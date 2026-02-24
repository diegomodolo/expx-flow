import { useState, useEffect, useCallback, useRef } from "react";
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

export interface ClipOptions {
  maxClips?: number;
  format?: string;
  maxDurationSeconds?: number;
  timeStartSeconds?: number;
  timeEndSeconds?: number;
  contextDescription?: string;
  companyId?: string;
  clientId?: string;
}

// Processing steps for visual progress
export interface ProcessingStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
}

function deriveSteps(job: ClipJob | null): ProcessingStep[] {
  const progress = job?.progress ?? 0;
  const status = job?.status ?? "pending";
  const isError = status === "error";
  const errorMsg = job?.error_message ?? "";

  const steps: ProcessingStep[] = [
    { id: "created", label: "Job criado", status: "pending" },
    { id: "resolve", label: "Preparando vídeo", status: "pending" },
    { id: "ingest", label: "Enviando para transcrição", status: "pending" },
    { id: "transcription", label: "Transcrevendo áudio", status: "pending" },
    { id: "analysis", label: "Analisando momentos virais", status: "pending" },
    { id: "rendering", label: "Renderizando clipes", status: "pending" },
    { id: "done", label: "Concluído", status: "pending" },
  ];

  // Determine the current active step index based on progress
  let activeIndex = 0;
  if (progress >= 100) activeIndex = 6;
  else if (progress >= 50) activeIndex = 5;
  else if (progress >= 30) activeIndex = 4;
  else if (progress >= 10) activeIndex = 3;
  else if (progress >= 8) activeIndex = 2;
  else if (progress >= 5) activeIndex = 1;
  else activeIndex = 0;

  // Mark steps
  for (let i = 0; i < steps.length; i++) {
    if (i < activeIndex) {
      steps[i].status = "done";
    } else if (i === activeIndex) {
      if (isError) {
        steps[i].status = "error";
      } else if (status === "done") {
        steps[i].status = "done";
      } else {
        steps[i].status = "active";
      }
    }
    // remaining stay "pending"
  }

  return steps;
}

export function useClipGenerator() {
  const { toast } = useToast();
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<ClipJob | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive visual steps from job state
  const steps = deriveSteps(job);

  // Polling fallback — fetch status every 5s while processing
  useEffect(() => {
    if (!jobId) return;
    if (job?.status === "done" || job?.status === "error") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }

    const poll = async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "get-clip-job-status",
          { body: undefined, method: "GET", headers: {} }
        );
        // Use fetch directly since invoke doesn't support query params well
      } catch {
        // ignore
      }
    };

    // Direct fetch with query params
    const doPoll = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = (supabase as any).supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        const res = await fetch(
          `${supabaseUrl}/functions/v1/get-clip-job-status?jobId=${jobId}`,
          {
            headers: {
              "Content-Type": "application/json",
              "apikey": supabaseKey,
              "Authorization": `Bearer ${session?.access_token || supabaseKey}`,
            },
          }
        );
        if (!res.ok) return;
        const result = await res.json();
        if (result.job) {
          setJob(result.job as ClipJob);
        }
        if (result.clips && result.clips.length > 0) {
          setClips(
            (result.clips as Clip[]).sort(
              (a, b) => b.virality_score - a.virality_score
            )
          );
        }
      } catch {
        // ignore polling errors
      }
    };

    pollingRef.current = setInterval(doPoll, 5000);
    // Also poll immediately
    doPoll();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [jobId, job?.status]);

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
    async (url: string, options: ClipOptions = {}) => {
      setIsLoading(true);
      setClips([]);
      setJob(null);

      try {
        const { data, error } = await supabase.functions.invoke(
          "create-clip-job",
          {
            body: {
              inputUrl: url,
              maxClips: options.maxClips ?? 30,
              format: options.format ?? "9:16",
              maxDurationSeconds: options.maxDurationSeconds ?? 60,
              timeStartSeconds: options.timeStartSeconds,
              timeEndSeconds: options.timeEndSeconds,
              contextDescription: options.contextDescription,
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
    async (file: File, options: ClipOptions = {}) => {
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
              maxClips: options.maxClips ?? 30,
              format: options.format ?? "9:16",
              maxDurationSeconds: options.maxDurationSeconds ?? 60,
              timeStartSeconds: options.timeStartSeconds,
              timeEndSeconds: options.timeEndSeconds,
              contextDescription: options.contextDescription,
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
    steps,
    isLoading,
    processUrl,
    uploadAndProcess,
    reset,
    isDone: job?.status === "done",
    isError: job?.status === "error",
    isProcessing: !!job && job.status !== "done" && job.status !== "error",
  };
}
