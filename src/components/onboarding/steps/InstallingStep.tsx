import { useEffect, useRef, useState } from "react";
import { CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  RotateCw,
  CheckCircle2,
} from "lucide-react";
import {
  runStream,
  type SseEvent,
} from "@/components/onboarding/api/installerSse";
import {
  STEP_LABELS_PTBR,
  clearStoredProgress,
  loadStoredProgress,
  storeProgress,
  type OnboardingData,
} from "@/components/onboarding/onboardingState";

interface InstallingStepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onDone: () => void;
  onBack: () => void;
}

interface UiState {
  status: "running" | "error" | "done";
  pct: number;
  step: string;
  message?: string;
}

const INITIAL: UiState = {
  status: "running",
  pct: 0,
  step: "create-project",
  message: undefined,
};

export function InstallingStep({
  data,
  onUpdate,
  onDone,
  onBack,
}: InstallingStepProps) {
  const [ui, setUi] = useState<UiState>(INITIAL);
  const [attempt, setAttempt] = useState(0);
  const lastProgressRef = useRef<unknown>(loadStoredProgress());
  const resumedRef = useRef<boolean>(lastProgressRef.current != null);

  function startRun(progressToSend?: unknown) {
    setUi({
      ...INITIAL,
      step: progressToSend ? "deploy-functions" : "create-project",
    });
    const cancel = runStream(
      {
        vercelToken: data.vercelToken,
        supabaseToken: data.supabaseToken,
        options: {
          orgId: data.orgId,
          projectName: data.projectName,
          dbPassword: data.dbPassword,
        },
        progress: progressToSend ?? undefined,
      },
      {
        onEvent: (event: SseEvent) =>
          handleEvent(event, () => startRun(lastProgressRef.current)),
      },
    );
    return cancel;
  }

  function handleEvent(event: SseEvent, resume: () => void) {
    if (event.pct !== undefined) {
      setUi((prev) => ({ ...prev, pct: Math.max(prev.pct, event.pct ?? 0) }));
    }
    if (event.step && event.step !== "global") {
      setUi((prev) => ({ ...prev, step: event.step }));
    }
    if (event.status === "error") {
      setUi({
        status: "error",
        pct: event.pct ?? 0,
        step: event.step ?? "global",
        message: event.message,
      });
      return;
    }
    if (event.status === "partial" && event.progress) {
      // Persiste o progress para resume (recarregar a página) E reinvoca o
      // run imediatamente enviando o progress de volta.
      lastProgressRef.current = event.progress;
      storeProgress(event.progress);
      // Extrai projectRef do progress para o passo admin.
      const ref = readProjectRef(event.progress);
      if (ref && data.projectRef !== ref) onUpdate({ projectRef: ref });
      // Resume automático — cliente reenvia o progress.
      resume();
      return;
    }
    if (event.status === "done") {
      if (event.progress) {
        lastProgressRef.current = event.progress;
        storeProgress(event.progress);
        const ref = readProjectRef(event.progress);
        if (ref) onUpdate({ projectRef: ref });
      }
      setUi({
        status: "done",
        pct: 100,
        step: "global",
        message: event.message ?? "Instalação concluída.",
      });
      clearStoredProgress();
      // Pequeno delay para o usuário ver o 100% antes de avançar.
      setTimeout(() => onDone(), 800);
    }
  }

  // Inicia o run no mount (e no retry manual).
  useEffect(() => {
    const cancel = startRun(lastProgressRef.current);
    return () => {
      cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const handleRetry = () => {
    setUi(INITIAL);
    setAttempt((n) => n + 1);
  };

  const currentLabel = STEP_LABELS_PTBR[ui.step] ?? "Instalando";
  const running = ui.status === "running";
  const done = ui.status === "done";
  const error = ui.status === "error";

  return (
    <div className="space-y-5" data-testid="installing-step">
      <div className="space-y-2">
        <CardTitle className="text-xl">Instalando</CardTitle>
        <CardDescription>
          {resumedRef.current && running
            ? "Retomando a instalação de onde parou..."
            : "Estamos preparando tudo para você. Isso costuma levar alguns minutos — pode deixar com a gente."}
        </CardDescription>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground" aria-live="polite">
            {running ? currentLabel : done ? "Concluído" : "Falhou"}
          </span>
          <span className="tabular-nums text-muted-foreground">
            {Math.round(ui.pct)}%
          </span>
        </div>
        <Progress
          value={ui.pct}
          aria-label={`Progresso da instalação: ${Math.round(ui.pct)}%`}
          aria-valuenow={Math.round(ui.pct)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
        <ul className="space-y-1.5 text-sm">
          {Object.entries(STEP_LABELS_PTBR)
            .filter(([key]) => key !== "global")
            .map(([key, label]) => {
              const completed = isStepCompleted(lastProgressRef.current, key);
              return (
                <li
                  key={key}
                  className={
                    "flex items-center gap-2 " +
                    (completed
                      ? "text-emerald-600"
                      : ui.step === key && running
                        ? "text-foreground"
                        : "text-muted-foreground")
                  }
                >
                  {completed ? (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  ) : ui.step === key && running ? (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className="inline-block h-2 w-2 rounded-full bg-current opacity-40"
                      aria-hidden="true"
                    />
                  )}
                  {label}
                </li>
              );
            })}
        </ul>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-medium">Algo deu errado durante a instalação.</p>
            {ui.message && <p className="text-destructive/90">{ui.message}</p>}
            <p className="text-muted-foreground">
              Você pode tentar novamente — vamos retomar de onde parou.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={running}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Button>
        {error && (
          <Button type="button" onClick={handleRetry}>
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}

function readProjectRef(progress: unknown): string | undefined {
  if (progress && typeof progress === "object" && "projectRef" in progress) {
    const ref = (progress as { projectRef?: unknown }).projectRef;
    return typeof ref === "string" ? ref : undefined;
  }
  return undefined;
}

function isStepCompleted(progress: unknown, stepKey: string): boolean {
  if (!progress || typeof progress !== "object") return false;
  const completed = (progress as { completedSteps?: unknown }).completedSteps;
  return Array.isArray(completed) && completed.includes(stepKey);
}
