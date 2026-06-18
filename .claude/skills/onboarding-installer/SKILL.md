---
name: onboarding-installer
description: Use ao trabalhar no auto-instalador in-app /onboarding — botão Deploy to Vercel, wizard de 7 passos, functions em api/installer/* (Vercel Serverless), InstallationGuard, schema consolidado e manifesto de functions. Aplica ao tocar no fluxo de instalação sem terminal, em api/installer/*, no guard de instalação, ou nos scripts build:schema / build:functions-manifest.
---

# Auto-Instalador `/onboarding` — Skill de Contexto

## Quando usar

- Editar/estender o fluxo de instalação sem terminal (`api/installer/*`, wizard, guard)
- Trabalhar em `src/pages/Onboarding.tsx` ou `src/components/onboarding/*`
- Mexer em `src/guards/InstallationGuard.tsx` ou `installationStatusCache.ts`
- Alterar os scripts `build:schema` / `build:functions-manifest` / `check:schema`
- Tocar em `vercel.json` no trecho de `functions`/`includeFiles` do instalador
- Depurar "o app abre em `/onboarding`" ou "instalação não completa"
- Adicionar um novo step ao instalador ou mudar o protocolo de progresso/resume

## Visão geral

O auto-instalador entrega uma instalação **sem terminal** para um público **não-técnico**.
O fluxo é:

1. Cliente clica em **Deploy to Vercel** (badge no `README.md`) → a Vercel sobe o **frontend**
   **sem Supabase configurado**.
2. Ao abrir o app, o `InstallationGuard` detecta `installation_completed = false` e
   redireciona para `/onboarding`.
3. O cliente cola **2 tokens** (Vercel + Supabase), escolhe a organização e dá um nome ao projeto.
4. O **orquestrador de steps** (roda como **Vercel Serverless Function**) provisiona tudo via
   API em nome do cliente:
   - **Cria** o projeto Supabase (Supabase Management API)
   - **Aplica** o schema consolidado de uma vez (`consolidated.sql`)
   - **Deploya** as ~232 Edge Functions em lotes com retry e resume
   - **Configura** as variáveis (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.)
   - **Dispara** um redeploy da Vercel para as variáveis entrarem em vigor
5. O cliente cadastra o **admin** (email + senha) → vira `system owner` + `owner` da empresa.
6. O instalador marca `installation_completed = true` e o guard libera o app.

Resultado: uma instância nova fica 100% funcional a partir de 2 tokens + dados do admin.

## Arquivos-chave

```
api/installer/
  status.ts                 # GET  — detecção configured (4 cenários: sem env / sem flag / sem admin / ok)
  validate-tokens.ts        # POST — valida token Vercel + token Supabase
  list-orgs.ts              # POST — lista organizações Supabase (para o dropdown do wizard)
  run.ts                    # POST — orquestra steps via SSE (stream de progresso)
  create-admin.ts           # POST — cria admin (service_role do projeto recém-criado) + fecha instalação
  _lib/
    vercel-api.ts           # wrapper da Vercel API (deploy, env vars, redeploy)
    supabase-mgmt.ts        # wrapper da Supabase Management API (create project, deploy functions)
    steps.ts                # orquestrador de steps idempotentes (isStepDone)
    progress.ts             # leitura/escrita de install_progress (resume)
    run.ts                  # loop de execução com orçamento de tempo + partial
    http.ts                 # helpers CORS, SSE, respostas
  _functions-manifest.json  # gerado no build (nome → arquivos, verify_jwt) — embutido no bundle

supabase/schema/
  consolidated.sql          # gerado no build (idempotente) — aplicado de uma vez, sem replay de ~490 migrations

scripts/
  build-consolidated-schema.mjs   # npm run build:schema
  build-functions-manifest.mjs    # npm run build:functions-manifest

src/
  pages/Onboarding.tsx                 # rota /onboarding (wizard de 7 passos)
  components/onboarding/               # um componente por passo (boas-vindas, tokens, org+nome, instalando, admin, concluído)
  guards/InstallationGuard.tsx         # redireciona para /onboarding se não configurado; isola /onboarding se configurado
  lib/installationStatusCache.ts       # cache client do status (invalidado após create-admin)

vercel.json                # functions para api/installer/*.ts + includeFiles de supabase/functions/** + manifesto; rewrites SPA

tests/e2e/
  onboarding.spec.ts       # fluxo feliz, resume, token inválido, reinstalação bloqueada
  fakes/                   # fakes locais de Vercel API + Supabase Management API (sem rede real)
```

### Comandos de build do instalador

```sh
npm run build:schema             # gera supabase/schema/consolidated.sql
npm run build:functions-manifest # gera api/installer/_functions-manifest.json
npm run check:schema             # valida o schema consolidado
```

> Estes rodam no CI e devem ser regenerados sempre que migrations ou functions mudarem.

## Padrões

### Steps idempotentes (`isStepDone`)

Cada step (create-project, apply-schema, deploy-functions, set-secrets,
write-vercel-env, trigger-redeploy) é **idempotente**: antes de executar, checa se já foi
feito (via `install_progress`) e pula se sim. Isso é o que torna o fluxo **resumível** — um
reload não repete steps concluídos nem re-deploya funções já deployadas.

### Tokens efêmeros (segurança)

Os tokens do cliente (Vercel + Supabase) e as credenciais sensíveis
(`serviceRoleKey`, `dbPassword` do projeto recém-criado) vivem **apenas na memória da
request** — **nunca** são persistidos, logados ou devolvidos no corpo de resposta. Eles
trafegam do browser para a function via POST e somem quando a function termina.

### Progresso resumível

O estado de progresso vive em `install_progress` no **Supabase do cliente** (gravado após
`apply-schema`, quando o banco já existe). Antes disso (create-project, apply-schema), vive
em memória da serverless — então um reload **entre o passo 4 e o 5** perde o contexto, mas
a instalação já está marcada no Supabase e o resume reconstrói o necessário.

### Partial / resume (orçamento de tempo)

A function `run` tem um **orçamento de tempo** (limite da serverless Vercel, ~300s). Quando
estoura, ela emite um evento `partial` e o **cliente reinvoca** `run` automaticamente até
receber `done`. O deploy de funções é em **lotes** justamente para caber no orçamento.

### SSE via POST + ReadableStream (não EventSource)

O progresso é transmitido por **Server-Sent Events**, mas sobre **POST** + `ReadableStream`
no browser — **não** `EventSource` (que só suporta GET e não permite enviar o body com os
tokens). O cliente consome o stream com `fetch` + `getReader()`.

### TDD com fakes

Toda a malha de testes usa **fakes** locais de Vercel API e Supabase Management API em
`tests/e2e/fakes/`. **Nunca** bater em serviço real em teste unit/e2e (há um smoke-test
manual ponta-a-ponta explícito no Gate 2, marcado como tal). QueryClient de teste sempre com
`retry: false`.

## Armadilhas

1. **Limite de tempo da serverless Vercel (~300s):** o deploy de ~232 funções não cabe numa
   chamada única. Use **lotes + partial + resume** — o cliente reinvoca `run`. Nunca assuma
   que uma única invocation completa tudo.
2. **Redeploy invalida o estado em memória:** o `trigger-redeploy` reinicia as functions da
   Vercel, zerando qualquer estado em memória. Por isso o progresso vive no **Supabase do
   cliente**, não na Vercel.
3. **`serviceRoleKey` / `dbPassword` não persistidos:** como não são salvos, um reload entre
   o passo 4 (apply-schema) e o passo 5 (create-admin) perde essas credenciais em memória.
   Isso é aceitável: a instalação já está marcada e o admin é criado com a service_role
   gravada onde necessário.
4. **POST + SSE exige `fetch` + stream no browser:** `EventSource` não serve (só GET, sem
   body). O wizard usa `fetch` com `getReader()` para consumir o stream de progresso.
5. **Bundle das ~232 functions via `includeFiles` do `vercel.json`:** as functions do
   Supabase precisam estar acessíveis à serverless da Vercel no momento de deployá-las. O
   `vercel.json` usa `includeFiles: ["supabase/functions/**",
"api/installer/_functions-manifest.json"]`. Mexer nisso quebra o deploy.
6. **Instalação é única:** uma vez `installation_completed = true`, chamar `run` retorna
   **409** e `/onboarding` redireciona para `/`. Para reinstalar, é preciso apagar o projeto
   Supabase e reimplantar na Vercel.
7. **`installation_completed` + admin são a fonte de verdade do guard:** o `status.ts`
   responde `configured` só quando há flag **e** ≥1 admin. Não tente liberar o app de outro
   jeito.

## Contexto não-óbvio

### Por que Vercel Serverless e não Edge Function do Supabase?

Existe um problema **ovo-e-galinha**: para rodar uma Edge Function do Supabase, você
precisa de um projeto Supabase. Mas o projeto Supabase **ainda não existe** no momento da
instalação — ele é **criado** pelo instalador. Logo, o instalador tem que rodar **fora** do
Supabase, num host que já esteja deployado: a **Vercel**. O frontend deployado pelo botão
"Deploy to Vercel" já vem com as functions `api/installer/*`, que então criam o Supabase do
cliente via Management API.

### `vercelProjectId` vem do ambiente

O ID do projeto da Vercel (necessário para gravar env vars e disparar redeploy) vem de
`process.env.VERCEL_PROJECT_ID`, injetado automaticamente pela Vercel no runtime das
functions. **Não** é hardcode nem configuração do cliente.

### Onde vive o progresso

`installation_completed` e `install_progress` ficam em `system_config_app` no **Supabase do
cliente** (a mesma tabela que guarda `app_url`/`app_name`). Antes do `apply-schema` criar a
tabela, o progresso fica só em memória da serverless. Veja `.claude/skills/self-hosting/`
para o padrão `system_config_*`.

### Relação com o self-hosting

O instalador é a **automatização** do que antes era manual (`docs/INSTALACAO.md` — caminho
avançado). As credenciais das integrações (WhatsApp, Facebook, Google, IA, etc.) **não** são
parte do instalador — são configuradas **depois**, em `/configuracoes/sistema`, seguindo o
padrão **env > banco** (`getSystemConfig`). Veja
[`.claude/skills/self-hosting/SKILL.md`](../self-hosting/SKILL.md).

## Documentação relacionada

- Plano de execução: [`docs/onboarding-installer/`](../../../docs/onboarding-installer/)
- Spec de origem: `docs/superpowers/specs/2026-06-18-onboarding-installer-design.md`
- Guia de instalação (leigo): [`docs/INSTALACAO.md`](../../../docs/INSTALACAO.md)
- Checklist pós-instalação: [`docs/CHECKLIST_POS_INSTALACAO.md`](../../../docs/CHECKLIST_POS_INSTALACAO.md)
- Self-hosting (credenciais globais): [`.claude/skills/self-hosting/SKILL.md`](../self-hosting/SKILL.md)
