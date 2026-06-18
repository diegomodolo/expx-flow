#!/usr/bin/env node
// =============================================================
// Fase 1.2.1 — Gerador do schema consolidado do auto-instalador.
//
// Concatena as migrations de `supabase/migrations/*.sql` (ordenadas por
// nome de arquivo) num único `supabase/schema/consolidated.sql` que o
// instalador aplica no Supabase recém-criado via Management API.
//
// Decisões de projeto (REFACTOR / idempotência):
//   * As migrations do Expx Flow já seguem convenção idempotente
//     (CREATE OR REPLACE FUNCTION, CREATE TABLE IF NOT EXISTS,
//      DO $$ ... EXCEPTION WHEN duplicate_object ... END $$,
//      DROP POLICY IF EXISTS antes de CREATE POLICY). Portanto a
//     concatenação pura é idempotente por construção na maioria dos
//     casos. A idempotência real num Postgres é validada no smoke-test
//     de Gate 1; este script foca em estrutura.
//   * Aplicamos UMA transformação segura adicional: `CREATE FUNCTION`
//     sem `OR REPLACE` vira `CREATE OR REPLACE FUNCTION` (idem
//     `CREATE PROCEDURE`). CREATE OR REPLACE é no-op se a função já
//     está igual; nunca quebra SQL válido.
//   * Um bloco final `-- installer seed` garante `system_config_app`
//     com coluna `installation_completed BOOLEAN NOT NULL DEFAULT false`
//     e linha singleton existente — via ALTER TABLE ADD COLUMN IF NOT
//     EXISTS + INSERT ... ON CONFLICT DO NOTHING. A instalação só
//     comuta para TRUE no fechamento (Fase 3.2 do instalador).
//
// Uso:
//   node scripts/build-consolidated-schema.mjs
//       [--migrations=<dir>]   default: supabase/migrations
//       [--output=<arquivo>]   default: supabase/schema/consolidated.sql
//
// Env equivalents (precedência: argv > env > default):
//   INSTALLER_MIGRATIONS_DIR, INSTALLER_SCHEMA_OUTPUT
// =============================================================
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = {};
  for (const arg of argv.slice(2)) {
    const m = /^--([^=]+)=(.*)$/.exec(arg);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function resolvePaths(args) {
  const migrations =
    args.migrations ||
    process.env.INSTALLER_MIGRATIONS_DIR ||
    path.join(ROOT, "supabase", "migrations");
  const output =
    args.output ||
    process.env.INSTALLER_SCHEMA_OUTPUT ||
    path.join(ROOT, "supabase", "schema", "consolidated.sql");
  return { migrations, output };
}

function listMigrationFiles(migrationsDir) {
  if (!existsSync(migrationsDir)) {
    throw new Error(`Diretório de migrations não encontrado: ${migrationsDir}`);
  }
  return readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(migrationsDir, f));
}

/**
 * Lê todos os arquivos de migration e devolve um array ordenado de
 * { name, content }. O conteúdo é devolvido cru — qualquer
 * transformação acontece em transformBody().
 */
function readMigrations(files) {
  return files.map((file) => ({
    name: path.basename(file),
    content: readFileSync(file, "utf-8"),
  }));
}

/**
 * Aplica transformações de idempotência seguras ao SQL:
 *   1. `CREATE FUNCTION` (sem OR REPLACE) -> `CREATE OR REPLACE FUNCTION`
 *   2. `CREATE PROCEDURE` (sem OR REPLACE) -> `CREATE OR REPLACE PROCEDURE`
 *
 * Não mexe em CREATE TRIGGER, CREATE POLICY, CREATE TYPE — as migrations
 * do projeto já usam DO $$ EXCEPTION / DROP ... IF EXISTS para esses.
 * A regex é ancorada em início de statement (início de linha após ;) para
 * evitar capturar tokens em comentários ou strings.
 */
