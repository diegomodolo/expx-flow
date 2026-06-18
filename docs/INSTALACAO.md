# Instalação — Expx Flow (Self-Hosting)

Guia de instalação ponta-a-ponta para uma nova instância do Expx Flow.

Há **dois caminhos**:

- 🟢 **Pelo Assistente (recomendado, sem terminal):** você clica num botão e cola 2 tokens.
  O instalador automático provisiona tudo. **Leia a seção [Instalação pelo Assistente](#instalação-pelo-assistente-sem-terminal).**
- 🔵 **Manual (avançado, via terminal):** você controla cada etapa (migrations, deploy de
  functions, env vars via CLI). **Leia a seção [Instalação Manual (Avançada)](#instalação-manual-avançada).**

> Tempo estimado: **15-30 min** (assistente) ou **1-2 horas** (manual), sem contar a criação
> de contas em serviços terceiros.

---

## Pré-requisitos

Antes de começar, você precisa de **duas contas gratuitas**:

| Conta        | Onde criar                            | Para que serve                                                 |
| ------------ | ------------------------------------- | -------------------------------------------------------------- |
| **Vercel**   | https://vercel.com/signup             | Hospeda o frontend (app React) e roda o instalador             |
| **Supabase** | https://supabase.com/dashboard/signup | Banco de dados, Auth e Edge Functions (criado pelo instalador) |

> Ambas possuem **plano gratuito** suficiente para começar. Não é necessário cartão.

Você também vai precisar de **2 tokens** (um de cada serviço). Veja onde pegá-los na seção
[Onde pegar os tokens](#onde-pegar-os-tokens) abaixo.

### Serviços terceiros (decida quais usar — todos opcionais)

Cada um só é necessário se você for usar o recurso correspondente. Eles são configurados
**depois** da instalação, em `/configuracoes/sistema`:

| Serviço                 | Para que serve                              | Onde criar conta         |
| ----------------------- | ------------------------------------------- | ------------------------ |
| OpenRouter              | IA (chat, geração de texto) — **essencial** | openrouter.ai            |
| Facebook for Developers | Facebook Ads, Instagram, WhatsApp           | developers.facebook.com  |
| Google Cloud Console    | Google Ads, Google Meet, YouTube            | console.cloud.google.com |
| UazapiGO                | WhatsApp não-oficial                        | uazapi.com               |
| API4Com                 | Ligações telefônicas                        | api4com.com              |
| Resend                  | Email transacional                          | resend.com               |
| Apify                   | Scraping Google Maps                        | apify.com                |
| Firecrawl               | Scraping páginas web                        | firecrawl.dev            |
| Shotstack               | Edição de vídeo                             | shotstack.io             |
| Discord                 | Bot Discord                                 | discord.com/developers   |
| GitHub                  | Issue tracking (opcional)                   | github.com               |

---

## Instalação pelo Assistente (sem terminal)

> Caminho recomendado para **quem não é técnico**. Nenhum comando de terminal é necessário.

### Onde pegar os tokens

Você vai colar **2 tokens** no passo 1 e 2 do assistente. Pegue-os antes:

#### Token da Vercel

1. Acesse https://vercel.com/login (entre com a conta que vai hospedar o app)
2. Clique no avatar (canto superior direito) → **Settings**
3. No menu lateral, abra **Tokens** (ou acesse https://vercel.com/account/tokens)
4. Clique em **Create Token**
5. Dê um nome (ex.: `expx-instalador`), validade sugerida: **24h** (o token é usado só
   durante a instalação — depois você pode revogá-lo)
6. **Copie o token** (formato: começa com algo como `vercel_...`). Ele é mostrado **uma única vez**.

![print: onde criar token Vercel](prints/01-vercel-token.png)

<!-- Equipe de docs: adicionar print da tela Account Settings → Tokens → Create Token -->

> ⚠️ O token precisa ter escopo suficiente para criar variáveis de ambiente e disparar
> deploys no projeto. Use o escopo **Full Account** ou de **Team** que contém o projeto.

#### Token do Supabase

1. Acesse https://supabase.com/dashboard/account/tokens
2. Entre com a conta onde ficará o banco do seu Expx Flow
3. Clique em **Generate new token**
4. Dê um nome (ex.: `expx-instalador`)
5. **Copie o token** (formato: começa com `sbp_...`). Ele é mostrado **uma única vez**.

![print: onde criar token Supabase](prints/02-supabase-token.png)

<!-- Equipe de docs: adicionar print da tela Account → Access Tokens → Generate new token -->

> Esse token dá acesso à **Supabase Management API**, que o instalador usa para **criar**
> o projeto, aplicar o schema e fazer deploy das funções — tudo automaticamente.

### Passo a passo

#### Passo 0 — Clique em "Deploy to Vercel"

No [`README`](../README.md) do projeto, clique no botão **Deploy to Vercel**.

- A Vercel abre uma tela de "Clone & Deploy".
- Confirme a conta/time de destino e o nome do projeto.
- A Vercel faz o build e o deploy do **frontend**. **Atenção:** neste ponto ainda **não há
  Supabase configurado** — é proposital. O instalador cuida disso.
- Ao abrir o app, você é redirecionado para `/onboarding` automaticamente.

![print: tela clone & deploy da Vercel](prints/03-vercel-clone.png)

<!-- Equipe de docs: adicionar print da tela de "Create Git Repository" + "Deploy" -->

#### Passo 1 — Boas-vindas

Tela inicial explicando o que vai acontecer. Clique em **Começar**.

![print: tela boas-vindas](prints/04-onboarding-boas-vindas.png)

#### Passo 2 — Token da Vercel

Cole o **token da Vercel** (pegue em [https://vercel.com/account/tokens](https://vercel.com/account/tokens)).
O assistente valida o token imediatamente. Se inválido, aparece uma mensagem em PT-BR e o
avanço fica bloqueado.

![print: passo token Vercel](prints/05-onboarding-token-vercel.png)

#### Passo 3 — Token do Supabase

Cole o **token do Supabase** (pegue em
[https://supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens)).
O assistente valida o token.

![print: passo token Supabase](prints/06-onboarding-token-supabase.png)

#### Passo 4 — Organização e nome do projeto

- Escolha a **organização** do Supabase (lista carregada automaticamente pelo token).
- Dê um **nome** ao novo projeto Supabase que será criado.
- (Opcional) região — o instalador escolhe a ideal por padrão.

![print: passo org + nome](prints/07-onboarding-org-nome.png)

#### Passo 5 — Instalando (progresso ao vivo)

O assistente executa a instalação automática e mostra o progresso em tempo real:

1. **Criar projeto Supabase** — provisiona o banco, Auth e Storage.
2. **Aplicar schema** — cria todas as tabelas, RLS, funções SQL e triggers.
3. **Deploy das funções** — sobe as ~232 Edge Functions em lotes.
4. **Configurar variáveis** — grava `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.
5. **Redeploy** — dispara um novo deploy da Vercel com as variáveis já configuradas.

> 💡 **Pode demorar alguns minutos** (o deploy das funções é o mais demorado). Você pode
> sair e voltar: o progresso é retomado de onde parou (não recomeça do zero).
> Se a tela travar ou der timeout, recarregue — o assistente **continua** automaticamente.

![print: passo instalando](prints/08-onboarding-instalando.png)

#### Passo 6 — Criar admin

Cadastre o **email** e a **senha** do administrador da instância. Esse usuário vira o
**system owner** (acesso total) e o primeiro **owner** da empresa padrão.

![print: passo admin](prints/09-onboarding-admin.png)

#### Passo 7 — Concluído

Tela de sucesso. Clique em **Entrar** para acessar o app já funcionando (o
`InstallationGuard` libera todas as rotas).

Pronto! 🎉 Sua instância está 100% operacional.

![print: tela concluído](prints/10-onboarding-concluido.png)

> Após concluir, siga o **[`CHECKLIST_POS_INSTALACAO.md`](CHECKLIST_POS_INSTALACAO.md)**
> para configurar as integrações (IA, WhatsApp, Facebook, Google Ads, etc.).

### Solução de problemas (assistente)

| Sintoma                                     | Causa provável                                     | Solução                                                                                                  |
| ------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "Token inválido ou expirado" (Vercel)       | Token errado, expirado ou sem escopo               | Gere um novo em https://vercel.com/account/tokens com escopo **Full Account**; validade 24h é suficiente |
| "Token inválido ou expirado" (Supabase)     | Token errado ou revogado                           | Gere um novo em https://supabase.com/dashboard/account/tokens                                            |
| "Você não tem permissão nesta organização"  | Token do Supabase sem acesso à org escolhida       | Troque de org na conta Supabase ou gere o token com a conta dona da org                                  |
| Instalação travou / timeout no passo 5      | Limite de tempo da function serverless atingido    | **Recarregue a página** — o assistente retoma de onde parou. O deploy de funções é em lotes e resumível  |
| "Projeto já existe" / instalação já marcada | Você já instalou antes nesta instância             | A instalação é única. Para reinstalar, é preciso apagar o projeto Supabase e reimplantar na Vercel       |
| Barra de progresso reinicia ao recarregar   | Não deveria acontecer (o progresso é persistido)   | Se ocorrer, aguarde — o assistente lê `install_progress` e pula etapas concluídas                        |
| App abre em `/` em vez de `/onboarding`     | Instalação já foi concluída antes                  | Comportamento esperado quando `installation_completed = true`                                            |
| "Erro ao aplicar schema"                    | Projeto Supabase novo ainda provisionando serviços | Aguarde 1-2 min e recarregue; o instalador retoma                                                        |

> Precisa de ajuda? Veja a [seção de suporte](#suporte) ao final.

---

## Instalação Manual (Avançada)

> Para quem prefere controle total via terminal. Pula o assistente e configura tudo à mão.

### 1. Pré-requisitos adicionais (manual)

| Item             | Onde criar                           | Observação                                          |
| ---------------- | ------------------------------------ | --------------------------------------------------- |
| Node.js 20+      | https://nodejs.org                   | Necessário para build local                         |
| Deno 2+          | https://deno.land                    | Opcional, para rodar testes das Edge Functions      |
| Supabase CLI 2.x | https://supabase.com/docs/guides/cli | Necessário para migrations e deploy                 |
| Domínio próprio  | qualquer registrar                   | Opcional, mas recomendado (Auth redirects + emails) |

### 2. Criar projeto Supabase (manual)

1. Acesse https://supabase.com/dashboard/new
2. Escolha nome, senha forte, região (recomendado: mesma região da Vercel)
3. Anote:
   - **Project URL**: `https://<project-ref>.supabase.co`
   - **Project Reference ID**: `<project-ref>` (12 caracteres alfanuméricos)
   - **anon/publishable key**: `sb_publishable_...` ou `eyJ...` (JWT)
   - **service_role key**: `eyJ...` (guarde em segredo — nunca vai para o frontend)

### 3. Aplicar migrations (manual)

```sh
git clone <seu-fork>
cd expxflow-selfhost
supabase link --project-ref <project-ref>
supabase db push
```

Isso cria todas as tabelas, RLS, funções SQL, triggers, etc.

> Alternativa: aplicar o **schema consolidado** gerado pelo instalador
> (`supabase/schema/consolidated.sql`) de uma só vez via SQL Editor do Supabase.

### 4. Deploy das Edge Functions (manual)

```sh
supabase functions deploy --no-verify-jwt
```

Ou deploy individual:

```sh
supabase functions deploy facebook-oauth
supabase functions deploy whatsapp-webhook --no-verify-jwt
# etc.
```

> Nota: ~232 funções. Em planos Free pode levar alguns minutos.

### 5. Configurar secrets do Supabase (opcional, manual)

A maior parte das credenciais vai para o banco (UI em `/configuracoes/sistema`).
Mas algumas env vars podem ser definidas via CLI para bypass de banco:

```sh
supabase secrets set OPENROUTER_API_KEY=sk-or-...     # fallback global de IA
supabase secrets set RESEND_API_KEY=re_...            # fallback de email
supabase secrets set FACEBOOK_APP_ID=... FACEBOOK_APP_SECRET=...
# (ver lista completa no .env.example)
```

> **Recomendado:** use a UI em `/configuracoes/sistema` (banco) para facilitar gestão.

### 6. Configurar variáveis do frontend (manual)

```sh
cp .env.example .env
```

Edite `.env`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sua_anon_key
VITE_FACEBOOK_APP_ID=...        # opcional, pode ir pelo banco
VITE_GOOGLE_ADS_CLIENT_ID=...   # opcional
VITE_GOOGLE_MEET_CLIENT_ID=...  # opcional
```

### 7. Deploy na Vercel (manual)

```sh
npm install --legacy-peer-deps
npm run build
```

#### Opção A: Vercel CLI

```sh
npm i -g vercel
vercel --prod
```

Configure as env vars (mesmas do `.env`) no dashboard Vercel > Settings > Environment Variables.

#### Opção B: Vercel Dashboard

1. Importe o repositório
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`
5. Adicione as env vars de `VITE_*` (idênticas ao `.env`)

### 8. Configurar Auth URLs no Supabase (manual)

Acesse **Supabase Dashboard > Authentication > URL Configuration**:

- **Site URL:** `https://<sua-url-vercel>` (ou domínio próprio)
- **Redirect URLs:**
  - `https://<sua-url-vercel>/**`
  - `http://localhost:8080/**` (para desenvolvimento)

> **Importante:** isso substitui os redirects hardcoded do projeto original.
> O `supabase/config.toml` no repositório tem placeholders `<SEU_DOMINIO>` para referência.

### 9. Primeiro acesso (manual)

1. Acesse sua URL na Vercel
2. Crie sua conta (email/senha ou magic link)
3. O **primeiro usuário criado** vira automaticamente o **system owner** (função `is_system_owner()`)
4. Crie sua empresa — você é o `owner` da empresa também

### 10. Configurar Webhooks (manual)

Cada plataforma externa exige cadastrar uma URL de webhook apontando para o seu Supabase:

| Plataforma          | URL de webhook                                                               |
| ------------------- | ---------------------------------------------------------------------------- |
| Facebook App        | `https://<project-ref>.supabase.co/functions/v1/meta-whatsapp-webhook`       |
| Meta WhatsApp Cloud | `https://<project-ref>.supabase.co/functions/v1/whatsapp-webhook`            |
| Instagram Messaging | `https://<project-ref>.supabase.co/functions/v1/instagram-messaging-webhook` |
| API4Com             | `https://<project-ref>.supabase.co/functions/v1/api4com-webhook`             |
| Shotstack           | `https://<project-ref>.supabase.co/functions/v1/shotstack-webhook`           |

> Substitua `<project-ref>` pelo Project Reference ID do **seu** Supabase.

### 11. Cron Jobs (opcional, manual)

Algumas funcionalidades (snapshots diários, processamento de notificações, etc.) rodam via `pg_cron`.

#### Opção A (recomendado): setup-cron-jobs

Após deploy das funções:

```sh
supabase functions invoke setup-cron-jobs --no-verify-jwt
```

Isso agenda todos os jobs necessários lendo `SUPABASE_URL` e `SUPABASE_ANON_KEY` do runtime.

#### Opção B: SQL manual

Os arquivos `supabase/CONFIGURE_*.sql` são templates com placeholders `<SUA_SUPABASE_URL>` e
`<SUA_ANON_KEY>`. Substitua manualmente e execute no SQL Editor do Supabase.

### 12. Verificação final (manual)

```sh
bash scripts/verify-self-hosting.sh
```

Todos os 9 checks devem retornar OK.

Consulte também [`docs/CHECKLIST_POS_INSTALACAO.md`](CHECKLIST_POS_INSTALACAO.md).

---

## Atualizações

Para receber updates do projeto original:

```sh
git remote add upstream https://github.com/<autor-original>/controledetrafego.git
git fetch upstream
git merge upstream/main --allow-unrelated-histories  # primeira vez
```

Migrations incrementais rodam automaticamente com `supabase db push`.

---

## Suporte

- Documentação técnica: [`docs/`](.)
- Especificação self-hosting: [`docs/SPEC_SELF_HOSTING.md`](SPEC_SELF_HOSTING.md)
- Checklist pós-instalação: [`docs/CHECKLIST_POS_INSTALACAO.md`](CHECKLIST_POS_INSTALACAO.md)
- Skill de contexto (IA agents): [`.claude/skills/self-hosting/`](../.claude/skills/self-hosting/)
- Skill do instalador: [`.claude/skills/onboarding-installer/`](../.claude/skills/onboarding-installer/)

Em caso de dúvida sobre uma integração específica, consulte a skill correspondente
em `.claude/skills/<modulo>/SKILL.md`.
