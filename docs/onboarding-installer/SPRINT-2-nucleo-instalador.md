# Sprint 2 — Núcleo do Instalador

> **Meta do sprint:** dado 2 tokens, o instalador cria o projeto Supabase, aplica o schema, deploya as ~235 functions (com retry/resume), define secrets, grava as envs na Vercel e dispara o redeploy — tudo testado com APIs mockadas e validado por um smoke-test real.

**Gate de saída:** ver [`00-ORQUESTRADOR.md`](./00-ORQUESTRADOR.md) §5 GATE 2.

Todas as functions são **Vercel Serverless** (`api/installer/*`), Node runtime. Tokens **só em memória** da request, nunca persistidos nem logados.

---

## Fase 2.1 — Clientes de API (wrappers)

### Task 2.1.1 — `api/installer/_lib/vercel-api.ts`

- **RED:** testes (mock fetch / fake da Fase 1.1) para: validar token (`GET /v2/user`), upsert de env var, disparar redeploy, ler status de deploy. Inclui erro tipado (401, 429 com retry, 5xx).
- **GREEN:** wrapper com retry exponencial (3x) em 429/5xx, erros tipados (`VercelApiError`), nunca loga o token.
- **Aceite:** testes verdes; retry só em 429/5xx; token ausente nos logs.

### Task 2.1.2 — `api/installer/_lib/supabase-mgmt.ts`

- **RED:** testes para: listar orgs, criar projeto (retorna ref + credenciais), poll de status até `ACTIVE_HEALTHY`, deploy de 1 function, set de secret, executar SQL.
- **GREEN:** wrapper com retry, poll com timeout configurável, erros tipados (`SupabaseMgmtError`).
- **Aceite:** testes verdes; poll respeita timeout e backoff.

---

## Fase 2.2 — Validação & listagem

### Task 2.2.1 — `POST /api/installer/validate-tokens`

- **RED:** token Vercel válido + Supabase válido → `{ vercel: true, supabase: true }`; qualquer inválido → `{ ..., error }` com mensagem PT-BR; nunca 500.
- **GREEN:** implementar usando os wrappers.
- **Aceite:** testes verdes; mensagens PT-BR; tokens não persistidos.

### Task 2.2.2 — `POST /api/installer/list-orgs`

- **RED:** dado token válido, retorna `[{ id, name }]`; token inválido → erro PT-BR.
- **GREEN:** implementar via `supabase-mgmt.listOrgs`.
- **Aceite:** testes verdes; mapeamento correto da resposta da Management API.

---

## Fase 2.3 — Orquestrador de steps: create-project + apply-schema

### Task 2.3.1 — `_lib/progress.ts` (estado resumível)

- **RED:** ler progresso inexistente → estado inicial; escrever e reler step concluído; `completedSteps` acumula sem duplicar.
- **GREEN:** persistência em `system_config.install_progress` (JSON) no Supabase do cliente assim que ele existe; antes disso, em memória/retorno da request.
- **Aceite:** testes verdes; idempotência de `completedSteps`.

### Task 2.3.2 — Step `create-project`

- **RED:** cria projeto na org; aguarda `ACTIVE_HEALTHY`; se `projectRef` já no progress, **pula** (idempotente); falha de criação → erro tipado e step não marcado.
- **GREEN:** implementar usando `supabase-mgmt`.
- **Aceite:** testes verdes; re-run não cria projeto duplicado.

### Task 2.3.3 — Step `apply-schema`

- **RED:** habilita extensões necessárias; aplica `consolidated.sql` (mock da execução SQL); re-run não falha (idempotente); erro de SQL → step não marcado.
- **GREEN:** implementar (conexão PG direta ou endpoint de query da Management API, usando credenciais retornadas na criação).
- **Aceite:** testes verdes; extensões habilitadas antes do schema; idempotente.

---

## Fase 2.4 — Step `deploy-functions` (lotes + retry + resume)

### Task 2.4.1 — Deploy em lotes

- **RED:** dado manifesto com N functions, deploya em lotes de ~10; uma function que falha 2x e passa na 3ª é deployada (retry backoff); functions já em `completedSteps.functions[]` são **puladas** no resume.
- **GREEN:** iterar o manifesto, respeitar `verify_jwt`, marcar cada function concluída no progress.
- **Aceite:**
  - Todas as functions do manifesto deployadas (teste compara contagem).
  - Resume a partir de lote parcial não re-deploya as concluídas.
  - Falha definitiva (após 3 tentativas) interrompe com erro claro e progress preservado.

### Task 2.4.2 — Limite de tempo / continuação

- **RED:** quando o lote restante excede o orçamento de tempo, `run` retorna `{ status: 'partial', resumeFrom }` em vez de estourar; reinvocação continua.
- **GREEN:** orçamento de tempo por invocação; SSE emite `partial`; cliente reinvoca `run`.
- **Aceite:** simulação de tempo curto → `partial` + continuação até `done`.

---

## Fase 2.5 — Secrets, envs da Vercel e redeploy

### Task 2.5.1 — Step `set-secrets`

- **RED:** define secrets/placeholders padrão (Deno.env) via Management API; upsert idempotente.
- **GREEN:** implementar; valores reais das integrações ficam vazios/placeholder (configurados depois em `/configuracoes/sistema`).
- **Aceite:** testes verdes; nenhum secret real do dev embutido.

### Task 2.5.2 — Step `write-vercel-env`

- **RED:** grava `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (do projeto recém-criado) via Vercel API; upsert por chave (não duplica).
- **GREEN:** implementar via `vercel-api`.
- **Aceite:** testes verdes; chaves corretas com os valores do novo projeto.

### Task 2.5.3 — Step `trigger-redeploy`

- **RED:** dispara redeploy; aguarda status `READY` (poll com timeout); erro → step não marcado.
- **GREEN:** implementar via `vercel-api`.
- **Aceite:** testes verdes; só marca concluído quando `READY`.

### Task 2.5.4 — `POST /api/installer/run` (SSE) integrando os steps

- **RED:** orquestra create-project → apply-schema → deploy-functions → set-secrets → write-vercel-env → trigger-redeploy emitindo eventos `{ step, status, pct }`; re-run pula steps concluídos; recusa 409 se `installation_completed=true` (sem flag de reinstalação).
- **GREEN:** implementar o orquestrador (`_lib/steps.ts`) + handler SSE.
- **Aceite:** testes verdes da sequência completa, idempotência e bloqueio de reinstalação.

---

## Smoke-test manual de Gate 2 (documentado, não automatizado)

Procedimento (registrar evidência no PR):

1. Criar um Supabase access token e um Vercel token de teste.
2. Rodar `run` apontando para uma org real de teste.
3. Confirmar: projeto criado, schema aplicado (tabelas-chave existem), amostra de functions no ar, envs gravadas na Vercel, redeploy `READY`.
4. Apagar o projeto de teste ao final.

---

## Critérios de Aceite do Sprint 2 (GATE 2)

- [ ] Wrappers Vercel + Supabase Management com retry/erros tipados — testes verdes.
- [ ] `validate-tokens` e `list-orgs` testados, mensagens PT-BR, tokens não persistidos.
- [ ] `run` executa todos os steps com idempotência e resume — testes verdes.
- [ ] `deploy-functions` cobre todas as functions, com retry e resume por lote.
- [ ] Bloqueio de reinstalação (409) testado.
- [ ] Smoke-test manual ponta-a-ponta concluído e documentado.
- [ ] `lint` + `test:ci` verdes.
