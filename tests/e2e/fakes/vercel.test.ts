import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createVercelFake, type VercelFake } from "./vercel";

/**
 * Fakes da Vercel API — testes de comportamento determinístico.
 * O fake sobe um servidor HTTP real (node:http) que pode ser consumido por
 * fetch no Vitest (unit) ou pelo browser no Playwright (e2e).
 */
describe("Vercel fake API", () => {
  let fake: VercelFake;
  let baseUrl: string;
  const token = "vercel-token-valido";
  const headers = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    fake = await createVercelFake({ validToken: token });
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

  describe("GET /v2/user", () => {
    it("retorna 200 e o usuário quando o token é válido", async () => {
      const res = await fetch(baseUrl + "/v2/user", {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.uid).toBeTruthy();
    });

    it("retorna 401 quando o token é inválido", async () => {
      const res = await fetch(baseUrl + "/v2/user", {
        headers: { Authorization: "Bearer token-errado" },
      });
      expect(res.status).toBe(401);
    });
  });

  describe("upsert de env var", () => {
    it("cria e depois atualiza uma variável de ambiente", async () => {
      const proj = fake.state.projects[0];
      const endpoint = `/v9/projects/${proj.id}/env`;

      const create = await api(endpoint, {
        method: "POST",
        body: JSON.stringify({
          key: "SUPABASE_URL",
          value: "https://x.supabase.co",
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(create.status).toBe(200);

      const update = await api(endpoint, {
        method: "PATCH",
        body: JSON.stringify({
          key: "SUPABASE_URL",
          value: "https://y.supabase.co",
        }),
        headers: { "Content-Type": "application/json" },
      });
      expect(update.status).toBe(200);

      const env = fake.state.envVars[proj.id];
      expect(env?.SUPABASE_URL).toBe("https://y.supabase.co");
    });
  });

  describe("disparar redeploy", () => {
    it("cria um novo deploy para o projeto e retorna READY após pronto", async () => {
      const proj = fake.state.projects[0];
      const res = await api(`/v13/deployments?project=${proj.id}`, {
        method: "POST",
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.id).toBeTruthy();
      expect(body.state).toBe("QUEUED");

      // Simula o avanço do estado pelo fake (determinístico após 1 poll)
      await fake.advanceDeployments();
      const status = await fetch(`${baseUrl}/v13/deployments/${body.id}`, {
        headers: headers(),
      });
      const statusBody = await status.json();
      expect(statusBody.state).toBe("READY");
    });
  });

  describe("ler status de deploy", () => {
    it("retorna o estado mais recente do deploy do projeto", async () => {
      const proj = fake.state.projects[0];
      const res = await api(`/v6/deployments?projectId=${proj.id}&limit=1`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.deployments)).toBe(true);
      if (body.deployments.length > 0) {
        expect(["QUEUED", "BUILDING", "ERROR", "READY"]).toContain(
          body.deployments[0].state,
        );
      }
    });
  });
});
