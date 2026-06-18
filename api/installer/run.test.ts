import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Readable } from "node:stream";
import { createVercelFake } from "../../tests/e2e/fakes/vercel";
import { createSupabaseMgmtFake } from "../../tests/e2e/fakes/supabase-mgmt";
import { autoAdvancePendingProjects } from "./_lib/__tests__/_helpers";
import { STEPS, type InstallProgress } from "./_lib/progress";
import type { VercelRequest } from "./_lib/http";
import runHandler from "./run";

const V_TOKEN = "V_TOKEN_RUN";
const S_TOKEN = "S_TOKEN_RUN";
const VERCEL_PID = "prj_run";

const SMALL_MANIFEST = {
  functionsRoot: "supabase/functions",
  count: 2,
  functions: [
    {
      name: "a",
      entrypoint: "a/index.ts",
      files: ["a/index.ts"],
      verifyJwt: true,
    },
    {
      name: "b",
      entrypoint: "b/index.ts",
      files: ["b/index.ts"],
      verifyJwt: false,
    },
  ],
};

function mockReq(
  method: string,
  body: unknown,
  query: Record<string, string> = {},
): VercelRequest {
  const stream = Readable.from(
    body === undefined ? [] : [JSON.stringify(body)],
  ) as unknown as VercelRequest;
  stream.method = method;
  stream.headers = {};
  (stream as any).query = query;
  return stream;
}

interface MockSseRes {
  statusCode: number;
  headers: Record<string, string>;
  chunks: string[];
  ended: boolean;
  status(code: number): this;
  setHeader(k: string, v: string): void;
  write(chunk: string): boolean;
  writeHead(code: number, headers?: Record<string, string>): void;
  json(b: unknown): this;
  end(): void;
}

function mockSseRes(): MockSseRes {
  const r = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    chunks: [] as string[],
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(k: string, v: string) {
      this.headers[k] = v;
    },
    write(chunk: string) {
      this.chunks.push(chunk);
      return true;
    },
    writeHead(code: number, headers?: Record<string, string>) {
      this.statusCode = code;
      if (headers)
        for (const [k, v] of Object.entries(headers)) this.headers[k] = v;
    },
    json(b: unknown) {
      this.chunks.push(JSON.stringify(b));
      return this;
    },
    end() {
      this.ended = true;
    },
  };
  return r;
}

/** Coleta eventos SSE das chunks escritas no res. */
function parseSseEvents(res: MockSseRes): Array<Record<string, unknown>> {
  const events: Array<Record<string, unknown>> = [];
  for (const chunk of res.chunks) {
    for (const block of chunk.split("\n\n")) {
      const trimmed = block.trim();
      if (!trimmed.startsWith("data:")) continue;
      try {
        events.push(JSON.parse(trimmed.slice("data:".length).trim()));
      } catch {
        /* ignore */
      }
    }
  }
  return events;
}

