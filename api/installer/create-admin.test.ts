import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Readable } from "node:stream";
import type { VercelRequest, VercelResponse } from "./_lib/http";
import createAdminHandler from "./create-admin";

/**
 * Task 3.2.1 — POST /api/installer/create-admin (RED).
 *
 * Contrato testado:
 *  - body { projectRef, serviceRoleKey, email, password, fullName? }
 *  - cria admin via `auth.admin.createUser` (confirmado, email_confirm:true)
 *  - cria empresa-default para o admin (vira `owner` via trigger handle_new_company)
 *  - marca `system_config_app.installation_completed=true` (só após admin)
 *  - recusa se já existe admin (count profiles ≥ 1)
 *  - email duplicado/senha fraca → erro PT-BR (status adequado, nunca 500)
 *  - tokens/keys só em memória (não logados, não persistidos)
 */

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@supabase/supabase-js";

interface MockClient {
  auth: {
    admin: {
      createUser: ReturnType<typeof vi.fn>;
    };
  };
  from: ReturnType<typeof vi.fn>;
}

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

function buildClient(
  opts: Partial<{
    createUserResult: {
      data?: { user?: { id: string } };
      error?: { message: string };
    };
    profilesCount: number;
    companyInsertError: unknown;
    flagUpdateError: unknown;
  }> = {},
): MockClient {
  const profilesCount = opts.profilesCount ?? 0;
  const companyInsertError = opts.companyInsertError;
  const flagUpdateError = opts.flagUpdateError;

  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue(
          opts.createUserResult ?? {
            data: { user: { id: "user-123" } },
            error: null,
          },
        ),
      },
    },
    from: vi.fn((table: string) => {
      // profiles count para checar se já existe admin.
      // `select("*", { count: "exact", head: true })` é terminal: retorna
      // `{ count, data: null, error }`.
      if (table === "profiles") {
        return {
          select: vi.fn().mockResolvedValue({
            count: profilesCount,
            data: null,
            error: null,
          }),
        };
      }
      // companies — cria empresa-default para o admin (vira owner via trigger).
      if (table === "companies") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi
                .fn()
                .mockResolvedValue(
                  companyInsertError
                    ? { data: null, error: companyInsertError }
                    : { data: { id: "comp-1" }, error: null },
                ),
            }),
          }),
        };
      }
      // system_config_app — flag installation_completed.
      if (table === "system_config_app") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockResolvedValue(
                flagUpdateError
                  ? { data: null, error: flagUpdateError }
                  : { data: null, error: null },
              ),
          }),
        };
      }
      return {} as never;
    }),
  };
}

describe("POST /api/installer/create-admin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it("responde OPTIONS com 204 (preflight CORS)", async () => {
    const res = mockRes();
    await createAdminHandler(mockReq("OPTIONS", undefined), res);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it("método não permitido → 405", async () => {
    const res = mockRes();
    await createAdminHandler(mockReq("GET", undefined), res);
    expect(res.statusCode).toBe(405);
  });

  it("cria admin confirmado (email_confirm:true) e define como owner", async () => {
    const client = buildClient();
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "admin@examplo.com",
        password: "SenhaForte123",
        fullName: "Admin",
      }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(client.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "admin@examplo.com",
        password: "SenhaForte123",
        email_confirm: true,
      }),
    );
    // Cria empresa-default → vira owner via trigger `handle_new_company`.
    expect(client.from).toHaveBeenCalledWith("companies");
    // Marca installation_completed.
    expect(client.from).toHaveBeenCalledWith("system_config_app");
    expect(res.body).toMatchObject({ ok: true, userId: "user-123" });
  });

  it("recusa 409 se já existe admin (profiles count ≥ 1)", async () => {
    const client = buildClient({ profilesCount: 1 });
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "second@examplo.com",
        password: "SenhaForte123",
      }),
      res,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/administrador/i),
    });
    expect(client.auth.admin.createUser).not.toHaveBeenCalled();
  });

  it("email duplicado → erro PT-BR (nunca 500)", async () => {
    const client = buildClient({
      createUserResult: {
        data: null,
        error: { message: "User already registered" },
      },
    });
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "dup@examplo.com",
        password: "SenhaForte123",
      }),
      res,
    );

    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/e-mail.*j[aá]|cadastrado/i),
    });
  });

  it("senha fraca → erro PT-BR (nunca 500)", async () => {
    const client = buildClient({
      createUserResult: {
        data: null,
        error: { message: "Password should be at least 6 characters" },
      },
    });
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "admin@examplo.com",
        password: "123",
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/senha/i),
    });
  });

  it("campos obrigatórios ausentes → 400 PT-BR", async () => {
    const client = buildClient();
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        // serviceRoleKey ausente
        email: "admin@examplo.com",
        password: "SenhaForte123",
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/obrigat/i),
    });
  });

  it("email inválido → 400 PT-BR", async () => {
    const client = buildClient();
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "nao-email",
        password: "SenhaForte123",
      }),
      res,
    );

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      error: expect.stringMatching(/e-mail.*v[aá]lido/i),
    });
  });

  it("não marca installation_completed se falhar ao criar admin", async () => {
    const client = buildClient({
      createUserResult: {
        data: null,
        error: { message: "User already registered" },
      },
    });
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "dup@examplo.com",
        password: "SenhaForte123",
      }),
      res,
    );

    // Verifica que NÃO chamou update no system_config_app.
    const systemCalls = (
      client.from as ReturnType<typeof vi.fn>
    ).mock.calls.filter((c: unknown[]) => c[0] === "system_config_app");
    expect(systemCalls.length).toBe(0);
  });

  it("headers CORS presentes", async () => {
    const client = buildClient();
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "svc-role",
        email: "admin@examplo.com",
        password: "SenhaForte123",
      }),
      res,
    );
    expect(res.headers["Access-Control-Allow-Origin"]).toBeDefined();
    expect(res.headers["Access-Control-Allow-Methods"]).toBeDefined();
  });

  it("não vaza tokens no corpo da resposta", async () => {
    const client = buildClient();
    vi.mocked(createClient).mockReturnValue(client as unknown as never);

    const res = mockRes();
    await createAdminHandler(
      mockReq("POST", {
        projectRef: "ref-123",
        serviceRoleKey: "SECRET_SERVICE_ROLE_KEY",
        email: "admin@examplo.com",
        password: "SecretPassword123",
      }),
      res,
    );

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain("SECRET_SERVICE_ROLE_KEY");
    expect(serialized).not.toContain("SecretPassword123");
  });
});
