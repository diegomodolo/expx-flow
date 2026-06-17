# Sprint 1 — P0 Bloqueadores

> **Objetivo do sprint:** Após o gate, liberar os fontes **não vaza** credenciais do desenvolvedor. Estabelece a fundação (tabelas + helper + harness de teste Deno + guard test) e remove todo hardcode crítico do frontend e dos assets.
> **Orquestração:** ver [`00-ORQUESTRACAO.md`](./00-ORQUESTRACAO.md). Cada task carrega `global.md` + rules escopadas e segue TDD estrito (RED→GREEN→REFACTOR).

**Fases:** 1.1 Fundação → (1.2 Frontend ∥ 1.3 Assets & env) → Gate de Sprint 1.

---

## Fase 1.1 — Fundação (agentes: `backend`, `testing`, `devops`)

Pré-requisito de tudo no Sprint 2. Sem barreira interna entre tasks de tabelas e harness (arquivos disjuntos), mas a 1.1 inteira é barreira para 1.2/1.3 dependentes e para o Sprint 2.

### Task 1.1.1 — Harness de teste Deno + mock do Supabase

- **Agente:** `testing` · **Depende de:** nada
- **Arquivos:** `supabase/functions/_shared/__tests__/mockSupabase.ts`, `supabase/functions/_shared/__tests__/harness.test.ts`, `deno.json` (tasks de teste)
- **TDD:**
  - RED: `harness.test.ts` com um `Deno.test` que importa o mock e afirma que `mockSupabase({ system_config_ai: { openrouter_api_key: "x" } }).from("system_config_ai").select("*").maybeSingle()` resolve `{ data: { openrouter_api_key: "x" } }`. Falha (mock não existe).
  - GREEN: implementar `mockSupabase(seed)` — stub de `.from().select().maybeSingle()/eq()` retornando seed por tabela, sem rede.
  - REFACTOR: tipar o seed por nome de tabela.
- **Critérios de aceite:**
  - [ ] `deno test supabase/functions/_shared/__tests__/` passa.
  - [ ] Mock cobre `select`, `maybeSingle`, `eq`, `update`, `insert` (o necessário para as migrações de função).
  - [ ] Zero acesso de rede no teste.
- **Gate da task:** `deno test` verde no escopo `_shared/__tests__`.
- **Commit:** `test: add Deno test harness + Supabase mock for system_config`

### Task 1.1.2 — Migration `system_config_*` (8 tabelas) + `is_system_owner()` + RLS + GRANT

- **Agente:** `backend` · **Depende de:** nada
- **Arquivos:** `supabase/migrations/20260416100000_system_config_tables.sql`
- **Conteúdo:** 8 tabelas singleton (`app, facebook, google, ai, email, tools, discord, github`) + `is_system_owner()` SECURITY DEFINER + policy `FOR ALL USING (is_system_owner())` + `GRANT ... TO authenticated`. Campos adicionais do spec §4.2: `tools.youtube_proxy_url`, `tools.api4com_base_url`, `facebook.graph_api_version` (default `v21.0`). Base SQL: ver plano histórico `2026-04-16` Chunk 1.
- **TDD:**
  - RED: teste de RLS (`Deno.test` ou SQL via MCP) afirmando: owner faz `select` e recebe a linha; usuário não-owner recebe 0 rows. Falha antes da migration.
  - GREEN: aplicar migration via MCP Supabase (`apply_migration`).
  - REFACTOR: —
- **Critérios de aceite:**
  - [ ] 8 tabelas aparecem em `list_tables`.
  - [ ] `is_system_owner()` existe (SECURITY DEFINER, `search_path = public`).
  - [ ] Owner lê/grava; colaborador recebe 0 rows (RLS).
  - [ ] `GRANT SELECT,INSERT,UPDATE,DELETE ... TO authenticated` em todas as 8.
  - [ ] `facebook.graph_api_version` default `'v21.0'`; `tools.youtube_proxy_url` e `tools.api4com_base_url` presentes.
- **Gate da task:** migration aplicada + teste de RLS verde.
- **Commit:** `feat: add system_config_* tables (RLS + GRANT) for self-hosting`

