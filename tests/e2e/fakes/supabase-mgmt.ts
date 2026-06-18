import { startHttpServer, isAuthorized, type FakeRequestCtx } from "./_server";

/**
 * Fake da Supabase Management API — servidor HTTP real em memória.
 *
 * Coberto:
 *  - GET  /v1/organizations                            (lista orgs)
 *  - POST /v1/projects                                 (cria projeto PENDING)
 *  - GET  /v1/projects/:ref                            (status do projeto)
 *  - POST /v1/projects/:ref/functions/deploy?slug=SLUG (deploy de function)
 *  - POST /v1/projects/:ref/secrets                    (cria/atualiza secret)
 *  - POST /v1/projects/:ref/database/query             (executa SQL)
 *
 * Controle determinístico:
 *  - advanceProjectProvisioning(ref, polls)        PENDING → ACTIVE_HEALTHY
 *  - forceNextDeployFailure(ref, statusCode?, count?)  próximos deploys do ref
 *      falham com o status informado (default 500, 1x). Permite simular
 *      429/5xx consecutivos para testar retry exponencial dos wrappers.
 *  - GET /v1/projects/:ref/api-keys  retorna anon + service_role keys
 *      (para o wrapper montar credenciais completas na criação do projeto).
 */
export interface SupabaseMgmtOrganization {
  id: string;
  name: string;
}

export type SupabaseProjectStatus =
  | "PENDING"
  | "ACTIVE_HEALTHY"
  | "ACTIVE_UNHEALTHY"
  | "GOING_DOWN"
  | "PAUSED";

export interface SupabaseMgmtProject {
  id: string;
  ref: string;
  name: string;
  organization_id: string;
  status: SupabaseProjectStatus;
  region: string;
  plan: string;
  db_password: string;
  connection_string: string;
}

export interface SupabaseMgmtFunction {
  id: string;
  name: string;
  slug: string;
  verify_jwt: boolean;
}

export interface SupabaseMgmtFakeState {
  organizations: SupabaseMgmtOrganization[];
  projects: SupabaseMgmtProject[];
  functions: Record<string, SupabaseMgmtFunction[]>;
  secrets: Record<string, Record<string, string>>;
  sqlQueries: Array<{ ref: string; query: string; rows: number }>;
}

export interface SupabaseMgmtFakeOptions {
  validToken: string;
  organizations?: Array<Pick<SupabaseMgmtOrganization, "id" | "name">>;
}

export interface SupabaseMgmtFake {
  url: string;
  state: SupabaseMgmtFakeState;
  close: () => Promise<void>;
  reset: () => void;
  advanceProjectProvisioning: (ref: string, polls?: number) => void;
  forceNextDeployFailure: (
    ref: string,
    statusCode?: number,
    count?: number,
  ) => void;
}

let projectSeq = 0;
let functionSeq = 0;

