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
  SupabaseMgmtError,
  type SupabaseMgmtClient,
} from "../supabase-mgmt";

const VALID_TOKEN = "sbp_fake_valid_token_123";
const ORG_ID = "org_default";
const SEED_REF = "projseedref";

describe("wrapper Supabase Management API", () => {
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

  function client(
    overrides: Partial<Parameters<typeof createSupabaseMgmtClient>[0]> = {},
  ): SupabaseMgmtClient {
    return createSupabaseMgmtClient({
      token: VALID_TOKEN,
      baseUrl: fake.url,
      maxRetries: 2,
      baseDelayMs: 5,
      ...overrides,
    });
  }

  describe("listOrgs", () => {
    it("token válido lista organizações", async () => {
      const orgs = await client().listOrgs();
      expect(orgs.find((o) => o.id === ORG_ID)).toBeTruthy();
      expect(orgs[0].name).toBeTruthy();
    });

    it("token inválido lança SupabaseMgmtError 401", async () => {
      await expect(
        client({ token: "errado" }).listOrgs(),
      ).rejects.toMatchObject({ name: "SupabaseMgmtError", status: 401 });
    });
  });

  describe("createProject", () => {
    it("cria projeto e retorna ref + credenciais completas", async () => {
      const creds = await client().createProject({
        orgId: ORG_ID,
        name: "expx-test",
        dbPassword: "Secret123!",
      });
      expect(creds.ref).toMatch(/^projref/);
      expect(creds.id).toBeTruthy();
      expect(creds.status).toBe("PENDING");
      expect(creds.dbHost).toContain(creds.ref);
      expect(creds.dbPort).toBe(5432);
      expect(creds.dbPassword).toBe("Secret123!");
      expect(creds.connectionString).toContain(creds.ref);
      expect(creds.anonKey).toBeTruthy();
      expect(creds.serviceRoleKey).toBeTruthy();
      expect(creds.serviceRoleKey).not.toBe(creds.anonKey);
    });

    it("falha em org inexistente sem retry (4xx)", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      await expect(
        client().createProject({
          orgId: "org_inexistente",
          name: "x",
          dbPassword: "p",
        }),
      ).rejects.toMatchObject({ status: 400 });
      expect(spy.mock.calls.length).toBe(1);
    });
  });

  describe("getProjectStatus + waitForHealthy", () => {
    it("lê status PENDING logo após criar", async () => {
      const { ref } = await client().createProject({
        orgId: ORG_ID,
        name: "p",
        dbPassword: "X",
      });
      const s = await client().getProjectStatus(ref);
      expect(s.status).toBe("PENDING");
    });

    it("waitForHealthy retorna quando o projeto fica ACTIVE_HEALTHY", async () => {
      const c = client();
      const { ref } = await c.createProject({
        orgId: ORG_ID,
        name: "p",
        dbPassword: "X",
      });
      setTimeout(() => fake.advanceProjectProvisioning(ref), 5);
      await c.waitForHealthy(ref, { timeoutMs: 3000, intervalMs: 5 });
    });

    it("waitForHealthy respeita timeout se nunca fica healthy", async () => {
      const c = client();
      const { ref } = await c.createProject({
        orgId: ORG_ID,
        name: "p",
        dbPassword: "X",
      });
      await expect(
        c.waitForHealthy(ref, { timeoutMs: 20, intervalMs: 5 }),
      ).rejects.toMatchObject({ code: "timeout" });
    });
  });

  describe("deployFunction", () => {
    it("deploya uma function no projeto seed", async () => {
      const fn = await client().deployFunction(SEED_REF, {
        name: "hello",
        files: [
          { name: "index.ts", content: "Deno.serve(()=>new Response('ok'))" },
        ],
        verifyJwt: true,
      });
      expect(fn.name).toBe("hello");
      expect(fn.slug).toBe("hello");
      expect(
        fake.state.functions[SEED_REF]?.some((f) => f.name === "hello"),
      ).toBe(true);
    });

    it("5xx dispara retry e sucede na 2ª tentativa", async () => {
      const spy = vi.spyOn(globalThis, "fetch");
      fake.forceNextDeployFailure(SEED_REF, 500, 1);
      const fn = await client().deployFunction(SEED_REF, {
        name: "retry-ok",
        files: [],
        verifyJwt: false,
      });
      expect(fn).toBeTruthy();
      expect(spy.mock.calls.length).toBe(2);
    });

    it("429 também entra em retry", async () => {
      fake.forceNextDeployFailure(SEED_REF, 429, 1);
      const fn = await client().deployFunction(SEED_REF, {
        name: "rate-limited",
        files: [],
      });
      expect(fn).toBeTruthy();
    });

    it("esgota retry e lança SupabaseMgmtError", async () => {
      fake.forceNextDeployFailure(SEED_REF, 503, 3);
      await expect(
        client().deployFunction(SEED_REF, { name: "x", files: [] }),
      ).rejects.toMatchObject({ name: "SupabaseMgmtError", status: 503 });
    });
  });

  describe("setSecret", () => {
    it("define um secret no projeto", async () => {
      await client().setSecret(SEED_REF, "CHAVE", "valor");
      expect(fake.state.secrets[SEED_REF]?.CHAVE).toBe("valor");
    });
  });

  describe("executeSql", () => {
    it("executa SQL via endpoint de query da Management API", async () => {
      const res = await client().executeSql(
        SEED_REF,
        "CREATE TABLE foo (id int);",
      );
      expect(Array.isArray(res.rows)).toBe(true);
      expect(
        fake.state.sqlQueries.some(
          (q) => q.ref === SEED_REF && /CREATE TABLE foo/i.test(q.query),
        ),
      ).toBe(true);
    });
  });

  describe("baseUrl override", () => {
    it("respeita baseUrl customizado (aponta para o fake)", async () => {
      const orgs = await createSupabaseMgmtClient({
        token: VALID_TOKEN,
        baseUrl: fake.url,
        maxRetries: 0,
      }).listOrgs();
      expect(orgs.length).toBeGreaterThan(0);
    });
  });

  describe("segurança do token (efêmero, nunca exposto)", () => {
    it("SupabaseMgmtError nunca inclui o token na mensagem nem no JSON", async () => {
      const SECRET = "SBP_TOKEN_SECRETO_789";
      let err: unknown;
      try {
        await client({ token: SECRET }).listOrgs();
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(SupabaseMgmtError);
      expect(String((err as Error).message)).not.toContain(SECRET);
      expect(JSON.stringify(err)).not.toContain(SECRET);
    });

    it("não loga o token via console durante falhas", async () => {
      const SECRET = "SBP_TOKEN_LOG_012";
      const spies = [
        vi.spyOn(console, "error").mockImplementation(() => undefined),
        vi.spyOn(console, "warn").mockImplementation(() => undefined),
        vi.spyOn(console, "log").mockImplementation(() => undefined),
        vi.spyOn(console, "info").mockImplementation(() => undefined),
      ];
      try {
        await client({ token: SECRET }).listOrgs();
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