### Task 1.1.3 — Helper `getSystemConfig.ts` + `getAppUrl` + `resolveCredential` (funções puras testáveis)

- **Agente:** `backend` · **Depende de:** 1.1.1 (mock), 1.1.2 (tabelas)
- **Arquivos:** `supabase/functions/_shared/getSystemConfig.ts`, `supabase/functions/_shared/__tests__/getSystemConfig.test.ts`
- **TDD:**
  - RED: testes afirmando: (a) `getSystemConfig(mock, "ai")` retorna a linha do seed; (b) erro de banco → retorna `null` (não lança); (c) `resolveCredential(envValue, dbValue)` segue prioridade **env > banco** e lança erro graceful quando ambos ausentes; (d) `getAppUrl(config, req, fallback)` prioriza `config.app_url` > header `origin` > fallback. Falham (helper não existe).
  - GREEN: implementar `getSystemConfig`, `getAppUrl` e extrair `resolveCredential(env, db, errorMsg)` como função pura.
  - REFACTOR: genéricos de tipo por provider.
- **Critérios de aceite:**
  - [ ] `deno test _shared/__tests__/getSystemConfig.test.ts` verde (4 casos acima).
  - [ ] `resolveCredential` é exportada e pura (testável sem Supabase).
  - [ ] Mensagens de erro em PT-BR apontando "Configurações > Sistema".
- **Gate da task:** suite do helper verde.
- **Commit:** `feat: add getSystemConfig/getAppUrl/resolveCredential shared helper + tests`

### Task 1.1.4 — Guard test de hardcode (regression permanente)

- **Agente:** `devops` · **Depende de:** nada (mas valida o sprint inteiro)
- **Arquivos:** `src/test/guards/no-hardcode.test.ts`
- **TDD:**
  - RED: escrever o guard com os 5 patterns do §10 (project ID, 2 domínios, App IDs, username). Ele **falha agora** (o hardcode ainda existe) — isso é o RED legítimo do sprint inteiro.
  - GREEN: as tasks seguintes (1.2, 1.3 e Sprint 2) tornam-no verde por eliminação do hardcode. Nesta task, marcar os patterns ainda-vermelhos com `.fails`/skip anotado + TODO referenciando a task que os resolve.
  - REFACTOR: ao fim do Sprint 2, remover todos os skips — guard 100% verde.
- **Critérios de aceite:**
  - [ ] Guard roda em `npm run test:ci`.
  - [ ] Cada pattern ainda-vermelho tem skip anotado com a task que o fecha (rastreabilidade).
  - [ ] Documentado que o skip é temporário e deve zerar até o Gate de Sprint 2.
- **Gate da task:** o guard executa (mesmo com skips) sem quebrar a suíte.
- **Commit:** `test: add hardcode guard (regression) from spec §10`

> **Barreira:** 1.1 completa e verde antes de prosseguir para tasks dependentes do helper.

---

## Fase 1.2 — Frontend sem hardcode (agente: `frontend` + `testing`)

Paralela à 1.3. Arquivos em `src/`. Toda task tem teste Vitest (mocks de Supabase/Auth/Company/Sonner, QueryClient `retry:false`, providers).

### Task 1.2.1 — `client.ts` e `publicClient.ts` só com env + storageKey dinâmica

