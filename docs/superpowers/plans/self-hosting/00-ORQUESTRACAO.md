# Self-Hosting — Plano de Execução (Orquestração)

> **Arquivo main.** Ponto de entrada para executar a liberação de fontes para self-hosting. Define os sprints, as fases, a orquestração de sub-agents, os gates e a política de TDD. Os arquivos de sprint (`SPRINT-1`, `SPRINT-2`, `SPRINT-3`) contêm as tasks detalhadas.

**Spec de origem:** [`docs/SPEC_SELF_HOSTING.md`](../../../SPEC_SELF_HOSTING.md)
**Plano absorvido (histórico):** [`docs/superpowers/plans/2026-04-16-system-config-self-hosting.md`](../2026-04-16-system-config-self-hosting.md) — suas 15 tasks foram reescritas e expandidas aqui. Este plano é a **fonte única**.

---

## 1. Objetivo

Eliminar **todos** os valores hardcoded (project ID, domínios, App IDs, username, tokens) e externalizar todas as configs globais para que um cliente instale e opere sua própria instância sem nunca ver dados do desenvolvedor original. Resultado verificável: o §10 do spec (guard test) passa, o build limpa e a instalação é reproduzível a partir do `.env.example` + UI `/configuracoes/sistema`.

---

## 2. Mapa de Sprints e Fases

```
SPRINT 1 — P0 Bloqueadores (não se pode liberar fontes sem isso)
  ├── Fase 1.1  Fundação: harness de teste Deno + guard test + system_config_* + getSystemConfig
  ├── Fase 1.2  Frontend: client.ts, publicClient.ts, hooks, webhooks dinâmicos, naming anon key
  └── Fase 1.3  Assets & env: PNGs corrompidos, index.html, .env → .env.example
       ▼ GATE DE SPRINT 1

SPRINT 2 — P1 Essencial (self-hosting funcional)
  ├── Fase 2.1  Edge Functions: Facebook/Meta (~5)
  ├── Fase 2.2  Edge Functions: Google Ads (~7) + Google Meet (~4) + YouTube + Slides (~2)
  ├── Fase 2.3  Edge Functions: Email (~5) + Ferramentas/Apify/Shotstack/Firecrawl (~8)
  ├── Fase 2.4  Edge Functions: GitHub (~4, remover fallback) + Discord fallback
  ├── Fase 2.5  Cron: templates parametrizados / setup-cron-jobs
  └── Fase 2.6  UI: useSystemConfig + SystemConfigSettings + rota /configuracoes/sistema
       ▼ GATE DE SPRINT 2

SPRINT 3 — P2 Polimento & Docs (DX e distribuição)
  ├── Fase 3.1  Serviços terceiros: Railway proxy, API4Com base URL, User-Agent
  ├── Fase 3.2  Distribuição: .github/ dev-only, README, licença
  ├── Fase 3.3  Docs: docs/INSTALACAO.md + checklist pós-instalação + webhooks
  └── Fase 3.4  Verificação final: scripts/verify-self-hosting.sh + guard test full
       ▼ GATE DE SPRINT 3 (release-ready)
```

Sprints são alinhados a **prioridade** (P0→P1→P2, §8 do spec). Cortar escopo = parar após um gate de sprint: depois do Gate 1 os fontes não vazam credenciais; depois do Gate 2 o self-hosting é funcional; depois do Gate 3 é release-grade.

---

## 3. Orquestração de Sub-Agents

Todo o trabalho passa pelo agente **`orquestrador`** (`.claude/agents/orquestrador.md`), que decompõe cada fase e delega às especialidades. Agentes especializados **não delegam entre si** — reportam ao orquestrador.

### 3.1. Mapa fase → agente

| Fase                   | Agente primário                                  | Agentes de apoio                               | Rules carregadas                               |
| ---------------------- | ------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| 1.1 Fundação           | `backend` (tabelas/helper) + `testing` (harness) | `devops` (guard test)                          | global + backend + testing + devops            |
| 1.2 Frontend           | `frontend`                                       | `testing` (Vitest)                             | global + frontend + testing                    |
| 1.3 Assets & env       | `devops`                                         | `frontend` (index.html)                        | global + devops + frontend                     |
| 2.1–2.4 Edge Functions | `backend`                                        | `testing` (Deno.test), `auth` (OAuth redirect) | global + backend + testing + auth-permissions  |
| 2.5 Cron               | `devops`                                         | `backend`                                      | global + devops + backend                      |
| 2.6 UI config          | `frontend`                                       | `auth` (owner gate), `testing`                 | global + frontend + auth-permissions + testing |
| 3.1 Terceiros          | `backend` + `devops`                             | —                                              | global + backend + devops                      |
| 3.2 Distribuição       | `devops`                                         | —                                              | global + devops                                |
| 3.3 Docs               | `devops`                                         | —                                              | global + devops                                |
| 3.4 Verificação        | `testing` + `devops`                             | todos                                          | global + testing + devops                      |

