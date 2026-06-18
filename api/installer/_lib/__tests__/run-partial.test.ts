import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createSupabaseMgmtFake } from "../../../../tests/e2e/fakes/supabase-mgmt";
import { createVercelFake } from "../../../../tests/e2e/fakes/vercel";
import { createSupabaseMgmtClient } from "../supabase-mgmt";
import { createVercelClient } from "../vercel-api";
import {
  runInstaller,
  DEFAULT_MAX_RUN_MS,
  DEFAULT_BUDGET_MARGIN_MS,
} from "../run";
import { autoAdvancePendingProjects } from "./_helpers";
import type { InstallProgress } from "../progress";

const VALID_V = "vrt_partial";
const VALID_S = "sbp_partial";
const VERCEL_PID = "prj_partial";

/** Manifesto pequeno para o deploy caber em poucos lotes. */
const SMALL_MANIFEST = {
  functionsRoot: "supabase/functions",
  count: 3,
  functions: [
    {
      name: "a",
      entrypoint: "a/index.ts",
      files: ["a/index.ts"],
      verifyJwt: true,
    },
    {
      name: "b",
      entrypoint: "b/index.ts",
      files: ["b/index.ts"],
      verifyJwt: false,
    },
    {
      name: "c",
      entrypoint: "c/index.ts",
      files: ["c/index.ts"],
      verifyJwt: true,
    },
  ],
};

