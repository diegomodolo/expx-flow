# Sprint 1 — Fundação & Bootstrap

> **Meta do sprint:** o app detecta que não está instalado e isola `/onboarding`; o schema consolidado e o manifesto de functions são gerados e testados. Sem isso, o núcleo do instalador (Sprint 2) não tem o que aplicar nem como decidir quando rodar.

**Gate de saída:** ver [`00-ORQUESTRADOR.md`](./00-ORQUESTRADOR.md) §5 GATE 1.

Cada task segue **TDD**: escreva o teste (RED), implemente (GREEN), refatore. Tasks marcadas `[infra]` não têm teste de comportamento — validam-se pelo gate da fase.

---

## Fase 1.1 — Infra de testes do instalador

### Task 1.1.1 `[infra]` — Adicionar Playwright + estrutura de testes serverless

- Instalar `@playwright/test`; adicionar scripts `test:e2e` e `test:e2e:ui` ao `package.json`.
- Configurar Vitest para também cobrir `api/**` (ambiente node).
- Criar `tests/e2e/` e `tests/e2e/fakes/` (placeholder).
- **Aceite:** `npm run test:e2e -- --list` roda sem erro; `vitest` enxerga `api/**`.

### Task 1.1.2 — Fakes das APIs externas (Vercel + Supabase Management)

- **RED:** teste que sobe o fake e espera respostas determinísticas para `GET /v2/user`, `GET /v1/organizations`, criação de projeto e deploy de function.
- **GREEN:** implementar `tests/e2e/fakes/vercel.ts` e `tests/e2e/fakes/supabase-mgmt.ts` (MSW ou servidor http fake) com cenários: token válido, token inválido, criação de projeto (estado pendente→ativo), deploy de function (ok/erro→retry).
- **Aceite:** testes do fake verdes; fake exposto para reuso em unit e e2e.

---

## Fase 1.2 — Schema consolidado

### Task 1.2.1 — `scripts/build-consolidated-schema.mjs`

- **RED:** teste (Vitest) que, dado um conjunto pequeno de migrations de fixture, o script produz um SQL contendo: extensões, enums, funções `SECURITY DEFINER` (`get_user_company_ids`), tabelas, policies RLS, **GRANTs** e seed de `system_config` (`installation_completed=false`).
- **GREEN:** implementar o gerador (concatenação ordenada de `supabase/migrations/` ou `pg_dump`), saída em `supabase/schema/consolidated.sql`.
- **REFACTOR:** garantir **idempotência** (`IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP POLICY IF EXISTS` antes de recriar).
- **Aceite:**
  - Gerar e aplicar `consolidated.sql` **duas vezes** num Postgres limpo de teste **não** dá erro (idempotente).
  - Contém `system_config` com `installation_completed = false`.
  - Script `npm run build:schema` adicionado.

### Task 1.2.2 — Gate de CI: schema atualizado

- **RED:** teste que falha se `consolidated.sql` está desatualizado em relação às migrations (hash/contagem).
- **GREEN:** script `scripts/check-schema-fresh.mjs`; plugar no `test:ci` e no husky.
- **Aceite:** alterar uma migration sem regenerar o schema quebra o pipeline.

---

## Fase 1.3 — Manifesto de functions

### Task 1.3.1 — `scripts/build-functions-manifest.mjs`

- **RED:** teste que, dado `supabase/functions/` de fixture com 3 functions (1 com `verify_jwt=false`), gera um manifesto JSON com `{ name, entrypoint, files[], verifyJwt }` para cada uma, lendo o `verify_jwt` do `supabase/config.toml`.
- **GREEN:** implementar o gerador → `api/installer/_functions-manifest.json`.
- **Aceite:**
  - Manifesto cobre **todas** as ~235 functions de `supabase/functions/` (teste compara contagem).
  - `verify_jwt` correto por function (cruzando com `config.toml`).
  - Script `npm run build:functions-manifest`.

### Task 1.3.2 `[infra]` — Embutir functions no bundle da Vercel

- Garantir que o código de `supabase/functions/**` está acessível no runtime Node da Vercel function (FS include via `vercel.json` `functions`/`includeFiles`, ou import).
- **Aceite:** um teste de fumaça lê o conteúdo de 1 function pelo manifesto em runtime node sem erro.

---

## Fase 1.4 — Guard & detecção

### Task 1.4.1 — `GET /api/installer/status`

- **RED (Vitest):** 4 cenários →
  1. sem `VITE_SUPABASE_URL` → `{ configured: false, reason: 'no-env' }`
  2. env ok, sem flag → `{ configured: false, reason: 'not-installed' }`
  3. env+flag ok, sem admin → `{ configured: false, reason: 'no-admin' }`
  4. tudo ok → `{ configured: true }`
- **GREEN:** implementar `api/installer/status.ts` (consulta `system_config.installation_completed` + count admins via anon/публic client quando há env; tolera ausência de env).
- **Aceite:** os 4 testes verdes; nunca lança 500 por env ausente.

### Task 1.4.2 — `InstallationGuard` + rota `/onboarding`

- **RED (Vitest + Testing Library):**
  - guard mostra spinner durante loading;
  - `configured=false` → redireciona para `/onboarding`;
  - `configured=true` e usuário em `/onboarding` → redireciona para `/`;
  - resultado `true` é cacheado (não refaz fetch a cada navegação).
- **GREEN:**
  - `src/guards/InstallationGuard.tsx` no topo do `App.tsx`, **antes** de `ProtectedRoute`.
  - `src/pages/Onboarding.tsx` registrada como rota **pública** (sem `DashboardLayout`/`ProtectedRoute`).
- **Aceite:** testes verdes; `/onboarding` não renderiza sidebar/header; app normal inacessível enquanto não configurado.

---

## Critérios de Aceite do Sprint 1 (GATE 1)

- [ ] `npm run build:schema` → `consolidated.sql` idempotente (aplica 2x sem erro) com `system_config` seed.
- [ ] `npm run build:functions-manifest` → manifesto cobrindo todas as functions, `verify_jwt` correto.
- [ ] Gate de CI quebra se schema desatualizado.
- [ ] `GET /api/installer/status` correto nos 4 cenários.
- [ ] `InstallationGuard` redireciona/isola `/onboarding` corretamente; `true` cacheado.
- [ ] `lint` + `test:ci` verdes.