> **Novo agente:** `devops` (`.claude/agents/devops.md` + `.claude/rules/devops.md`) foi criado para o entorno de self-hosting (cron, config.toml, .env, .github, assets, guard test) — trabalho que não cabe limpo em frontend/backend/auth/testing.

### 3.2. Paralelismo permitido

Dentro de um sprint, fases que tocam **arquivos disjuntos** podem rodar em paralelo (sub-agents concorrentes). Entre fases com dependência (ex.: 2.x depende de `getSystemConfig` da 1.1), há barreira.

```
Sprint 1:  1.1 ──┬──▶ 1.2  (1.2 e 1.3 paralelas após 1.1)
                 └──▶ 1.3
Sprint 2:  2.1 ∥ 2.2 ∥ 2.3 ∥ 2.4   (4 grupos de Edge Functions, arquivos disjuntos — paralelos)
           └──────────────────────▶ 2.5 ∥ 2.6
Sprint 3:  3.1 ∥ 3.2 ∥ 3.3 ──▶ 3.4
```

Pré-requisito para qualquer paralelismo no Sprint 2: a Fase 1.1 (helper + tabelas + harness) estar **mergeada e verde**.

### 3.3. Protocolo de delegação (o que o orquestrador instrui em cada task)

1. Carregar `.claude/rules/global.md` + a(s) rule(s) escopada(s) da fase.
2. Ler a skill de contexto do módulo se existir (ex.: `ai-gateway`, `publicacao-social`).
3. Seguir o ciclo TDD da task (RED → GREEN → REFACTOR) — ver §4.
4. Rodar os critérios de aceite da task.
5. Reportar ao orquestrador: o que mudou, testes verdes, saída dos gates.

---

## 4. Política de TDD (estrito em todas as tasks)

Toda task segue **RED → GREEN → REFACTOR**. Nenhuma implementação antes de um teste que falha.

### 4.1. Frontend (hooks, componentes, clients)

- Runner: **Vitest** (`npm run test`, `npm run test:ci`).
- Mocks obrigatórios: Supabase client, `useAuth`, `CompanyContext`, Sonner (rule `testing.md`).
- QueryClient com `retry: false`; providers (QueryClientProvider + BrowserRouter + contexts).
- RED: teste que assere o comportamento esperado (ex.: "webhook URL é derivada de `VITE_SUPABASE_URL`", "owner vê form, colaborador vê acesso negado") e falha contra o código atual.

### 4.2. Edge Functions (Deno) — harness criado na Fase 1.1

- Runner: **`Deno.test`** (`deno test supabase/functions/`).
- **Mock do Supabase client** (`_shared/__tests__/mockSupabase.ts`): retorna linhas de `system_config_*` controladas pelo teste, sem rede.
- Lógica de resolução de credencial é testada como **função pura testável**: `getSystemConfig` e o padrão `env > banco`.
  - RED para cada função migrada: teste que afirma "quando env var ausente, lê do banco" e "quando nenhum dos dois, erro graceful" — falha antes da migração.
- Handlers HTTP finos: a lógica de credencial/URL sai para módulos puros importáveis pelo teste.

### 4.3. SQL / Migrations / Cron / Config

- Cobertos por **gates de verificação executáveis** no lugar de unit test puro:
  - `setup-cron-jobs`: teste Deno que verifica que o SQL gerado não contém literais de URL/bearer (usa o mock).
  - Migrations `system_config_*`: verificação via `list_tables` + teste de RLS (owner lê, colaborador não).
  - `config.toml` / `.env`: cobertos pelo **guard test** (§4.4).

### 4.4. Guard test de hardcode (regression — sempre verde)

- `src/test/guards/no-hardcode.test.ts` (Vitest): transforma o §10 do spec em teste. Falha o build se reaparecer project ID, domínio, App ID ou username.
- É um **teste permanente**, não de uma task: roda em todo gate e no CI.

---

## 5. Critérios de Aceite (template por task)

Cada task nos arquivos de sprint segue este formato:

