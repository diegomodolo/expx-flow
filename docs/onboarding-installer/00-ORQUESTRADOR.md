# Auto-Instalador `/onboarding` — Plano de Execução (Orquestrador)

> **Arquivo norte.** Ponto de entrada para implementar o auto-instalador in-app do Expx Flow. Define os sprints, fases, orquestração de sub-agents, gates, política de TDD e critérios de aceite. Os arquivos de sprint contêm as tasks detalhadas.

**Spec de origem:** [`docs/superpowers/specs/2026-06-18-onboarding-installer-design.md`](../superpowers/specs/2026-06-18-onboarding-installer-design.md)
**Dependência (pré-requisito):** [`docs/superpowers/plans/self-hosting/00-ORQUESTRACAO.md`](../superpowers/plans/self-hosting/00-ORQUESTRACAO.md) — zero hardcode + `system_config_*` + schema consolidável.

---

## 1. Objetivo

Entregar uma instalação **sem terminal** para um público **não-técnico**: o cliente clica em "Deploy to Vercel", abre o app, é levado a `/onboarding`, cola **2 tokens** (Vercel + Supabase), e o instalador cria o Supabase, aplica o schema, deploya as ~235 functions, configura a Vercel, redeploya e cria o admin. Resultado verificável: uma instância nova fica 100% funcional a partir de 2 tokens + dados do admin, com `installation_completed = true` e o guard liberando o app.

---

## 2. Mapa de Sprints e Fases

```
SPRINT 1 — Fundação & Bootstrap (sem isso nada roda)
  ├── Fase 1.1  Infra de testes do instalador: Vitest p/ serverless + Playwright + fakes de API
  ├── Fase 1.2  Schema consolidado: scripts/build-consolidated-schema.mjs + gate CI
  ├── Fase 1.3  Manifesto de functions: scripts/build-functions-manifest.mjs + embutir no bundle
  └── Fase 1.4  Guard & detecção: /api/installer/status + InstallationGuard + rota /onboarding pública
       ▼ GATE 1 — guard redireciona; schema e manifesto gerados e testados

SPRINT 2 — Núcleo do Instalador (o trabalho pesado)
  ├── Fase 2.1  Clientes de API: wrappers Vercel API + Supabase Management API (com retry/erros)
  ├── Fase 2.2  validate-tokens + list-orgs (functions + testes)
  ├── Fase 2.3  Orquestrador de steps (run/SSE): create-project, apply-schema
  ├── Fase 2.4  deploy-functions em lotes com retry + resume (install_progress)
  └── Fase 2.5  set-secrets + write-vercel-env + trigger-redeploy
       ▼ GATE 2 — instância criada e configurada via API (com APIs reais em projeto de teste)

SPRINT 3 — Wizard, Admin & E2E (a experiência do leigo)
  ├── Fase 3.1  UI do wizard: 7 telas, estado, progresso SSE, mensagens PT-BR, resume
  ├── Fase 3.2  create-admin + fechamento (installation_completed) + redirect final
  ├── Fase 3.3  E2E Playwright: fluxo feliz, resume, token inválido, reinstalação bloqueada
  └── Fase 3.4  Distribuição: botão Deploy to Vercel + README + docs + skill de contexto
       ▼ GATE 3 — instalação ponta-a-ponta por leigo, build/lint/test/e2e verdes
```

Cortar escopo = parar após um gate: após Gate 1 o app detecta instalação e isola `/onboarding`; após Gate 2 o instalador provisiona tudo via API; após Gate 3 é release-grade para leigos.

---

## 3. Orquestração de Sub-Agents

Todo trabalho passa pelo agente **`orquestrador`** (`.claude/agents/orquestrador.md`), que decompõe cada fase e delega. Agentes especializados **não delegam entre si** — reportam ao orquestrador. Cada delegação carrega `global.md` + a rule escopada do agente.

### 3.1 Mapa fase → agente

| Fase | Agente principal | Apoio      | Rules carregadas                                    |
| ---- | ---------------- | ---------- | --------------------------------------------------- |
| 1.1  | `testing`        | —          | `global.md` + `testing.md`                          |
| 1.2  | `backend`        | `devops`   | `global.md` + `backend.md` + `devops.md`            |
| 1.3  | `backend`        | `devops`   | `global.md` + `backend.md` + `devops.md`            |
| 1.4  | `frontend`       | `auth`     | `global.md` + `frontend.md` + `auth-permissions.md` |
| 2.1  | `devops`         | `backend`  | `global.md` + `devops.md` + `backend.md`            |
| 2.2  | `devops`         | `testing`  | `global.md` + `devops.md`                           |
| 2.3  | `backend`        | `devops`   | `global.md` + `backend.md` + `devops.md`            |
| 2.4  | `devops`         | `backend`  | `global.md` + `devops.md`                           |
| 2.5  | `devops`         | `frontend` | `global.md` + `devops.md`                           |
| 3.1  | `frontend`       | `testing`  | `global.md` + `frontend.md`                         |
| 3.2  | `auth`           | `backend`  | `global.md` + `auth-permissions.md` + `backend.md`  |
| 3.3  | `testing`        | `frontend` | `global.md` + `testing.md`                          |
| 3.4  | `devops`         | `frontend` | `global.md` + `devops.md`                           |

> **Nota:** o instalador roda como **Vercel Serverless Function** (`api/installer/*`), território novo no projeto. O agente `devops` é o dono dessa superfície; `backend` cobre o SQL/Management API; `frontend` cobre o wizard; `testing` cobre toda a malha de testes.

---

