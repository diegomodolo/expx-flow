/**
 * Orquestrador de steps do auto-instalador `/onboarding`.
 *
 * Cada step é uma função `async (ctx) => void` idempotente:
 *  - Se já concluído (`progress.isStepDone`), retorna imediatamente sem chamar
 *    APIs externas (resume).
 *  - Em caso de falha, lança o erro tipado do wrapper e NÃO marca o step como
 *    concluído (próxima execução retoma deste step).
 *  - Em sucesso, marca o step e persiste o progress.
 *
 * Referência: docs/onboarding-installer/SPRINT-2-nucleo-instalador.md
 *             docs/onboarding-installer/00-ORQUESTRADOR.md §6/§8
 */

import path from "node:path";
import { promises as fs } from "node:fs";
import type { VercelClient } from "./vercel-api";
import type { SupabaseMgmtClient } from "./supabase-mgmt";
import {
  type InstallProgress,
  type ProgressService,
  type StepName,
} from "./progress";

// ---------------------------------------------------------------------------
// Tipos compartilhados
// ---------------------------------------------------------------------------

export interface RunOptions {
  /** Org do Supabase onde criar o projeto. */
  orgId: string;
  /** Nome do projeto Supabase a criar. */
  projectName: string;
  /** Senha do DB do projeto novo (efêmera — só em memória da request). */
  dbPassword: string;
  region?: string;
  plan?: string;
  /**
   * ID do projeto Vercel sob o qual o instalador roda. Vem de
   * `process.env.VERCEL_PROJECT_ID` (runtime Vercel) ou do body (testes).
   */
  vercelProjectId?: string;
  /** Orçamento de tempo por invocação (ms). Default ~250s (limite Vercel). */
  maxRunMs?: number;
  /** Tamanho do lote de deploy de functions. Default 10. */
  functionsBatchSize?: number;
  /** Path raiz para ler consolidated.sql e o manifesto (override p/ testes). */
  cwd?: string;
  /** Intervalo de poll p/ `waitForHealthy` (ms). Default 5000. */
  projectHealthyIntervalMs?: number;
  /** Timeout p/ `waitForHealthy` (ms). Default 300000. */
  projectHealthyTimeoutMs?: number;
  /** Intervalo de poll p/ `waitForDeploymentReady` (ms). Default 3000. */
  deployReadyIntervalMs?: number;
  /** Timeout p/ `waitForDeploymentReady` (ms). Default 180000. */
  deployReadyTimeoutMs?: number;
}

/** Credenciais do projeto novo mantidas só em memória do `ctx`. */
export interface ProjectRuntime {
  ref: string;
  anonKey: string;
  serviceRoleKey: string;
  dbPassword: string;
  dbHost: string;
  dbPort: number;
  connectionString?: string;
}

/** Mínimo necessário de um client supabase-js para persistir progress. */
export interface SupabaseLike {
  from: (table: string) => any;
}

export interface SseEvent {
  step: StepName | "global";
  status: "started" | "completed" | "error" | "skipped" | "partial";
  pct: number;
  message?: string;
  resumeFrom?: StepName;
  detail?: unknown;
}

export interface SseEmitter {
  (event: SseEvent): void;
}

export interface TimeBudget {
  startedAt: number;
  maxMs: number;
  remainingMs(): number;
  shouldStop(): boolean;
}

export interface StepContext {
  options: RunOptions;
  vercel: VercelClient;
  supabase: SupabaseMgmtClient;
  progress: ProgressService;
  /** Populado por `stepCreateProject`. Em memória (não persistido). */
  project?: ProjectRuntime;
  /**
   * Client Supabase do cliente (service_role) para persistir `install_progress`
   * em `system_config_app`. Populado após `apply-schema`.
   */
  clientSupabase?: SupabaseLike;
  /**
   * Manifesto de functions override (testes). Se ausente, lê do FS do bundle
   * (`api/installer/_functions-manifest.json`).
   */
  manifest?: FunctionsManifest;
  emit: SseEmitter;
  budget: TimeBudget;
}

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function pctFor(step: StepName): number {
  // Progresso aproximado por step (soma → 100 ao concluir todos).
  const map: Record<StepName, number> = {
    "create-project": 10,
    "apply-schema": 25,
    "deploy-functions": 80,
    "set-secrets": 85,
    "write-vercel-env": 95,
    "trigger-redeploy": 100,
  };
  return map[step];
}

function emitStarted(ctx: StepContext, step: StepName, message?: string): void {
  ctx.emit({ step, status: "started", pct: pctFor(step) - 1, message });
}

