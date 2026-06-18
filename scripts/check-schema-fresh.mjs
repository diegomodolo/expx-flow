// =============================================================
// Fase 1.2.2 — Verifica se `consolidated.sql` está atualizado
// em relação às migrations fonte.
//
// Estratégia: recomputa o hash agregado (sha256) do mesmo jeito
// que `build-consolidated-schema.mjs` e compara com o hash embutido
// no header do arquivo gerado (`-- Source-Hash: <hex>`). Sai 0 se
// sincronizado, != 0 caso contrário (ou se o arquivo não existir,
// ou se faltar o header).
//
// Uso:
//   node scripts/check-schema-fresh.mjs
//       [--migrations=<dir>]   default: supabase/migrations
//       [--schema=<arquivo>]   default: supabase/schema/consolidated.sql
//
// Plugar em CI/gate é responsabilidade do orquestrador. Aqui o script
// é standalone e determinístico (sem side-effects).
// =============================================================
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
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
  const schema =
    args.schema ||
    process.env.INSTALLER_SCHEMA_OUTPUT ||
    path.join(ROOT, "supabase", "schema", "consolidated.sql");
  return { migrations, schema };
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

function computeSourceHash(files) {
  const h = createHash("sha256");
  for (const f of files) {
    h.update(path.basename(f), "utf-8");
    h.update("\u0000");
    h.update(readFileSync(f, "utf-8"), "utf-8");
    h.update("\u0000");
  }
  return h.digest("hex");
}

function extractEmbeddedHash(schemaContent) {
  const m = /^--\s*Source-Hash:\s*([a-f0-9]{64})\s*$/im.exec(schemaContent);
  return m ? m[1] : null;
}

function main() {
  const args = parseArgs(process.argv);
  const { migrations: migrationsDir, schema: schemaFile } = resolvePaths(args);

  if (!existsSync(schemaFile)) {
    process.stderr.write(
      `[check:schema] consolidated.sql não encontrado: ${schemaFile}\n` +
        `[check:schema] Rode: npm run build:schema\n`
    );
    return 2;
  }

  const files = listMigrationFiles(migrationsDir);
  if (files.length === 0) {
    process.stderr.write(
      `[check:schema] Nenhuma migration em: ${migrationsDir}\n`
    );
    return 3;
  }

  const expected = computeSourceHash(files);
  const schemaContent = readFileSync(schemaFile, "utf-8");
  const embedded = extractEmbeddedHash(schemaContent);

  if (!embedded) {
    process.stderr.write(
      `[check:schema] Header 'Source-Hash' ausente em ${schemaFile}.\n` +
        `[check:schema] Rode: npm run build:schema\n`
    );
    return 4;
  }

  if (embedded !== expected) {
    process.stderr.write(
      `[check:schema] Schema DESATUALIZADO.\n` +
        `[check:schema]   esperado: ${expected}\n` +
        `[check:schema]   no schema: ${embedded}\n` +
        `[check:schema] Rode: npm run build:schema\n`
    );
    return 1;
  }

  process.stdout.write(
    `[check:schema] OK — consolidated.sql sincronizado (${files.length} migrations, hash=${expected.slice(0, 12)}…)\n`
  );
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const code = main();
    process.exit(code);
  } catch (err) {
    process.stderr.write(`[check:schema] ERRO: ${err.message}\n`);
    process.exit(1);
  }
}

export { main, parseArgs, resolvePaths, computeSourceHash, extractEmbeddedHash };
