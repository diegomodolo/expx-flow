import { vi } from "vitest";
import { createProgressService } from "../progress";
import type { SupabaseMgmtClient } from "../supabase-mgmt";
import type { VercelClient } from "../vercel-api";
import type { StepContext, RunOptions, SseEvent, TimeBudget } from "../steps";

/**
 * Fábrica de StepContext para testes. Usa o `progress` em memória e um
 * coletor de eventos SSE simples.
 */
export function makeCtx(parts: {
  supabase: SupabaseMgmtClient;
  vercel: VercelClient;
  options?: Partial<RunOptions>;
  project?: StepContext["project"];
  clientSupabase?: StepContext["clientSupabase"];
  maxRunMs?: number;
}): {
  ctx: StepContext;
  events: SseEvent[];
  emitter: (e: SseEvent) => void;
} {
  const events: SseEvent[] = [];
  const emitter = (e: SseEvent) => events.push(e);
  const budget: TimeBudget = createTimeBudget(parts.maxRunMs ?? 60_000);
  const ctx: StepContext = {
    options: {
      orgId: "org_default",
      projectName: "expx-flow-test",
      dbPassword: "DbPass123!",
      region: "sa-east-1",
      ...parts.options,
    },
    vercel: parts.vercel,
    supabase: parts.supabase,
    progress: createProgressService({}),
    project: parts.project,
    clientSupabase: parts.clientSupabase,
    emit: emitter,
    budget,
  };
  return { ctx, events, emitter };
}

export function createTimeBudget(maxMs: number): TimeBudget {
  const startedAt = Date.now();
  return {
    startedAt,
    maxMs,
    remainingMs: () => Math.max(0, startedAt + maxMs - Date.now()),
    shouldStop: () => Date.now() >= startedAt + maxMs - 5_000,
  };
}

/** Spy de método do client (vi.spyOn com tipagem solta). */
export function spyOn<T extends object, K extends keyof T>(
  obj: T,
  key: K,
): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(obj as any, key as any);
}

/**
 * Dispara `advanceProjectProvisioning` para TODOS os projetos PENDING do fake
 * periodicamente até ficarem ACTIVE_HEALTHY — robusto a races entre o
 * `createProject` (async) e o interval do teste. Não depende de ref fixo
 * (o `projectSeq` do fake reseta entre testes).
 *
 * Só para DEPOIS de ter avançado pelo menos um projeto para ACTIVE_HEALTHY
 * (ou após `timeoutMs`). Assim o seed já-healthy não encerra o helper cedo.
 */
export function autoAdvancePendingProjects(
  fake: {
    advanceProjectProvisioning: (ref: string) => void;
    state: { projects: Array<{ ref: string; status: string }> };
  },
  intervalMs = 5,
  timeoutMs = 2000,
): () => void {
  const started = Date.now();
  let advancedOnce = false;
  const id = setInterval(() => {
    const pending = fake.state.projects.filter((p) => p.status === "PENDING");
    if (pending.length > 0) {
      for (const p of pending) fake.advanceProjectProvisioning(p.ref);
      advancedOnce = true;
    }
    if (
      (advancedOnce && pending.length === 0) ||
      Date.now() - started > timeoutMs
    ) {
      clearInterval(id);
    }
  }, intervalMs);
  return () => clearInterval(id);
}
