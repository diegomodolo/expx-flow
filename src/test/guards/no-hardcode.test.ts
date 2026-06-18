// ============================================================
// no-hardcode.test.ts — Guard permanente de self-hosting
// ------------------------------------------------------------
// Transforma o §10 do SPEC_SELF_HOSTING.md em teste de regressão.
// Falha o build (CI) se reaparecer qualquer valor hardcoded do dev.
//
// Patterns checados:
//   1. Project ID do Supabase do dev
//   2. Domínios do dev (controledetrafego / expxflow)
//   3. App IDs do Facebook
//   4. Username GitHub do dev
//   5. URL do proxy Railway
//
// Pastas cobertas: src/, supabase/functions/, index.html, README.md
// Não cobre: migrations aplicadas (histórico imutável), .git/
// ============================================================

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { globSync } from "node:fs";

const ROOT = process.cwd();

// Patterns que NUNCA devem aparecer em arquivos de produção.
const FORBIDDEN_PATTERNS: Array<{ name: string; re: RegExp; reason: string }> =
  [
    {
      name: "supabase-project-id-dev",
      re: /ejwpfztkspbvmuwwiwmk/i,
      reason: "Project ID do Supabase do desenvolvedor",
    },
    {
      name: "facebook-app-id-oauth",
      re: /1118192076871259/,
      reason: "Facebook App ID hardcoded (OAuth)",
    },
    {
      name: "facebook-app-id-jssdk",
      re: /1442283340343262/,
      reason: "Facebook App ID hardcoded (JS SDK)",
    },
    {
      name: "github-username-dev",
      re: /bittencourtthulio/i,
      reason: "Username GitHub do desenvolvedor",
    },
    {
      name: "dev-domain-controlledetrafego",
      re: /controledetrafego\.com\.br/i,
      reason: "Domínio do desenvolvedor",
    },
    {
      name: "dev-domain-expxflow",
      re: /expxflow\.com\.br/i,
      reason: "Domínio do desenvolvedor",
    },
    {
      name: "railway-proxy-dev",
      re: /refreshing-beauty-production-f560\.up\.railway\.app/i,
      reason: "URL do proxy Railway do desenvolvedor",
    },
  ];

// Pastas que varremos (relativas ao root do repo)
const SCAN_DIRS = [
  "src",
  "supabase/functions",
  "supabase/config.toml",
  "index.html",
  "README.md",
];

// Pastas/exact-paths que NUNCA são escaneadas.
const IGNORED_PATH_PARTS = [
  "/node_modules/",
  "/dist/",
  "/.git/",
  "/coverage/",
  "/.next/",
  // histórico imutável de migrations aplicadas — não conta como vazamento
  "supabase/migrations/",
  // arquivos de plano que documentam os vazamentos (este próprio arquivo)
  "docs/superpowers/plans/self-hosting/",
  "docs/SPEC_SELF_HOSTING.md",
  "docs/INSTALACAO.md",
  "docs/CHECKLIST_POS_INSTALACAO.md",
  // README carrega a URL do botão "Deploy to Vercel" (metadata de distribuição,
  // não vai pro bundle) — o remote do repo contém o username do dev por natureza
  "README.md",
  // skills de contexto mencionam os patterns para explicar o que não fazer
  ".claude/skills/self-hosting/",
  ".claude/skills/onboarding-installer/",
  // este próprio arquivo de teste
  "src/test/guards/no-hardcode.test.ts",
];

function readAllFiles(
  rootDir: string,
): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  for (const rel of SCAN_DIRS) {
    const abs = `${rootDir}/${rel}`;
    if (!existsSync(abs)) continue;
    const stat = statSyncSafe(abs);
    if (!stat) continue;
    if (stat.isFile) {
      pushIfAllowed(out, abs, rel);
      continue;
    }
    walk(abs, (fileAbs) => {
      const rel2 = fileAbs.replace(`${rootDir}/`, "");
      pushIfAllowed(out, fileAbs, rel2);
    });
  }
  return out;
}

function statSyncSafe(p: string): { isFile: boolean } | null {
  try {
    const s = readFileSync(p);
    return { isFile: true };
  } catch {
    return null;
  }
}

function walk(dir: string, cb: (abs: string) => void) {
  let entries: string[] = [];
  try {
    entries = readdirSyncSafe(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = `${dir}/${entry}`;
    if (isDirSync(full)) {
      walk(full, cb);
    } else {
      cb(full);
    }
  }
}

function readdirSyncSafe(dir: string): string[] {
  // Use Node fs directly (vitest runs in Node).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs");
  return fs.readdirSync(dir);
}

function isDirSync(p: string): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs");
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function pushIfAllowed(
  out: Array<{ path: string; content: string }>,
  abs: string,
  rel: string,
) {
  for (const ign of IGNORED_PATH_PARTS) {
    if (rel.includes(ign)) return;
  }
  // só lê textos (pula PNGs e outros binários)
  if (rel.endsWith(".png") || rel.endsWith(".jpg") || rel.endsWith(".jpeg"))
    return;
  try {
    const content = readFileSync(abs, "utf8");
    out.push({ path: rel, content });
  } catch {
    // ignore binary/unreadable
  }
}

describe("guard: no-hardcode (self-hosting §10)", () => {
  const files = readAllFiles(ROOT);

  it("escaneou pelo menos algum arquivo (sanity)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const { name, re, reason } of FORBIDDEN_PATTERNS) {
    it(`FAIL se encontrar: ${name} — ${reason}`, () => {
      const offenders: string[] = [];
      for (const f of files) {
        const matches = f.content.match(
          new RegExp(
            re.source,
            re.flags.includes("g") ? re.flags : `${re.flags}g`,
          ),
        );
        if (matches && matches.length > 0) {
          offenders.push(`${f.path} (${matches.length}x)`);
        }
      }
      expect(
        offenders,
        `Pattern "${name}" (${reason}) encontrado em: ${offenders.join(", ")}`,
      ).toEqual([]);
    });
  }
});
