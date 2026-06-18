import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createSupabaseMgmtFake, type SupabaseMgmtFake } from "./supabase-mgmt";

/**
 * Fakes da Supabase Management API — testes de comportamento determinístico.
 */
describe("Supabase Management fake API", () => {
  let fake: SupabaseMgmtFake;
  let baseUrl: string;
  const token = "sbp-management-token";
  const headers = () => ({
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  });

  beforeAll(async () => {
    fake = await createSupabaseMgmtFake({ validToken: token });
    baseUrl = fake.url;
  });

  afterAll(async () => {
    await fake.close();
  });

  async function api(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(baseUrl + path, {
      ...init,
      headers: { ...headers(), ...(init.headers as Record<string, string>) },
    });
  }

  describe("GET /v1/organizations", () => {
    it("retorna 200 e a lista de organizações com token válido", async () => {
      const res = await fetch(baseUrl + "/v1/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      expect(body[0].id).toBeTruthy();
    });

    it("retorna 401 com token inválido", async () => {
      const res = await fetch(baseUrl + "/v1/organizations", {
        headers: { Authorization: "Bearer errado" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("criação de projeto", () => {
    it("retorna ref + credenciais e transita PENDING → ACTIVE_HEALTHY após N polls", async () => {
      const org = fake.state.organizations[0];
      const create = await api(`/v1/projects`, {
        method: "POST",
        body: JSON.stringify({
          organization_id: org.id,
          name: "expx-flow-test",
          db_password: "SenhaForte123!",
          region: "sa-east-1",
          plan: "free",
        }),
      });
      expect(create.status).toBe(201);
      const project = await create.json();
      expect(project.id).toBeTruthy();
      expect(project.ref).toBeTruthy();
      expect(project.status).toBe("PENDING");
      expect(project.connection_string).toBeTruthy();

      // Avança o relógio do fake (simula provisionamento real do Supabase).
      await fake.advanceProjectProvisioning(project.ref, 1);
      let status = await fetch(`${baseUrl}/v1/projects/${project.ref}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect((await status.json()).status).toBe("ACTIVE_HEALTHY");
    });

    it("consulta estado por ref antes do provisionamento completo", async () => {
      const org = fake.state.organizations[0];
      const create = await api(`/v1/projects`, {
        method: "POST",
        body: JSON.stringify({
          organization_id: org.id,
          name: "expx-pending",
          db_password: "SenhaForte123!",
          region: "us-east-1",
          plan: "pro",
        }),
      });
      const project = await create.json();
      const status = await fetch(`${baseUrl}/v1/projects/${project.ref}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect((await status.json()).status).toBe("PENDING");
    });
  });

  describe("deploy de function", () => {
    it("deploya 1 function com sucesso (201)", async () => {
      const project = fake.state.projects[0];
      const res = await api(
        `/v1/projects/${project.ref}/functions/deploy?slug=minha-func`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "minha-func",
            slug: "minha-func",
            verify_jwt: true,
            body: "export default () => new Response('ok')",
          }),
        },
      );
      expect(res.status).toBe(201);
      const fn = await res.json();
      expect(fn.id).toBeTruthy();
    });

    it("retorna erro determinístico quando forçado a falhar (permite retry)", async () => {
      const project = fake.state.projects[0];
      fake.forceNextDeployFailure(project.ref);
      const res = await api(
        `/v1/projects/${project.ref}/functions/deploy?slug=func-retry`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "func-retry",
            slug: "func-retry",
            verify_jwt: false,
            body: "export default () => new Response('ok')",
          }),
        },
      );
      expect(res.status).toBe(500);

      // Na segunda tentativa (sem falha forçada) o deploy sucede.
      const retry = await api(
        `/v1/projects/${project.ref}/functions/deploy?slug=func-retry`,
        {
          method: "POST",
          body: JSON.stringify({
            name: "func-retry",
            slug: "func-retry",
            verify_jwt: false,
            body: "export default () => new Response('ok')",
          }),
        },
      );
      expect(retry.status).toBe(201);
    });
  });

  describe("set de secret", () => {
    it("cria/atualiza um secret no projeto (201)", async () => {
      const project = fake.state.projects[0];
      const res = await api(`/v1/projects/${project.ref}/secrets`, {
        method: "POST",
        body: JSON.stringify({ name: "OPENROUTER_API_KEY", value: "sk-test" }),
      });
      expect(res.status).toBe(201);
      expect(fake.state.secrets[project.ref]?.OPENROUTER_API_KEY).toBe(
        "sk-test",
      );
    });
  });

  describe("executar SQL", () => {
    it("executa SQL e retorna contagem de linhas afetadas", async () => {
      const project = fake.state.projects[0];
      const res = await api(`/v1/projects/${project.ref}/database/query`, {
        method: "POST",
        body: JSON.stringify({ query: "CREATE TABLE t (id int);" }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty("rows");
    });
  });
});
