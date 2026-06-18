# Checklist Pós-Instalação — Expx Flow

Use este checklist **após** a instalação (pelo [Assistente](INSTALACAO.md#instalação-pelo-assistente-sem-terminal)
ou [Manual](INSTALACAO.md#instalação-manual-avançada)) para validar que sua instância está
100% operacional e configurar as integrações.

> Ao final do assistente, o Supabase já está criado, o schema aplicado, as funções no ar,
> as variáveis configuradas e o admin cadastrado. **O que falta** é preencher as
> credenciais das integrações que você vai usar.

---

## 0. Fundação (já feita pelo assistente — apenas confirme)

Se você instalou pelo assistente, estes itens já estão prontos. Se instalou manualmente,
confirme cada um:

- [ ] Projeto Supabase criado e acessível no dashboard
- [ ] Schema aplicado (todas as tabelas, RLS, funções SQL, triggers)
- [ ] Edge Functions deployadas (~232 funções)
- [ ] Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas na Vercel
- [ ] Frontend sobe na Vercel sem erros no console
- [ ] Login funciona (admin cadastrado no passo 6 do assistente)
- [ ] Admin é reconhecido como **system owner** (acessa `/configuracoes/sistema` sem "acesso negado")
- [ ] `installation_completed = true` (app não redireciona mais para `/onboarding`)

---

## 1. Configurações globais (`/configuracoes/sistema`)

Como system owner, acesse **Configurações > Sistema** e preencha as abas das integrações
que você vai usar. O Expx Flow segue o padrão **env > banco**: cada credencial é lida
primeiro de uma variável de ambiente (fallback) e, se ausente, da tabela `system_config_*`
(editável por aqui). **Configure por aqui** — é mais fácil que mexer em env vars.

Preencha no mínimo as **obrigatórias**:

- [ ] **App** → `app_url` (URL pública da sua Vercel, sem barra final) + `app_name`
      _Usado em redirects de Auth, links de email e convites._
- [ ] **IA** → `openrouter_api_key`
      _Essencial para todos os recursos de IA (chat, geração de criativos, agentes)._
- [ ] **Email** → `resend_api_key` + `from_email` (com domínio **verificado** no Resend) + `from_name`
      _Necessário para convites por email e notificações transacionais._

Integrações opcionais (configure só as que for usar):

- [ ] **Facebook** → `app_id` + `app_secret` + `graph_api_version` (default `v21.0`)
      _Para Facebook Ads, Instagram e WhatsApp._
- [ ] **Google** → `ads_client_id` + `ads_client_secret` + `ads_developer_token` +
      `meet_client_id` + `meet_client_secret` + `youtube_api_key` + `gcp_service_account_json`
      _Para Google Ads, Google Meet, YouTube, Google Slides._
- [ ] **Ferramentas** → `apify_api_token` + `firecrawl_api_key` + `shotstack_api_key` +
      `youtube_proxy_url` + `api4com_base_url`
      _Para scraping Google Maps, scraping web, edição de vídeo e ligações telefônicas._
- [ ] **Discord** → `bot_token`
      _Para notificações via bot do Discord (opcional)._
- [ ] **GitHub** → `pat` + `repo_owner` + `repo_name`
      _Para issue tracking integrado (opcional)._

> **Segredos:** campos secretos (API keys, tokens) não são exibidos de volta após salvar —
> aparecem como `(vazio)`. Deixe em branco para **manter** o valor atual; preencha para
> **sobrescrever**.

---

## 2. Supabase Auth

Configure os redirects de autenticação para apontar para a sua URL:

- [ ] **Site URL** em _Authentication > URL Configuration_ = `https://<sua-url-vercel>`
- [ ] **Redirect URLs** inclui `https://<sua-url-vercel>/**` e `http://localhost:8080/**`
- [ ] Convite por email funciona (magic link chega e redireciona corretamente)
- [ ] (Opcional) Login social habilitado: Facebook/Google em _Authentication > Providers_

---

## 3. Smoke-tests das integrações

Rode uma ação real de cada integração configurada e confirme nos logs:

- [ ] **IA:** abra um chat ou gere um criativo — confirme em `supabase functions logs` que
      usou a chave do banco (`system_config_ai`)
- [ ] **Email:** envie um convite — confirme que o `from_email` é o configurado
- [ ] **Facebook OAuth:** clique em "Conectar Facebook" — redireciona para o Facebook sem erro
- [ ] **Google Ads/Meet:** (se configurado) botão Google funciona
- [ ] **WhatsApp:** (se usar UazapiGO ou Meta Cloud) conexão com QR-code ou Cloud API estabelecida

---

## 4. Webhooks registrados

Cadastre as URLs de webhook em cada plataforma externa (ver
[`INSTALACAO.md`](INSTALACAO.md) — seção Webhooks):

- [ ] Facebook App (developer.facebook.com) → `.../functions/v1/meta-whatsapp-webhook`
- [ ] Meta WhatsApp Cloud (se usar) → `.../functions/v1/whatsapp-webhook`
- [ ] Instagram Messaging (se usar) → `.../functions/v1/instagram-messaging-webhook`
- [ ] API4Com (se usar) → `.../functions/v1/api4com-webhook`
- [ ] Shotstack (se usar) → `.../functions/v1/shotstack-webhook`

> Substitua o prefixo pela URL do **seu** projeto Supabase: `https://<project-ref>.supabase.co`.

---

## 5. Cron Jobs

- [ ] Executei `supabase functions invoke setup-cron-jobs --no-verify-jwt`
      _(lê `SUPABASE_URL`/`SUPABASE_ANON_KEY` do runtime)_
- [ ] Em _Supabase Dashboard > Database > Cron Jobs_, vejo ~10 jobs ativos

---

## 6. Operação inicial (organização)

Configurações de uso do dia a dia:

- [ ] **Usuários:** convide os membros do seu time em `/configuracoes/usuarios`
      (recebem magic link por email)
- [ ] **Squads:** crie os squads e adicione membros em `/squad` (defina líder,
      responsável WhatsApp e autorizador conforme o fluxo do time)
- [ ] **Permissões:** ajuste os grupos de permissão em `/configuracoes/permissoes`
      (owners têm acesso total — não precisa configurar para eles)
- [ ] **Primeiro projeto/campanha:** crie sua empresa padrão (se ainda não existir) e
      abra o primeiro projeto/campanha para validar o fluxo ponta-a-ponta

---

## 7. Verificação final

- [ ] `bash scripts/verify-self-hosting.sh` retorna **todos OK**
- [ ] Nenhuma credencial do dev original vaza no bundle:
      `grep -rE "ejwpfztkspbvmuwwiwmk|controledetrafego\.com\.br|expxflow\.com\.br|bittencourtthulio" src/ supabase/functions/`
      retorna **vazio**
- [ ] `npm run build` limpo
- [ ] `npm run test:ci` verde

---

## 8. Operação contínua

- [ ] Backup do Supabase configurado (automático em Pro+; manual em Free via `pg_dump`)
- [ ] Domínio próprio apontado para a Vercel (opcional, mas recomendado) — atualize
      `app_url` em `/configuracoes/sistema > App` se mudar
- [ ] Monitoramento de erros configurado (ex.: Sentry) — opcional

---

## Troubleshooting rápido

| Sintoma                                     | Causa provável                                    | Solução                                                                                       |
| ------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| "Acesso negado" em `/configuracoes/sistema` | Não é system owner                                | Você precisa ser o primeiro usuário (admin do assistente) OU ter `role='owner'` em `profiles` |
| App abre em `/onboarding` em vez do app     | `installation_completed` ainda `false`            | Conclua o assistente (passo 6: criar admin). Se travou, recarregue — ele retoma               |
| Facebook OAuth redireciona para URL errada  | `app_url` não salva em `/configuracoes/sistema`   | Preencha a aba **App** e salve                                                                |
| Emails não chegam                           | `from_email` com domínio não verificado no Resend | Verifique o domínio no dashboard Resend                                                       |
| Convites expiram                            | Auth Site URL divergente da Vercel                | Confira _Supabase Dashboard > Authentication > URL Configuration_                             |
| `cron.job` vazio                            | setup-cron-jobs não rodou                         | Execute `supabase functions invoke setup-cron-jobs --no-verify-jwt`                           |
| IA responde "key não configurada"           | `system_config_ai` vazia                          | Preencha em `/configuracoes/sistema > IA`                                                     |
| Webhook retorna 404                         | Function não deployada ou URL errada              | Confira o `<project-ref>` na URL e rode `supabase functions deploy <nome>`                    |
| Login social não aparece                    | Provider não habilitado no Supabase               | Habilite em _Authentication > Providers_ e preencha client ID/secret                          |

---

Após tudo verde, sua instância está release-ready. Bons mercados!
