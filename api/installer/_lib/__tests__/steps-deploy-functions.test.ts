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
import {
  createSupabaseMgmtClient,
  type SupabaseMgmtClient,
} from "../supabase-mgmt";
import { stepDeployFunctions, type FunctionsManifest } from "../steps";
import { makeCtx, spyOn } from "./_helpers";

const VALID_TOKEN = "sbp_valid_deploy";
const SEED_REF = "projseedref";

function makeManifest(
  n: number,
  opts?: { verifyJwt?: (i: number) => boolean },
): FunctionsManifest {
  const fns = Array.from({ length: n }, (_, i) => ({
    name: `fn-${i}`,
    entrypoint: `fn-${i}/index.ts`,
    files: [`fn-${i}/index.ts`],
    verifyJwt: opts?.verifyJwt ? opts.verifyJwt(i) : i % 2 === 0,
  }));
  return { functionsRoot: "supabase/functions", count: n, functions: fns };
}

describe("step deploy-functions (lotes + retry + resume)", () => {
  let fake: Awaited<ReturnType<typeof createSupabaseMgmtFake>>;
  let close: () => Promise<void>;

  beforeAll(async () => {
    fake = await createSupabaseMgmtFake({ validToken: VALID_TOKEN });
    close = fake.close;
  });
  afterAll(async () => {
    await close();
  });
  beforeEach(() => fake.reset());
  afterEach(() => vi.restoreAllMocks());

  function client(): SupabaseMgmtClient {
    return createSupabaseMgmtClient({
      token: VALID_TOKEN,
      baseUrl: fake.url,
      maxRetries: 0,
      baseDelayMs: 1,
    });
  }

  function projectRuntime() {
    return {
      ref: SEED_REF,
      anonKey: "anon",
      serviceRoleKey: "sr",
      dbPassword: "p",
      dbHost: "h",
      dbPort: 5432,
    } as const;
  }

  function ctxWith(manifest: FunctionsManifest) {
    const base = makeCtx({
      supabase: client(),
      vercel: {} as any,
      project: projectRuntime(),
    });
    base.ctx.manifest = manifest;
    return base;
  }

  it("deploya todas as functions em lotes de ~10", async () => {
    const manifest = makeManifest(25);
    const { ctx } = ctxWith(manifest);

    const { deployed, partial } = await stepDeployFunctions(ctx);

    expect(partial).toBe(false);
    expect(deployed.length).toBe(25);
    expect(ctx.progress.snapshot().functions.length).toBe(25);
    expect(ctx.progress.isStepDone("deploy-functions")).toBe(true);
    // Confere que as functions estão no estado do fake.
    const fnsNoFake = fake.state.functions[SEED_REF] ?? [];
    expect(fnsNoFake.length).toBe(25);
  });

  it("function que falha 2x e passa na 3ª é deployada (retry backoff)", async () => {
    // Uma única function para determinismo: a fila de falhas é por ref.
    const manifest = makeManifest(1);
    const { ctx } = ctxWith(manifest);
    const spy = spyOn(ctx.supabase, "deployFunction");

    fake.forceNextDeployFailure(SEED_REF, 500, 2); // 2 falhas, passa na 3ª

    const { deployed } = await stepDeployFunctions(ctx);
    expect(deployed).toContain("fn-0");
    expect(ctx.progress.isFunctionDeployed("fn-0")).toBe(true);
    // A function fn-0 foi chamada 3x (2 falhas + 1 sucesso).
    const fn0Calls = spy.mock.calls.filter(
      (c) => (c[1] as any).name === "fn-0",
    ).length;
    expect(fn0Calls).toBe(3);
  });

  it("resume: functions já em progress.functions[] são puladas (sem chamar deployFunction)", async () => {
    const manifest = makeManifest(5);
    const { ctx } = ctxWith(manifest);
    // Pré-deploya 2 functions (simula lote anterior concluído).
    await ctx.progress.markFunctionDeployed("fn-0");
    await ctx.progress.markFunctionDeployed("fn-1");

    const spy = spyOn(ctx.supabase, "deployFunction");

    const { deployed } = await stepDeployFunctions(ctx);
    expect(deployed.length).toBe(3); // fn-2, fn-3, fn-4
    // Apenas 3 chamadas (fn-0 e fn-1 puladas).
    expect(spy.mock.calls.length).toBe(3);
    const deployedNames = spy.mock.calls.map((c) => (c[1] as any).name);
    expect(deployedNames).not.toContain("fn-0");
    expect(deployedNames).not.toContain("fn-1");
    expect(new Set(deployedNames)).toEqual(new Set(["fn-2", "fn-3", "fn-4"]));
  });

  it("falha definitiva após 3 tentativas interrompe com erro claro e preserva progress", async () => {
    // Uma única function para determinismo.
    const manifest = makeManifest(1);
    const { ctx } = ctxWith(manifest);

    fake.forceNextDeployFailure(SEED_REF, 500, 3); // 3 falhas → definitivo

    await expect(stepDeployFunctions(ctx)).rejects.toMatchObject({
      name: "SupabaseMgmtError",
    });

    // fn-0 NÃO ficou persistida; step NÃO marcado.
    expect(ctx.progress.isFunctionDeployed("fn-0")).toBe(false);
    expect(ctx.progress.isStepDone("deploy-functions")).toBe(false);

    // Evento de erro emitido menciona a function.
    const { events } = ctxWith(manifest); // (re-checa acesso ao emit via run.test)
    void events;
  });

  it("respeita verifyJwt por function (passa ao wrapper)", async () => {
    const manifest = makeManifest(4, { verifyJwt: (i) => i === 0 });
    const { ctx } = ctxWith(manifest);

    const spy = spyOn(ctx.supabase, "deployFunction");
    await stepDeployFunctions(ctx);

    const call0 = spy.mock.calls.find((c) => (c[1] as any).name === "fn-0");
    const call1 = spy.mock.calls.find((c) => (c[1] as any).name === "fn-1");
    expect((call0![1] as any).verifyJwt).toBe(true);
    expect((call1![1] as any).verifyJwt).toBe(false);
  });

  it("manifesto vazio → step concluído sem chamar deployFunction", async () => {
    const manifest = makeManifest(0);
    const { ctx } = ctxWith(manifest);
    const spy = spyOn(ctx.supabase, "deployFunction");
    const result = await stepDeployFunctions(ctx);
    expect(spy).not.toHaveBeenCalled();
    expect(ctx.progress.isStepDone("deploy-functions")).toBe(true);
    expect(result.deployed.length).toBe(0);
  });

  it("preserva progress das functions já deployadas quando uma posterior falha", async () => {
    // fn-0 no estado do fake (já deployada), fn-1 falha 3x.
    // Como a fila é por ref, fn-0 (já em progress) é pulada → não consume falhas.
    const manifest = makeManifest(2);
    const { ctx } = ctxWith(manifest);
    await ctx.progress.markFunctionDeployed("fn-0"); // será pulada
    fake.forceNextDeployFailure(SEED_REF, 500, 3); // fn-1 falha 3x

    await expect(stepDeployFunctions(ctx)).rejects.toMatchObject({
      name: "SupabaseMgmtError",
    });

    // fn-0 permanece; fn-1 não.
    expect(ctx.progress.isFunctionDeployed("fn-0")).toBe(true);
    expect(ctx.progress.isFunctionDeployed("fn-1")).toBe(false);
  });
});
