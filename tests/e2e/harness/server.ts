/**
 * Harness de teste E2E para o auto-instalador `/onboarding`.
 *
 * Arquitetura (decisão: handlers reais + fakes):
 *  - Sobe os 2 fakes HTTP (`createVercelFake`, `createSupabaseMgmtFake`) em
 *    portas efêmeras (127.0.0.1).
 *  - Aponta `process.env.VERCEL_API_BASE_URL`/`SUPABASE_MGMT_BASE_URL` para
 *    as URLs dos fakes — os wrappers (`_lib/vercel-api.ts` e
 *    `_lib/supabase-mgmt.ts`) usam essas envs como baseUrl.
 *  - Sobe um servidor HTTP (porta 4173 por padrão) que:
 *      • roteia `/api/installer/{status,validate-tokens,list-orgs,run}` para
 *        os handlers Vercel reais (`api/installer/*.ts`), adaptando
 *        `node:http` → `(VercelRequest, VercelResponse)`.
 *      • stuba `/api/installer/create-admin` (o handler real exigiria o REST
 *        do Supabase do projeto novo em `https://<ref>.supabase.co`, que não
 *        é coberto pelos fakes). O stub espelha o contrato: marca
 *        `installationCompleted=true` no harness e responde 200 com
 *        `{ ok: true, userId }`.
 *      • short-circuit de `/api/installer/status` quando `installationCompleted`
 *        está ligado (o handler real leria a flag de `system_config_app`,
 *        tabela que não existe nos fakes).
 *      • expõe `/__e2e/*` — endpoints de controle usados pela fixture
 *        Playwright para resetar fakes, forçar partial, ler estado, etc.
 *      • serve o build de `dist/` como static fallback (SPA) para o
 *        frontend — mesmo origin, mesma porta. Assim o wizard no browser
 *        chama `/api/installer/*` via URL relativa e tudo bate no harness.
 *
 * Por que handlers reais (e não `page.route` com stubs)?
 *  - Valida a stack inteira do instalador (handlers + wrappers + steps
 *    orquestrados por `runInstaller`) contra os fakes, não só o contrato.
 *  - O custo de adaptar `(req,res)` Vercel para `node:http` é baixo (os
 *    handlers já usam helpers em `_lib/http.ts` com tipos compatíveis).
 *
 * Único stub: `create-admin` (documentado acima). O fluxo `run` roda o
 * `runInstaller` REAL com schema consolidado + manifesto de 232 functions.
 *
 * Execução: `npx tsx tests/e2e/harness/server.ts` (configurado como
 * `webServer` do playwright.config.ts). O `npm run build` roda antes para
 * gerar `dist/`.
 */

import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createVercelFake } from "../fakes/vercel";
import { createSupabaseMgmtFake } from "../fakes/supabase-mgmt";
import statusHandler from "../../../api/installer/status";
import validateTokensHandler from "../../../api/installer/validate-tokens";
import listOrgsHandler from "../../../api/installer/list-orgs";
import runHandler from "../../../api/installer/run";

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

const V_TOKEN = "vercel-e2e-valid-token";
const S_TOKEN = "supabase-e2e-valid-token";
const VERCEL_PID = "prj_e2e";
const ORG_ID = "org_e2e";
const ORG_NAME = "Organização E2E";

const port = Number(process.env.HARNESS_PORT ?? 4173);
const host = process.env.HARNESS_HOST ?? "127.0.0.1";

// dist/ pode estar no cwd (quando o webServer roda `npm run build && tsx ...`)
// ou relativo a este arquivo (em outros arranjos). Preferimos cwd.
const distDir = path.resolve(process.cwd(), "dist");

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

const vFake = await createVercelFake({
  validToken: V_TOKEN,
  projects: [{ id: VERCEL_PID, name: "expx-flow-e2e" }],
});
const sFake = await createSupabaseMgmtFake({
  validToken: S_TOKEN,
  organizations: [{ id: ORG_ID, name: ORG_NAME }],
});

process.env.VERCEL_API_BASE_URL = vFake.url;
process.env.SUPABASE_MGMT_BASE_URL = sFake.url;
process.env.VERCEL_PROJECT_ID = VERCEL_PID;
// Orçamento farto por default — a fixture controla "force-partial" quando
// precisa testar resume.
process.env.INSTALLER_MAX_RUN_MS = "250000";

// ---------------------------------------------------------------------------
// Estado interno de controle (manipulável via /__e2e/*)
// ---------------------------------------------------------------------------

