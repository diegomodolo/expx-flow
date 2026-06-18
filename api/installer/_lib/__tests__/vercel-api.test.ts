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
import {
  createVercelClient,
  VercelApiError,
  type VercelClient,
} from "../vercel-api";

const VALID_TOKEN = "vrt_fake_valid_token_123";
const PROJECT_ID = "prj_test";

describe("wrapper Vercel API", () => {
  let fake: Awaited<ReturnType<typeof createVercelFake>>;
  let close: () => Promise<void>;

  beforeAll(async () => {
    fake = await createVercelFake({
      validToken: VALID_TOKEN,
      projects: [{ id: PROJECT_ID, name: "expx" }],
    });
    close = fake.close;
  });
  afterAll(async () => {
    await close();
  });
  beforeEach(() => fake.reset());
  afterEach(() => vi.restoreAllMocks());

  function client(
    overrides: Partial<Parameters<typeof createVercelClient>[0]> = {},
  ): VercelClient {
    return createVercelClient({
      token: VALID_TOKEN,
      baseUrl: fake.url,
      maxRetries: 2,
      baseDelayMs: 5,
      ...overrides,
    });
  }

  describe("validateToken", () => {
    it("token válido retorna usuário (200 OK)", async () => {
      const u = await client().validateToken();
      expect(u.uid).toBe("user_fake_1");
      expect(u.email).toBe("owner@expxflow.com");
      expect(u.name).toBeTruthy();
    });

    it("token inválido lança VercelApiError com status 401", async () => {
      await expect(
        client({ token: "errado" }).validateToken(),
      ).rejects.toMatchObject({ name: "VercelApiError", status: 401 });
    });

    it("401 não faz retry — exatamente 1 chamada HTTP", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      await expect(
        client({ token: "errado" }).validateToken(),
      ).rejects.toBeInstanceOf(VercelApiError);
      expect(spy.mock.calls.length).toBe(1);
    });
  });

  describe("upsertEnvVar", () => {
    it("cria variável de ambiente no projeto", async () => {
      await client().upsertEnvVar(PROJECT_ID, "FOO", "bar");
      expect(fake.state.envVars[PROJECT_ID]?.FOO).toBe("bar");
    });

    it("segunda chamada sobrescreve o valor (upsert por chave)", async () => {
      await client().upsertEnvVar(PROJECT_ID, "K", "v1");
      await client().upsertEnvVar(PROJECT_ID, "K", "v2");
      expect(fake.state.envVars[PROJECT_ID]?.K).toBe("v2");
    });
  });

  describe("triggerRedeploy + getDeploymentStatus", () => {
    it("dispara redeploy e retorna deploy em estado QUEUED", async () => {
      const d = await client().triggerRedeploy(PROJECT_ID);
      expect(d.state).toBe("QUEUED");
      expect(d.id).toMatch(/^dpl_/);
    });

    it("lê status do deploy pelo id (após advance → READY)", async () => {
      const created = await client().triggerRedeploy(PROJECT_ID);
      fake.advanceDeployments();
      const status = await client().getDeploymentStatus(created.id);
      expect(status.state).toBe("READY");
    });
  });

  describe("waitForDeploymentReady (poll)", () => {
    it("retorna quando o deploy fica READY", async () => {
      const c = client();
      const d = await c.triggerRedeploy(PROJECT_ID);
      setTimeout(() => fake.advanceDeployments(), 5);
      const ready = await c.waitForDeploymentReady(d.id, {
        timeoutMs: 2000,
        intervalMs: 5,
      });
      expect(ready.state).toBe("READY");
    });

    it("lança erro de timeout se o deploy nunca fica READY", async () => {
      const c = client();
      const d = await c.triggerRedeploy(PROJECT_ID);
      await expect(
        c.waitForDeploymentReady(d.id, { timeoutMs: 20, intervalMs: 5 }),
      ).rejects.toMatchObject({ code: "timeout" });
    });
  });

  describe("retry em erros transitórios (429 / 5xx)", () => {
    it("429 dispara retry e sucede na 2ª tentativa", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      fake.forceNextDeployFailure(429, 1);
      const d = await client().triggerRedeploy(PROJECT_ID);
      expect(d.state).toBe("QUEUED");
      expect(spy.mock.calls.length).toBe(2);
    });

    it("500 (5xx) dispara retry e sucede na 2ª tentativa", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      fake.forceNextDeployFailure(500, 1);
      const d = await client().triggerRedeploy(PROJECT_ID);
      expect(d.state).toBe("QUEUED");
      expect(spy.mock.calls.length).toBe(2);
    });

    it("esgota 3 tentativas e lança VercelApiError com status final", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      fake.forceNextDeployFailure(503, 3);
      await expect(client().triggerRedeploy(PROJECT_ID)).rejects.toMatchObject({
        name: "VercelApiError",
        status: 503,
      });
      expect(spy.mock.calls.length).toBe(3);
    });

    it("404 (4xx) não faz retry — falha imediata", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      await expect(
        client().triggerRedeploy("proj_inexistente"),
      ).rejects.toMatchObject({ status: 404 });
      expect(spy.mock.calls.length).toBe(1);
    });
  });

  describe("baseUrl override", () => {
    it("respeita baseUrl customizado (aponta para o fake)", async () => {
      const u = await createVercelClient({
        token: VALID_TOKEN,
        baseUrl: fake.url,
        maxRetries: 0,
      }).validateToken();
      expect(u.uid).toBeTruthy();
    });
  });

  describe("segurança do token (efêmero, nunca exposto)", () => {
    it("VercelApiError nunca inclui o token na mensagem nem no JSON", async () => {
      const SECRET = "TOKEN_SECRETO_123";
      fake.forceNextDeployFailure(500, 3);
      let err: unknown;
      try {
        await client({ token: SECRET }).triggerRedeploy(PROJECT_ID);
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(VercelApiError);
      expect(String((err as Error).message)).not.toContain(SECRET);
      expect(JSON.stringify(err)).not.toContain(SECRET);
    });

    it("não loga o token via console durante falhas", async () => {
      const SECRET = "TOKEN_SECRETO_LOG_456";
      const spies = [
        vi.spyOn(console, "error").mockImplementation(() => undefined),
        vi.spyOn(console, "warn").mockImplementation(() => undefined),
        vi.spyOn(console, "log").mockImplementation(() => undefined),
        vi.spyOn(console, "info").mockImplementation(() => undefined),
      ];
      fake.forceNextDeployFailure(500, 3);
      try {
        await client({ token: SECRET }).triggerRedeploy(PROJECT_ID);
      } catch {
        /* esperado */
      }
      for (const s of spies) {
        for (const call of s.mock.calls) {
          expect(String(call)).not.toContain(SECRET);
        }
      }
    });
  });
});
