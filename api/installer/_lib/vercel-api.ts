/**
 * Wrapper da Vercel REST API para o auto-instalador `/onboarding`.
 *
 * Token é **efêmero**: vive apenas em memória da request. Nunca é logado,
 * persistido em `install_progress` ou retornado em respostas HTTP.
 *
 * Retry exponencial (default 3 tentativas: 1 + 2 retries) **apenas** em 429/5xx
 * e erros de rede. Erros 4xx (ex.: 401) falham imediatamente (sem retry).
 *
 * `baseUrl` é overrideável — default `https://api.vercel.com`, ou
 * `process.env.VERCEL_API_BASE_URL` se definido (uso em testes/fakes).
 */

export const VERCEL_DEFAULT_BASE_URL = "https://api.vercel.com";

export class VercelApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "VercelApiError";
  }
}

export interface VercelUser {
  uid: string;
  email: string;
  name: string;
}

export interface VercelDeployment {
  id: string;
  state: string;
}

export interface VercelClientOptions {
  token: string;
  baseUrl?: string;
  /** Tentativas adicionais após a primeira (default 2 → 3 totais). */
  maxRetries?: number;
  /** Base do backoff exponencial em ms (default 200). */
  baseDelayMs?: number;
}

export interface UpsertEnvVarOptions {
  type?: "encrypted" | "plain" | "sensitive";
  target?: string[];
}

export interface WaitForReadyOptions {
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

export function createVercelClient(opts: VercelClientOptions) {
  const baseUrl = (
    opts.baseUrl ??
    process.env.VERCEL_API_BASE_URL ??
    VERCEL_DEFAULT_BASE_URL
  ).replace(/\/$/, "");
  const token = opts.token;
  const maxRetries = opts.maxRetries ?? 2;
  const baseDelayMs = opts.baseDelayMs ?? 200;

  /** Header de auth — nunca exposto fora do closure. */
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
        // Erro de rede: retry até esgotar.
        if (!isLast) {
          await sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        throw new VercelApiError(0, "network_error", String(err));
      }

      if (resp.status === 429 || resp.status >= 500) {
        const errBody = await safeJson(resp);
        const err = new VercelApiError(
          resp.status,
          extractCode(errBody, resp.status),
          extractMessage(errBody, resp.status, "Vercel"),
        );
        if (!isLast) {
          await sleep(baseDelayMs * 2 ** attempt);
          continue;
        }
        throw err;
      }

      if (!resp.ok) {
        // 4xx (exceto 429 já tratado): falha imediata, sem retry.
        const errBody = await safeJson(resp);
        throw new VercelApiError(
          resp.status,
          extractCode(errBody, resp.status),
          extractMessage(errBody, resp.status, "Vercel"),
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
    // Inalcançável: o loop sempre retorna ou lança.
    throw new VercelApiError(0, "unknown", "erro desconhecido");
  }

  async function validateToken(): Promise<VercelUser> {
    const data = await request<any>("/v2/user", { method: "GET" });
    const u = data?.user ?? data;
    return { uid: u.uid, email: u.email, name: u.name };
  }

  async function upsertEnvVar(
    projectId: string,
    key: string,
    value: string,
    envOpts?: UpsertEnvVarOptions,
  ): Promise<void> {
    await request(`/v9/projects/${projectId}/env`, {
      method: "POST",
      body: {
        key,
        value,
        type: envOpts?.type ?? "encrypted",
        target: envOpts?.target ?? ["production", "preview", "development"],
      },
    });
  }

  async function triggerRedeploy(projectId: string): Promise<VercelDeployment> {
    const data = await request<any>("/v13/deployments", {
      method: "POST",
      query: { project: projectId },
      body: {},
    });
    return { id: data.id, state: data.state };
  }

  async function getDeploymentStatus(
    deploymentId: string,
  ): Promise<VercelDeployment> {
    const data = await request<any>(`/v13/deployments/${deploymentId}`, {
      method: "GET",
    });
    return { id: data.id, state: data.state };
  }

  async function waitForDeploymentReady(
    deploymentId: string,
    waitOpts?: WaitForReadyOptions,
  ): Promise<VercelDeployment> {
    const timeoutMs = waitOpts?.timeoutMs ?? 180_000;
    const intervalMs = waitOpts?.intervalMs ?? 3_000;
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const deployment = await getDeploymentStatus(deploymentId);
      if (deployment.state === "READY") return deployment;
      if (deployment.state === "ERROR") {
        throw new VercelApiError(
          500,
          "deployment_error",
          `Deploy da Vercel falhou com estado ERROR (id=${deploymentId})`,
        );
      }
      if (Date.now() >= deadline) {
        throw new VercelApiError(
          408,
          "timeout",
          `Timeout aguardando deploy ficar READY (estado atual: ${deployment.state})`,
        );
      }
      await sleep(intervalMs);
    }
  }

  return {
    validateToken,
    upsertEnvVar,
    triggerRedeploy,
    getDeploymentStatus,
    waitForDeploymentReady,
  };
}

export type VercelClient = ReturnType<typeof createVercelClient>;
