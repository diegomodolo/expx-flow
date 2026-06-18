/**
 * Wrapper da Supabase Management API para o auto-instalador `/onboarding`.
 *
 * Token é **efêmero**: vive apenas em memória da request. Nunca é logado,
 * persistido em `install_progress` ou retornado em respostas HTTP.
 *
 * Retry exponencial (default 3 tentativas: 1 + 2 retries) **apenas** em 429/5xx
 * e erros de rede. Erros 4xx (ex.: 401) falham imediatamente.
 *
 * `baseUrl` é overrideável — default `https://api.supabase.com`, ou
 * `process.env.SUPABASE_MGMT_BASE_URL` se definido (uso em testes/fakes).
 *
 * Decisão `executeSql`: usa o endpoint REST de query da Management API
 * (`POST /v1/projects/:ref/database/query`) em vez de conexão PG direta —
 * assim não precisamos da senha do DB nem de deps de PG no runtime serverless.
 */

export const SUPABASE_MGMT_DEFAULT_BASE_URL = "https://api.supabase.com";

export class SupabaseMgmtError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SupabaseMgmtError";
  }
}

export interface SupabaseOrg {
  id: string;
  name: string;
}

export interface SupabaseProjectCredentials {
  ref: string;
  id: string;
  name: string;
  status: string;
  region: string;
  plan: string;
  dbHost: string;
  dbPort: number;
  dbPassword: string;
  connectionString: string;
  anonKey: string;
  serviceRoleKey: string;
}

export interface CreateProjectInput {
  orgId: string;
  name: string;
  dbPassword: string;
  region?: string;
  plan?: string;
}

export interface SupabaseDeployedFunction {
  id: string;
  name: string;
  slug: string;
  verifyJwt: boolean;
}

export interface DeployFunctionInput {
  name: string;
  files: Array<{ name: string; content: string }>;
  verifyJwt?: boolean;
}

export interface SupabaseMgmtClientOptions {
  token: string;
  baseUrl?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface WaitForHealthyOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

interface RequestOptions {
  method: string;
  body?: unknown;
  query?: Record<string, string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCode(body: any, status: number): string {
  const c =
    body?.error?.code ??
    body?.code ??
    (typeof body?.error === "string" ? body.error : null);
  return String(c ?? `http_${status}`);
}

function extractMessage(body: any, status: number, prefix: string): string {
  const m =
    body?.message ??
    body?.error?.message ??
    (typeof body?.error === "string" ? body.error : null);
  return String(m ?? `${prefix} API retornou ${status}`);
}

async function safeJson(resp: Response): Promise<any> {
  try {
    return await resp.json();
  } catch {
    return {};
  }
}

export function createSupabaseMgmtClient(opts: SupabaseMgmtClientOptions) {
  const baseUrl = (
    opts.baseUrl ??
    process.env.SUPABASE_MGMT_BASE_URL ??
    SUPABASE_MGMT_DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const token = opts.token;
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 200;

  function authHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async function request<T = any>(
    path: string,
    init: RequestOptions,
  ): Promise<T> {
    const url = new URL(baseUrl + path);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query))
        url.searchParams.set(k, v);
    }
    const fetchOpts: RequestInit = {
      method: init.method,
      headers: authHeaders(),
    };
    if (init.body !== undefined) fetchOpts.body = JSON.stringify(init.body);

    const totalAttempts = maxRetries + 1;
    for (let attempt = 0; attempt < totalAttempts; attempt++) {
      const isLast = attempt === totalAttempts - 1;
      let resp: Response;
      try {
        resp = await fetch(url.toString(), fetchOpts);
      } catch (err) {
        if (!isLast) {
          await sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        throw new SupabaseMgmtError(0, "network_error", String(err));
      }

      if (resp.status === 429 || resp.status >= 500) {
        const errBody = await safeJson(resp);
        const err = new SupabaseMgmtError(
          resp.status,
          extractCode(errBody, resp.status),
          extractMessage(errBody, resp.status, "Supabase"),
        );
        if (!isLast) {
          await sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        throw err;
      }

      if (!resp.ok) {
        const errBody = await safeJson(resp);
        throw new SupabaseMgmtError(
          resp.status,
          extractCode(errBody, resp.status),
          extractMessage(errBody, resp.status, "Supabase"),
        );
      }

      if (resp.status === 204) return null as T;
      const text = await resp.text();
      if (!text) return null as T;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text as unknown as T;
      }
    }
    throw new SupabaseMgmtError(0, "unknown", "erro desconhecido");
  }