- **Agente:** `frontend` · **Depende de:** 1.1.4
- **Arquivos:** `src/integrations/supabase/client.ts`, `src/integrations/supabase/publicClient.ts`
- **TDD:**
  - RED: teste afirmando que a `storageKey` é derivada do project ref extraído de `VITE_SUPABASE_URL` (mockada) e que nenhuma constante contém `ejwpfztkspbvmuwwiwmk`. Falha contra o código atual.
  - GREEN: ler `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; derivar `storageKey = sb-${ref}-auth-token` a partir do host da URL.
  - REFACTOR: extrair `extractProjectRef(url)` reutilizável.
- **Critérios de aceite:**
  - [ ] Teste verde; `extractProjectRef` testada (URL válida e inválida).
  - [ ] `grep ejwpfztkspbvmuwwiwmk src/integrations/supabase/` vazio.
  - [ ] `npm run build` ok.
- **Gate da task:** build + teste verdes; guard pattern do project ID melhora.
- **Commit:** `fix: supabase clients use only env vars + dynamic storageKey`

### Task 1.2.2 — Padronizar `VITE_SUPABASE_ANON_KEY` (naming) em todos os leitores

- **Agente:** `frontend` · **Depende de:** 1.2.1
- **Arquivos (§6.1 do spec):** `src/hooks/useClipGenerator.ts`, `src/hooks/useCarouselGenerationStream.ts`, `src/hooks/useSquadChat.ts`, `src/components/repositorio-criativos/RegenerateCarouselModal.tsx`, `src/components/content-planner/ContentPlanEditor.tsx`, `src/pages/PublicContentReview.tsx` (+ `client.ts`/`publicClient.ts` já na 1.2.1)
- **TDD:**
  - RED: teste afirmando que nenhum arquivo lê `VITE_SUPABASE_PUBLISHABLE_KEY` (grep-test no escopo) e que os hooks afetados constroem o header com `VITE_SUPABASE_ANON_KEY`. Falha.
  - GREEN: substituir todas as leituras por `VITE_SUPABASE_ANON_KEY`.
  - REFACTOR: considerar um util `getAnonKey()` único.
- **Critérios de aceite:**
  - [ ] `grep -r "VITE_SUPABASE_PUBLISHABLE_KEY" src/` vazio.
  - [ ] Testes dos hooks afetados verdes; `npm run build` ok.
- **Gate da task:** build + testes verdes.
- **Commit:** `refactor: standardize on VITE_SUPABASE_ANON_KEY across frontend`

### Task 1.2.3 — Webhook URLs dinâmicas (componentes + hooks)

- **Agente:** `frontend` · **Depende de:** 1.2.1
- **Arquivos:** `src/components/whatsapp/MetaConnectionCard.tsx`, `src/components/instagram/InstagramKeywordAutomation.tsx`, `src/hooks/useWebhookTokens.tsx`, `src/pages/DashboardTrafegoPublic.tsx`, `src/hooks/useWhatsAppMediaCache.ts`
- **TDD:**
  - RED: por arquivo, teste afirmando que a URL exibida/usada é `${VITE_SUPABASE_URL}/functions/v1/<func>` e não contém `ejwpfztkspbvmuwwiwmk`. Falha.
  - GREEN: construir URLs de `import.meta.env.VITE_SUPABASE_URL`.
  - REFACTOR: util `functionUrl(name)`.
- **Critérios de aceite:**
  - [ ] Testes verdes; `grep ejwpfztkspbvmuwwiwmk src/` vazio.
  - [ ] `npm run build` ok.
- **Gate da task:** build + testes verdes; guard pattern project ID em `src/` zera.
- **Commit:** `fix: webhook URLs derived from VITE_SUPABASE_URL`

### Task 1.2.4 — `useFacebookIntegration.tsx`: app_id do banco + `window.location.origin`

- **Agente:** `frontend` · **Depende de:** 1.1.2 (tabela facebook), 1.2.1
- **Arquivos:** `src/hooks/useFacebookIntegration.tsx`
- **TDD:**
  - RED: teste afirmando (a) `facebookAppId` vem de `system_config_facebook.app_id` (Supabase mockado), não da string `1118192076871259`; (b) `redirectUri === ${window.location.origin}/auth/callback`, sem branch de domínio. Falha.
  - GREEN: `useQuery(["system_config","facebook"])` lendo `app_id`; remover App ID hardcoded e o bloco `if (origin.includes(...))`.
  - REFACTOR: —
- **Critérios de aceite:**
  - [ ] Testes verdes; `grep -E "1118192076871259|expxflow.com.br|controledetrafego.com.br" src/hooks/useFacebookIntegration.tsx` vazio.
  - [ ] `npm run build` ok.
- **Gate da task:** build + testes verdes.
- **Commit:** `fix: useFacebookIntegration reads app_id from system_config, dynamic redirect`

---

## Fase 1.3 — Assets & env (agentes: `devops`, `frontend`)

Paralela à 1.2. Arquivos disjuntos (raiz, `public/`, `index.html`, `.env`).

### Task 1.3.1 — Substituir PNGs corrompidos com token Netlify

- **Agente:** `devops` · **Depende de:** nada
- **Arquivos:** `public/logo-full.png`, `public/logo-icon.png`
- **TDD:**
  - RED: guard `Deno`/Vitest (ou caso novo no guard) afirmando `file public/logo-full.png` contém "PNG image" e o conteúdo **não** contém `site_id=` / `account_id=`. Falha (arquivos são HTML).
  - GREEN: substituir por PNG reais (logos da marca self-host neutra ou placeholders válidos).
  - REFACTOR: —
- **Critérios de aceite:**
  - [ ] `file public/*.png | grep "PNG image"` para ambos.
  - [ ] `grep -l "site_id\|account_id" public/*.png` vazio.
- **Gate da task:** asserções acima verdes.
- **Commit:** `fix: replace corrupted public PNGs leaking Netlify token`

### Task 1.3.2 — `index.html`: FB SDK App ID dinâmico + logos locais + metadata

- **Agente:** `frontend` (+ `devops`) · **Depende de:** 1.3.1
- **Arquivos:** `index.html`
- **TDD:**
  - RED: teste/guard afirmando que `index.html` não contém `1442283340343262` nem URLs `i.imgur.com`; favicon/og apontam para `public/` local. Falha.
  - GREEN: `FB.init()` lê `import.meta.env.VITE_FACEBOOK_APP_ID` (ou script que busca config); trocar Imgur por arquivos locais; metadata neutra/externalizada.
  - REFACTOR: —
- **Critérios de aceite:**
  - [ ] `grep -E "1442283340343262|i.imgur.com" index.html` vazio.
  - [ ] `npm run build` ok; app sobe sem erro de FB SDK quando `VITE_FACEBOOK_APP_ID` vazio (degrada graceful).
- **Gate da task:** build verde + greps vazios.
- **Commit:** `fix: index.html FB SDK dynamic app id, local logos, neutral metadata`

### Task 1.3.3 — `.env` → `.env.example` (placeholders) e limpeza do `.env`

- **Agente:** `devops` · **Depende de:** 1.2.2 (naming definido)
- **Arquivos:** `.env.example` (criar), `.env` (limpar), `.gitignore` (confirmar `.env` ignorado)
- **TDD:**
  - RED: guard afirmando `test -f .env.example` e que `.env.example` não contém `ejwpfztkspbvmuwwiwmk`; e que `.env` versionado (se houver) não tem anon key JWT real. Falha (não existe).
  - GREEN: criar `.env.example` (bloco do spec §6.2, com `VITE_SUPABASE_ANON_KEY` + Client IDs OAuth vazios); remover credenciais reais do `.env`; garantir `.env` no `.gitignore`.
  - REFACTOR: —
- **Critérios de aceite:**
  - [ ] `.env.example` existe com placeholders e sem segredos reais.
  - [ ] `.env` não contém project ID/JWT real (ou está fora do versionamento).
- **Gate da task:** guard verde para env.
- **Commit:** `chore: add .env.example, scrub .env of real credentials`

---

## Gate de Sprint 1 (bloqueia Sprint 2)

Executar e anexar saída ao commit de fechamento:

- [ ] `npm run test:ci` verde (inclui guard parcial — patterns de `src/` já devem estar verdes).
- [ ] `deno test supabase/functions/_shared/__tests__/` verde.
- [ ] `npm run build` + `npm run lint` limpos.
- [ ] `grep -r "ejwpfztkspbvmuwwiwmk" src/` **vazio**.
- [ ] `grep -rE "controledetrafego\.com\.br|expxflow\.com\.br" src/` **vazio**.
- [ ] `grep -rE "1118192076871259|1442283340343262" src/ index.html` **vazio**.
- [ ] `file public/logo-full.png public/logo-icon.png` → ambos "PNG image".
- [ ] `test -f .env.example` OK.
- [ ] **Smoke-test (§6.3 do main):** build sobe contra Supabase novo só com `.env.example` preenchido; login funciona.
- [ ] Commit + push na `main`.

> Os patterns ainda-vermelhos do guard nesta etapa são **somente** os de `supabase/functions/` (domínios/username em Edge Functions) — fechados no Sprint 2. Frontend e assets devem estar 100% limpos aqui.
