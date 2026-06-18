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
import { stepCreateProject } from "../steps";
import { makeCtx, spyOn, autoAdvancePendingProjects } from "./_helpers";

const VALID_TOKEN = "sbp_valid_create";

describe("step create-project", () => {
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

  it("cria projeto na org e aguarda ACTIVE_HEALTHY", async () => {
    const supabase = supabaseClient();
    const { ctx } = makeCtx({
      supabase,
      vercel: {} as any,
      options: {
        orgId: "org_default",
        projectName: "expx-inst",
        dbPassword: "S3cret!",
        projectHealthyIntervalMs: 5,
        projectHealthyTimeoutMs: 2000,
      },
    });

    // Auto-avança o projeto recém-criado para ACTIVE_HEALTHY assim que existir.
    autoAdvancePendingProjects(fake);

    await stepCreateProject(ctx);

    const snap = ctx.progress.snapshot();
    expect(snap.completedSteps).toContain("create-project");
    expect(snap.projectRef).toMatch(/^projref/);
    expect(ctx.project?.ref).toBe(snap.projectRef);
    expect(ctx.project?.anonKey).toBeTruthy();
    expect(ctx.project?.serviceRoleKey).toBeTruthy();
    expect(ctx.project?.dbPassword).toBe("S3cret!");
  });

  it("é idempotente: se projectRef já no progress, NÃO chama createProject de novo", async () => {
    const supabase = supabaseClient();
    const { ctx } = makeCtx({
      supabase,
      vercel: {} as any,
    });
    // Pré-marca como concluído com ref (simula resume)
    await ctx.progress.markStep("create-project", {
      projectRef: "projref-ja-existe",
    });
    ctx.project = {
      ref: "projref-ja-existe",
      anonKey: "anon-x",
      serviceRoleKey: "sr-x",
      dbPassword: "p",
      dbHost: "db.host",
    };

    const spy = spyOn(supabase, "createProject");

    await stepCreateProject(ctx);

    expect(spy).not.toHaveBeenCalled();
    expect(ctx.progress.isStepDone("create-project")).toBe(true);
  });

  it("falha de criação → lança erro tipado e NÃO marca step como concluído", async () => {
    const supabase = supabaseClient();
    const { ctx } = makeCtx({
      supabase,
      vercel: {} as any,
      options: { orgId: "org_inexistente", projectName: "x", dbPassword: "p" },
    });

    await expect(stepCreateProject(ctx)).rejects.toMatchObject({
      name: "SupabaseMgmtError",
    });

    expect(ctx.progress.isStepDone("create-project")).toBe(false);
    expect(ctx.project).toBeUndefined();
  });

  it("emite eventos SSE started e completed", async () => {
    const supabase = supabaseClient();
    const { ctx, events } = makeCtx({
      supabase,
      vercel: {} as any,
      options: {
        projectHealthyIntervalMs: 5,
        projectHealthyTimeoutMs: 2000,
      },
    });
    autoAdvancePendingProjects(fake);
    await stepCreateProject(ctx);
    const statuses = events.map((e) => e.status);
    expect(statuses).toContain("started");
    expect(statuses).toContain("completed");
  });
});
