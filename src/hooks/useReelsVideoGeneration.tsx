import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SceneProgress {
  sceneNumber: number;
  status: "pending" | "generating" | "completed" | "error";
  prompt?: string;
  operationName?: string | null;
  videoUrl?: string | null;
  error?: string | null;
}

interface ReelsProgress {
  totalScenes: number;
  currentScene: number;
  scenes: SceneProgress[];
  error?: string | null;
}

interface ReelsGenerationState {
  status: "idle" | "analyzing" | "generating" | "completed" | "error";
  progress: ReelsProgress | null;
  estimatedTime: string | null;
}

interface StartReelsGenerationParams {
  postId: string;
  clientId: string;
  companyId: string;
  script: string;
  headline?: string;
  subheadline?: string;
}

export function useReelsVideoGeneration() {
  const [state, setState] = useState<ReelsGenerationState>({
    status: "idle",
    progress: null,
    estimatedTime: null,
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const postIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setState({
      status: "idle",
      progress: null,
      estimatedTime: null,
    });
    postIdRef.current = null;
  }, [stopPolling]);

  const startPolling = useCallback((postId: string) => {
    stopPolling();
    postIdRef.current = postId;

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-reels-video", {
          body: { action: "status", postId },
        });

        if (error) {
          console.error("Polling error:", error);
          return;
        }

        const progress = data.progress as ReelsProgress;
        const completedScenes = progress?.scenes?.filter(s => s.status === "completed").length || 0;
        const errorScenes = progress?.scenes?.filter(s => s.status === "error").length || 0;
        const totalScenes = progress?.totalScenes || 0;
        const remainingScenes = totalScenes - completedScenes - errorScenes;
        
        // Estimate ~60 seconds per scene
        const estimatedSeconds = remainingScenes * 60;
        const estimatedTime = estimatedSeconds > 60 
          ? `~${Math.ceil(estimatedSeconds / 60)} min restantes`
          : `~${estimatedSeconds}s restantes`;

        // Determine UI status - safety fallback for inconsistent backend state
        let uiStatus = data.status;
        if (data.allDone && data.status === "generating") {
          // Backend says all done but status is still generating - force correct status
          if (errorScenes > 0 && completedScenes === 0) {
            uiStatus = "error";
          } else if (completedScenes > 0) {
            uiStatus = "completed";
          } else {
            uiStatus = "error"; // No scenes completed = error
          }
        }

        setState({
          status: uiStatus,
          progress,
          estimatedTime: uiStatus === "generating" ? estimatedTime : null,
        });

        // Stop polling if done
        if (uiStatus === "completed" || uiStatus === "error" || data.allDone) {
          stopPolling();
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Poll immediately, then every 10 seconds
    poll();
    pollingRef.current = setInterval(poll, 10000);
  }, [stopPolling]);

  const startGeneration = useCallback(async (params: StartReelsGenerationParams) => {
    const { postId, clientId, companyId, script, headline, subheadline } = params;

    setState({
      status: "analyzing",
      progress: null,
      estimatedTime: "Analisando roteiro...",
    });

    try {
      const { data, error } = await supabase.functions.invoke("generate-reels-video", {
        body: {
          action: "start",
          postId,
          clientId,
          companyId,
          script,
          headline,
          subheadline,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || "Failed to start generation");
      }

      // Estimate initial time: ~60 seconds per scene
      const estimatedSeconds = data.totalScenes * 60;
      const estimatedTime = `~${Math.ceil(estimatedSeconds / 60)} min`;

      setState(prev => ({
        ...prev,
        status: "generating",
        estimatedTime,
      }));

      // Start polling for progress
      startPolling(postId);

      return data;
    } catch (err: any) {
      setState({
        status: "error",
        progress: { totalScenes: 0, currentScene: 0, scenes: [], error: err.message },
        estimatedTime: null,
      });
      throw err;
    }
  }, [startPolling]);

  const cancelGeneration = useCallback(async (postId: string) => {
    stopPolling();

    try {
      await supabase.functions.invoke("generate-reels-video", {
        body: { action: "reset", postId },
      });
    } catch (err) {
      console.error("Error resetting generation:", err);
    }

    reset();
  }, [stopPolling, reset]);

  // Load existing progress on mount
  const loadExistingProgress = useCallback(async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from("content_plan_posts")
        .select("reels_generation_status, reels_generation_progress")
        .eq("id", postId)
        .single();

      if (error || !data) return;

      const status = data.reels_generation_status as ReelsGenerationState["status"];
      const progressData = data.reels_generation_progress;
      const progress: ReelsProgress | null = progressData && typeof progressData === 'object' && 'scenes' in progressData
        ? progressData as unknown as ReelsProgress
        : null;

      if (status && status !== "idle") {
        setState({
          status,
          progress,
          estimatedTime: status === "generating" ? "Calculando..." : null,
        });

        // Resume polling if still generating
        if (status === "generating") {
          startPolling(postId);
        }
      }
    } catch (err) {
      console.error("Error loading existing progress:", err);
    }
  }, [startPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    state,
    startGeneration,
    cancelGeneration,
    reset,
    loadExistingProgress,
    isGenerating: state.status === "analyzing" || state.status === "generating",
    isCompleted: state.status === "completed",
    hasError: state.status === "error",
  };
}
