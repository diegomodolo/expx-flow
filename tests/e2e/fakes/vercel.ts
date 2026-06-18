import { startHttpServer, isAuthorized, type FakeRequestCtx } from "./_server";

/**
 * Fake da Vercel API — servidor HTTP real em memória.
 *
 * Estado zerável via `reset()` e isolado por instância (cada teste que chama
 * `createVercelFake()` recebe seu próprio servidor e estado).
 *
 * Coberto:
 *  - GET  /v2/user                     (token válido 200 / inválido 401)
 *  - POST /v9/projects/:id/env         (criar env var)
 *  - PATCH /v9/projects/:id/env        (atualizar env var)
 *  - POST /v13/deployments?project=ID  (disparar redeploy → QUEUED)
 *  - GET  /v13/deployments/:id         (status do deploy)
 *  - GET  /v6/deployments?projectId=ID (histórico de deploys)
 *
 * Controle determinístico:
 *  - advanceDeployments()                          move QUEUED → READY
 *  - forceNextDeployFailure(statusCode?, count?)   próximos deploys falham
 *      com o status informado (default 500, 1x). Permite simular 429/5xx
 *      consecutivos para testar retry exponencial dos wrappers.
 */
export interface VercelFakeProject {
  id: string;
  name: string;
}

export type VercelDeployState = "QUEUED" | "BUILDING" | "READY" | "ERROR";

export interface VercelFakeDeploy {
  id: string;
  projectId: string;
  state: VercelDeployState;
  createdAt: number;
}

export interface VercelFakeState {
  projects: VercelFakeProject[];
  envVars: Record<string, Record<string, string>>;
  deploys: VercelFakeDeploy[];
}

export interface VercelFakeOptions {
  validToken: string;
  projects?: Array<Pick<VercelFakeProject, "id" | "name">>;
}

export interface VercelFake {
  url: string;
  state: VercelFakeState;
  close: () => Promise<void>;
  reset: () => void;
  advanceDeployments: () => void;
  forceNextDeployFailure: (statusCode?: number, count?: number) => void;
}

let deploySeq = 0;

export async function createVercelFake(
  opts: VercelFakeOptions,
): Promise<VercelFake> {
  const initialProjects: VercelFakeProject[] =
    opts.projects && opts.projects.length > 0
      ? opts.projects.map((p) => ({ id: p.id, name: p.name }))
      : [{ id: "prj_default", name: "expx-flow" }];

  let state: VercelFakeState = freshState();
  const deployFailureQueue: number[] = [];

  function freshState(): VercelFakeState {
    deploySeq = 0;
    return {
      projects: initialProjects.map((p) => ({ ...p })),
      envVars: {},
      deploys: [],
    };
  }

  function findProject(id: string): VercelFakeProject | undefined {
    return state.projects.find((p) => p.id === id);
  }

  function requireAuth(ctx: FakeRequestCtx): boolean {
    return isAuthorized(ctx.headers, opts.validToken);
  }

  const server = await startHttpServer(async (ctx, body) => {
    // Auth em todas as rotas (exceto OPTIONS tratada no helper)
    if (!requireAuth(ctx)) {
      return { status: 401, body: { error: "Unauthorized" } };
    }

    // GET /v2/user
    if (ctx.method === "GET" && ctx.pathname === "/v2/user") {
      return {
        status: 200,
        body: {
          user: {
            uid: "user_fake_1",
            email: "owner@expxflow.com",
            name: "Owner Fake",
          },
        },
      };
    }

    // POST/PATCH /v9/projects/:id/env
    const envMatch = ctx.pathname.match(/^\/v9\/projects\/([^/]+)\/env$/);
    if (envMatch && (ctx.method === "POST" || ctx.method === "PATCH")) {
      const projectId = envMatch[1];
      if (!findProject(projectId)) {
        return { status: 404, body: { error: "project_not_found" } };
      }
      const { key, value } = (body ?? {}) as { key?: string; value?: string };
      if (!key || value === undefined) {
        return { status: 400, body: { error: "missing key/value" } };
      }
      state.envVars[projectId] = state.envVars[projectId] ?? {};
      state.envVars[projectId][key] = value;
      return { status: 200, body: { id: `env_${key}`, key, value } };
    }

    // POST /v13/deployments?project=ID
    if (ctx.method === "POST" && ctx.pathname === "/v13/deployments") {
      const projectId = ctx.query.get("project") ?? "";
      if (!findProject(projectId)) {
        return { status: 404, body: { error: "project_not_found" } };
      }
      if (deployFailureQueue.length > 0) {
        const code = deployFailureQueue.shift() as number;
        return {
          status: code,
          body: {
            error: "deploy_failed_injected",
            code: code === 429 ? "rate_limited" : "server_error",
          },
        };
      }
      deploySeq += 1;
      const deploy: VercelFakeDeploy = {
        id: `dpl_${deploySeq}`,
        projectId,
        state: "QUEUED",
        createdAt: Date.now(),
      };
      state.deploys.push(deploy);
      return { status: 200, body: { ...deploy } };
    }

    // GET /v13/deployments/:id
    const deployDetail = ctx.pathname.match(/^\/v13\/deployments\/([^/]+)$/);
    if (ctx.method === "GET" && deployDetail) {
      const deploy = state.deploys.find((d) => d.id === deployDetail[1]);
      if (!deploy) return { status: 404, body: { error: "deploy_not_found" } };
      return { status: 200, body: { ...deploy } };
    }

    // GET /v6/deployments?projectId=ID&limit=N
    if (ctx.method === "GET" && ctx.pathname === "/v6/deployments") {
      const projectId = ctx.query.get("projectId") ?? "";
      const limit = Number(ctx.query.get("limit") ?? "100");
      const deploys = state.deploys
        .filter((d) => !projectId || d.projectId === projectId)
        .slice(-limit)
        .reverse();
      return {
        status: 200,
        body: { deployments: deploys.map((d) => ({ ...d })) },
      };
    }

    return undefined;
  });

  return {
    url: server.url,
    get state() {
      return state;
    },
    close: server.close,
    reset: () => {
      state = freshState();
      deployFailureQueue.length = 0;
    },
    advanceDeployments: () => {
      for (const d of state.deploys) {
        if (d.state === "QUEUED") d.state = "READY";
      }
    },
    forceNextDeployFailure: (statusCode = 500, count = 1) => {
      for (let i = 0; i < count; i++) deployFailureQueue.push(statusCode);
    },
  };
}
