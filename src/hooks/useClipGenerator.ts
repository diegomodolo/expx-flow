import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ClipJob {
  id: string;
  status: string;
  progress: number;
  progress_message: string;
  error_message?: string;
  input_url?: string;
  created_at: string;
}

export interface Clip {
  id: string;
  title: string;
  clip_type: string;
  virality_score: number;
  reason: string;
  duration_seconds: number;
  public_url: string;
  start_seconds: number;
  end_seconds: number;
}

export function useClipGenerator() {
  const { toast } = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ClipJob | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Listen to realtime updates
  useEffect(() => {
    if (!jobId) return;

    const jobChannel = supabase
      .channel(`clip-job-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "clip_jobs",
          filter: `id=eq.${jobId}`,
        },
        (payload) => {
          const updated = payload.new as ClipJob;
          setJob(updated);

          if (updated.status === "done") {
            toast({
              title: "Clipes prontos!",
              description: "Seus clipes virais foram gerados com sucesso.",
            });
          } else if (updated.status === "error") {
            toast({
              title: "Erro no processamento",
              description: updated.error_message || "Erro desconhecido",
              variant: "destructive",
            });
          }
        }
      )
      .subscribe();

    const clipsChannel = supabase
      .channel(`clip-clips-${jobId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "clips",
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          setClips((prev) =>
            [...prev, payload.new as Clip].sort(
              (a, b) => b.virality_score - a.virality_score
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(jobChannel);
      supabase.removeChannel(clipsChannel);
    };
  }, [jobId, toast]);

  const processUrl = useCallback(
    async (
      url: string,
      options: {
        maxClips?: number;
        format?: string;
        companyId?: string;
        clientId?: string;
      } = {}
    ) => {
      setIsLoading(true);
      setClips([]);
      setJob(null);

      try {
        const { data, error } = await supabase.functions.invoke(
          "create-clip-job",
          {
            body: {
              inputUrl: url,
              maxClips: options.maxClips ?? 3,
              format: options.format ?? "9:16",
              companyId: options.companyId,
              clientId: options.clientId,
            },
          }
        );

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Erro ao criar job");

        setJobId(data.jobId);
        setJob({
          id: data.jobId,
          status: "pending",
          progress: 0,
          progress_message: "Job criado, aguardando processamento...",
          input_url: url,
          created_at: new Date().toISOString(),
        });

        toast({
          title: "Processamento iniciado",
          description: "Seus clipes estão sendo gerados...",
        });
      } catch (err: any) {
        console.error("processUrl error:", err);
        toast({
          title: "Erro",
          description: err?.message || "Erro ao iniciar processamento",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const uploadAndProcess = useCallback(
    async (
      file: File,
      options: {
        maxClips?: number;
        format?: string;
        companyId?: string;
        clientId?: string;
      } = {}
    ) => {
      setIsLoading(true);
      setClips([]);
      setJob(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const storagePath = `${user.id}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("videos-input")
          .upload(storagePath, file);

        if (uploadError) throw uploadError;

        const { data, error } = await supabase.functions.invoke(
          "create-clip-job",
          {
            body: {
              inputStoragePath: storagePath,
              maxClips: options.maxClips ?? 3,
              format: options.format ?? "9:16",
              companyId: options.companyId,
              clientId: options.clientId,
            },
          }
        );

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || "Erro ao criar job");

        setJobId(data.jobId);
        setJob({
          id: data.jobId,
          status: "pending",
          progress: 0,
          progress_message: "Job criado, aguardando processamento...",
          created_at: new Date().toISOString(),
        });

        toast({
          title: "Upload e processamento iniciados",
          description: "Seus clipes estão sendo gerados...",
        });
      } catch (err: any) {
        console.error("uploadAndProcess error:", err);
        toast({
          title: "Erro",
          description: err?.message || "Erro ao enviar vídeo",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const reset = useCallback(() => {
    setJobId(null);
    setJob(null);
    setClips([]);
  }, []);

  return {
    job,
    clips,
    isLoading,
    processUrl,
    uploadAndProcess,
    reset,
    isDone: job?.status === "done",
    isError: job?.status === "error",
    isProcessing: !!job && job.status !== "done" && job.status !== "error",
  };
}
