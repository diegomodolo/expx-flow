import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import { createSupabaseMgmtFake } from "../../tests/e2e/fakes/supabase-mgmt";
import type { VercelRequest, VercelResponse } from "./_lib/http";
import listOrgsHandler from "./list-orgs";

const VALID_TOKEN = "S_TOKEN_VALIDO";

function mockReq(method: string, body: unknown): VercelRequest {
  const stream = Readable.from(
    body === undefined ? [] : [JSON.stringify(body)],
  ) as unknown as VercelRequest;
  stream.method = method;
  stream.headers = {};
  return stream;
}

function mockRes(): VercelResponse & {
  statusCode: number;
  body: unknown;
  headers: Record<string, string>;
  ended: boolean;
} {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(b: unknown) {
      this.body = b;
      return this;
    },
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    end() {
      this.ended = true;
    },
  };
  return res;
}

describe("POST /api/installer/list-orgs", () => {
  let sFake: Awaited<ReturnType<typeof createSupabaseMgmtFake>>;
  let prevEnv: string | undefined;

  beforeAll(async () => {
    sFake = await createSupabaseMgmtFake({
      validToken: VALID_TOKEN,
      organizations: [
        { id: "org_a", name: "Org Alpha" },
        { id: "org_b", name: "Org Beta" },
      ],
    });
    prevEnv = process.env.SUPABASE_MGMT_BASE_URL;
    process.env.SUPABASE_MGMT_BASE_URL = sFake.url;
  });

  afterAll(async () => {
    if (prevEnv === undefined) delete process.env.SUPABASE_MGMT_BASE_URL;
    else process.env.SUPABASE_MGMT_BASE_URL = prevEnv;
    await sFake.close();
  });

  it("token válido → { orgs: [{ id, name }] }", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("POST", { supabaseToken: VALID_TOKEN }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      orgs: [
        { id: "org_a", name: "Org Alpha" },
        { id: "org_b", name: "Org Beta" },
      ],
    });
  });

  it("token inválido → 401 com mensagem PT-BR", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("POST", { supabaseToken: "errado" }), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Supabase/i);
    expect(res.body.error).toMatch(/inválido|expirado/i);
  });

  it("token ausente → 400 com mensagem PT-BR", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("POST", {}), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/obrigat/i);
  });

  it("responde OPTIONS com 204 (preflight CORS)", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("OPTIONS", undefined), res);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it("método não permitido → 405", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("GET", undefined), res);
    expect(res.statusCode).toBe(405);
  });

  it("headers CORS presentes na resposta", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("POST", { supabaseToken: VALID_TOKEN }), res);
    expect(res.headers["Access-Control-Allow-Origin"]).toBeDefined();
  });

  it("nunca retorna 500 nem vaza o token na resposta", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("POST", { supabaseToken: VALID_TOKEN }), res);
    expect(res.statusCode).toBeLessThan(500);
    expect(JSON.stringify(res.body)).not.toContain(VALID_TOKEN);
  });

  it("mapeia para apenas { id, name } (sem campos extras)", async () => {
    const res = mockRes();
    await listOrgsHandler(mockReq("POST", { supabaseToken: VALID_TOKEN }), res);
    const orgs = (res.body as { orgs: Array<Record<string, unknown>> }).orgs;
    for (const o of orgs) {
      expect(Object.keys(o).sort()).toEqual(["id", "name"]);
    }
  });
});
