# Expx Flow

Plataforma de automação de marketing e gestão de tráfego pago em **português (PT-BR)**.
Gerencia campanhas multi-plataforma (Facebook, Google Ads, Instagram, WhatsApp, YouTube),
CRM, tarefas, agentes IA e dashboards de performance.

## Instalação rápida (sem terminal)

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/bittencourtthulio/expxflow-selfhost&project-name=expx-flow)

> **Leigo?** Clique no botão acima. A Vercel sobe o **frontend** (sem precisar do Supabase
> configurado). Ao abrir o app, você cai em `/onboarding` — basta colar **2 tokens**
> (Vercel + Supabase), escolher a organização, dar um nome e aguardar. O instalador
> automático provisiona tudo (cria o projeto Supabase, aplica o schema, sobe as ~232 Edge
> Functions, configura as variáveis e o redeploy). No fim, você cadastra o admin e entra
> no app já funcionando. **Sem terminal, sem editar arquivos.**

Passo a passo ilustrado (com onde pegar cada token e o que esperar em cada etapa):
**[`docs/INSTALACAO.md`](docs/INSTALACAO.md)** — seção "Instalação pelo Assistente".
Após concluir, siga o **[`docs/CHECKLIST_POS_INSTALACAO.md`](docs/CHECKLIST_POS_INSTALACAO.md)**
para configurar integrações (WhatsApp, Facebook, Google Ads, IA, etc.).

**Pré-requisitos:** apenas uma conta [Vercel](https://vercel.com) e uma conta
[Supabase](https://supabase.com) (ambas têm plano gratuito).

## Instalação avançada (terminal / manual)

Para quem prefere controlar cada etapa (migrations, deploy de functions, env vars via CLI).
Leia o guia completo em [`docs/INSTALACAO.md`](docs/INSTALACAO.md) — seção
"Instalação Manual (Avançada)". Resumo:

```sh
git clone <seu-fork>
cd expxflow-selfhost
npm install --legacy-peer-deps
cp .env.example .env  # preencha com suas credenciais Supabase
npm run dev
```

Após o primeiro deploy, acesse **Configurações > Sistema** (`/configuracoes/sistema`)
para configurar todas as integrações (IA, Meta, Google, Email, etc.).

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui + Radix UI + Mantine
- **Backend:** Supabase (PostgreSQL, Edge Functions em Deno/TS, Auth, Realtime)
- **State:** TanStack React Query + React Context
- **Forms:** React Hook Form + Zod
- **Deploy:** Vercel (frontend) + Supabase (backend)

## Comandos

```sh
npm run dev        # Dev server (porta 8080)
npm run build      # Build produção
npm run lint       # ESLint
npm run test       # Vitest (watch)
npm run test:ci    # Vitest (CI, single run)
deno test --allow-all supabase/functions/_shared/__tests__/   # Testes Deno do helper
```

## Self-Hosting

Este repositório é **self-hostable**: nenhum dado do desenvolvedor original está embutido.
Todas as credenciais globais ficam em `system_config_*` (PostgreSQL), editáveis via UI.

- Variáveis de ambiente: ver [`.env.example`](.env.example)
- Verificação final: `bash scripts/verify-self-hosting.sh`
- Checklist pós-instalação: [`docs/CHECKLIST_POS_INSTALACAO.md`](docs/CHECKLIST_POS_INSTALACAO.md)

## Licença

Veja [`LICENSE`](LICENSE).