export async function createSupabaseMgmtFake(
  opts: SupabaseMgmtFakeOptions,
): Promise<SupabaseMgmtFake> {
  const initialOrgs: SupabaseMgmtOrganization[] =
    opts.organizations && opts.organizations.length > 0
      ? opts.organizations.map((o) => ({ id: o.id, name: o.name }))
      : [{ id: "org_default", name: "Expx Flow Org" }];

  // Projeto seed ACTIVE_HEALTHY para que deploy/secret/sql tenham onde rodar.
  const seededProject: SupabaseMgmtProject = {
    id: "proj_seed_id",
    ref: "projseedref",
    name: "expx-flow-seed",
    organization_id: initialOrgs[0].id,
    status: "ACTIVE_HEALTHY",
    region: "sa-east-1",
    plan: "free",
    db_password: "SeedPass123!",
    connection_string:
      "postgresql://postgres.projseedref:SeedPass123!@db.projseedref.supabase.co:5432/postgres",
  };

  let state: SupabaseMgmtFakeState = freshState();
  const deployFailureQueues = new Map<string, number[]>();

  function freshState(): SupabaseMgmtFakeState {
    projectSeq = 0;
    functionSeq = 0;
    return {
      organizations: initialOrgs.map((o) => ({ ...o })),
      projects: [{ ...seededProject }],
      functions: {},
      secrets: {},
      sqlQueries: [],
    };
  }

  function findProject(ref: string): SupabaseMgmtProject | undefined {
    return state.projects.find((p) => p.ref === ref);
  }

  function requireAuth(ctx: FakeRequestCtx): boolean {
    return isAuthorized(ctx.headers, opts.validToken);
  }

  const server = await startHttpServer(async (ctx, body) => {
    if (!requireAuth(ctx)) {
      return { status: 401, body: { error: "Unauthorized" } };
    }

    // GET /v1/organizations
    if (ctx.method === "GET" && ctx.pathname === "/v1/organizations") {
      return {
        status: 200,
        body: state.organizations.map((o) => ({ ...o })),
      };
    }

    // POST /v1/projects (criação)
    if (ctx.method === "POST" && ctx.pathname === "/v1/projects") {
      const payload = (body ?? {}) as {
        organization_id?: string;
        name?: string;
        db_password?: string;
        region?: string;
        plan?: string;
      };
      const orgId = payload.organization_id ?? initialOrgs[0].id;
      if (!state.organizations.find((o) => o.id === orgId)) {
        return { status: 400, body: { error: "organization_not_found" } };
      }
      projectSeq += 1;
      const ref = `projref${projectSeq}`;
      const dbPassword = payload.db_password ?? "DbPass123!";
      const project: SupabaseMgmtProject = {
        id: `proj_id_${projectSeq}`,
        ref,
        name: payload.name ?? `project-${projectSeq}`,
        organization_id: orgId,
        status: "PENDING",
        region: payload.region ?? "sa-east-1",
        plan: payload.plan ?? "free",
        db_password: dbPassword,
        connection_string: `postgresql://postgres.${ref}:${dbPassword}@db.${ref}.supabase.co:5432/postgres`,
      };
      state.projects.push(project);
      return { status: 201, body: { ...project } };
    }

    // GET /v1/projects/:ref
    const projectByRef = ctx.pathname.match(/^\/v1\/projects\/([^/]+)$/);
    if (ctx.method === "GET" && projectByRef) {
      const project = findProject(projectByRef[1]);
      if (!project)
        return { status: 404, body: { error: "project_not_found" } };
      return { status: 200, body: { ...project } };
    }

    // GET /v1/projects/:ref/api-keys (retorna anon + service_role)
    const apiKeysMatch = ctx.pathname.match(
      /^\/v1\/projects\/([^/]+)\/api-keys$/,
    );
    if (ctx.method === "GET" && apiKeysMatch) {
      const ref = apiKeysMatch[1];
      if (!findProject(ref)) {
        return { status: 404, body: { error: "project_not_found" } };
      }
      return {
        status: 200,
        body: [
          { name: "anon", api_key: `anon-key-${ref}` },
          { name: "service_role", api_key: `service-role-key-${ref}` },
        ],
      };
    }

    // POST /v1/projects/:ref/functions/deploy?slug=SLUG
    const deployMatch = ctx.pathname.match(
      /^\/v1\/projects\/([^/]+)\/functions\/deploy$/,
    );
    if (ctx.method === "POST" && deployMatch) {
      const ref = deployMatch[1];
      const project = findProject(ref);
      if (!project)
        return { status: 404, body: { error: "project_not_found" } };
      const queue = deployFailureQueues.get(ref);
      if (queue && queue.length > 0) {
        const code = queue.shift() as number;
        if (queue.length === 0) deployFailureQueues.delete(ref);
        return {
          status: code,
          body: {
            error: "function_deploy_failed_injected",
            code: code === 429 ? "rate_limited" : "server_error",
          },
        };
      }
      const payload = (body ?? {}) as {
        name?: string;
        slug?: string;
        verify_jwt?: boolean;
      };
      const slug =
        payload.slug ?? ctx.query.get("slug") ?? `func-${functionSeq}`;
      functionSeq += 1;
      const fn: SupabaseMgmtFunction = {
        id: `fn_${functionSeq}`,
        name: payload.name ?? slug,
        slug,
        verify_jwt: payload.verify_jwt ?? true,
      };
      state.functions[ref] = state.functions[ref] ?? [];
      state.functions[ref].push(fn);
      return { status: 201, body: { ...fn } };
    }

    // POST /v1/projects/:ref/secrets
    const secretsMatch = ctx.pathname.match(
      /^\/v1\/projects\/([^/]+)\/secrets$/,
    );
    if (ctx.method === "POST" && secretsMatch) {
      const ref = secretsMatch[1];
      if (!findProject(ref)) {
        return { status: 404, body: { error: "project_not_found" } };
      }
      const { name, value } = (body ?? {}) as {
        name?: string;
        value?: string;
      };
      if (!name || value === undefined) {
        return { status: 400, body: { error: "missing name/value" } };
      }
      state.secrets[ref] = state.secrets[ref] ?? {};
      state.secrets[ref][name] = value;
      return { status: 201, body: { name, value: "***" } };
    }

    // POST /v1/projects/:ref/database/query
    const queryMatch = ctx.pathname.match(
      /^\/v1\/projects\/([^/]+)\/database\/query$/,
    );
    if (ctx.method === "POST" && queryMatch) {
      const ref = queryMatch[1];
      if (!findProject(ref)) {
        return { status: 404, body: { error: "project_not_found" } };
      }
      const { query } = (body ?? {}) as { query?: string };
      const rows = query?.match(/CREATE TABLE/i) ? 0 : 0;
      state.sqlQueries.push({ ref, query: query ?? "", rows });
      return { status: 200, body: { rows: [] } };
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
      deployFailureQueues.clear();
    },
    advanceProjectProvisioning: (_ref, _polls = 1) => {
      const project = findProject(_ref);
      if (project && project.status === "PENDING") {
        project.status = "ACTIVE_HEALTHY";
      }
    },
    forceNextDeployFailure: (ref, statusCode = 500, count = 1) => {
      const q = deployFailureQueues.get(ref) ?? [];
      for (let i = 0; i < count; i++) q.push(statusCode);
      deployFailureQueues.set(ref, q);
    },
  };
}