interface HarnessState {
  /** Quando true, status retorna configured:true e create-admin vira sucesso. */
  installationCompleted: boolean;
  /** Quando true, run retorna partial sintético sem chamar o handler real. */
  forcePartial: boolean;
  /** Quando true, run faz a 1ª chamada real (1 lote) e demais viram partial. */
  blockAfterFirstBatch: boolean;
  /** Contador de chamadas ao run (para detectar a primeira no block-after-first). */
  runCallCount: number;
}

const harnessState: HarnessState = {
  installationCompleted: false,
  forcePartial: false,
  blockAfterFirstBatch: false,
  runCallCount: 0,
};

function resetAll(): void {
  vFake.reset();
  sFake.reset();
  harnessState.installationCompleted = false;
  harnessState.forcePartial = false;
  harnessState.blockAfterFirstBatch = false;
  harnessState.runCallCount = 0;
}

// ---------------------------------------------------------------------------
// Adaptadores node:http → Vercel (req, res)
// ---------------------------------------------------------------------------

interface AdaptedRequest {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  url?: string;
  body?: unknown;
  on?(event: string, listener: (...args: unknown[]) => void): unknown;
}

interface AdaptedResponse {
  status(code: number): AdaptedResponse;
  json(body: unknown): AdaptedResponse;
  setHeader(name: string, value: string): AdaptedResponse;
  end(): AdaptedResponse;
  write?(chunk: string | Buffer): boolean;
  writeHead?(code: number, headers?: Record<string, string>): void;
}

function adaptRes(res: http.ServerResponse): AdaptedResponse {
  const api = {
    status(code: number) {
      res.statusCode = code;
      return api;
    },
    json(b: unknown) {
      if (!res.headersSent) res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(b));
      return api;
    },
    setHeader(name: string, value: string) {
      res.setHeader(name, value);
      return api;
    },
    end() {
      if (!res.writableEnded) res.end();
      return api;
    },
    write(chunk: string | Buffer) {
      if (!res.writableEnded) res.write(chunk);
      return true;
    },
    writeHead(code: number, headers?: Record<string, string>) {
      if (headers) res.writeHead(code, headers);
      else res.writeHead(code);
    },
  };
  return api;
}

function adaptReq(
  req: http.IncomingMessage,
  bodyBuffer: Buffer,
): AdaptedRequest {
  let parsed: unknown = undefined;
  if (bodyBuffer.length > 0) {
    try {
      parsed = JSON.parse(bodyBuffer.toString("utf-8"));
    } catch {
      parsed = null;
    }
  } else {
    // body vazio → null (diferente de undefined) para short-circuit em
    // readJsonBody sem precisar ler do stream (já drenado).
    parsed = null;
  }
  return {
    method: req.method ?? "GET",
    headers: req.headers as Record<string, string | string[] | undefined>,
    url: req.url,
    body: parsed,
  };
}

