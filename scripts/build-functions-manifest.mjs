// Gerador do manifesto de Edge Functions do Supabase.
//
// Varre supabase/functions/*/ (cada subdiretorio com index.ts = 1 function),
// extrai o verify_jwt de supabase/config.toml (default true quando ausente) e
// escreve api/installer/_functions-manifest.json para o instalador usar em
// runtime (deploy de functions via Supabase Management API).
//
// Uso (CLI):
//   node scripts/build-functions-manifest.mjs
//   node scripts/build-functions-manifest.mjs \
//     --functions-dir <dir> --config <config.toml> --output <out.json>
//
// Override via env (util em testes/CI):
//   FUNCTIONS_DIR=... CONFIG_PATH=... OUTPUT=... node scripts/build-functions-manifest.mjs
//
// Sem dependencias externas (Node nativo apenas).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const DEFAULT_FUNCTIONS_DIR = path.resolve(REPO_ROOT, "supabase", "functions");
const DEFAULT_CONFIG_PATH = path.resolve(REPO_ROOT, "supabase", "config.toml");
const DEFAULT_OUTPUT = path.resolve(
  REPO_ROOT,
  "api",
  "installer",
  "_functions-manifest.json",
);
const DEFAULT_FUNCTIONS_ROOT = "supabase/functions";

/**
 * Parse minimalista do config.toml do Supabase: extrai so o verify_jwt por
 * function. Retorna um Map<name, boolean> apenas das functions que declaram
 * verify_jwt explicitamente (ausencia => default true no gerador).
 *
 * Estrutura suportada:
 *   [functions.<name>]
 *   verify_jwt = true | false
 *
 * Linhas comentadas (#) e outras secoes ([api], [db], ...) sao ignoradas.
 * @param {string} toml
 * @returns {Map<string, boolean>}
 */
export function parseVerifyJwtMap(toml) {
  const map = new Map();
  let currentFunction = null;
  const headerRe = /^\[functions\.([A-Za-z0-9_-]+)\]$/;
  const verifyRe = /^verify_jwt\s*=\s*(true|false)\s*$/;

  for (const rawLine of toml.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;

    const header = line.match(headerRe);
    if (header) {
      currentFunction = header[1];
      continue;
    }

    if (line.startsWith("[")) {
      // outra secao nao-funcion: sai do contexto.
      currentFunction = null;
      continue;
    }

    const verify = line.match(verifyRe);
    if (verify && currentFunction) {
      map.set(currentFunction, verify[1] === "true");
    }
  }
  return map;
}

/**
 * Lista recursivamente todos os arquivos .ts dentro de baseDir, retornando
 * caminhos relativos a functionsDir (ex: "foo/helper.ts").
 * @param {string} baseDir diretorio da function
 * @param {string} functionsDir raiz das functions (para path relativo)
 * @returns {string[]}
 */
function listTsFiles(baseDir, functionsDir) {
  const out = [];
  const stack = [baseDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        stack.push(full);
      } else if (ent.isFile() && ent.name.endsWith(".ts")) {
        out.push(path.relative(functionsDir, full));
      }
    }
  }
  return out.sort();
}

/**
 * Gera as entradas do manifesto a partir de um diretorio de functions e um
 * config.toml.
 * @param {object} opts
 * @param {string} opts.functionsDir diretorio com as functions (cada subdir = 1)
 * @param {string} opts.configPath caminho do config.toml
 * @returns {{ entries: Array<{name:string,entrypoint:string,files:string[],verifyJwt:boolean}>, verifyJwtMap: Map<string,boolean> }}
 */
export function buildFunctionEntries({ functionsDir, configPath }) {
  let toml = "";
  try {
    toml = fs.readFileSync(configPath, "utf8");
  } catch {
    // sem config.toml => todas default true.
  }
  const verifyJwtMap = parseVerifyJwtMap(toml);

  const dirs = fs
    .readdirSync(functionsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .filter((d) => fs.existsSync(path.join(functionsDir, d.name, "index.ts")))
    .map((d) => d.name)
    .sort();

  const entries = dirs.map((name) => {
    const functionDir = path.join(functionsDir, name);
    const files = listTsFiles(functionDir, functionsDir);
    return {
      name,
      entrypoint: `${name}/index.ts`,
      files,
      verifyJwt: verifyJwtMap.has(name) ? verifyJwtMap.get(name) : true,
    };
  });

  return { entries, verifyJwtMap };
}

/**
 * Gera o manifesto completo (objeto) a partir das options.
 *
 * Retorna `entries` (nome conceitual da API interna). O JSON serializado por
 * writeManifestFile usa a chave `functions` apontando para o mesmo array.
 * @param {object} opts
 * @param {string} opts.functionsDir
 * @param {string} opts.configPath
 * @param {string} [opts.functionsRoot] valor de functionsRoot no JSON (default "supabase/functions")
 * @returns {{ functionsRoot: string, generatedAt: string, count: number, entries: Array }}
 */
export function generateManifest({
  functionsDir,
  configPath,
  functionsRoot = DEFAULT_FUNCTIONS_ROOT,
}) {
  const { entries } = buildFunctionEntries({ functionsDir, configPath });
  return {
    functionsRoot,
    generatedAt: new Date().toISOString(),
    count: entries.length,
    entries,
  };
}

/**
 * Escreve o manifesto em outputPath.
 * @param {object} opts
 * @param {string} opts.functionsDir
 * @param {string} opts.configPath
 * @param {string} opts.outputPath
 * @param {string} [opts.functionsRoot]
 * @returns {{ output: string, count: number }}
 */
export function writeManifestFile({
  functionsDir,
  configPath,
  outputPath,
  functionsRoot,
}) {
  const manifest = generateManifest({
    functionsDir,
    configPath,
    functionsRoot,
  });
  // Serializa com a chave `functions` (nome natural do JSON de saida).
  const payload = {
    functionsRoot: manifest.functionsRoot,
    generatedAt: manifest.generatedAt,
    count: manifest.count,
    functions: manifest.entries,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  return { output: outputPath, count: manifest.count };
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--functions-dir") out.functionsDir = argv[++i];
    else if (a === "--config") out.configPath = argv[++i];
    else if (a === "--output") out.outputPath = argv[++i];
    else if (a === "--functions-root") out.functionsRoot = argv[++i];
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const functionsDir =
    args.functionsDir || process.env.FUNCTIONS_DIR || DEFAULT_FUNCTIONS_DIR;
  const configPath =
    args.configPath || process.env.CONFIG_PATH || DEFAULT_CONFIG_PATH;
  const outputPath =
    args.outputPath || process.env.OUTPUT || DEFAULT_OUTPUT;
  const functionsRoot =
    args.functionsRoot || process.env.FUNCTIONS_ROOT || DEFAULT_FUNCTIONS_ROOT;

  const { output, count } = writeManifestFile({
    functionsDir,
    configPath,
    outputPath,
    functionsRoot,
  });

  console.log(
    `[build-functions-manifest] ${count} functions -> ${path.relative(REPO_ROOT, output)}`,
  );
}

const isMain = path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
