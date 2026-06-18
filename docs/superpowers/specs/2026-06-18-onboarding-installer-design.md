# Spec: Auto-Instalador `/onboarding` do Expx Flow

> **Objetivo:** Permitir que uma pessoa **sem conhecimento técnico** instale uma instância completa do Expx Flow colando apenas **2 tokens** (Vercel + Supabase access token) numa tela `/onboarding`. O instalador cria o projeto Supabase do cliente, aplica todo o schema, deploya as ~235 Edge Functions, configura as env vars da Vercel, dispara o redeploy e cria o usuário admin — tudo sozinho, com barra de progresso, sem terminal.

**Data:** 2026-06-18
**Status:** Aprovado para planejamento
**Spec relacionada (pré-requisito):** [`docs/SPEC_SELF_HOSTING.md`](../../SPEC_SELF_HOSTING.md) — a externalização de credenciais (zero hardcode, `system_config_*`, schema consolidável) é **pré-condição** deste instalador.

---

## 1. Sumário Executivo

Hoje a instalação do Expx Flow é um processo **manual de terminal** (clone, `supabase link`, `db push`, deploy de 236 functions à mão, configuração da Vercel). Isso é inviável para o público-alvo: **quem instala não é técnico**.

Este projeto entrega um **auto-instalador in-app** com a seguinte experiência:

1. O cliente clica em **"Deploy to Vercel"** no README. A Vercel clona o repositório e sobe o frontend **sem nenhum Supabase configurado**.
2. Ao abrir o app, um **guard** detecta que a instalação não foi concluída e redireciona para **`/onboarding`**.
3. No wizard, o cliente cola **2 tokens** (Vercel API token + Supabase access token), escolhe a **organização** Supabase, e dá um nome ao projeto.
4. Uma **Vercel Serverless Function (`/api/installer/*`)** executa todo o trabalho pesado, reportando progresso em tempo real.
5. Ao final, o cliente cadastra **email + senha do admin** e é redirecionado para a aplicação já funcionando.

### Princípio central

> **O instalador NÃO roda no Supabase.** Ele roda como **Vercel Serverless Function** (Node runtime, Fluid Compute). Isso é o que elimina o problema do ovo-e-galinha: no início **não existe Supabase**, então o instalador não pode viver nele. Ele vive na Vercel, que já está no ar desde o "Deploy to Vercel".

---

## 2. Decisões de Arquitetura (travadas)

| #   | Decisão                                                                                                                      | Justificativa                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| D1  | Instalador = **Vercel Serverless Functions** (`api/installer/*.ts`), Node runtime                                            | Elimina chicken-and-egg: não há Supabase no início. Tem Node (HTTP/bundling), recebe tokens por request.                     |
| D2  | **Sem Supabase mestre.** O instalador **cria** o projeto Supabase do cliente via Management API                              | Zero infra compartilhada do desenvolvedor; máxima autonomia do cliente.                                                      |
| D3  | **Schema consolidado** (`supabase/schema/consolidated.sql`) gerado no build a partir das 536 migrations                      | Replay de 536 migrations é lento e frágil (migrations assumem estado do dev). Um snapshot idempotente aplica em 1 transação. |
| D4  | **~235 Edge Functions** deployadas via **Supabase Management API** em lotes com retry; código embutido no deploy da Vercel   | Browser não bundla/deploya functions. A Management API aceita upload por function.                                           |
| D5  | **Detecção de "não configurado"** = `system_config.installation_completed = true` **E** ≥1 admin                             | Robusto contra instalação parcial (schema ok mas sem admin → ainda vai pro onboarding).                                      |
| D6  | **Wizard resumível**: progresso em `system_config.install_progress`; **tokens nunca persistidos** (só em memória da request) | Se cair na function 180/235, retoma do último passo OK. Tokens são segredo — descartados após uso.                           |
| D7  | **Admin** criado via `auth.admin.createUser` (service_role, na própria function)                                             | Cria usuário confirmado sem fluxo de email.                                                                                  |
| D8  | Apenas **2 tokens colados** pelo usuário leigo. Tudo o mais é derivado/criado pelo instalador                                | Requisito de público não-técnico.                                                                                            |
| D9  | TDD: **Vitest** (unit das functions e do guard) + **Playwright** (e2e do wizard com APIs externas mockadas)                  | Functions são testáveis isoladamente; o wizard precisa de e2e de fluxo.                                                      |

---

## 3. Arquitetura-Alvo

