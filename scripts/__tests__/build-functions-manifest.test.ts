import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// @ts-expect-error - modulo .mjs sem declaracoes de tipo
import {
  parseVerifyJwtMap,
  generateManifest,
} from "../build-functions-manifest.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, "fixtures");
const FIXTURE_FUNCTIONS = path.resolve(FIXTURES, "functions");
const FIXTURE_CONFIG = path.resolve(FIXTURES, "config.toml");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REAL_FUNCTIONS = path.resolve(REPO_ROOT, "supabase", "functions");
const REAL_CONFIG = path.resolve(REPO_ROOT, "supabase", "config.toml");

interface ManifestEntry {
  name: string;
  entrypoint: string;
  files: string[];
  verifyJwt: boolean;
}

describe("parseVerifyJwtMap", () => {
  it("extrai verify_jwt=false de functions com a flag explicita e omite as demais", () => {
    const toml = fs.readFileSync(FIXTURE_CONFIG, "utf8");
    const map = parseVerifyJwtMap(toml);

    expect(map.get("baz")).toBe(false);
    // foo e bar nao aparecem => default true no gerador.
    expect(map.has("foo")).toBe(false);
    expect(map.has("bar")).toBe(false);
  });

  it("ignora linhas comentadas e secoes que nao sao de functions", () => {
    const toml = [
      "# [functions.comentada]",
      "# verify_jwt = false",
      "[api]",
      "enabled = true",
      "[functions.dm-agent-responder]",
      "verify_jwt = false",
      "",
    ].join("\n");
    const map = parseVerifyJwtMap(toml);
    expect(map.get("dm-agent-responder")).toBe(false);
    expect(map.size).toBe(1);
  });
});

describe("generateManifest — com fixtures", () => {
  const result = generateManifest({
    functionsDir: FIXTURE_FUNCTIONS,
    configPath: FIXTURE_CONFIG,
    functionsRoot: "supabase/functions",
  });

  it("gera uma entrada para cada function do diretorio de fixture (3 functions)", () => {
    const nomes = result.entries.map((e: ManifestEntry) => e.name).sort();
    expect(nomes).toEqual(["bar", "baz", "foo"]);
  });

  it("cada entrada tem entrypoint apontando para index.ts", () => {
    for (const entry of result.entries as ManifestEntry[]) {
      expect(entry.entrypoint).toBe(`${entry.name}/index.ts`);
    }
  });

  it("files[] lista todos os arquivos .ts recursivamente (foo tem helper.ts)", () => {
    const foo = (result.entries as ManifestEntry[]).find(
      (e) => e.name === "foo",
    )!;
    expect(foo.files.sort()).toEqual(["foo/helper.ts", "foo/index.ts"]);
  });

  it("baz vem com verifyJwt=false (declarado no config.toml)", () => {
    const baz = (result.entries as ManifestEntry[]).find(
      (e) => e.name === "baz",
    )!;
    expect(baz.verifyJwt).toBe(false);
  });

  it("foo e bar vem com verifyJwt=true (default quando ausente no config.toml)", () => {
    const foo = (result.entries as ManifestEntry[]).find(
      (e) => e.name === "foo",
    )!;
    const bar = (result.entries as ManifestEntry[]).find(
      (e) => e.name === "bar",
    )!;
    expect(foo.verifyJwt).toBe(true);
    expect(bar.verifyJwt).toBe(true);
  });

  it("entries estao ordenadas por nome para saida deterministica", () => {
    const nomes = (result.entries as ManifestEntry[]).map((e) => e.name);
    const ordenados = [...nomes].sort();
    expect(nomes).toEqual(ordenados);
  });
});

describe("generateManifest — contra o repo real", () => {
  it("cobre TODAS as functions validas (dirs com index.ts, excluindo _shared)", () => {
    const dirsReais = fs
      .readdirSync(REAL_FUNCTIONS, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .filter((d) =>
        fs.existsSync(path.join(REAL_FUNCTIONS, d.name, "index.ts")),
      )
      .map((d) => d.name);

    const result = generateManifest({
      functionsDir: REAL_FUNCTIONS,
      configPath: REAL_CONFIG,
      functionsRoot: "supabase/functions",
    });
    const nomesManifesto = (result.entries as ManifestEntry[]).map(
      (e) => e.name,
    );

    expect(nomesManifesto.length).toBe(dirsReais.length);
    for (const nome of dirsReais) {
      expect(nomesManifesto).toContain(nome);
    }
  });

  it("dm-agent-responder tem verifyJwt=false (declarado no config.toml real)", () => {
    const result = generateManifest({
      functionsDir: REAL_FUNCTIONS,
      configPath: REAL_CONFIG,
      functionsRoot: "supabase/functions",
    });
    const entry = (result.entries as ManifestEntry[]).find(
      (e) => e.name === "dm-agent-responder",
    );
    expect(entry).toBeDefined();
    expect(entry!.verifyJwt).toBe(false);
  });
});

describe("smoke de runtime (Fase 1.3.2)", () => {
  it("localiza uma function pelo manifesto e le o entrypoint do FS sem erro", () => {
    const result = generateManifest({
      functionsDir: REAL_FUNCTIONS,
      configPath: REAL_CONFIG,
      functionsRoot: "supabase/functions",
    });
    const entry = (result.entries as ManifestEntry[])[0];
    expect(entry).toBeDefined();

    const entrypointAbsoluto = path.join(REAL_FUNCTIONS, entry.entrypoint);
    const conteudo = fs.readFileSync(entrypointAbsoluto, "utf8");
    expect(typeof conteudo).toBe("string");
    expect(conteudo.length).toBeGreaterThan(0);
  });
});