async function readRawBody(req: http.IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// Helpers de orquestração determinística dos fakes
// ---------------------------------------------------------------------------

/**
 * Avança o provisionamento de qualquer projeto PENDING e os deploys QUEUED.
 * Chamado a cada request para garantir determinismo sem depender de timers.
 */
function autoAdvance(): void {
  for (const p of sFake.state.projects) {
    if (p.status === "PENDING") sFake.advanceProjectProvisioning(p.ref);
  }
  vFake.advanceDeployments();
}

/** Encontra o projeto Supabase criado pelo instalador (exclui o seed). */
function findInstallerProjectRef(): string | undefined {
  const created = sFake.state.projects.find((p) => p.ref !== "projseedref");
  return created?.ref;
}

/**
 * Monta um evento SSE `partial` sintético usando o estado atual do fake,
 * sem chamar o handler real. Usado para:
 *  - `forcePartial` (sempre que ligado).
 *  - `blockAfterFirstBatch` (após a 1ª chamada real).
 */
function writeSyntheticPartial(res: http.ServerResponse): void {
  const ref = findInstallerProjectRef() ?? "projseedref";
  const fns = sFake.state.functions[ref] ?? [];
  const totalFunctions = 232; // espelha o manifesto de produção
  const pct = Math.round(25 + (fns.length / totalFunctions) * 55);
  const progress = {
    completedSteps:
      fns.length > 0
        ? ["create-project", "apply-schema"]
        : ["create-project", "apply-schema"],
    functions: fns.map((f) => f.name),
    projectRef: ref,
    projectAnonKey: `anon-key-${ref}`,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  };
  const event = {
    step: "global",
    status: "partial" as const,
    pct,
    message:
      'Orçamento de tempo da invocação atingido. Retome a partir de "deploy-functions".',
    resumeFrom: "deploy-functions",
    progress,
    done: true,
  };
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write(`data: ${JSON.stringify(event)}\n\n`);
  res.end();
}

// ---------------------------------------------------------------------------
// Static file server (SPA fallback)
// ---------------------------------------------------------------------------

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function serveStatic(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
): void {
  // Normaliza e previne path traversal.
  const safe = pathname.replace(/\/+/g, "/").replace(/\.\.+/g, "");
  let filePath = path.join(distDir, safe === "/" ? "index.html" : safe);
  if (!filePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    const content = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
    });
    res.end(content);
    return;
  } catch {
    // cai para SPA fallback
  }

  // SPA fallback: serve index.html para qualquer rota desconhecida.
  try {
    const index = fs.readFileSync(path.join(distDir, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(index);
  } catch {
    res.writeHead(404);
    res.end(
      "Not Found. Rode `npm run build` antes de iniciar o harness (dist/ ausente).",
    );
  }
}

// ---------------------------------------------------------------------------
// Router principal
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // CORS global (mesmo origin em produção, mas seguro por padrão).
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "*");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Avança o "relógio" dos fakes a cada request — determinismo sem timers.
  autoAdvance();

  const fullUrl = req.url ?? "/";
  const [pathnameRaw, searchRaw = ""] = fullUrl.split("?");
  const pathname = pathnameRaw;
  const search = searchRaw;

  // -------------------------------------------------------------------------
  // /__e2e/* — controle da fixture Playwright
  // -------------------------------------------------------------------------

  if (pathname === "/__e2e/state" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        vercel: vFake.state,
        supabase: sFake.state,
        installerProjectRef: findInstallerProjectRef(),
        harness: harnessState,
        tokens: { valid: { vercel: V_TOKEN, supabase: S_TOKEN } },
        ver: 1,
      }),
    );
    return;
  }

  if (pathname === "/__e2e/control" && req.method === "POST") {
    const body = JSON.parse((await readRawBody(req)).toString("utf-8") || "{}");
    switch (body.action) {
      case "reset":
        resetAll();
        break;
      case "set-installation-completed":
        harnessState.installationCompleted = !!body.value;
        break;
      case "set-force-partial":
        harnessState.forcePartial = !!body.value;
        // Reset do contador de chamadas ao mudar modo.
        harnessState.runCallCount = 0;
        break;
      case "set-block-after-first-batch":
        harnessState.blockAfterFirstBatch = !!body.value;
        harnessState.runCallCount = 0;
        break;
      case "setup-resume-scenario": {
        // Cenário determinístico para o teste de resume: cria um projeto
        // novo no fake (como o instalador faria), pré-deploya N functions
        // com nomes DO MANIFESTO (para que o filtro `pending` do step
        // deploy-functions os exclua), e liga `forcePartial`. Assim o
        // wizard recebe partial com progress real e fica preso até o
        // teste desligar forcePartial — momento em que o handler real
        // deploya apenas as funções ainda ausentes.
        const preCount = Number(body.count) || 10;
        // 1. Cria projeto novo no fake.
        const org = sFake.state.organizations[0];
        const dbPassword = "ResumeDb123!";
        const ref = `projref${sFake.state.projects.length}`;
        const newProject = {
          id: `proj_id_resume_${Date.now()}`,
          ref,
          name: "expx-resume",
          organization_id: org.id,
          status: "ACTIVE_HEALTHY" as const,
          region: "sa-east-1",
          plan: "free",
          db_password: dbPassword,
          connection_string: `postgresql://postgres.${ref}:${dbPassword}@db.${ref}.supabase.co:5432/postgres`,
        };
        sFake.state.projects.push(newProject);
        // 2. Lê o manifesto de produção para nomes reais.
        const manifestPath = path.resolve(
          process.cwd(),
          "api",
          "installer",
          "_functions-manifest.json",
        );
        const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as {
          functions: Array<{ name: string; verifyJwt: boolean }>;
        };
        sFake.state.functions[ref] = [];
        for (let i = 0; i < preCount && i < manifest.functions.length; i++) {
          const fn = manifest.functions[i];
          sFake.state.functions[ref].push({
            id: `fn_pre_${i}`,
            name: fn.name,
            slug: fn.name,
            verify_jwt: fn.verifyJwt,
          });
        }
        // 3. Liga forcePartial para o wizard ficar preso.
        harnessState.forcePartial = true;
        break;
      }
      default:
        res.writeHead(400);
        res.end(JSON.stringify({ error: "unknown action" }));
        return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // -------------------------------------------------------------------------
  // /api/installer/* — handlers reais (ou stubs documentados)
  // -------------------------------------------------------------------------

  if (pathname === "/api/installer/status") {
    res.setHeader("Cache-Control", "no-store");
    if (harnessState.installationCompleted) {
      // Short-circuit: o handler real exigiria uma query em
      // `system_config_app.installation_completed`, que não existe nos fakes.
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ configured: true }));
      return;
    }
    await statusHandler(adaptReq(req, Buffer.alloc(0)), adaptRes(res));
    return;
  }

  if (pathname === "/api/installer/validate-tokens") {
    const body = await readRawBody(req);
    await validateTokensHandler(adaptReq(req, body), adaptRes(res));
    return;
  }

  if (pathname === "/api/installer/list-orgs") {
    const body = await readRawBody(req);
    await listOrgsHandler(adaptReq(req, body), adaptRes(res));
    return;
  }

  if (pathname === "/api/installer/run") {
    const body = await readRawBody(req);
    harnessState.runCallCount += 1;

    // Modo "force-partial": sempre retorna partial sintético.
    if (harnessState.forcePartial) {
      writeSyntheticPartial(res);
      return;
    }

    // Modo "block-after-first-batch": 1ª chamada real (com orçamento curto
    // para partialar após 1 lote), demais viram partial sintético.
    if (harnessState.blockAfterFirstBatch) {
      if (harnessState.runCallCount > 1) {
        writeSyntheticPartial(res);
        return;
      }
      // 1ª chamada: orçamento curto → partial após 1 lote.
      const prev = process.env.INSTALLER_MAX_RUN_MS;
      process.env.INSTALLER_MAX_RUN_MS = "30";
      try {
        await runHandler(adaptReq(req, body), adaptRes(res));
      } finally {
        process.env.INSTALLER_MAX_RUN_MS = prev;
      }
      return;
    }

    // Modo default: handler real com orçamento farto.
    await runHandler(adaptReq(req, body), adaptRes(res));
    return;
  }

  if (pathname === "/api/installer/create-admin") {
    // STUB: o handler real chamaria `https://<ref>.supabase.co/rest/v1/...` e
    // `auth.admin.createUser`, endpoints do Supabase do projeto novo que não
    // são cobertos pelos fakes (apenas a Management API é). O stub espelha o
    // contrato de sucesso (200 + { ok, userId }) e marca a flag
    // installationCompleted no harness — efeito equivalente ao que o handler
    // faria em `system_config_app`.
    // Body é consumido para evitar log de "unhandled request body".
    await readRawBody(req);
    harnessState.installationCompleted = true;
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ ok: true, userId: "e2e-admin-user-id" }));
    return;
  }

  // -------------------------------------------------------------------------
  // Outras rotas API — 404
  // -------------------------------------------------------------------------

  if (pathname.startsWith("/api/")) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found", path: pathname }));
    return;
  }

  // -------------------------------------------------------------------------
  // Static + SPA fallback (incluindo query string, se houver)
  // -------------------------------------------------------------------------

  // Reconstrói path com query para assets nomeados (vite usa ?v=hash).
  void search;
  void fileURLToPath;
  serveStatic(req, res, pathname);
});

