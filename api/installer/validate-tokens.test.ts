import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Readable } from "node:stream";
import { createVercelFake } from "../../tests/e2e/fakes/vercel";
import { createSupabaseMgmtFake } from "../../tests/e2e/fakes/supabase-mgmt";
import type { VercelRequest, VercelResponse } from "./_lib/http";
import validateTokensHandler from "./validate-tokens";

const V_TOKEN = "V_TOKEN_VALIDO";
const S_TOKEN = "S_TOKEN_VALIDO";

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

describe("POST /api/installer/validate-tokens", () => {
  let vFake: Awaited<ReturnType<typeof createVercelFake>>;
  let sFake: Awaited<ReturnType<typeof createSupabaseMgmtFake>>;
  let prevVercelEnv: string | undefined;
  let prevSupabaseEnv: string | undefined;

  beforeAll(async () => {
    vFake = await createVercelFake({ validToken: V_TOKEN });
    sFake = await createSupabaseMgmtFake({ validToken: S_TOKEN });
    prevVercelEnv = process.env.VERCEL_API_BASE_URL;
    prevSupabaseEnv = process.env.SUPABASE_MGMT_BASE_URL;
    process.env.VERCEL_API_BASE_URL = vFake.url;
    process.env.SUPABASE_MGMT_BASE_URL = sFake.url;
  });

  afterAll(async () => {
    if (prevVercelEnv === undefined) delete process.env.VERCEL_API_BASE_URL;
    else process.env.VERCEL_API_BASE_URL = prevVercelEnv;
    if (prevSupabaseEnv === undefined)
      delete process.env.SUPABASE_MGMT_BASE_URL;
    else process.env.SUPABASE_MGMT_BASE_URL = prevSupabaseEnv;
    await Promise.all([vFake.close(), sFake.close()]);
  });

  it("ambos válidos → { vercel: true, supabase: true } sem erro", async () => {
    const res = mockRes();
    await validateTokensHandler(
      mockReq("POST", { vercelToken: V_TOKEN, supabaseToken: S_TOKEN }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ vercel: true, supabase: true });
  });

  it("Vercel inválido → vercel:false, supabase:true e mensagem PT-BR", async () => {
    const res = mockRes();
    await validateTokensHandler(
      mockReq("POST", { vercelToken: "errado", supabaseToken: S_TOKEN }),
      res,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ vercel: false, supabase: true });
    expect(res.body.error).toMatch(/Vercel/i);
  });

  it("Supabase inválido → supabase:false, vercel:true e mensagem PT-BR", async () => {
    const res = mockRes();
    await validateTokensHandler(
      mockReq("POST", { vercelToken: V_TOKEN, supabaseToken: "errado" }),
      res,
    );
    expect(res.body).toMatchObject({ vercel: true, supabase: false });
    expect(res.body.error).toMatch(/Supabase/i);
  });

  it("ambos inválidos → mensagem combinada PT-BR", async () => {
    const res = mockRes();
    await validateTokensHandler(
      mockReq("POST", { vercelToken: "x", supabaseToken: "y" }),
      res,
    );
    expect(res.body).toMatchObject({ vercel: false, supabase: false });
    expect(res.body.error).toMatch(/Vercel/);
    expect(res.body.error).toMatch(/Supabase/);
  });

  it("tokens ausentes → 400 com mensagem PT-BR (nunca 500)", async () => {
    const res = mockRes();
    await validateTokensHandler(mockReq("POST", {}), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/obrigat/i);
  });

  it("responde OPTIONS com 204 (preflight CORS)", async () => {
    const res = mockRes();
    await validateTokensHandler(mockReq("OPTIONS", undefined), res);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it("método não permitido → 405", async () => {
    const res = mockRes();
    await validateTokensHandler(mockReq("GET", undefined), res);
    expect(res.statusCode).toBe(405);
  });

  it("headers CORS presentes na resposta", async () => {
    const res = mockRes();
    await validateTokensHandler(
      mockReq("POST", { vercelToken: V_TOKEN, supabaseToken: S_TOKEN }),
      res,
    );
    expect(res.headers["Access-Control-Allow-Origin"]).toBeDefined();
    expect(res.headers["Access-Control-Allow-Methods"]).toBeDefined();
  });

  it("nunca retorna 500 nem vaza tokens no corpo da resposta", async () => {
    const res = mockRes();
    await validateTokensHandler(
      mockReq("POST", { vercelToken: V_TOKEN, supabaseToken: S_TOKEN }),
      res,
    );
    expect(res.statusCode).toBeLessThan(500);
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(V_TOKEN);
    expect(serialized).not.toContain(S_TOKEN);
  });
});
