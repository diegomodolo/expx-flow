import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "build-consolidated-schema.mjs");
const FIXTURE_MIGRATIONS = path.join(__dirname, "fixtures", "migrations");

const TMP_DIR = path.join(__dirname, "..", ".tmp-build-schema-test");
const OUTPUT_FILE = path.join(TMP_DIR, "consolidated.sql");

function node(): string {
  return process.execPath;
}

function runBuilder(opts: { migrations: string; output: string }) {
  const args = [
    SCRIPT,
    `--migrations=${opts.migrations}`,
    `--output=${opts.output}`,
  ];
  return execFileSync(node(), args, {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

describe("build-consolidated-schema.mjs (Fase 1.2.1)", () => {
  beforeAll(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("gera consolidated.sql a partir das migrations de fixture", () => {
    runBuilder({ migrations: FIXTURE_MIGRATIONS, output: OUTPUT_FILE });
    expect(existsSync(OUTPUT_FILE)).toBe(true);
  });

  it("contém header AUTO-GERADO com aviso e timestamp", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/AUTO-GERADO/i);
    expect(sql).toMatch(/N[ÃA]O EDITAR/i);
    expect(sql).toMatch(/Gerado em:/);
  });

  it("contém hash das migrations fonte no header", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/Source-Hash:\s*[a-f0-9]{64}/i);
  });

  it("contém as extensões das migrations", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/CREATE EXTENSION IF NOT EXISTS pgcrypto/);
    expect(sql).toMatch(/pg_cron/);
  });

  it("contém o enum menu_item_type", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/menu_item_type/);
    expect(sql).toMatch(/CREATE TYPE/);
  });

  it("contém a função SECURITY DEFINER get_user_company_ids", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/get_user_company_ids/);
    expect(sql).toMatch(/SECURITY DEFINER/);
  });

  it("contém a tabela companies com RLS habilitada", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/CREATE TABLE.*public\.companies/s);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
  });

  it("contém policies RLS", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/CREATE POLICY/);
    expect(sql).toMatch(/companies_select_own/);
  });

  it("contém GRANT para authenticated", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(
      /GRANT SELECT, INSERT, UPDATE, DELETE ON public\.companies TO authenticated/,
    );
  });

  it("contém seed idempotente de system_config com installation_completed = false", () => {
    const sql = readFileSync(OUTPUT_FILE, "utf-8");
    expect(sql).toMatch(/installation_completed/i);
    expect(sql).toMatch(
      /ALTER TABLE public\.system_config_app[\s\S]*ADD COLUMN IF NOT EXISTS installation_completed/i,
    );
    expect(sql).toMatch(
      /INSERT INTO public\.system_config_app[\s\S]*installation_completed[\s\S]*ON CONFLICT.*DO NOTHING/i,
    );
    expect(sql).toMatch(/installation_completed[\s\S]*false/i);
  });

  it("aplica transformação CREATE FUNCTION -> CREATE OR REPLACE FUNCTION (idempotência)", () => {
    const raw = readFileSync(OUTPUT_FILE, "utf-8");
    // Ignora linhas de comentário SQL ao verificar a transformação.
    const code = raw
      .split("\n")
      .filter((l) => !l.trimStart().startsWith("--"))
      .join("\n");
    expect(code).not.toMatch(/(^|[\s;])CREATE\s+FUNCTION(?!\s+OR REPLACE)/im);
  });

  it("gera saída determinística: rodar 2x produz o mesmo hash", () => {
    const out1 = path.join(TMP_DIR, "consolidated-1.sql");
    const out2 = path.join(TMP_DIR, "consolidated-2.sql");
    runBuilder({ migrations: FIXTURE_MIGRATIONS, output: out1 });
    runBuilder({ migrations: FIXTURE_MIGRATIONS, output: out2 });

    const hash1 = createHash("sha256").update(readFileSync(out1)).digest("hex");
    const hash2 = createHash("sha256").update(readFileSync(out2)).digest("hex");
    expect(hash1).toBe(hash2);
  });
});