```
┌──────────────────────────── Vercel (já no ar) ─────────────────────────────┐
│                                                                             │
│  Frontend (React)                  Serverless Functions (Node)              │
│  ┌──────────────────┐              ┌────────────────────────────────────┐   │
│  │ InstallationGuard │──fetch──────▶│ GET  /api/installer/status         │   │
│  │  (App.tsx)        │              │ POST /api/installer/validate-tokens│   │
│  │                   │              │ POST /api/installer/list-orgs      │   │
│  │ /onboarding       │──orquestra──▶│ POST /api/installer/run  (SSE)     │   │
│  │  (wizard)         │              │ POST /api/installer/create-admin   │   │
│  └──────────────────┘              └──────────────┬─────────────────────┘   │
│                                                    │ tokens (em memória)     │
└────────────────────────────────────────────────────┼─────────────────────────┘
                                                      │
              ┌───────────────────────────────────────┼───────────────────────┐
              │ Supabase Management API                │  Vercel API           │
              │  - criar projeto                       │  - set env vars       │
              │  - aplicar schema (PG via service_role)│  - trigger redeploy   │
              │  - deploy de ~235 functions            │                       │
              │  - set secrets (Deno.env)              │                       │
              └────────────────────────┬──────────────┴───────────────────────┘
                                       ▼
                        ┌──────────────────────────────┐
                        │  Supabase do Cliente (novo)   │
                        │  schema + functions + secrets │
                        │  system_config.install_*      │
                        │  auth: admin user             │
                        └──────────────────────────────┘
```

---

## 4. Fluxo do Wizard (telas)

| Passo | Tela                   | O que o usuário faz                                                | O que o sistema faz                                                               |
| ----- | ---------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| 0     | **Boas-vindas**        | Lê o que vai acontecer, clica "Começar"                            | Confirma que `status.configured = false`                                          |
| 1     | **Token Vercel**       | Cola o Vercel API token (link + print de onde pegar)               | `validate-tokens`: valida contra `GET /v2/user`                                   |
| 2     | **Token Supabase**     | Cola o Supabase access token (link + print)                        | `validate-tokens`: valida contra `GET /v1/organizations`                          |
| 3     | **Organização & nome** | Escolhe a org Supabase (dropdown) e dá um nome ao projeto + região | `list-orgs` popula o dropdown                                                     |
| 4     | **Instalando**         | Só assiste a barra de progresso                                    | `run` (SSE): cria projeto → schema → functions → secrets → envs Vercel → redeploy |
| 5     | **Admin**              | Preenche email + senha (e confirmação)                             | `create-admin`: `auth.admin.createUser` + marca `installation_completed`          |
| 6     | **Concluído**          | Clica "Entrar"                                                     | Redireciona para `/` (já logado ou tela de login)                                 |

**Resumível:** se o usuário recarregar durante o passo 4, o wizard lê `install_progress` e retoma a barra do último passo OK (os passos já concluídos não repetem).

---

## 5. Etapas internas do `/api/installer/run` (SSE)

Cada etapa emite um evento `{ step, status, message, pct }`. Estado persistido em `system_config.install_progress` (JSON: `{ projectRef, completedSteps: [], currentStep }`).

