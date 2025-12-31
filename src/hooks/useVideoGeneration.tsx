import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VideoGenerationState {
  creativeId: string | null;
  operationName: string | null;
  status: "idle" | "generating" | "completed" | "error";
  videoUrl: string | null;
  progress: number;
  error: string | null;
  estimatedTime: number;
}

interface StartVideoGenerationParams {
  clientId: string;
  companyId: string;
  theme: string;
  creativeType?: string;
  aspectRatio?: string;
  duration?: number;
  model?: "veo-2.0" | "veo-3.1";
  noTextInVideo?: boolean;
  imageReference?: string;
  clientName?: string;
  title?: string;
  description?: string;
}

export function useVideoGeneration() {
  const { toast } = useToast();
  const [state, setState] = useState<VideoGenerationState>({
    creativeId: null,
    operationName: null,
    status: "idle",
    videoUrl: null,
    progress: 0,
    error: null,
    estimatedTime: 60,
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const cancelGeneration = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    setState({
      creativeId: null,
      operationName: null,
      status: "idle",
      videoUrl: null,
      progress: 0,
      error: null,
      estimatedTime: 60,
    });
  }, []);

  const startPolling = useCallback(
    (operationName: string, creativeId: string, estimatedTimeSeconds: number) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      const pollInterval = 10_000; // 10s
      let pollCount = 0;
      const maxPolls = 60; // ~10min

      const poll = async () => {
        pollCount++;

        // Progresso estimado (só UX)
        const elapsed = Date.now() - (startTimeRef.current || Date.now());
        const estimatedMs = Math.max(5, estimatedTimeSeconds) * 1000;
        const progress = Math.min(95, Math.round((elapsed / estimatedMs) * 100));
        setState((prev) => ({ ...prev, progress }));

        try {
          const { data, error } = await supabase.functions.invoke("generate-video-creative", {
            method: "POST",
            body: { operationName, creativeId },
          });

          if (error) throw error;

          const statusData = data as any;

          if (statusData?.done) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;

            if (statusData.error) {
              setState((prev) => ({
                ...prev,
                status: "error",
                error: statusData.error,
                progress: 0,
              }));

              toast({
                title: "Erro na geração",
                description: statusData.error,
                variant: "destructive",
              });
            } else {
              setState((prev) => ({
                ...prev,
                status: "completed",
                videoUrl: statusData.videoUrl,
                progress: 100,
              }));

              toast({
                title: "Vídeo gerado!",
                description: "Seu vídeo está pronto para visualização.",
              });
            }
          }
        } catch (err) {
          // Não interrompe por erro transitório
          console.error("Polling error:", err);
        }

        if (pollCount >= maxPolls) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          setState((prev) => ({
            ...prev,
            status: "error",
            error: "Tempo limite excedido. Por favor, tente novamente.",
            progress: 0,
          }));

          toast({
            title: "Tempo limite excedido",
            description: "A geração demorou mais que o esperado.",
            variant: "destructive",
          });
        }
      };

      setTimeout(poll, 15_000);
      pollingRef.current = setInterval(poll, pollInterval);
    },
    [toast],
  );

  const startGeneration = useCallback(
    async (params: StartVideoGenerationParams) => {
      setState((prev) => ({
        ...prev,
        status: "generating",
        progress: 0,
        error: null,
        videoUrl: null,
      }));
      startTimeRef.current = Date.now();

      try {
        const { data, error } = await supabase.functions.invoke("generate-video-creative", {
          method: "POST",
          body: params,
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Failed to start video generation");

        const estimatedTime = data.estimatedTime || 60;

        setState((prev) => ({
          ...prev,
          creativeId: data.creativeId,
          operationName: data.operationName,
          estimatedTime,
        }));

        toast({
          title: "Geração iniciada",
          description: `Estimativa: ${Math.ceil(estimatedTime / 60)} minuto(s)`,
        });

        startPolling(data.operationName, data.creativeId, estimatedTime);

        return data;
      } catch (error: any) {
        console.error("Video generation error:", error);

        setState((prev) => ({
          ...prev,
          status: "error",
          error: error?.message || "Erro ao iniciar geração",
        }));

        toast({
          title: "Erro na geração",
          description: error?.message,
          variant: "destructive",
        });

        throw error;
      }
    },
    [startPolling, toast],
  );

  const reset = useCallback(() => {
    cancelGeneration();
  }, [cancelGeneration]);

  return {
    state,
    startGeneration,
    cancelGeneration,
    reset,
    isGenerating: state.status === "generating",
    isCompleted: state.status === "completed",
    isError: state.status === "error",
  };
}