describe("runInstaller — partial (orçamento de tempo) + resume", () => {
  let sFake: Awaited<ReturnType<typeof createSupabaseMgmtFake>>;
  let vFake: Awaited<ReturnType<typeof createVercelFake>>;
  let sClose: () => Promise<void>;
  let vClose: () => Promise<void>;

  beforeAll(async () => {
    sFake = await createSupabaseMgmtFake({ validToken: VALID_S });
    vFake = await createVercelFake({
      validToken: VALID_V,
      projects: [{ id: VERCEL_PID, name: "expx" }],
    });
    sClose = sFake.close;
    vClose = vFake.close;
  });
  afterAll(async () => {
    await Promise.all([sClose(), vClose()]);
  });
  beforeEach(() => {
    sFake.reset();
    vFake.reset();
  });
  afterEach(() => vi.restoreAllMocks());

  function eventsCollector() {
    const events: Array<{
      step: string;
      status: string;
      pct: number;
      message?: string;
      resumeFrom?: string;
    }> = [];
    return {
      events,
      onEvent: (e: any) => events.push(e),
    };
  }

  async function baseRun(overrides: {
    initialProgress?: InstallProgress;
    maxRunMs?: number;
    vercelProjectId?: string;
  }) {
    const { events, onEvent } = eventsCollector();
    // Auto-avança provisionamento do projeto novo.
    autoAdvancePendingProjects(sFake);
    const result = await runInstaller({
      vercelToken: VALID_V,
      supabaseToken: VALID_S,
      options: {
        orgId: "org_default",
        projectName: "expx-test",
        dbPassword: "Db123!",
        vercelProjectId: overrides.vercelProjectId ?? VERCEL_PID,
        cwd: process.cwd(),
        projectHealthyIntervalMs: 5,
        projectHealthyTimeoutMs: 2000,
        deployReadyIntervalMs: 5,
        deployReadyTimeoutMs: 2000,
        functionsBatchSize: 10,
      },
      initialProgress: overrides.initialProgress,
      onEvent,
      vercel: createVercelClient({
        token: VALID_V,
        baseUrl: vFake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      supabase: createSupabaseMgmtClient({
        token: VALID_S,
        baseUrl: sFake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      maxRunMs: overrides.maxRunMs,
      manifest: SMALL_MANIFEST,
    });
    return { result, events };
  }

  it("DEFAULT_MAX_RUN_MS e DEFAULT_BUDGET_MARGIN_MS têm valores sensatos (> 60s e < 60s)", () => {
    expect(DEFAULT_MAX_RUN_MS).toBeGreaterThan(60_000);
    expect(DEFAULT_BUDGET_MARGIN_MS).toBeLessThan(DEFAULT_MAX_RUN_MS);
    expect(DEFAULT_BUDGET_MARGIN_MS).toBeGreaterThan(1_000);
  });

  it("orçamento curto → retorna status 'partial' com resumeFrom (sem estourar)", async () => {
    // Orçamento de 30ms: create-project estoura o budget.shouldStop() cedo.
    // Pré-concluímos create-project+apply-schema no initialProgress para
    // forçar o partial no deploy-functions (onde faz sentido).
    const initial: InstallProgress = {
      completedSteps: ["create-project", "apply-schema"],
      functions: [],
      projectRef: "projseedref",
      projectAnonKey: "anon-seed",
      vercelProjectId: VERCEL_PID,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    // maxRunMs baixo: assim que entra no deploy-functions, shouldStop é true.
    const { result, events } = await baseRun({
      initialProgress: initial,
      maxRunMs: 5,
    });

    expect(result.status).toBe("partial");
    expect(result.resumeFrom).toBeTruthy();
    const partialEvents = events.filter((e) => e.status === "partial");
    expect(partialEvents.length).toBeGreaterThan(0);
  });

  it("reinvocação continua a partir do partial e chega a 'done'", async () => {
    // 1ª invocação: create-project e apply-schema pré-concluídos, maxRunMs=1
    // → partial imediato ANTES do deploy-functions.
    const initialPartial: InstallProgress = {
      completedSteps: ["create-project", "apply-schema"],
      functions: [],
      projectRef: "projseedref",
      projectAnonKey: "anon-seed",
      vercelProjectId: VERCEL_PID,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };

    const { events: ev1, onEvent: emit1 } = eventsCollector();
    const r1 = await runInstaller({
      vercelToken: VALID_V,
      supabaseToken: VALID_S,
      options: {
        orgId: "org_default",
        projectName: "expx-test",
        dbPassword: "Db123!",
        vercelProjectId: VERCEL_PID,
        cwd: process.cwd(),
        functionsBatchSize: 10,
        projectHealthyIntervalMs: 5,
        projectHealthyTimeoutMs: 1000,
        deployReadyIntervalMs: 5,
        deployReadyTimeoutMs: 2000,
      },
      initialProgress: initialPartial,
      onEvent: emit1,
      vercel: createVercelClient({
        token: VALID_V,
        baseUrl: vFake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      supabase: createSupabaseMgmtClient({
        token: VALID_S,
        baseUrl: sFake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      maxRunMs: 1,
      manifest: SMALL_MANIFEST,
    });
    expect(r1.status).toBe("partial");
    expect(ev1.some((e) => e.status === "partial")).toBe(true);
    expect(r1.progress.completedSteps).toContain("apply-schema");
    // Nada foi deployado ainda.
    expect(r1.progress.functions.length).toBe(0);

    // 2ª invocação: orçamento generoso, retoma do progress do r1.
    // Auto-avança o redeploy da Vercel para READY.
    const stop = setInterval(() => vFake.advanceDeployments(), 5);
    const { events: ev2, onEvent: emit2 } = eventsCollector();
    const r2 = await runInstaller({
      vercelToken: VALID_V,
      supabaseToken: VALID_S,
      options: {
        orgId: "org_default",
        projectName: "expx-test",
        dbPassword: "Db123!",
        vercelProjectId: VERCEL_PID,
        cwd: process.cwd(),
        functionsBatchSize: 10,
        deployReadyIntervalMs: 5,
        deployReadyTimeoutMs: 3000,
      },
      initialProgress: r1.progress,
      onEvent: emit2,
      vercel: createVercelClient({
        token: VALID_V,
        baseUrl: vFake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      supabase: createSupabaseMgmtClient({
        token: VALID_S,
        baseUrl: sFake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      maxRunMs: 60_000,
      manifest: SMALL_MANIFEST,
    });
    clearInterval(stop);

    expect(r2.status).toBe("done");
    // As 3 functions foram deployadas nesta invocação.
    expect(r2.progress.functions.length).toBe(3);
    expect(
      ev2.some((e) => e.step === "global" && e.status === "completed"),
    ).toBe(true);
  });
});