| Ordem | Step               | Ação                                                                                 | Idempotência                                                |
| ----- | ------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------- |
| 1     | `create-project`   | Management API cria projeto Supabase na org; aguarda status `ACTIVE_HEALTHY` (poll)  | Se `projectRef` já existe no progress, pula                 |
| 2     | `apply-schema`     | Aplica `consolidated.sql` via conexão PG (service_role / db password) numa transação | Schema é idempotente (`IF NOT EXISTS`, `CREATE OR REPLACE`) |
| 3     | `deploy-functions` | Deploya ~235 functions via Management API em lotes de ~10, com retry (3x backoff)    | Marca cada function deployada; retoma do lote pendente      |
| 4     | `set-secrets`      | Define secrets padrão/placeholder (Deno.env) via Management API                      | Upsert                                                      |
| 5     | `write-vercel-env` | Grava `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (+ opcionais) via Vercel API     | Upsert por chave                                            |
| 6     | `trigger-redeploy` | Dispara redeploy na Vercel para o frontend pegar as novas envs                       | —                                                           |
| —     | (admin)            | Feito no passo 5 do wizard, via `/api/installer/create-admin` após o redeploy        | —                                                           |

> **Nota sobre o redeploy:** como as `VITE_*` são embutidas no build, o frontend só "enxerga" o novo Supabase **após** o redeploy. O wizard trata isso aguardando o deploy ficar `READY` antes de liberar o passo de admin. O estado de progresso vive na Vercel function / `install_progress`, sobrevivendo ao redeploy.

---

## 6. Geração do `consolidated.sql` (build-time)

- Script `scripts/build-consolidated-schema.mjs` concatena/`pg_dump`-a o schema a partir de `supabase/migrations/` (fonte de verdade), produzindo `supabase/schema/consolidated.sql`.
- Requisitos do arquivo: **idempotente** (re-aplicável sem erro), inclui enums, funções `SECURITY DEFINER` (`get_user_company_ids` etc.), policies RLS, **GRANTs** e seeds mínimos (`system_config` com `installation_completed=false`).
- O arquivo é **versionado** e regenerado quando migrations mudam (gate de CI valida que está atualizado).

---

## 7. Empacotamento das ~235 Functions

- No build da Vercel, o código de `supabase/functions/**` é **incluído** no bundle das serverless functions (via import estático de um manifesto gerado, ou leitura do FS no runtime Node da Vercel).
- Script `scripts/build-functions-manifest.mjs` gera `api/installer/_functions-manifest.json` (nome → arquivos/entrypoint) + `config.toml` de cada uma (`verify_jwt`).
- O `deploy-functions` itera o manifesto e faz upload via Management API, respeitando `verify_jwt`.

---

## 8. Segurança

| Risco                                  | Mitigação                                                                                                |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Tokens vazarem                         | Nunca persistidos; trafegam por HTTPS; usados só na memória da request; logs nunca imprimem tokens       |
| `/onboarding` acessível após instalado | Guard redireciona `/onboarding` → `/` quando `configured = true`                                         |
| Instalador re-executado por terceiro   | Após `installation_completed = true`, `run` recusa (409) a menos que haja flag de reinstalação explícita |
| service_role exposto                   | Fica só na Vercel function; nunca enviado ao browser                                                     |
| CSRF nas functions                     | Functions exigem que o request venha do próprio app (same-origin) + nonce de sessão de install           |

---

## 9. Detecção & Guard (frontend)

- `InstallationGuard` no topo do `App.tsx`, **antes** dos guards de auth.
- Chama `GET /api/installer/status` → `{ configured, step? }`.
  - `configured = true` ⇔ `VITE_SUPABASE_URL` presente **E** `system_config.installation_completed = true` **E** `count(admins) ≥ 1`.
- `configured = false` → redireciona para `/onboarding` (rota pública, **sem** `DashboardLayout`/`ProtectedRoute`).
- `configured = true` → `/onboarding` redireciona para `/`.
- Resultado `true` é cacheado no client (evita consultar a cada navegação).

---

## 10. Testes

### Unit (Vitest)

- Validação de tokens (mock fetch Vercel/Supabase): aceita válido, rejeita inválido.
- `list-orgs`: mapeia resposta da Management API.
- Orquestrador de steps: idempotência (re-run pula steps concluídos), retry de lote de functions.
- Guard: decide `configured` corretamente para cada combinação (sem env / sem flag / sem admin / tudo ok).
- Geração de `consolidated.sql` e manifesto: estrutura esperada.

### E2E (Playwright)

- **Fluxo feliz:** com Management API/Vercel API **mockadas** (MSW/servidor fake), o wizard vai de boas-vindas → admin → "Entrar", e o guard libera o app.
- **Resume:** matar/recarregar no passo de functions retoma do último lote.
- **Token inválido:** mensagem de erro PT-BR e bloqueio de avanço.
- **Reinstalação bloqueada:** com `installation_completed=true`, `/onboarding` redireciona pra `/`.

### Critérios de aceite globais

- Pessoa não-técnica conclui colando 2 tokens + dados do admin, sem terminal.
- Nenhuma credencial do desenvolvedor no bundle (guard test do self-hosting continua passando).
- `npm run build`, `lint`, `test:ci` e e2e verdes.

---

## 11. Fora de escopo (YAGNI)

- Multi-região avançada / escolha fina de plano Supabase (usa default sensato).
- Migração de dados de instância existente.
- Atualização automática de versão pós-instalação (upgrades).
- Configuração das integrações de terceiros (Meta, Google, etc.) — segue via `/configuracoes/sistema` do plano de self-hosting.

---

## 12. Pré-condições (dependências do plano de self-hosting)

Este instalador **depende** de que o trabalho de [`docs/superpowers/plans/self-hosting/`](../plans/self-hosting/00-ORQUESTRACAO.md) esteja concluído ou pelo menos:

- Zero hardcode de credenciais do dev (Sprint 1 do self-hosting).
- `client.ts`/`publicClient.ts` lendo só de env (já feito).
- `system_config_*` existindo no schema consolidado.

O plano de execução detalhado deste instalador está em [`docs/onboarding-installer/`](../../onboarding-installer/00-ORQUESTRADOR.md).
