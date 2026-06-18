import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  existsSync,
  readdirSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const CHECK_SCRIPT = path.join(ROOT, "scripts", "check-schema-fresh.mjs");
const BUILD_SCRIPT = path.join(
  ROOT,
  "scripts",
  "build-consolidated-schema.mjs",
);
const FIXTURE_MIGRATIONS = path.join(__dirname, "fixtures", "migrations");

const TMP_DIR = path.join(__dirname, "..", ".tmp-check-schema-test");

function node(): string {
  return process.execPath;
}

function runScript(script: string, args: string[]) {
  return execFileSync(node(), [script, ...args], {
    cwd: ROOT,
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runScriptAllowFail(script: string, args: string[]) {
  try {
    const stdout = execFileSync(node(), [script, ...args], {
      cwd: ROOT,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout };
  } catch (err) {
    const e = err as { status?: number; stdout?: string };
    return { code: e.status ?? 1, stdout: e.stdout ?? "" };
  }
}

describe("check-schema-fresh.mjs (Fase 1.2.2)", () => {
  beforeAll(() => {
    mkdirSync(TMP_DIR, { recursive: true });
  });

  afterAll(() => {
    rmSync(TMP_DIR, { recursive: true, force: true });
  });

  it("sai 0 quando consolidated.sql está sincronizado com as migrations", () => {
    const schemaFile = path.join(TMP_DIR, "fresh-sync.sql");
    runScript(BUILD_SCRIPT, [
      `--migrations=${FIXTURE_MIGRATIONS}`,
      `--output=${schemaFile}`,
    ]);
    expect(existsSync(schemaFile)).toBe(true);

    const result = runScriptAllowFail(CHECK_SCRIPT, [
      `--migrations=${FIXTURE_MIGRATIONS}`,
      `--schema=${schemaFile}`,
    ]);
    expect(result.code).toBe(0);
  });

  it("sai != 0 quando uma migration é modificada e o schema não é regenerado", () => {
    // 1. Build inicial synchronizado.
    const migrationsOriginal = FIXTURE_MIGRATIONS;
    const tamperedDir = path.join(TMP_DIR, "tampered-migrations");
    rmSync(tamperedDir, { recursive: true, force: true });
    mkdirSync(tamperedDir, { recursive: true });

    // Copia fixtures para diretório temporário.
    for (const f of readFileSyncList(migrationsOriginal)) {
      const dest = path.join(tamperedDir, path.basename(f));
      writeFileSync(dest, readFileSync(f, "utf-8"), "utf-8");
    }

    const schemaFile = path.join(TMP_DIR, "fresh-tampered.sql");
    runScript(BUILD_SCRIPT, [
      `--migrations=${tamperedDir}`,
      `--output=${schemaFile}`,
    ]);

    // 2. Modifica uma migration sem regenerar o schema.
    const target = path.join(
      tamperedDir,
      "20250101000003_create_companies_table.sql",
    );
    const original = readFileSync(target, "utf-8");
    writeFileSync(target, original + "\n-- ALTERACAO DE TESTE\n", "utf-8");

    // 3. Verifica que o check falha.
    const result = runScriptAllowFail(CHECK_SCRIPT, [
      `--migrations=${tamperedDir}`,
      `--schema=${schemaFile}`,
    ]);
    expect(result.code).not.toBe(0);

    // Limpeza: restaura conteúdo.
    writeFileSync(target, original, "utf-8");
  });

  it("sai != 0 quando consolidated.sql não existe", () => {
    const missing = path.join(TMP_DIR, "nao-existe.sql");
    rmSync(missing, { force: true });
    const result = runScriptAllowFail(CHECK_SCRIPT, [
      `--migrations=${FIXTURE_MIGRATIONS}`,
      `--schema=${missing}`,
    ]);
    expect(result.code).not.toBe(0);
  });

  it("sai != 0 quando header não contém Source-Hash", () => {
    const schemaFile = path.join(TMP_DIR, "sem-hash.sql");
    writeFileSync(
      schemaFile,
      "-- schema manual sem hash\nCREATE TABLE foo ();\n",
      "utf-8",
    );
    const result = runScriptAllowFail(CHECK_SCRIPT, [
      `--migrations=${FIXTURE_MIGRATIONS}`,
      `--schema=${schemaFile}`,
    ]);
    expect(result.code).not.toBe(0);
  });
});

function readFileSyncList(dir: string): string[] {
  return readdirSync(dir)
    .filter((f: string) => f.endsWith(".sql"))
    .sort()
    .map((f: string) => path.join(dir, f));
}
