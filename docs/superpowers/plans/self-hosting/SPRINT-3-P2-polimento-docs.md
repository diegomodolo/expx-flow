# Sprint 3 — P2 Polimento & Docs (Release-ready)

> **Objetivo do sprint:** Após o gate, o projeto é **release-grade** para distribuição: serviços de terceiros externalizados, CI/CD do dev separado, guia de instalação reproduzível e verificação automatizada de ponta a ponta.
> **Pré-requisito:** Gate de Sprint 2 fechado (functions + cron + UI funcionais; guard 100% verde).
> **TDD:** tasks de código seguem RED→GREEN→REFACTOR; tasks de docs/distribuição são cobertas por **gates de verificação executáveis** (guard test, `verify-self-hosting.sh`, reprodução do guia).

**Fases:** (3.1 ∥ 3.2 ∥ 3.3) → 3.4 → Gate de Sprint 3.

---

## Fase 3.1 — Serviços de terceiros (agente: `backend` + `devops`)

### Task 3.1.1 — Railway proxy (Shotstack/YouTube download) externalizado

- **Arquivos:** `create-clip-job/index.ts`, `generate-reels-video/index.ts`, `generate-video-creative/index.ts`
- **Foco:** trocar `https://refreshing-beauty-production-f560.up.railway.app` por `system_config_tools.youtube_proxy_url` (fallback env). Sem URL configurada → erro graceful ou caminho alternativo documentado.
- **TDD:** RED: teste afirma que a URL do proxy vem do banco/env e não há literal Railway. GREEN: aplicar.
- **Aceite:** [ ] TDD verde · [ ] `grep -r "railway.app" supabase/functions/` vazio · [ ] deploy + smoke.
- **Commit:** `feat: externalize youtube/shotstack proxy url to system_config_tools`

### Task 3.1.2 — API4Com base URL externalizada

- **Arquivos:** `initiate-voice-call/index.ts` (+ correlatas de webhook API4Com)
- **Foco:** `api4com_base_url` (`system_config_tools`, default `https://api.api4com.com`) em vez de literal.
- **TDD:** RED: teste afirma base URL configurável com default correto. GREEN: aplicar.
- **Aceite:** [ ] TDD verde · [ ] deploy + smoke · [ ] skill `ligacoes-api4com` atualizada.
- **Commit:** `feat: externalize api4com base url to system_config_tools`

### Task 3.1.3 — User-Agent sem domínio

- **Arquivos:** `fetch-webpage-content/index.ts`, `analyze-carousel-from-url/index.ts`
- **Foco:** remover domínio do User-Agent; usar nome neutro ou `app_name` do banco.
- **TDD:** RED: teste/guard afirma que o UA não contém `controledetrafego.com.br`/`expxflow.com.br`. GREEN: aplicar.
- **Aceite:** [ ] grep de domínio vazio nesses arquivos · [ ] deploy + smoke.
- **Commit:** `fix: neutral User-Agent without dev domain`

---

## Fase 3.2 — Distribuição & CI/CD (agente: `devops`)

### Task 3.2.1 — `.github/workflows` dev-only

- **Arquivos:** `.github/workflows/jules-dispatcher.yml` (+ workflows com `ALLOWED`/repo do dev)
- **Foco:** mover workflows específicos do fluxo do dev para `.github.dev/` (excluído da distribuição) **ou** documentá-los como opcionais. Remover `ALLOWED` com username.
- **Aceite:** [ ] `grep -r "bittencourtthulio" .github/` vazio (ou pasta movida) · [ ] documentado em `docs/INSTALACAO.md` como opcional.
- **Commit:** `chore: move dev-only workflows out of distributed .github`

### Task 3.2.2 — `README.md` + licença

- **Arquivos:** `README.md`, `LICENSE` (criar, ex.: MIT)
- **Foco:** remover URL do GitHub pessoal do dev; README aponta para `docs/INSTALACAO.md`; adicionar licença.
- **Aceite:** [ ] `grep -i "bittencourtthulio\|controledetrafego" README.md` vazio · [ ] `LICENSE` existe.
- **Commit:** `docs: neutral README + add LICENSE`

---

## Fase 3.3 — Documentação do cliente (agente: `devops`)

### Task 3.3.1 — `docs/INSTALACAO.md` (guia ponta a ponta)