server.listen(port, host, () => {
  console.log(`[e2e-harness] ouvindo em http://${host}:${port}`);
  console.log(`[e2e-harness] fake vercel:   ${vFake.url}`);
  console.log(`[e2e-harness] fake supabase: ${sFake.url}`);
  console.log(`[e2e-harness] dist/:         ${distDir}`);
});

// Background "relógio" dos fakes: avança provisioning de projetos PENDING e
// deploys QUEUED a cada 50ms. Isso é necessário porque o `runInstaller`
// (chamado pelo handler real) faz polling DIRETO nos fakes — sem passar
// pelo roteador do harness, então o `autoAdvance()` por-request não cobra
// esse caminho. Sem isso, `waitForHealthy` e `waitForDeploymentReady` dariam
// timeout (5s/180s defaults).
const autoAdvanceTimer = setInterval(() => {
  for (const p of sFake.state.projects) {
    if (p.status === "PENDING") sFake.advanceProjectProvisioning(p.ref);
  }
  vFake.advanceDeployments();
}, 50);
autoAdvanceTimer.unref();

// Shutdown gracioso.
const shutdown = (sig: string) => {
  console.log(`[e2e-harness] ${sig} recebido, fechando...`);
  clearInterval(autoAdvanceTimer);
  server.close(() => process.exit(0));
  // Force-kill após 5s se o close pendurar.
  setTimeout(() => process.exit(1), 5000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