## 4. Política de TDD (inviolável)

Para **toda** task com alvo testável:

1. **RED** — escrever o teste que falha (unit Vitest ou e2e Playwright) reproduzindo o comportamento desejado.
2. **GREEN** — implementação mínima para passar.
3. **REFACTOR** — limpar mantendo verde.

- Mocks obrigatórios: Vercel API, Supabase Management API, conexão PG e `fetch` — **nunca** bater em serviço real em teste unit (exceto o smoke-test manual de Gate 2, explicitamente marcado).
- E2E roda contra **fakes locais** das APIs externas (MSW ou servidor fake em `tests/e2e/fakes/`).
- QueryClient de teste sempre com `retry: false`. Componentes envoltos em `QueryClientProvider` + `BrowserRouter`.
- Nomes de teste em **PT-BR**, descrevendo comportamento (não implementação).

---

## 5. Gates (critérios de saída por sprint)

### GATE 1

- [ ] `npm run build:schema` gera `supabase/schema/consolidated.sql` idempotente; teste valida estrutura.
- [ ] `npm run build:functions-manifest` gera o manifesto; teste valida que cobre todas as functions de `supabase/functions/`.
- [ ] `GET /api/installer/status` responde `configured` corretamente nos 4 cenários (sem env / sem flag / sem admin / ok) — testes verdes.
- [ ] `InstallationGuard` redireciona para `/onboarding` quando não configurado e isola `/onboarding` quando configurado.
- [ ] `lint` + `test:ci` verdes.

### GATE 2

- [ ] Wrappers de Vercel API e Supabase Management API com retry/erro tipado — testes verdes.
- [ ] `validate-tokens` e `list-orgs` testados (mock).
- [ ] `run` executa create-project → apply-schema → deploy-functions (lotes+retry) → set-secrets → write-vercel-env → trigger-redeploy, com idempotência e resume — testes verdes.
- [ ] **Smoke-test manual** (documentado): provisionar um Supabase real de teste ponta-a-ponta e confirmar schema + functions no ar.
- [ ] `lint` + `test:ci` verdes.

### GATE 3

- [ ] Wizard completo (7 telas) com progresso SSE, resume e mensagens PT-BR.
- [ ] `create-admin` cria admin e marca `installation_completed`; guard libera o app.
- [ ] E2E Playwright: fluxo feliz, resume, token inválido, reinstalação bloqueada — todos verdes.
- [ ] Botão "Deploy to Vercel" + README + `docs/INSTALACAO.md` atualizados; skill de contexto `.claude/skills/onboarding-installer/SKILL.md` criada.
- [ ] `build` + `lint` + `test:ci` + e2e verdes. Guard test de hardcode (self-hosting) continua passando.

---

## 6. Convenções de Arquivos

```
api/installer/
  status.ts                 # GET  detecção configured
  validate-tokens.ts        # POST valida Vercel + Supabase token
  list-orgs.ts              # POST lista orgs Supabase
  run.ts                    # POST orquestra steps (SSE)
  create-admin.ts           # POST cria admin + fecha instalação
  _lib/
    vercel-api.ts           # wrapper Vercel API
    supabase-mgmt.ts        # wrapper Supabase Management API
    steps.ts                # orquestrador de steps idempotente
    progress.ts             # leitura/escrita de install_progress
  _functions-manifest.json  # gerado no build (nome→arquivos, verify_jwt)

supabase/schema/
  consolidated.sql          # gerado no build (idempotente)

scripts/
  build-consolidated-schema.mjs
  build-functions-manifest.mjs

src/
  components/onboarding/    # telas do wizard
  pages/Onboarding.tsx      # rota /onboarding
  guards/InstallationGuard.tsx

tests/e2e/
  onboarding.spec.ts
  fakes/                    # fakes de Vercel/Supabase Management API
```

- Imports do frontend com `@/`. Textos UI/toasts em PT-BR. Forms com React Hook Form + Zod.
- Functions da Vercel: Node runtime, sem segredo no client, tokens só em memória.

---

## 7. Ordem de Execução Recomendada

1. **Sprint 1 inteiro** (fundação) — sem schema consolidado, manifesto e guard, nada do resto funciona.
2. **Sprint 2** — núcleo; fechar com o smoke-test manual de Gate 2 antes de construir a UI.
3. **Sprint 3** — UI + admin + e2e + distribuição.

Cada fase abre com os testes (RED), implementa (GREEN), refatora, e só avança após o checklist da fase. Cada sprint só fecha após seu GATE.

---

## 8. Riscos & Decisões em Aberto (resolver na execução)

| Risco                                                                                    | Mitigação planejada                                                                                             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Limite de tempo da serverless function (deploy de 235 functions)                         | Lotes + SSE + resume; se estourar, dividir `run` em chamadas sequenciais por lote (cliente reinvoca)            |
| Aplicar `consolidated.sql` precisa da senha do DB / service_role do projeto recém-criado | Management API retorna credenciais na criação; usar conexão direta PG ou endpoint de query da Management API    |
| `pg_cron`/extensões não habilitadas no projeto novo                                      | `apply-schema` habilita extensões necessárias antes do schema; cron via templates parametrizados (self-hosting) |
| Bundle das 235 functions estourar tamanho da Vercel function                             | Avaliar ler do FS no runtime Node vs import estático; comprimir manifesto                                       |
| Redeploy invalida o estado em memória                                                    | Estado vive em `install_progress` (no Supabase já criado) — sobrevive ao redeploy                               |

Estas decisões são refinadas no início da fase correspondente e registradas no arquivo de sprint.