function transformBody(sql) {
  return sql
    .replace(
      /(^|\n|\;)\s*CREATE\s+(?!OR REPLACE)(FUNCTION|PROCEDURE)\b/gi,
      "$1 CREATE OR REPLACE $2"
    )
    .replace(/\n CREATE OR REPLACE/g, "\nCREATE OR REPLACE");
}

/**
 * Hash sha256 agregado do conjunto de migrations — usado pelo
 * `check-schema-fresh.mjs` para detectar desatualização do schema
 * consolidado em relação ao diretório fonte.
 *
 * Combina (nome + conteúdo) para que tanto renomear quanto editar uma
 * migration invalidem o schema.
 */
function computeSourceHash(migrations) {
  const h = createHash("sha256");
  for (const m of migrations) {
    h.update(m.name, "utf-8");
    h.update("\u0000");
    h.update(m.content, "utf-8");
    h.update("\u0000");
  }
  return h.digest("hex");
}

const INSTALLER_SEED = `-- =====================================================
-- Installer seed (idempotente) — adicionado automaticamente.
-- Garante que system_config_app tenha a coluna installation_completed
-- como FALSE até que o instalador a marque TRUE (Fase 3.2).
-- Referência: docs/onboarding-installer/00-ORQUESTRADOR.md §1.
-- =====================================================
ALTER TABLE public.system_config_app
  ADD COLUMN IF NOT EXISTS installation_completed BOOLEAN NOT NULL DEFAULT false;

INSERT INTO public.system_config_app (id, installation_completed)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;
`;

function buildHeader({ generatedAt, count, sourceHash }) {
  return [
    "-- =====================================================",
    "-- AUTO-GERADO por scripts/build-consolidated-schema.mjs",
    "-- NÃO EDITAR — regenere via: npm run build:schema",
    `-- Gerado em: ${generatedAt}`,
    `-- Migrations fonte: ${count} arquivo(s)`,
    `-- Source-Hash: ${sourceHash}`,
    "--",
    "-- Idempotência: as migrations fonte seguem a convenção do Expx Flow",
    "-- (CREATE OR REPLACE, IF NOT EXISTS, DO $$ EXCEPTION, DROP ... IF EXISTS).",
    "-- Transformações aplicadas neste build:",
    "--   * CREATE FUNCTION -> CREATE OR REPLACE FUNCTION",
    "--   * CREATE PROCEDURE -> CREATE OR REPLACE PROCEDURE",
    "--   * Bloco final installer seed (idempotente).",
    "-- A idempotência real é confirmada no smoke-test do Gate 1.",
    "-- =====================================================",
    "",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv);
  const { migrations: migrationsDir, output } = resolvePaths(args);

  const files = listMigrationFiles(migrationsDir);
  if (files.length === 0) {
    throw new Error(`Nenhuma migration .sql encontrada em: ${migrationsDir}`);
  }

  const migrations = readMigrations(files);
  const sourceHash = computeSourceHash(migrations);
  const generatedAt = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const sections = [];
  for (const m of migrations) {
    sections.push(
      `-- >>> Migration: ${m.name} <<<\n` + transformBody(m.content).trim()
    );
  }
  sections.push("-- >>> Installer seed <<<\n" + INSTALLER_SEED.trim());

  const header = buildHeader({
    generatedAt,
    count: migrations.length,
    sourceHash,
  });
  const body = sections.join("\n\n\n") + "\n";
  const out = header + body;

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, out, "utf-8");

  const sizeKb = Math.round((out.length / 1024) * 10) / 10;
  process.stdout.write(
    `[build:schema] ${migrations.length} migrations -> ${path.relative(ROOT, output)} (${sizeKb} KB)\n` +
      `[build:schema] source-hash=${sourceHash}\n`
  );
}

// Permite `import` em testes (sem efeito colateral se só importado).
const __testExports = {
  parseArgs,
  resolvePaths,
  listMigrationFiles,
  readMigrations,
  transformBody,
  computeSourceHash,
  buildHeader,
  INSTALLER_SEED,
};

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (err) {
    process.stderr.write(`[build:schema] ERRO: ${err.message}\n`);
    process.exit(1);
  }
}

export { main, __testExports as internals };