```
### Task <S>.<F>.<N> — <título>
- Agente: <frontend|backend|auth|testing|devops>
- Depende de: <task(s) ou "nada">
- Arquivos: <lista>
- TDD:
  - RED:   <teste que falha + comando>
  - GREEN: <implementação mínima>
  - REFACTOR: <limpeza, se houver>
- Critérios de aceite (todos verificáveis):
  - [ ] <asserção 1 — teste/comando>
  - [ ] ...
- Gate da task: <build/test/grep/deploy que deve passar para marcar done>
- Commit: <mensagem padrão>
```

---

## 6. Gates

### 6.1. Gate de fase (dentro do sprint)

Bloqueia o início da próxima fase dependente. Deve passar:

- [ ] Todos os testes da fase verdes (`npm run test:ci` e/ou `deno test` no escopo).
- [ ] Guard test verde (`no-hardcode.test.ts`).
- [ ] `npm run build` sem erros (quando a fase tocou `src/`).
- [ ] Edge Functions da fase deployadas com smoke-test OK (quando a fase tocou `supabase/functions/`).
- [ ] Sem `--no-verify`; husky passou.

### 6.2. Gate de sprint (bloqueia o sprint seguinte)

Tudo do gate de fase **+**:

- [ ] Guard test full (§10 do spec inteiro: 5 patterns) verde em `src/` **e** `supabase/`.
- [ ] `npm run build` + `npm run test:ci` + `npm run lint` limpos.
- [ ] `deno test supabase/functions/` verde (todas as suites do harness).
- [ ] Smoke-test de regressão das integrações chave do sprint (ver tabela §6.3).
- [ ] Commit + push na `main` (deploy Vercel) — rule global #9.
- [ ] Skill de contexto criada/atualizada se a fase concluiu um módulo (rule global #10).

### 6.3. Smoke-tests por sprint

| Sprint | Smoke-test                                                                                                                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | App builda e sobe apontando para um Supabase **novo** (não o do dev) só com `.env.example` preenchido; login funciona; `public/*.png` são PNG válidos.                                                                               |
| 2      | Como owner em `/configuracoes/sistema`: salvar config de IA + Email + Facebook; uma chamada de IA usa a chave do banco; um convite por email usa `from_email` do banco; cron registrado via `setup-cron-jobs` aparece em `cron.job`. |
| 3      | `scripts/verify-self-hosting.sh` retorna todos OK; `docs/INSTALACAO.md` reproduz a instalação do zero; nenhuma referência ao GitHub do dev.                                                                                          |

---

## 7. Ordem de Execução e Retomada

1. Executar fases na ordem do §2, respeitando barreiras do §3.2.
2. Cada task: TDD → critérios de aceite → gate da task → commit.
3. Fim de fase: gate de fase (§6.1).
4. Fim de sprint: gate de sprint (§6.2) → **só então** iniciar o próximo sprint.

**Retomada:** o estado vive nos checkboxes `- [ ]` dos arquivos de sprint + no histórico git (uma mensagem de commit por task). Para retomar, achar a primeira task não-checada cujo "Depende de" já está verde.

---

## 8. Resumo de Entregáveis

| Entregável                                               | Onde               | Sprint |
| -------------------------------------------------------- | ------------------ | ------ |
| `system_config_*` (8 tabelas) + `is_system_owner()`      | migration          | 1      |
| `_shared/getSystemConfig.ts` + harness Deno + mock       | supabase/functions | 1      |
| `no-hardcode.test.ts` (guard)                            | src/test/guards    | 1      |
| Frontend sem hardcode (clients, hooks, webhooks, naming) | src/               | 1      |
| `.env.example`, PNGs válidos, index.html limpo           | raiz/public        | 1      |
| ~30 Edge Functions lendo do banco (env > banco)          | supabase/functions | 2      |
| `setup-cron-jobs` + templates de cron                    | supabase           | 2      |
| `useSystemConfig` + `SystemConfigSettings` + rota        | src/               | 2      |
| Terceiros externalizados (Railway, API4Com, UA)          | supabase           | 3      |
| `.github.dev/`, README, `docs/INSTALACAO.md`, checklist  | raiz/docs          | 3      |
| `scripts/verify-self-hosting.sh`                         | scripts            | 3      |
| Skill de contexto `self-hosting`                         | .claude/skills     | 3      |

---

_Plano gerado a partir de `SPEC_SELF_HOSTING.md`. Estimativa de origem: 10–15 dias focados. Estrutura: 3 sprints, 13 fases, ~40 tasks._
