import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  computeInstallationStatus,
  type StatusEnv,
  type StatusSupabase,
} from "./status";

const ENV_OK: StatusEnv = {
  VITE_SUPABASE_URL: "https://exemplo.supabase.co",
  VITE_SUPABASE_ANON_KEY: "anon-key",
};

function makeFakeSupabase(opts: {
  flagValue?: boolean | null;
  flagError?: unknown;
  adminCount?: number;
  adminError?: unknown;
}): StatusSupabase {
  return {
    from: (table: string) => {
      if (table === "system_config_app") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data:
                  opts.flagValue === undefined || opts.flagValue === null
                    ? null
                    : { installation_completed: opts.flagValue },
                error: opts.flagError ?? null,
              }),
            }),
          }),
        };
      }
      const thenable = {
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        then: <T>(onFulfilled: (r: unknown) => T | PromiseLike<T>) =>
          onFulfilled({
            data: null,
            count: opts.adminCount ?? 0,
            error: opts.adminError ?? null,
          }),
      };
      return { select: () => thenable };
    },
  };
}

describe("GET /api/installer/status — computeInstallationStatus", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sem VITE_SUPABASE_URL retorna configured=false com reason 'no-env'", async () => {
    const status = await computeInstallationStatus({}, null);
    expect(status).toEqual({ configured: false, reason: "no-env" });
  });

  it("com env ok mas flag installation_completed=false retorna reason 'not-installed'", async () => {
    const supabase = makeFakeSupabase({ flagValue: false, adminCount: 0 });
    const status = await computeInstallationStatus(ENV_OK, supabase);
    expect(status).toEqual({ configured: false, reason: "not-installed" });
  });

  it("com flag ok mas sem admin retorna reason 'no-admin'", async () => {
    const supabase = makeFakeSupabase({ flagValue: true, adminCount: 0 });
    const status = await computeInstallationStatus(ENV_OK, supabase);
    expect(status).toEqual({ configured: false, reason: "no-admin" });
  });

  it("com flag ok e admin presente retorna configured=true", async () => {
    const supabase = makeFakeSupabase({ flagValue: true, adminCount: 1 });
    const status = await computeInstallationStatus(ENV_OK, supabase);
    expect(status).toEqual({ configured: true });
  });

  it("trata flag ausente (null) como 'not-installed'", async () => {
    const supabase = makeFakeSupabase({ flagValue: null, adminCount: 5 });
    const status = await computeInstallationStatus(ENV_OK, supabase);
    expect(status).toEqual({ configured: false, reason: "not-installed" });
  });

  it("trata erro de leitura da flag como 'not-installed'", async () => {
    const supabase = makeFakeSupabase({
      flagValue: true,
      flagError: new Error("rls bloqueou"),
      adminCount: 5,
    });
    const status = await computeInstallationStatus(ENV_OK, supabase);
    expect(status).toEqual({ configured: false, reason: "not-installed" });
  });

  it("trata erro de contagem de admins como 'no-admin'", async () => {
    const supabase = makeFakeSupabase({
      flagValue: true,
      adminCount: 3,
      adminError: new Error("rls bloqueou"),
    });
    const status = await computeInstallationStatus(ENV_OK, supabase);
    expect(status).toEqual({ configured: false, reason: "no-admin" });
  });
});

describe("GET /api/installer/status — handler HTTP", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("nunca retorna 500 por env ausente: responde 200 com reason 'no-env'", async () => {
    const previousEnv = { ...process.env };
    for (const key of [
      "VITE_SUPABASE_URL",
      "SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "SUPABASE_ANON_KEY",
    ]) {
      delete process.env[key];
    }

    const handler = (await import("./status")).default;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      end: vi.fn(),
    };

    await handler({ method: "GET" }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      configured: false,
      reason: "no-env",
    });

    process.env = previousEnv;
  });

  it("responde OPTIONS com 204 (preflight)", async () => {
    const handler = (await import("./status")).default;
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn(),
      end: vi.fn(),
    };

    await handler({ method: "OPTIONS" }, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });
});