  async function listOrgs(): Promise<SupabaseOrg[]> {
    const data = await request<any[]>("/v1/organizations", { method: "GET" });
    return (Array.isArray(data) ? data : []).map((o) => ({
      id: o.id,
      name: o.name,
    }));
  }

  async function getApiKeys(
    ref: string,
  ): Promise<{ anonKey: string; serviceRoleKey: string }> {
    const keys = await request<any[]>(`/v1/projects/${ref}/api-keys`, {
      method: "GET",
    });
    const arr = Array.isArray(keys) ? keys : [];
    const anonKey = arr.find((k) => k.name === "anon")?.api_key ?? "";
    const serviceRoleKey =
      arr.find((k) => k.name === "service_role")?.api_key ??
      arr.find((k) => k.name === "service")?.api_key ??
      "";
    return { anonKey, serviceRoleKey };
  }

  async function createProject(
    input: CreateProjectInput,
  ): Promise<SupabaseProjectCredentials> {
    const created = await request<any>("/v1/projects", {
      method: "POST",
      body: {
        organization_id: input.orgId,
        name: input.name,
        db_password: input.dbPassword,
        region: input.region ?? "sa-east-1",
        plan: input.plan ?? "free",
      },
    });
    const ref = created.ref;
    const { anonKey, serviceRoleKey } = await getApiKeys(ref);
    return {
      ref,
      id: created.id,
      name: created.name,
      status: created.status,
      region: created.region,
      plan: created.plan,
      dbHost: `db.${ref}.supabase.co`,
      dbPort: 5432,
      dbPassword: input.dbPassword,
      connectionString: created.connection_string,
      anonKey,
      serviceRoleKey,
    };
  }

  async function getProjectStatus(ref: string): Promise<{ status: string }> {
    const data = await request<any>(`/v1/projects/${ref}`, { method: "GET" });
    return { status: data.status };
  }

  async function waitForHealthy(
    ref: string,
    waitOpts?: WaitForHealthyOptions,
  ): Promise<void> {
    const timeoutMs = waitOpts?.timeoutMs ?? 300_000;
    const intervalMs = waitOpts?.intervalMs ?? 5_000;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const { status } = await getProjectStatus(ref);
      if (status === "ACTIVE_HEALTHY") return;
      if (
        status === "GOING_DOWN" ||
        status === "PAUSED" ||
        status === "ACTIVE_UNHEALTHY"
      ) {
        // Estados terminais não-saudáveis: ainda assim continuamos tentando
        // até o timeout, mas se o projeto pause/destroy transita para isso
        // não há valor em ficar preso — deixamos o timeout agir.
      }
      if (Date.now() >= deadline) {
        throw new SupabaseMgmtError(
          408,
          "timeout",
          `Timeout aguardando projeto ficar ACTIVE_HEALTHY (estado atual: ${status})`,
        );
      }
      await sleep(intervalMs);
    }
  }

  async function deployFunction(
    ref: string,
    input: DeployFunctionInput,
  ): Promise<SupabaseDeployedFunction> {
    const data = await request<any>(`/v1/projects/${ref}/functions/deploy`, {
      method: "POST",
      query: { slug: input.name },
      body: {
        name: input.name,
        slug: input.name,
        verify_jwt: input.verifyJwt ?? true,
        files: input.files,
      },
    });
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      verifyJwt: data.verify_jwt ?? input.verifyJwt ?? true,
    };
  }

  async function setSecret(
    ref: string,
    name: string,
    value: string,
  ): Promise<void> {
    await request(`/v1/projects/${ref}/secrets`, {
      method: "POST",
      body: { name, value },
    });
  }

  async function executeSql(
    ref: string,
    sql: string,
  ): Promise<{ rows: unknown[] }> {
    const data = await request<any>(`/v1/projects/${ref}/database/query`, {
      method: "POST",
      body: { query: sql },
    });
    return { rows: Array.isArray(data?.rows) ? data.rows : [] };
  }

  return {
    listOrgs,
    createProject,
    getProjectStatus,
    waitForHealthy,
    deployFunction,
    setSecret,
    executeSql,
    getApiKeys,
  };
}

export type SupabaseMgmtClient = ReturnType<typeof createSupabaseMgmtClient>;
