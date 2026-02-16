

# Plano de Integraciao com Discord

## Visao Geral

Criar uma integracao completa com o Discord dentro do sistema, permitindo associar colaboradores e squads a canais/servidores do Discord, e enviar notificacoes automaticas do sistema para la.

## Etapas

### 1. Banco de Dados - Nova tabela e colunas

**Tabela `discord_config`** (configuracao geral por empresa):
- `id`, `company_id`, `bot_token` (criptografado), `guild_id` (ID do servidor), `enabled`, `created_at`, `updated_at`

**Coluna nova em `employees`:**
- `discord_user_id` (TEXT) - ID do usuario no Discord para mencoes e DMs

**Coluna nova em `teams`:**
- `discord_channel_id` (TEXT) - ID do canal do Discord associado a squad

### 2. Edge Function `discord-bot`

Uma edge function que faz chamadas a API do Discord (envio de mensagens, validacao de conexao):
- `POST /discord-bot` com actions: `test-connection`, `send-message`, `send-notification`
- Usa o Bot Token armazenado como secret do Supabase para autenticar na API do Discord
- Suporta envio para canais de squads e DMs para colaboradores

### 3. Hook `useDiscordConfig`

Hook para gerenciar a configuracao do Discord:
- Carregar/salvar configuracoes (guild_id, bot_token)
- Testar conexao com o servidor
- Listar canais do servidor para associacao com squads

### 4. Pagina de Configuracoes - Aba Discord

Nova aba em **Configuracoes > Discord** com:

**Secao 1 - Configuracao do Bot:**
- Campo para o Bot Token
- Campo para o Guild ID (ID do servidor)
- Botao "Testar Conexao"
- Status da conexao (conectado/desconectado)

**Secao 2 - Associacao de Squads:**
- Lista de squads com seletor de canal do Discord para cada uma
- Ao selecionar, salva o `discord_channel_id` na tabela `teams`

**Secao 3 - Associacao de Colaboradores:**
- Lista de colaboradores com campo para Discord User ID
- Botao para salvar as associacoes

### 5. Integracao com Notificacoes

Estender o sistema de notificacoes existente para incluir Discord como canal de envio:
- Quando uma tarefa e atribuida, notificar no canal da squad
- Quando uma tarefa precisa de aprovacao, notificar o autorizador via DM ou canal

---

## Detalhes Tecnicos

### Arquivos a criar:
- `supabase/migrations/xxx_add_discord_integration.sql` - Migration com tabela e colunas
- `supabase/functions/discord-bot/index.ts` - Edge function para API do Discord
- `src/hooks/useDiscordConfig.ts` - Hook de gerenciamento
- `src/components/discord/DiscordSettings.tsx` - Pagina principal de configuracao
- `src/components/discord/DiscordBotConfig.tsx` - Formulario do bot
- `src/components/discord/DiscordSquadChannels.tsx` - Associacao squad/canal
- `src/components/discord/DiscordEmployeeMapping.tsx` - Associacao colaborador/Discord

### Arquivos a editar:
- `src/components/settings/SettingsLayout.tsx` - Adicionar item "Discord" no menu lateral
- `src/pages/Configuracoes.tsx` - Adicionar rota `/configuracoes/discord`

### Fluxo da Edge Function:
1. Recebe action + payload
2. Busca `bot_token` dos secrets do Supabase
3. Chama a API do Discord (`https://discord.com/api/v10/...`)
4. Retorna resultado

### Seguranca:
- O Bot Token sera armazenado como secret do Supabase (nao no banco de dados diretamente)
- RLS habilitado na tabela `discord_config` filtrando por `company_id`

