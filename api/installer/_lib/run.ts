/**
 * Orquestrador `runInstaller` — executa a sequência de steps do auto-instalador
 * com idempotência, resume e orçamento de tempo (partial).
 *
 * Tokens **só em memória** da invocação (nunca persistidos). O `run`:
 *  1. Carrega o progress (do body no resume, ou estado inicial).
 *  2. Recusa 409 se a instalação já está concluída (sem `reinstall`).
 *  3. Constrói wrappers Vercel/Supabase Mgmt com tokens do body.
 *  4. Executa os steps em ordem, respeitando `isStepDone` (resume).
 *  5. Após `apply-schema`, constrói client Supabase do cliente (service_role
 *     em memória) e passa a persistir `install_progress` lá (sobrevive ao
 *     redeploy — risco §8).
 *  6. Checa o orçamento de tempo; ao se aproximar do limite, finaliza o lote
 *     em andamento e retorna `{ status: "partial", resumeFrom }`. O cliente
 *     (F3.1) reinvoca `run`.
 *
 * Referência: docs/onboarding-installer/SPRINT-2-nucleo-instalador.md Fase 2.4/2.5
 */

import { createClient } from "@supabase/supabase-js";
import type { VercelClient } from "./vercel-api";
import type { SupabaseMgmtClient } from "./supabase-mgmt";
import { createVercelClient } from "./vercel-api";
import { createSupabaseMgmtClient } from "./supabase-mgmt";
import {
  type InstallProgress,
  type ProgressService,
  createProgressService,
  createInMemoryProgressStore,
  createSupabaseProgressStore,
  STEPS,
  type StepName,
} from "./progress";
import {
  type RunOptions,
  type StepContext,
  type SseEvent,
  type SseEmitter,
  type TimeBudget,
  type SupabaseLike,
  type FunctionsManifest,
  stepCreateProject,
  stepApplySchema,
  stepDeployFunctions,
  stepSetSecrets,
  stepWriteVercelEnv,
  stepTriggerRedeploy,
} from "./steps";

/** Orçamento de tempo padrão por invocação (ms). Limite Vercel ~300s, margem. */
export const DEFAULT_MAX_RUN_MS = 250_000;
/** Margem de segurança antes do limite para emitir partial (ms). */
export const DEFAULT_BUDGET_MARGIN_MS = 15_000;

export type RunStatus = "done" | "partial" | "error";

export interface RunResult {
  status: RunStatus;
  resumeFrom?: StepName;
  progress: InstallProgress;
  error?: { message: string; step?: StepName };
}

export interface RunInstallerInput {
  vercelToken: string;
  supabaseToken: string;
  options: RunOptions;
  /** Progress vindo do body (resume via cliente). */
  initialProgress?: InstallProgress;
  /** Força reinstalação mesmo se já concluída (?reinstall=1). */
  reinstall?: boolean;
  /** Callback para checar installation_completed no projeto novo. Opcional. */
  isAlreadyCompleted?: (progress: InstallProgress) => Promise<boolean>;
  /** Emissor de eventos SSE (text/event-stream). */
  onEvent: SseEmitter;
  /** Override de wrappers (testes). */
  vercel?: VercelClient;
  supabase?: SupabaseMgmtClient;
  /** BaseUrl override para testes (fakes). */
  vercelBaseUrl?: string;
  supabaseBaseUrl?: string;
  /** Orçamento de tempo override. */
  maxRunMs?: number;
  /** Manifesto de functions override (testes com poucas functions). */
  manifest?: FunctionsManifest;
}

function createTimeBudget(maxMs: number, marginMs: number): TimeBudget {
  const startedAt = Date.now();
  return {
    startedAt,
    maxMs,
    remainingMs: () => Math.max(0, startedAt + maxMs - Date.now()),
    shouldStop: () => Date.now() >= startedAt + maxMs - marginMs,
  };
}

/**
 * Executa a instalação. Não trata HTTP/SSE — essa camada é do handler `run.ts`.
 * Retorna `{ status }` + progress atualizado para o cliente reenviar no resume.
 */