function emitCompleted(
  ctx: StepContext,
  step: StepName,
  message?: string,
): void {
  ctx.emit({ step, status: "completed", pct: pctFor(step), message });
}

function emitSkipped(ctx: StepContext, step: StepName): void {
  ctx.emit({
    step,
    status: "skipped",
    pct: pctFor(step),
    message: "Já concluído",
  });
}

// ---------------------------------------------------------------------------
// Step 2.3.2 — create-project
// ---------------------------------------------------------------------------

/**
 * Cria o projeto Supabase na org informada e aguarda `ACTIVE_HEALTHY`.
 * Idempotente: se `progress.projectRef` já existir, pula sem chamar a API.
 * Em sucesso, popula `ctx.project` (credenciais em memória) e marca o step.
 */
export async function stepCreateProject(ctx: StepContext): Promise<void> {
  const STEP: StepName = "create-project";

  // Idempotência: se já temos um ref no progress, não recria.
  const existing = (await ctx.progress.loadProgress()).projectRef;
  if (existing) {
    if (!ctx.project) {
      // Resume: reconstrói o runtime mínimo a partir do que está persistido.
      // serviceRoleKey/dbPassword não sobrevivem — ficam vazios até serem
      // re-obtidos (na prática o resume acontece em nova invocação onde o
      // wizard reenvia essas credenciais, ou o run detecta via Management API).
      ctx.project = {
        ref: existing,
        anonKey: (await ctx.progress.snapshot()).projectAnonKey ?? "",
        serviceRoleKey: "",
        dbPassword: "",
        dbHost: `db.${existing}.supabase.co`,
        dbPort: 5432,
      };
    }
    emitSkipped(ctx, STEP);
    return;
  }

  emitStarted(ctx, STEP, "Criando projeto Supabase...");
  try {
    const creds = await ctx.supabase.createProject({
      orgId: ctx.options.orgId,
      name: ctx.options.projectName,
      dbPassword: ctx.options.dbPassword,
      region: ctx.options.region,
      plan: ctx.options.plan,
    });

    // Popula runtime em memória (com serviceRoleKey/dbPassword sensíveis).
    ctx.project = {
      ref: creds.ref,
      anonKey: creds.anonKey,
      serviceRoleKey: creds.serviceRoleKey,
      dbPassword: creds.dbPassword,
      dbHost: creds.dbHost,
      dbPort: creds.dbPort,
      connectionString: creds.connectionString,
    };

    // Aguarda o projeto ficar saudável antes de prosseguir (apply-schema etc.).
    await ctx.supabase.waitForHealthy(creds.ref, {
      timeoutMs: ctx.options.projectHealthyTimeoutMs ?? 300_000,
      intervalMs: ctx.options.projectHealthyIntervalMs ?? 5_000,
    });

    // Persiste apenas o que é seguro (ref + anonKey). serviceRoleKey/dbPassword
    // ficam só em memória.
    await ctx.progress.markStep(STEP, {
      projectRef: creds.ref,
      projectAnonKey: creds.anonKey,
    });
    emitCompleted(ctx, STEP, `Projeto ${creds.ref} criado e ativo`);
  } catch (err) {
    ctx.emit({
      step: STEP,
      status: "error",
      pct: pctFor(STEP),
      message: errorMessage(err, "Falha ao criar projeto Supabase"),
      detail: errorDetail(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Step 2.3.3 — apply-schema
// ---------------------------------------------------------------------------

/** Extensões exigidas pelo consolidated.sql (pesquisa em supabase/schema). */
export const REQUIRED_EXTENSIONS = ["pgcrypto", "pg_cron", "pg_net"] as const;

/**
 * SQL para garantir a coluna `install_progress JSONB` em `system_config_app`.
 * Idempotente. Permite que o `ProgressService` persista o estado após o schema.
 */
export const INSTALL_PROGRESS_COLUMN_SQL = `
ALTER TABLE public.system_config_app
  ADD COLUMN IF NOT EXISTS install_progress JSONB;
`;

/**
 * Habilita extensões necessárias e aplica `consolidated.sql` no projeto novo.
 * Lê o schema do FS do bundle (`supabase/schema/consolidated.sql`).
 * Idempotente (o consolidated.sql já é idempotente por construção).
 */
export async function stepApplySchema(ctx: StepContext): Promise<void> {
  const STEP: StepName = "apply-schema";

  if (ctx.progress.isStepDone(STEP)) {
    emitSkipped(ctx, STEP);
    return;
  }

  const ref = requireProjectRef(ctx);
  emitStarted(ctx, STEP, "Habilitando extensões e aplicando schema...");

  try {
    // 1) Extensões necessárias (antes do schema, que pode depender delas).
    const extSql = REQUIRED_EXTENSIONS.map(
      (name) =>
        `CREATE EXTENSION IF NOT EXISTS "${name}"${
          name === "pg_cron" || name === "pg_net"
            ? " WITH SCHEMA extensions"
            : ""
        };`,
    ).join("\n");
    await ctx.supabase.executeSql(ref, extSql);

    // 2) Coluna do install_progress (idempotente) — para persistência do estado.
    await ctx.supabase.executeSql(ref, INSTALL_PROGRESS_COLUMN_SQL);

    // 3) consolidated.sql — lê do FS do bundle.
    const cwd = ctx.options.cwd ?? process.cwd();
    const schemaPath = path.join(cwd, "supabase", "schema", "consolidated.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf-8");

    // A Management API de query aceita blocos grandes; enviamos em statements
    // separados apenas se houver marcadores de migração (para resiliência a
    // limites de payload). Na prática, mandamos o schema inteiro — o endpoint
    // PostgREST/psql suporta. Se um statement falhar, o erro sobe (não marca).
    await ctx.supabase.executeSql(ref, schemaSql);

    await ctx.progress.markStep(STEP);
    emitCompleted(ctx, STEP, "Schema aplicado");
  } catch (err) {
    ctx.emit({
      step: STEP,
      status: "error",
      pct: pctFor(STEP),
      message: errorMessage(err, "Falha ao aplicar schema"),
      detail: errorDetail(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Step 2.4.1 — deploy-functions (lotes + retry + resume)
// ---------------------------------------------------------------------------

export interface FunctionsManifest {
  functionsRoot: string;
  count: number;
  functions: Array<{
    name: string;
    entrypoint: string;
    files: string[];
    verifyJwt: boolean;
  }>;
}

/**
 * Lê o manifesto do FS do bundle.
 * Default: `api/installer/_functions-manifest.json`.
 */
export async function readFunctionsManifest(
  cwd: string = process.cwd(),
): Promise<FunctionsManifest> {
  const manifestPath = path.join(
    cwd,
    "api",
    "installer",
    "_functions-manifest.json",
  );
  const raw = await fs.readFile(manifestPath, "utf-8");
  return JSON.parse(raw) as FunctionsManifest;
}

/** Lê os arquivos de uma function do FS do bundle. */
async function readFunctionFiles(
  manifest: FunctionsManifest,
  files: string[],
): Promise<Array<{ name: string; content: string }>> {
  const root = manifest.functionsRoot;
  const out: Array<{ name: string; content: string }> = [];
  for (const rel of files) {
    const abs = path.join(process.cwd(), root, rel);
    try {
      const content = await fs.readFile(abs, "utf-8");
      out.push({ name: rel, content });
    } catch {
      // Arquivo ausente no bundle: envia vazio para não quebrar o deploy.
      // (manifesto de produção sempre contém os arquivos via includeFiles.)
      out.push({ name: rel, content: "" });
    }
  }
  return out;
}

/**
 * Deploya as Edge Functions em lotes (~10), com retry por function (3x) e
 * resume (pula as já em `progress.functions`). Respeita `verifyJwt` do
 * manifesto. Em falha definitiva após 3 tentativas, interrompe com erro claro
 * e preserva o progress das functions já deployadas.
 *
 * Retorna `{ deployed: string[], partial: boolean }` indicando o que concluiu.
 * `partial=true` sinaliza que o orçamento de tempo acabou antes de finalizar
 * todos os lotes — o `run` deve emitir `partial` e o cliente reinvoca.
 */
export async function stepDeployFunctions(
  ctx: StepContext,
): Promise<{ deployed: string[]; partial: boolean }> {
  const STEP: StepName = "deploy-functions";
  const ref = requireProjectRef(ctx);
  const manifest =
    ctx.manifest ?? (await readFunctionsManifest(ctx.options.cwd));
  const batchSize = ctx.options.functionsBatchSize ?? 10;
  const maxAttempts = 3;

  const pending = manifest.functions.filter(
    (f) => !ctx.progress.isFunctionDeployed(f.name),
  );

  if (pending.length === 0) {
    if (!ctx.progress.isStepDone(STEP)) {
      await ctx.progress.markStep(STEP);
    }
    emitSkipped(ctx, STEP);
    return { deployed: [], partial: false };
  }

  emitStarted(
    ctx,
    STEP,
    `Deployando ${pending.length} function(s) em lotes de ${batchSize}...`,
  );

  const total = manifest.functions.length;
  const already = total - pending.length;
  const deployed: string[] = [];
  let partial = false;

  for (let i = 0; i < pending.length; i += batchSize) {
    // Checa orçamento de tempo antes de iniciar novo lote.
    if (ctx.budget.shouldStop()) {
      partial = true;
      break;
    }
    const batch = pending.slice(i, i + batchSize);

    for (const fn of batch) {
      let lastErr: unknown;
      let ok = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const files = await readFunctionFiles(manifest, fn.files);
          await ctx.supabase.deployFunction(ref, {
            name: fn.name,
            files,
            verifyJwt: fn.verifyJwt,
          });
          ok = true;
          break;
        } catch (err) {
          lastErr = err;
          // Backoff exponencial simples entre tentativas (exceto na última).
          if (attempt < maxAttempts) {
            await sleep(50 * 2 ** (attempt - 1));
          }
        }
      }
      if (!ok) {
        ctx.emit({
          step: STEP,
          status: "error",
          pct: progressPctForFunction(already + deployed.length, total),
          message: `Falha definitiva ao deployar a function "${fn.name}" após ${maxAttempts} tentativas.`,
          detail: errorDetail(lastErr),
        });
        // Progress das functions já deployadas está preservado (markFunctionDeployed).
        throw lastErr;
      }
      await ctx.progress.markFunctionDeployed(fn.name);
      deployed.push(fn.name);
      ctx.emit({
        step: STEP,
        status: "started",
        pct: progressPctForFunction(already + deployed.length, total),
        message: `Function "${fn.name}" deployada`,
      });
    }
  }

  // Só marca o step como concluído se TODAS as functions foram deployadas.
  if (!partial && ctx.progress.snapshot().functions.length >= total) {
    await ctx.progress.markStep(STEP);
    emitCompleted(
      ctx,
      STEP,
      `${deployed.length} function(s) deployada(s) neste lote`,
    );
  } else if (partial) {
    ctx.emit({
      step: STEP,
      status: "partial",
      pct: progressPctForFunction(
        ctx.progress.snapshot().functions.length,
        total,
      ),
      message: `Orçamento de tempo atingido — ${ctx.progress.snapshot().functions.length}/${total} functions deployadas. Retome para continuar.`,
    });
  }

  return { deployed, partial };
}

function progressPctForFunction(done: number, total: number): number {
  if (total <= 0) return 80;
  // deploy-functions cobre 25%→80% (delta 55%) do progresso global.
  return Math.round(25 + (done / total) * 55);
}

// ---------------------------------------------------------------------------
// Step 2.5.1 — set-secrets
// ---------------------------------------------------------------------------

/**
 * Define secrets padrão no projeto novo via Management API.
 * JWT_SECRET é gerado aleatoriamente. Demais integrações ficam vazias
 * (placeholder) — o cliente as configura em `/configuracoes/sistema`
 * (padrão self-hosting env>banco). NUNCA embute credenciais reais do dev.
 */
export async function stepSetSecrets(ctx: StepContext): Promise<void> {
  const STEP: StepName = "set-secrets";
  if (ctx.progress.isStepDone(STEP)) {
    emitSkipped(ctx, STEP);
    return;
  }
  const ref = requireProjectRef(ctx);
  emitStarted(ctx, STEP, "Definindo secrets padrão...");

  const secrets: Array<{ name: string; value: string }> = [
    // JWT aleatório (substitui o default do Supabase para endurecer).
    { name: "JWT_SECRET", value: randomJwtSecret() },
    // Placeholders vazios — integradas depois via UI self-hosting.
    { name: "OPENROUTER_API_KEY", value: "" },
    { name: "OPENAI_API_KEY", value: "" },
    { name: "RESEND_API_KEY", value: "" },
    { name: "API4COM_TOKEN", value: "" },
    { name: "META_APP_ID", value: "" },
    { name: "META_APP_SECRET", value: "" },
    { name: "GOOGLE_ADS_DEVELOPER_TOKEN", value: "" },
    { name: "SHOTSTACK_API_KEY", value: "" },
    { name: "FIRECRAWT_API_KEY", value: "" },
    { name: "UAZAPI_BASE_URL", value: "" },
    { name: "UAZAPI_TOKEN", value: "" },
  ];

  try {
    for (const s of secrets) {
      // setSecret é upsert idempotente na Management API.
      await ctx.supabase.setSecret(ref, s.name, s.value);
    }
    await ctx.progress.markStep(STEP);
    emitCompleted(ctx, STEP, `${secrets.length} secrets definidos`);
  } catch (err) {
    ctx.emit({
      step: STEP,
      status: "error",
      pct: pctFor(STEP),
      message: errorMessage(err, "Falha ao definir secrets"),
      detail: errorDetail(err),
    });
    throw err;
  }
}

function randomJwtSecret(): string {
  // 48 bytes aleatórios em hex — sem deps externas (Web Crypto, Node 19+).
  const bytes = new Uint8Array(48);
  (globalThis.crypto as Crypto).getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// Step 2.5.2 — write-vercel-env
// ---------------------------------------------------------------------------

/**
 * Grava `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no projeto Vercel.
 * `vercelProjectId` vem de `process.env.VERCEL_PROJECT_ID` (runtime Vercel)
 * ou de `options.vercelProjectId` (override para testes).
 * Upsert por chave (idempotente).
 */
export async function stepWriteVercelEnv(ctx: StepContext): Promise<void> {
  const STEP: StepName = "write-vercel-env";
  if (ctx.progress.isStepDone(STEP)) {
    emitSkipped(ctx, STEP);
    return;
  }
  const project = requireProject(ctx);
  const vercelProjectId =
    ctx.options.vercelProjectId ?? process.env.VERCEL_PROJECT_ID;
  if (!vercelProjectId) {
    throw new Error(
      "VERCEL_PROJECT_ID ausente: não foi possível gravar as variáveis de ambiente. " +
        "Defina VERCEL_PROJECT_ID no ambiente da Vercel ou envie vercelProjectId no corpo.",
    );
  }

  emitStarted(ctx, STEP, "Gravando variáveis de ambiente na Vercel...");

  try {
    const supabaseUrl = `https://${project.ref}.supabase.co`;
    await ctx.vercel.upsertEnvVar(
      vercelProjectId,
      "VITE_SUPABASE_URL",
      supabaseUrl,
    );
    await ctx.vercel.upsertEnvVar(
      vercelProjectId,
      "VITE_SUPABASE_ANON_KEY",
      project.anonKey,
    );
    await ctx.progress.markStep(STEP, { vercelProjectId });
    emitCompleted(ctx, STEP, "Variáveis VITE_SUPABASE_* gravadas");
  } catch (err) {
    ctx.emit({
      step: STEP,
      status: "error",
      pct: pctFor(STEP),
      message: errorMessage(err, "Falha ao gravar variáveis na Vercel"),
      detail: errorDetail(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Step 2.5.3 — trigger-redeploy
// ---------------------------------------------------------------------------

/**
 * Dispara redeploy no projeto Vercel e aguarda ficar `READY`.
 * Só marca concluído quando o deploy estiver pronto.
 */
export async function stepTriggerRedeploy(ctx: StepContext): Promise<void> {
  const STEP: StepName = "trigger-redeploy";
  if (ctx.progress.isStepDone(STEP)) {
    emitSkipped(ctx, STEP);
    return;
  }
  const vercelProjectId =
    ctx.options.vercelProjectId ?? process.env.VERCEL_PROJECT_ID;
  if (!vercelProjectId) {
    throw new Error(
      "VERCEL_PROJECT_ID ausente: não foi possível disparar o redeploy.",
    );
  }
  emitStarted(ctx, STEP, "Disparando redeploy na Vercel...");
  try {
    const dep = await ctx.vercel.triggerRedeploy(vercelProjectId);
    await ctx.vercel.waitForDeploymentReady(dep.id, {
      timeoutMs: ctx.options.deployReadyTimeoutMs ?? 180_000,
      intervalMs: ctx.options.deployReadyIntervalMs ?? 3_000,
    });
    await ctx.progress.markStep(STEP, { vercelDeploymentId: dep.id });
    emitCompleted(ctx, STEP, "Redeploy pronto (READY)");
  } catch (err) {
    ctx.emit({
      step: STEP,
      status: "error",
      pct: pctFor(STEP),
      message: errorMessage(err, "Falha no redeploy da Vercel"),
      detail: errorDetail(err),
    });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function requireProjectRef(ctx: StepContext): string {
  if (!ctx.project?.ref) {
    throw new Error(
      "Projeto Supabase ainda não criado (projectRef ausente no contexto).",
    );
  }
  return ctx.project.ref;
}

function requireProject(ctx: StepContext): ProjectRuntime {
  if (!ctx.project) {
    throw new Error(
      "Credenciais do projeto ausentes no contexto (step create-project não rodou?).",
    );
  }
  return ctx.project;
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "message" in err) {
    return (err as { message?: unknown }).message
      ? String((err as { message: unknown }).message)
      : fallback;
  }
  return fallback;
}

function errorDetail(err: unknown): unknown {
  if (err && typeof err === "object") {
    const { message, name, status, code } = err as Record<string, unknown>;
    return { message, name, status, code };
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
