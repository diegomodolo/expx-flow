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
import { stepTriggerRedeploy } from "../steps";
import { makeCtx, spyOn } from "./_helpers";

const VALID_TOKEN = "vrt_valid_redeploy";
const VERCEL_PROJECT_ID = "prj_test_redeploy";

function autoAdvanceDeploys(fake: {
  advanceDeployments: () => void;
  state: { deploys: Array<{ state: string }> };
}) {
  const id = setInterval(() => {
    fake.advanceDeployments();
  }, 5);
  return () => clearInterval(id);
}

describe("step trigger-redeploy", () => {
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

  function ctxReady() {
    return makeCtx({
      supabase: {} as any,
      vercel: createVercelClient({
        token: VALID_TOKEN,
        baseUrl: fake.url,
        maxRetries: 0,
        baseDelayMs: 1,
      }),
      project: {
        ref: "r",
        anonKey: "a",
        serviceRoleKey: "s",
        dbPassword: "p",
        dbHost: "h",
        dbPort: 5,
      },
      options: { deployReadyIntervalMs: 5, deployReadyTimeoutMs: 2000 },
    });
  }

  it("dispara redeploy e aguarda READY", async () => {
    const { ctx } = ctxReady();
    const stop = autoAdvanceDeploys(fake);
    try {
      await stepTriggerRedeploy(ctx);
    } finally {
      stop();
    }
    expect(ctx.progress.isStepDone("trigger-redeploy")).toBe(true);
    // Estado do fake tem um deploy que virou READY.
    const ready = (fake.state.deploys ?? []).filter((d) => d.state === "READY");
    expect(ready.length).toBeGreaterThan(0);
  });

  it("só marca concluído quando o deploy está READY", async () => {
    const { ctx } = ctxReady();
    // Não avança o deploy → timeout → erro.
    await expect(stepTriggerRedeploy(ctx)).rejects.toMatchObject({
      code: "timeout",
    });
    expect(ctx.progress.isStepDone("trigger-redeploy")).toBe(false);
  });

  it("erro ao disparar redeploy → lança e NÃO marca step", async () => {
    const { ctx } = ctxReady();
    spyOn(ctx.vercel, "triggerRedeploy").mockRejectedValueOnce(
      new Error("boom"),
    );
    await expect(stepTriggerRedeploy(ctx)).rejects.toThrow(/boom/);
    expect(ctx.progress.isStepDone("trigger-redeploy")).toBe(false);
  });

  it("idempotente: segundo run skipa (step concluído)", async () => {
    const { ctx } = ctxReady();
    const stop = autoAdvanceDeploys(fake);
    try {
      await stepTriggerRedeploy(ctx);
    } finally {
      stop();
    }
    const spy = spyOn(ctx.vercel, "triggerRedeploy");
    await stepTriggerRedeploy(ctx);
    expect(spy).not.toHaveBeenCalled();
  });
});