- **Arquivos:** `docs/INSTALACAO.md`
- **Conteúdo (spec §7):** pré-requisitos; passo a passo (clonar → criar Supabase → `db push` → `functions deploy` → secrets → `.env` do `.env.example` → deploy Vercel → Auth Site/Redirect URLs → primeiro usuário vira owner → `/configuracoes/sistema`); tabela de webhooks; tabela de serviços de terceiros; `setup-cron-jobs`; nota sobre GitHub/Jules opcionais.
- **Aceite:** [ ] todos os passos do §7 cobertos · [ ] tabela de webhooks usa `https://SEU_PROJETO.supabase.co/...` (placeholder) · [ ] referencia `config.toml` (`site_url`/redirects) como passo manual.
- **Commit:** `docs: add client installation guide (docs/INSTALACAO.md)`

### Task 3.3.2 — Checklist pós-instalação + `config.toml` documentado

- **Arquivos:** `docs/CHECKLIST_POS_INSTALACAO.md`, `supabase/config.toml` (comentários/placeholders)
- **Foco:** `project_id`, `site_url`, `additional_redirect_urls` com placeholders e instruções inline. Checklist verificável pelo cliente.
- **Aceite:** [ ] `config.toml` sem domínio/project ID real (placeholders) · [ ] checklist cobre Auth URLs, secrets, webhooks, cron.
- **Commit:** `docs: post-install checklist + documented config.toml placeholders`

---

## Fase 3.4 — Verificação final (agente: `testing` + `devops`)

### Task 3.4.1 — `scripts/verify-self-hosting.sh` (§10 do spec executável)

- **Arquivos:** `scripts/verify-self-hosting.sh`
- **Conteúdo:** os 9 checks do §10 (greps de project ID, domínios, App IDs, username; `.env` limpo; `npm run build`; `.env.example` existe; PNGs válidos) com saída OK/FALHOU por linha.
- **TDD:** RED: o script é escrito; rodar deve dar todos OK (se algo falhar, é um bug remanescente a corrigir antes do gate).
- **Aceite:** [ ] script roda e retorna **todos OK** · [ ] guard test (`no-hardcode.test.ts`) 100% verde sem skips.
- **Commit:** `chore: add verify-self-hosting.sh covering spec §10`

### Task 3.4.2 — Skill de contexto `self-hosting` finalizada

- **Arquivos:** `.claude/skills/self-hosting/SKILL.md`
- **Foco:** consolidar (criada no Sprint 2) com seções: visão geral, arquivos-chave (`getSystemConfig`, `system_config_*`, `SystemConfigSettings`), padrões (`env > banco`, `resolveCredential`, `getAppUrl`), armadilhas (RLS singleton, owner-only, cron parametrizado), contexto não-óbvio (naming anon key, storageKey dinâmica).
- **Aceite:** [ ] segue formato das skills existentes · [ ] referenciada no CLAUDE.md (lista de skills de contexto).
- **Commit:** `docs: add self-hosting context skill`

---

## Gate de Sprint 3 (release-ready)

- [ ] `bash scripts/verify-self-hosting.sh` → **todos OK**.
- [ ] Guard test `no-hardcode.test.ts` **100% verde, zero skips**.
- [ ] `npm run test:ci` + `npm run lint` + `npm run build` limpos.
- [ ] `deno test supabase/functions/` verde.
- [ ] `grep -rE "ejwpfztkspbvmuwwiwmk|controledetrafego\.com\.br|expxflow\.com\.br|1118192076871259|1442283340343262|bittencourtthulio|railway\.app" src/ supabase/ index.html README.md` → **vazio**.
- [ ] **Smoke-test (§6.3 do main):** seguir `docs/INSTALACAO.md` do zero num Supabase+Vercel novos reproduz uma instância funcional; nenhuma referência ao dev.
- [ ] Todas as Edge Functions alteradas deployadas.
- [ ] Skill `self-hosting` no CLAUDE.md.
- [ ] Commit + push na `main`.

---

## Definition of Done (projeto inteiro)

O trabalho de self-hosting está concluído quando:

1. Os 3 gates de sprint passaram.
2. O guard test é permanente e verde no CI (regressão impossível silenciosamente).
3. Um terceiro instala a partir de `docs/INSTALACAO.md` + `.env.example` + `/configuracoes/sistema` sem nunca ver dados do desenvolvedor original.
