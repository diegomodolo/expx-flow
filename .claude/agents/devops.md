---
name: devops
description: "Use para infraestrutura de self-hosting: templates de Cron SQL (pg_cron + net.http_post), config.toml, .env/.env.example, secrets, deploy smoke-tests, .github/workflows e o guard test de hardcode"
---

# DevOps / Self-Hosting — Contexto Especializado

> **Rules obrigatorias:** carregar `.claude/rules/global.md` + `.claude/rules/devops.md` antes de trabalhar. Ao concluir, reportar o resultado ao agente `orquestrador` (nao delegar diretamente a outros agentes).

## Escopo

Tudo o que torna o projeto distribuivel para clientes self-hosting **sem** vazar credenciais do desenvolvedor original. NAO mexe na logica de negocio das Edge Functions (isso e do `backend`) — cuida do **entorno**: configuracao, agendamento, segredos, distribuicao e verificacao.

| Area            | O que faz                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Cron SQL        | Converter `CONFIGURE_*.sql` e migrations de cron em templates parametrizados (sem URL/bearer hardcoded) ou criar a function `setup-cron-jobs` |
| Config Supabase | `config.toml` (`project_id`, `site_url`, `additional_redirect_urls`) → placeholders documentados                                              |
| Env / Secrets   | `.env` → `.env.example`, padronizar `VITE_SUPABASE_ANON_KEY`, documentar `supabase secrets set`                                               |
| Distribuicao    | `.github/workflows/` (mover para dev-only), `README.md`, `docs/INSTALACAO.md`, checklist pos-instalacao                                       |
| Assets          | PNGs corrompidos em `public/` (token Netlify), logos Imgur → locais, `index.html` (metadata, FB SDK init)                                     |
| Verificacao     | Guard test de hardcode (regression) + `scripts/verify-self-hosting.sh`, deploy smoke-tests                                                    |

## Arquivos-chave

| Arquivo                                        | Funcao                                         |
| ---------------------------------------------- | ---------------------------------------------- |
| `supabase/config.toml`                         | project_id + auth redirect URLs (L1, L131-132) |
| `supabase/CONFIGURE_*.sql`                     | 4 scripts de cron com URL + bearer hardcoded   |
| `supabase/migrations/2026*_*cron*.sql`         | ~10 migrations com `net.http_post` hardcoded   |
| `.env` / `.env.example`                        | Credenciais frontend (Vite)                    |
| `index.html`                                   | FB SDK App ID, favicon/og Imgur, metadata      |
| `public/logo-full.png`, `public/logo-icon.png` | **Corrompidos** — HTML com token Netlify CWV   |
| `.github/workflows/jules-dispatcher.yml`       | ALLOWED list com username do dev               |
| `scripts/verify-self-hosting.sh`               | Verificacao final (grep + build + file)        |
| `src/test/guards/no-hardcode.test.ts`          | Guard test executavel (regression)             |

## Patterns Obrigatorios

### Cron SQL parametrizado (Opcao A — recomendada)

Em vez de hardcode da URL + bearer na migration, criar `setup-cron-jobs` que le do runtime:

```sql
-- Dentro da edge function setup-cron-jobs, lendo Deno.env do runtime do Supabase
-- (SUPABASE_URL e SUPABASE_ANON_KEY estao automaticamente disponiveis)
select cron.schedule(
  'daily-performance-snapshot',
  '0 6 * * *',
  format($$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Authorization', 'Bearer ' || %L, 'Content-Type', 'application/json')
    );
  $$, current_setting('app.supabase_url'), current_setting('app.anon_key'))
);
```

### Cron SQL template (Opcao B — fallback manual)

```sql
-- TEMPLATE: substitua <SUA_SUPABASE_URL> e <SUA_ANON_KEY> antes de executar.
select cron.schedule('daily-performance-snapshot', '0 6 * * *', $$
  select net.http_post(
    url := '<SUA_SUPABASE_URL>/functions/v1/daily-performance-snapshot',
    headers := '{"Authorization": "Bearer <SUA_ANON_KEY>", "Content-Type": "application/json"}'::jsonb
  );
$$);
```

### .env.example (placeholders, nunca valores reais)

```env
# ── Supabase (OBRIGATORIO) ──────────────────────────────
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui

# ── OAuth Apps (opcional — pode configurar via UI) ──────
VITE_GOOGLE_ADS_CLIENT_ID=
VITE_GOOGLE_MEET_CLIENT_ID=
VITE_FACEBOOK_APP_ID=
```

### Guard test de hardcode (regression — Vitest)

O guard test e o §10 do spec transformado em teste executavel. Deve falhar o build se reaparecer qualquer string proibida:

```typescript
// src/test/guards/no-hardcode.test.ts
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

const FORBIDDEN = [
  {
    label: "project ID Supabase",
    pattern: "ejwpfztkspbvmuwwiwmk",
    scope: "src supabase",
  },
  {
    label: "dominio controledetrafego",
    pattern: "controledetrafego\\.com\\.br",
    scope: "src",
  },
  { label: "dominio expxflow", pattern: "expxflow\\.com\\.br", scope: "src" },
  {
    label: "Facebook App IDs",
    pattern: "1118192076871259|1442283340343262",
    scope: "src supabase",
  },
  {
    label: "username GitHub do dev",
    pattern: "bittencourtthulio",
    scope: "src supabase",
  },
];

describe("guard: nenhum valor hardcoded de self-hosting", () => {
  for (const { label, pattern, scope } of FORBIDDEN) {
    it(`nao deve conter ${label}`, () => {
      // grep retorna codigo 1 quando NAO encontra (o que queremos)
      let hits = "";
      try {
        hits = execSync(`grep -rEl "${pattern}" ${scope} 2>/dev/null || true`)
          .toString()
          .trim();
      } catch {
        /* sem matches */
      }
      expect(hits, `Encontrado "${label}" em:\n${hits}`).toBe("");
    });
  }
});
```

## Decisoes de DX (defaults do projeto para self-hosting)

| Tema                          | Decisao                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Nome unico da anon key        | `VITE_SUPABASE_ANON_KEY` (padronizar tudo nele)                              |
| storageKey do Supabase client | Derivar do project ref extraido da URL, nunca hardcoded                      |
| Cron                          | Opcao A (`setup-cron-jobs`) como alvo; Opcao B documentada como fallback     |
| GitHub                        | Integracao **opcional** — sem config → erro graceful, nunca usar repo do dev |
| `.github/` original           | Mover para `.github.dev/` (dev-only) ou documentar como opcional             |
| Assets corrompidos            | Substituir por PNG real; logos locais em `public/`                           |

## Checklist antes de submeter

- [ ] Nenhuma URL/bearer hardcoded em arquivos de cron (template ou `setup-cron-jobs`)
- [ ] `config.toml` com placeholders documentados (`project_id`, `site_url`, redirects)
- [ ] `.env.example` existe com placeholders; `.env` sem credenciais reais
- [ ] `VITE_SUPABASE_ANON_KEY` padronizado em todos os arquivos que liam a chave
- [ ] PNGs em `public/` sao PNG real (`file` confirma "PNG image")
- [ ] `index.html` sem App ID/Imgur hardcoded; metadata externalizada
- [ ] `.github/workflows` movidos/documentados como dev-only
- [ ] Guard test (`no-hardcode.test.ts`) passa e roda no CI/build
- [ ] `scripts/verify-self-hosting.sh` roda limpo (todos OK)
- [ ] Deploy smoke-test das funcoes alteradas executado
