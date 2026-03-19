# Enquete WhatsApp (UAZAPI) — Design Spec

## Objetivo

Permitir envio de enquetes (polls) via WhatsApp pelo Flow, com visualização de votos em tempo real. Suporte apenas UAZAPI por agora.

## Arquitetura

Mesmo padrão de mensagens: UI → Hook → Edge Function → UAZAPI API. Votos recebidos via webhook e armazenados como JSON na mensagem.

## Componentes

### 1. Migration

- Adicionar `'poll'` ao CHECK constraint de `message_type` em `whatsapp_messages`
- Adicionar coluna `poll_votes` (JSONB, nullable) em `whatsapp_messages`
- Estrutura: `{ "opção1": ["phone1", "phone2"], "opção2": ["phone3"] }`

### 2. Edge Function: `send-whatsapp-poll`

- Request: `{ company_id, recipient_phone, question, options, allow_multiple, instance_id }`
- Busca config UAZAPI da instância
- Chama `POST {uazapi_endpoint}/message/sendPoll`:
  ```json
  {
    "number": "phone",
    "name": "question",
    "values": ["opt1", "opt2"],
    "selectableCount": 1
  }
  ```
- Retorna `{ success, message_id }`

### 3. Webhook: Captura de votos

- Atualizar `whatsapp-webhook/index.ts` para capturar `pollVoteMessage`
- Payload do UAZAPI: `{ key: { id: messageId }, vote: { selectedOptions: [...], voterPhone: "..." } }`
- Atualizar campo `poll_votes` da mensagem via upsert JSONB
- Realtime do Supabase propaga a mudança para o frontend

### 4. Hook: `sendPoll()` em `useWhatsAppMessages.tsx`

- Cria mensagem otimista no DB: `message_type: 'poll'`, `content: JSON.stringify({ question, options, allow_multiple })`
- Chama Edge Function `send-whatsapp-poll`
- Atualiza status para sent/failed

### 5. UI: `WhatsAppPollDialog.tsx` (novo)

- Modal com:
  - Input de pergunta
  - Lista dinâmica de opções (min 2, max 12)
  - Botão + para adicionar opção, X para remover
  - Toggle "Permitir múltiplas respostas"
  - Botão "Enviar Enquete"

### 6. UI: `WhatsAppMessageInput.tsx` (modificar)

- Adicionar item "Enquete" no dropdown de anexos com ícone BarChart3

### 7. UI: `WhatsAppMessageBubble.tsx` (modificar)

- Renderizar `message_type === 'poll'` como bubble especial:
  - Ícone de enquete + pergunta em destaque
  - Cada opção com barra de progresso e contagem de votos
  - Total de votos no rodapé
  - Atualização em tempo real via Realtime subscription em `poll_votes`

## Data Flow

```
Envio:  Modal → sendPoll() → DB (otimista) → Edge Function → UAZAPI
Votos:  UAZAPI webhook → Edge Function → DB update poll_votes → Realtime → Bubble
```

## Fora de Escopo

- Suporte Meta Cloud API e Z-API
- Tabela separada de votos
- Relatórios de enquetes
- Criação de enquete via template