export async function runInstaller(
  input: RunInstallerInput,
): Promise<RunResult> {
  const maxRunMs =
    input.maxRunMs ??
    input.options.maxRunMs ??
    Number(process.env.INSTALLER_MAX_RUN_MS ?? DEFAULT_MAX_RUN_MS);
  const budget = createTimeBudget(maxRunMs, DEFAULT_BUDGET_MARGIN_MS);

  const vercel: VercelClient =
    input.vercel ??
    createVercelClient({
      token: input.vercelToken,
      baseUrl: input.vercelBaseUrl,
    });
  const supabase: SupabaseMgmtClient =
    input.supabase ??
    createSupabaseMgmtClient({
      token: input.supabaseToken,
      baseUrl: input.supabaseBaseUrl,
    });

  const progress: ProgressService = createProgressService({
    initial: input.initialProgress,
  });
  if (input.initialProgress) progress.replace(input.initialProgress);
  await progress.loadProgress();

  // Bloqueio de reinstalação: se já concluída e sem flag → 409.
  const isCompleted = input.isAlreadyCompleted
    ? await input.isAlreadyCompleted(progress.snapshot())
    : isInstallationFullyDone(progress.snapshot());
  if (isCompleted && !input.reinstall) {
    input.onEvent({
      step: "global",
      status: "error",
      pct: 100,
      message:
        "Instalação já foi concluída nesta instância. Use ?reinstall=1 para reinstalar.",
    });
    return {
      status: "error",
      progress: progress.snapshot(),
      error: {
        message: "Instalação já concluída.",
      },
    };
  }

  const ctx: StepContext = {
    options: input.options,
    vercel,
    supabase,
    progress,
    emit: input.onEvent,
    budget,
    manifest: input.manifest,
  };

  try {
    // 1) create-project
    if (!ctx.budget.shouldStop()) {
      await stepCreateProject(ctx);
    }

    // 2) apply-schema
    if (!ctx.budget.shouldStop()) {
      await stepApplySchema(ctx);
      // Após apply-schema, construímos o client Supabase do cliente para
      // persistir o progress em system_config_app.install_progress.
      // Requer service_role em memória (não persistida).
      attachClientSupabase(ctx, progress);
    }

    // 3) deploy-functions (lotes + partial)
    if (!ctx.budget.shouldStop()) {
      const result = await stepDeployFunctions(ctx);
      if (result.partial) {
        return finalizePartial(input.onEvent, progress, "deploy-functions");
      }
    }

    // 4) set-secrets
    if (!ctx.budget.shouldStop()) {
      await stepSetSecrets(ctx);
    } else {
      return finalizePartial(input.onEvent, progress, "deploy-functions");
    }

    // 5) write-vercel-env
    if (!ctx.budget.shouldStop()) {
      await stepWriteVercelEnv(ctx);
    } else {
      return finalizePartial(input.onEvent, progress, "set-secrets");
    }

    // 6) trigger-redeploy
    if (!ctx.budget.shouldStop()) {
      await stepTriggerRedeploy(ctx);
    } else {
      return finalizePartial(input.onEvent, progress, "write-vercel-env");
    }

    input.onEvent({
      step: "global",
      status: "completed",
      pct: 100,
      message: "Instalação concluída com sucesso.",
    });
    return { status: "done", progress: progress.snapshot() };
  } catch (err) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Erro durante a instalação.";
    input.onEvent({
      step: "global",
      status: "error",
      pct: (progress.snapshot().completedSteps.length / STEPS.length) * 100,
      message,
    });
    return {
      status: "error",
      progress: progress.snapshot(),
      error: { message },
    };
  }
}

function finalizePartial(
  emit: SseEmitter,
  progress: ProgressService,
  resumeFrom: StepName,
): RunResult {
  emit({
    step: "global",
    status: "partial",
    pct: Math.round(
      (progress.snapshot().completedSteps.length / STEPS.length) * 100,
    ),
    message: `Orçamento de tempo da invocação atingido. Retome a partir de "${resumeFrom}".`,
    resumeFrom,
  });
  return {
    status: "partial",
    resumeFrom,
    progress: progress.snapshot(),
  };
}

function isInstallationFullyDone(p: InstallProgress): boolean {
  return STEPS.every((s) => p.completedSteps.includes(s));
}

/**
 * Constrói (se possível) um client Supabase do cliente com a service_role key
 * em memória, registra no `ctx` e troca o store do `progress` para persistir
 * em `system_config_app.install_progress`. Best-effort: se faltar
 * service_role (resume sem reenvio), mantém o store em memória.
 */
function attachClientSupabase(
  ctx: StepContext,
  progress: ProgressService,
): void {
  const project = ctx.project;
  if (!project?.ref || !project.serviceRoleKey) return;
  const url = `https://${project.ref}.supabase.co`;
  try {
    const client = createClient(url, project.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseLike;
    ctx.clientSupabase = client;
    // Troca o store para persistente e faz um flush imediato do snapshot.
    // A partir daqui, cada markStep/markFunctionDeployed também persiste lá,
    // sobrevivendo a redeploys (risco §8).
    const persistentStore = createSupabaseProgressStore({ client });
    void progress.attachPersistentStore(persistentStore);
  } catch {
    /* best-effort: segue com store em memória */
  }
}
