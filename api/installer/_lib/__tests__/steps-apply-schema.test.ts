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
import {
  INSTALL_PROGRESS_COLUMN_SQL,
  REQUIRED_EXTENSIONS,
  stepApplySchema,
} from "../steps";
import { makeCtx, spyOn } from "./_helpers";

const VALID_TOKEN = "sbp_valid_schema";
const SEED_REF = "projseedref";

describe("step apply-schema", () => {
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

  function supabaseClient() {
    return createSupabaseMgmtClient({
      token: VALID_TOKEN,
      baseUrl: fake.url,
      maxRetries: 0,
      baseDelayMs: 1,
    });
  }

  function makeReadyCtx() {
    const supabase = supabaseClient();
    return makeCtx({
      supabase,
      vercel: {} as any,
      project: {
        ref: SEED_REF,
        anonKey: "anon-seed",
        serviceRoleKey: "sr-seed",
        dbPassword: "p",
        dbHost: "db.host",
        dbPort: 5432,
      },
    });
  }

  it("habilita extensões necessárias (pgcrypto, pg_cron, pg_net) antes do schema", async () => {
    const { ctx } = makeReadyCtx();
    const spy = spyOn(ctx.supabase, "executeSql");
    await stepApplySchema(ctx);

    // Primeira chamada deve conter CREATE EXTENSION para as 3 extensões.
    const firstCall = spy.mock.calls[0];
    expect(firstCall[0]).toBe(SEED_REF);
    const extSql = String(firstCall[1]);
    for (const ext of REQUIRED_EXTENSIONS) {
      expect(extSql).toMatch(
        new RegExp(`CREATE EXTENSION IF NOT EXISTS.*${ext}`, "i"),
      );
    }
  });

  it("garante a coluna install_progress em system_config_app (idempotente)", async () => {
    const { ctx } = makeReadyCtx();
    const spy = spyOn(ctx.supabase, "executeSql");
    await stepApplySchema(ctx);
    const calls = spy.mock.calls.map((c) => String(c[1]));
    expect(
      calls.some(
        (sql) =>
          /ALTER TABLE public\.system_config_app/i.test(sql) &&
          /ADD COLUMN IF NOT EXISTS install_progress/i.test(sql),
      ),
    ).toBe(true);
  });

  it("aplica o conteúdo do consolidated.sql lido do FS do bundle", async () => {
    const { ctx } = makeReadyCtx();
    const spy = spyOn(ctx.supabase, "executeSql");
    await stepApplySchema(ctx);
    const calls = spy.mock.calls.map((c) => String(c[1]));
    // consolidated.sql começa com o header AUTO-GERADO e contém CREATE TABLE profiles.
    expect(
      calls.some((sql) =>
        /CREATE TABLE IF NOT EXISTS public\.profiles/i.test(sql),
      ),
    ).toBe(true);
    expect(calls.some((sql) => /AUTO-GERADO/i.test(sql))).toBe(true);
  });

  it("marca o step como concluído ao aplicar com sucesso", async () => {
    const { ctx } = makeReadyCtx();
    await stepApplySchema(ctx);
    expect(ctx.progress.isStepDone("apply-schema")).toBe(true);
  });

  it("re-run NÃO falha e é idempotente (não re-aplica quando já concluído)", async () => {
    const { ctx } = makeReadyCtx();
    await stepApplySchema(ctx);
    const spy = spyOn(ctx.supabase, "executeSql");
    await stepApplySchema(ctx); // segundo run
    expect(ctx.progress.isStepDone("apply-schema")).toBe(true);
    // No resume, não chama executeSql de novo.
    expect(spy).not.toHaveBeenCalled();
  });

  it("erro de SQL → lança e NÃO marca o step como concluído", async () => {
    const { ctx } = makeReadyCtx();
    const spy = spyOn(ctx.supabase, "executeSql").mockRejectedValueOnce(
      new Error("syntax error at or near FOO"),
    );
    await expect(stepApplySchema(ctx)).rejects.toThrow(/syntax error|FOO/);
    spy.mockRestore();
    expect(ctx.progress.isStepDone("apply-schema")).toBe(false);
  });

  it("INSTALL_PROGRESS_COLUMN_SQL é idempotente (ADD COLUMN IF NOT EXISTS)", () => {
    expect(INSTALL_PROGRESS_COLUMN_SQL).toMatch(
      /ADD COLUMN IF NOT EXISTS install_progress/i,
    );
  });

  it("exige projectRef presente no contexto (erro claro caso contrário)", async () => {
    const supabase = supabaseClient();
    const { ctx } = makeCtx({ supabase, vercel: {} as any }); // sem project
    await expect(stepApplySchema(ctx)).rejects.toThrow(/projectRef|projeto/i);
  });
});
