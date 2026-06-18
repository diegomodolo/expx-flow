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
import { createVercelFake } from "../../../../tests/e2e/fakes/vercel";
import { createVercelClient } from "../vercel-api";
import { stepWriteVercelEnv } from "../steps";
import { makeCtx, spyOn } from "./_helpers";

const VALID_TOKEN = "vrt_valid_env";
const VERCEL_PROJECT_ID = "prj_test_env";

describe("step write-vercel-env", () => {
  let fake: Awaited<ReturnType<typeof createVercelFake>>;
  let close: () => Promise<void>;
  const prevProjectId = process.env.VERCEL_PROJECT_ID;

  beforeAll(async () => {
    fake = await createVercelFake({
      validToken: VALID_TOKEN,
      projects: [{ id: VERCEL_PROJECT_ID, name: "expx" }],
    });
    close = fake.close;
    process.env.VERCEL_PROJECT_ID = VERCEL_PROJECT_ID;
  });
  afterAll(async () => {
    await close();
    if (prevProjectId === undefined) delete process.env.VERCEL_PROJECT_ID;
    else process.env.VERCEL_PROJECT_ID = prevProjectId;
  });
  beforeEach(() => fake.reset());
  afterEach(() => vi.restoreAllMocks());

  function ctxReady(vercelProjectId?: string) {
    return makeCtx({
      supabase: {} as any,
      vercel: createVercelClient({
        token: VALID_TOKEN,
        baseUrl: fake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      project: {
        ref: "novoref",
        anonKey: "anon-key-novoref",
        serviceRoleKey: "sr",
        dbPassword: "p",
        dbHost: "h",
        dbPort: 5,
      },
      options: vercelProjectId ? { vercelProjectId } : {},
    });
  }

  it("grava VITE_SUPABASE_URL com a URL do projeto novo", async () => {
    const { ctx } = ctxReady();
    const spy = spyOn(ctx.vercel, "upsertEnvVar");
    await stepWriteVercelEnv(ctx);

    const urlCall = spy.mock.calls.find((c) => c[1] === "VITE_SUPABASE_URL");
    expect(urlCall).toBeTruthy();
    expect(urlCall![2]).toBe("https://novoref.supabase.co");
    // Estado do fake confirma.
    expect(fake.state.envVars[VERCEL_PROJECT_ID]?.VITE_SUPABASE_URL).toBe(
      "https://novoref.supabase.co",
    );
  });

  it("grava VITE_SUPABASE_ANON_KEY com a anon key do projeto novo", async () => {
    const { ctx } = ctxReady();
    await stepWriteVercelEnv(ctx);
    expect(fake.state.envVars[VERCEL_PROJECT_ID]?.VITE_SUPABASE_ANON_KEY).toBe(
      "anon-key-novoref",
    );
  });

  it("upsert por chave — rodar 2x NÃO duplica (1 env var por chave)", async () => {
    const { ctx } = ctxReady();
    await stepWriteVercelEnv(ctx);
    // Segunda execução é skip (step concluído).
    const spy = spyOn(ctx.vercel, "upsertEnvVar");
    await stepWriteVercelEnv(ctx);
    expect(spy).not.toHaveBeenCalled();
    // Estado final tem 2 env vars (uma por chave).
    const keys = Object.keys(fake.state.envVars[VERCEL_PROJECT_ID] ?? {});
    expect(keys.filter((k) => k === "VITE_SUPABASE_URL").length).toBe(1);
    expect(keys.filter((k) => k === "VITE_SUPABASE_ANON_KEY").length).toBe(1);
  });

  it("usa vercelProjectId do options quando VERCEL_PROJECT_ID ausente", async () => {
    const prev = process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_PROJECT_ID;
    try {
      const { ctx } = ctxReady(VERCEL_PROJECT_ID);
      await stepWriteVercelEnv(ctx);
      expect(
        fake.state.envVars[VERCEL_PROJECT_ID]?.VITE_SUPABASE_URL,
      ).toBeTruthy();
    } finally {
      process.env.VERCEL_PROJECT_ID = prev;
    }
  });

  it("sem VERCEL_PROJECT_ID → erro claro e step NÃO marcado", async () => {
    const prev = process.env.VERCEL_PROJECT_ID;
    delete process.env.VERCEL_PROJECT_ID;
    try {
      const { ctx } = ctxReady();
      await expect(stepWriteVercelEnv(ctx)).rejects.toThrow(
        /VERCEL_PROJECT_ID/i,
      );
      expect(ctx.progress.isStepDone("write-vercel-env")).toBe(false);
    } finally {
      process.env.VERCEL_PROJECT_ID = prev;
    }
  });

  it("erro da API Vercel → lança e NÃO marca step", async () => {
    const { ctx } = ctxReady();
    spyOn(ctx.vercel, "upsertEnvVar").mockRejectedValueOnce(
      new Error("api down"),
    );
    await expect(stepWriteVercelEnv(ctx)).rejects.toThrow(/api down/);
    expect(ctx.progress.isStepDone("write-vercel-env")).toBe(false);
  });
});
