

# Integrar Agentes de IA com Bots do Telegram

## Resumo

Permitir que cada agente de IA criado no sistema seja conectado a um bot do Telegram. Quando alguem mandar mensagem para o bot, o agente responde automaticamente usando o mesmo prompt, conhecimento e contexto que ja possui.

## Como Funciona para o Usuario

1. Voce cria um bot no Telegram via @BotFather (ele te da um token)
2. Na pagina de edicao do agente, voce cola o token do bot
3. O sistema configura o webhook automaticamente
4. Pronto - qualquer pessoa que mandar mensagem pro bot recebe resposta do agente

## Mudancas Tecnicas

### 1. Banco de Dados

Adicionar coluna `telegram_bot_token` na tabela `ia_agents` para armazenar o token do bot associado ao agente.

### 2. Nova Edge Function: `telegram-agent-webhook`

Endpoint publico que o Telegram chama quando alguem manda mensagem para o bot:

- Recebe o update do Telegram (mensagem do usuario)
- Identifica qual agente esta associado ao bot pelo token na URL
- Busca o agente, prompt, documentos de conhecimento e contexto do cliente (mesma logica da `ia-agent-chat`)
- Envia para o Lovable AI Gateway
- Responde de volta no Telegram via `sendMessage`
- Gerencia historico de conversa por `chat_id` do Telegram

### 3. Nova Edge Function: `configure-telegram-webhook`

Chamada internamente quando o usuario salva o token do bot:

- Chama a API do Telegram `setWebhook` apontando para a URL da edge function `telegram-agent-webhook`
- Valida se o token e valido chamando `getMe`
- Retorna o nome do bot para exibir na interface

### 4. Tabela de Conversas do Telegram

Nova tabela `ia_agent_telegram_conversations` para manter historico por chat:

- `agent_id` (referencia ao agente)
- `telegram_chat_id` (ID do chat no Telegram)
- `messages` (historico em JSON ou tabela separada)
- Limitar historico a ultimas N mensagens para nao exceder contexto

### 5. Interface - Pagina de Edicao do Agente

Na pagina de edicao/criacao do agente, adicionar uma secao "Telegram":

- Campo para colar o token do bot (@BotFather)
- Botao "Conectar" que chama a edge function de configuracao
- Status da conexao (conectado/desconectado, nome do bot)
- Botao para desconectar/remover o bot
- Instrucoes simples de como criar um bot no @BotFather

### 6. Arquivos Modificados/Criados

**Novos:**
- `supabase/functions/telegram-agent-webhook/index.ts` - Webhook que recebe mensagens do Telegram
- `supabase/functions/configure-telegram-webhook/index.ts` - Configura o webhook no Telegram

**Modificados:**
- `src/hooks/useIAAgents.tsx` - Adicionar funcoes para salvar/remover token do Telegram
- Pagina/componente de edicao do agente - Adicionar secao de configuracao do Telegram
- Migration SQL para adicionar coluna `telegram_bot_token` em `ia_agents`

## Fluxo da Mensagem

```text
Usuario no Telegram
       |
       v
Telegram API --> telegram-agent-webhook (Edge Function)
       |
       v
Busca agente + prompt + conhecimento + contexto do cliente
       |
       v
Lovable AI Gateway (mesmo modelo configurado no agente)
       |
       v
Resposta enviada de volta ao Telegram via sendMessage
```

## Consideracoes

- O token do bot e armazenado na coluna do banco, protegido por RLS
- Cada agente pode ter no maximo 1 bot do Telegram
- O historico de conversa no Telegram e separado do historico interno do sistema
- O webhook e publico (sem JWT) pois o Telegram precisa acessar diretamente, mas validamos o token na URL