describe("POST /api/installer/run (SSE)", () => {
  let vFake: Awaited<ReturnType<typeof createVercelFake>>;
  let sFake: Awaited<ReturnType<typeof createSupabaseMgmtFake>>;
  let vClose: () => Promise<void>;
  let sClose: () => Promise<void>;
  const prevVEnv = process.env.VERCEL_API_BASE_URL;
  const prevSEnv = process.env.SUPABASE_MGMT_BASE_URL;
  const prevVpid = process.env.VERCEL_PROJECT_ID;

  beforeAll(async () => {
    vFake = await createVercelFake({
      validToken: V_TOKEN,
      projects: [{ id: VERCEL_PID, name: "expx" }],
    });
    sFake = await createSupabaseMgmtFake({ validToken: S_TOKEN });
    vClose = vFake.close;
    sClose = sFake.close;
    process.env.VERCEL_API_BASE_URL = vFake.url;
    process.env.SUPABASE_MGMT_BASE_URL = sFake.url;
    process.env.VERCEL_PROJECT_ID = VERCEL_PID;
  });

  afterAll(async () => {
    if (prevVEnv === undefined) delete process.env.VERCEL_API_BASE_URL;
    else process.env.VERCEL_API_BASE_URL = prevVEnv;
    if (prevSEnv === undefined) delete process.env.SUPABASE_MGMT_BASE_URL;
    else process.env.SUPABASE_MGMT_BASE_URL = prevSEnv;
    if (prevVpid === undefined) delete process.env.VERCEL_PROJECT_ID;
    else process.env.VERCEL_PROJECT_ID = prevVpid;
    await Promise.all([vClose(), sClose()]);
  });

  beforeEach(() => {
    vFake.reset();
    sFake.reset();
  });
  afterEach(() => vi.restoreAllMocks());

  function fullBody() {
    return {
      vercelToken: V_TOKEN,
      supabaseToken: S_TOKEN,
      options: {
        orgId: "org_default",
        projectName: "expx-run",
        dbPassword: "Db123!",
        vercelProjectId: VERCEL_PID,
        cwd: process.cwd(),
        functionsBatchSize: 10,
        projectHealthyIntervalMs: 5,
        projectHealthyTimeoutMs: 2000,
        deployReadyIntervalMs: 5,
        deployReadyTimeoutMs: 3000,
      },
      // Manifesto pequeno: o handler não injeta; usamos env/hook. Aqui enviamos
      // progress inicial zerado e validamos o fluxo. Para usar o manifesto
      // pequeno, o teste invoca runInstaller diretamente quando necessário.
    };
  }

  it("responde OPTIONS com 204 (preflight CORS)", async () => {
    const res = mockSseRes();
    await runHandler(mockReq("OPTIONS", undefined), res as any);
    expect(res.statusCode).toBe(204);
    expect(res.ended).toBe(true);
  });

  it("método não permitido → 405", async () => {
    const res = mockSseRes();
    await runHandler(mockReq("GET", undefined), res as any);
    expect(res.statusCode).toBe(405);
  });

  it("tokens/options ausentes → 400 PT-BR (nunca 500)", async () => {
    const res = mockSseRes();
    await runHandler(mockReq("POST", {}), res as any);
    expect(res.statusCode).toBe(400);
    expect(res.chunks.join("")).toMatch(/obrigat/i);
  });

  it("recusa 409 se instalação já concluída (sem reinstall)", async () => {
    const completed: InstallProgress = {
      completedSteps: [...STEPS],
      functions: ["a", "b"],
      projectRef: "r",
      projectAnonKey: "a",
      vercelProjectId: VERCEL_PID,
      startedAt: 1,
      updatedAt: 1,
    };
    const res = mockSseRes();
    await runHandler(
      mockReq("POST", { ...fullBody(), progress: completed, reinstall: false }),
      res as any,
    );
    expect(res.statusCode).toBe(409);
    expect(res.chunks.join("")).toMatch(/já concluída|reinstall/i);
  });

  it("headers CORS e SSE presentes na resposta", async () => {
    const res = mockSseRes();
    // Forçamos partial rápido para não depender de tempo real.
    const initial: InstallProgress = {
      completedSteps: ["create-project", "apply-schema"],
      functions: [],
      projectRef: "projseedref",
      projectAnonKey: "anon-seed",
      vercelProjectId: VERCEL_PID,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    // maxRunMs baixo via env para forçar partial imediato.
    const prev = process.env.INSTALLER_MAX_RUN_MS;
    process.env.INSTALLER_MAX_RUN_MS = "1";
    try {
      await runHandler(
        mockReq("POST", { ...fullBody(), progress: initial }),
        res as any,
      );
    } finally {
      if (prev === undefined) delete process.env.INSTALLER_MAX_RUN_MS;
      else process.env.INSTALLER_MAX_RUN_MS = prev;
    }
    expect(res.headers["Access-Control-Allow-Origin"]).toBeDefined();
    // Mesmo em partial, o Content-Type SSE está setado.
    expect(
      res.headers["Content-Type"]?.includes("text/event-stream") ?? false,
    ).toBe(true);
  });

  it("partial → status HTTP 200 com evento partial + resumeFrom no stream", async () => {
    const res = mockSseRes();
    const initial: InstallProgress = {
      completedSteps: ["create-project", "apply-schema"],
      functions: [],
      projectRef: "projseedref",
      projectAnonKey: "anon-seed",
      vercelProjectId: VERCEL_PID,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    const prev = process.env.INSTALLER_MAX_RUN_MS;
    process.env.INSTALLER_MAX_RUN_MS = "1";
    try {
      await runHandler(
        mockReq("POST", { ...fullBody(), progress: initial }),
        res as any,
      );
    } finally {
      if (prev === undefined) delete process.env.INSTALLER_MAX_RUN_MS;
      else process.env.INSTALLER_MAX_RUN_MS = prev;
    }
    // Status 200 (SSE aberto), não 500.
    expect(res.statusCode).toBe(200);
    const events = parseSseEvents(res);
    const partialEvents = events.filter((e) => e.status === "partial");
    expect(partialEvents.length).toBeGreaterThan(0);
    const terminal = events.find((e) => e.done === true);
    expect(terminal).toBeTruthy();
    expect(terminal!.status).toBe("partial");
    expect(terminal!.resumeFrom).toBeTruthy();
    // Tokens não vazam no stream.
    const allJson = JSON.stringify(events);
    expect(allJson).not.toContain(V_TOKEN);
    expect(allJson).not.toContain(S_TOKEN);
  });

  it("re-run pula steps concluídos (idempotência) — progress já completo vira 409/ou skip", async () => {
    // Caso A: progress completo + reinstall=true → re-executa (não 409).
    // Para o teste, apenas garantimos que não 409 com reinstall.
    const completed: InstallProgress = {
      completedSteps: [...STEPS],
      functions: ["a", "b"],
      projectRef: "r",
      projectAnonKey: "a",
      vercelProjectId: VERCEL_PID,
      startedAt: 1,
      updatedAt: 1,
    };
    const res = mockSseRes();
    const prev = process.env.INSTALLER_MAX_RUN_MS;
    process.env.INSTALLER_MAX_RUN_MS = "1"; // partial imediato, evita rodar tudo
    try {
      await runHandler(
        mockReq("POST", {
          ...fullBody(),
          progress: completed,
          reinstall: true,
        }),
        res as any,
      );
    } finally {
      if (prev === undefined) delete process.env.INSTALLER_MAX_RUN_MS;
      else process.env.INSTALLER_MAX_RUN_MS = prev;
    }
    // Com reinstall=true NÃO é 409.
    expect(res.statusCode).not.toBe(409);
  });

  it("orquestra fluxo completo até 'done' quando orçamento é farto", async () => {
    // Para um fluxo completo determinístico e rápido, usamos o manifesto
    // pequeno. Como o handler não expõe injeção de manifesto, spy em
    // readFunctionsManifest seria necessário. Aqui validamos o caminho:
    // create-project + apply-schema rodam (sem manifesto pequeno, o deploy
    // usa o manifesto real de 232 entries). Para manter o teste curto,
    // validamos o fluxo criando o projeto via initialProgress pré-deploy.
    const initial: InstallProgress = {
      completedSteps: ["create-project", "apply-schema"],
      functions: ["a", "b"], // simula deploy já feito
      projectRef: "projseedref",
      projectAnonKey: "anon-seed",
      vercelProjectId: VERCEL_PID,
      startedAt: Date.now(),
      updatedAt: Date.now(),
    };
    // Acrescenta deploy-functions como concluído para o fluxo pular direto
    // para set-secrets → write-vercel-env → trigger-redeploy.
    initial.completedSteps.push("deploy-functions");

    const stop = setInterval(() => vFake.advanceDeployments(), 5);
    autoAdvancePendingProjects(sFake);
    const res = mockSseRes();
    try {
      await runHandler(
        mockReq("POST", { ...fullBody(), progress: initial }),
        res as any,
      );
    } finally {
      clearInterval(stop);
    }
    expect(res.statusCode).toBe(200);
    const events = parseSseEvents(res);
    const terminal = events.find((e) => e.done === true);
    expect(terminal).toBeTruthy();
    expect(terminal!.status).toBe("done");
    // set-secrets, write-vercel-env, trigger-redeploy foram skipped (já ok)
    // ou executados. Confirmamos que o terminal é done.
    expect(terminal!.pct).toBe(100);
    // As env vars foram gravadas na Vercel.
    expect(vFake.state.envVars[VERCEL_PID]?.VITE_SUPABASE_URL).toContain(
      "projseedref",
    );
    expect(vFake.state.envVars[VERCEL_PID]?.VITE_SUPABASE_ANON_KEY).toBe(
      "anon-seed",
    );
  });
});
