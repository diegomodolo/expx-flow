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
import { createSupabaseMgmtClient } from "../supabase-mgmt";
import { stepSetSecrets } from "../steps";
import { makeCtx, spyOn } from "./_helpers";

const VALID_TOKEN = "sbp_valid_secrets";
const SEED_REF = "projseedref";

describe("step set-secrets", () => {
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

  function ctxReady() {
    return makeCtx({
      supabase: createSupabaseMgmtClient({
        token: VALID_TOKEN,
        baseUrl: fake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      vercel: {} as any,
      project: {
        ref: SEED_REF,
        anonKey: "anon",
        serviceRoleKey: "sr",
        dbPassword: "p",
        dbHost: "h",
        dbPort: 5,
      },
    });
  }

  it("define secrets padrão via Management API", async () => {
    const { ctx } = ctxReady();
    const spy = spyOn(ctx.supabase, "setSecret");
    await stepSetSecrets(ctx);

    expect(spy.mock.calls.length).toBeGreaterThan(0);
    // JWT_SECRET gerado aleatoriamente (não vazio).
    const jwtCall = spy.mock.calls.find((c) => c[1] === "JWT_SECRET");
    expect(jwtCall).toBeTruthy();
    expect(String(jwtCall![2]).length).toBeGreaterThan(20);
    // Estado do fake registrou os secrets.
    expect(
      Object.keys(fake.state.secrets[SEED_REF] ?? {}).length,
    ).toBeGreaterThan(0);
  });

  it("placeholders vazios para integrações configuradas depois (self-hosting env>banco)", async () => {
    const { ctx } = ctxReady();
    const spy = spyOn(ctx.supabase, "setSecret");
    await stepSetSecrets(ctx);

    const names = spy.mock.calls.map((c) => c[1]);
    for (const placeholder of [
      "OPENROUTER_API_KEY",
      "OPENAI_API_KEY",
      "RESEND_API_KEY",
      "META_APP_ID",
      "META_APP_SECRET",
    ]) {
      expect(names).toContain(placeholder);
      const value = spy.mock.calls.find((c) => c[1] === placeholder)![2];
      expect(String(value)).toBe("");
    }
  });

  it("upsert idempotente — rodar 2x não falha nem duplica step", async () => {
    const { ctx } = ctxReady();
    await stepSetSecrets(ctx);
    // Segunda execução deve ser idempotente (step já concluído → skip).
    const spy = spyOn(ctx.supabase, "setSecret");
    await stepSetSecrets(ctx);
    expect(spy).not.toHaveBeenCalled();
    expect(ctx.progress.isStepDone("set-secrets")).toBe(true);
  });

  it("NÃO embute credenciais reais do dev (guard self-hosting)", async () => {
    const { ctx } = ctxReady();
    const spy = spyOn(ctx.supabase, "setSecret");
    await stepSetSecrets(ctx);
    const all = spy.mock.calls.map((c) => String(c[2])).join(" ");
    // Proíbe strings reais do dev (project ID, domínios, App IDs Facebook).
    expect(all).not.toMatch(/ejwpfztkspbvmuwwiwmk/i);
    expect(all).not.toMatch(/controledetrafego|expxflow\.com\.br/i);
    expect(all).not.toMatch(/^\d{10,}$/); // App IDs numéricos do Facebook
  });

  it("marca o step como concluído ao final", async () => {
    const { ctx } = ctxReady();
    await stepSetSecrets(ctx);
    expect(ctx.progress.isStepDone("set-secrets")).toBe(true);
  });

  it("erro ao setar secret → lança e NÃO marca step", async () => {
    const { ctx } = ctxReady();
    spyOn(ctx.supabase, "setSecret").mockRejectedValueOnce(new Error("boom"));
    await expect(stepSetSecrets(ctx)).rejects.toThrow(/boom/);
    expect(ctx.progress.isStepDone("set-secrets")).toBe(false);
  });
});
