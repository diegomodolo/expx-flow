
# Plano: Integração UazapiGO + WhatsApp Web Interno

## Visão Geral

Este plano adiciona suporte completo à UazapiGO como provider alternativo de WhatsApp (além do Z-API já existente) e implementa uma interface de "WhatsApp Web" interno acessível pelo header do dashboard.

---

## Arquitetura da Solução

### Estrutura de Providers

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURAÇÕES WHATSAPP                       │
├───────────────────────────┬─────────────────────────────────────┤
│      Tab: Z-API           │       Tab: UazapiGO                 │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐    │
│  │ Instance ID         │  │  │ URL Base (endpoint)         │    │
│  │ Token               │  │  │ Token da API                │    │
│  │ Client-Token        │  │  │ Session ID                  │    │
│  │ [Testar] [Salvar]   │  │  │ [Ver QR] [Testar] [Salvar]  │    │
│  └─────────────────────┘  │  └─────────────────────────────┘    │
└───────────────────────────┴─────────────────────────────────────┘
```

### Widget WhatsApp no Header

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ [Logo]  Dashboard                    [🔔] [☀️] [🏢] [👤] [💬 WhatsApp]   │
└──────────────────────────────────────────────────────────────────────────┘
                                                          ↓ Clique
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │                    WhatsApp                              [−] [×]        │ │
│ ├─────────────────────────────────────────────────────────────────────────┤ │
│ │ 🔍 Buscar conversa...                                                   │ │
│ ├───────────────────────────┬─────────────────────────────────────────────┤ │
│ │                           │                                             │ │
│ │  CONVERSAS                │  MENSAGENS                                  │ │
│ │                           │                                             │ │
│ │  👤 Maria Silva     11:30 │  Maria: Preciso de ajuda...                 │ │
│ │     Última mensagem...    │                                             │ │
│ │                           │  Você: Olá! Como posso ajudar?              │ │
│ │  👤 João Souza      10:15 │                                             │ │
│ │     Ok, obrigado!         │  ───────────────────────────────────────    │ │
│ │                           │  [Digite sua mensagem...           ] [➤]   │ │
│ └───────────────────────────┴─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Alterações no Banco de Dados

### Adicionar colunas na tabela `whatsapp_configs`

```sql
ALTER TABLE whatsapp_configs 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'zapi',
ADD COLUMN IF NOT EXISTS uazapi_endpoint TEXT,
ADD COLUMN IF NOT EXISTS uazapi_token TEXT,
ADD COLUMN IF NOT EXISTS uazapi_session TEXT;

COMMENT ON COLUMN whatsapp_configs.provider IS 'Provider de WhatsApp: zapi ou uazapi';
COMMENT ON COLUMN whatsapp_configs.uazapi_endpoint IS 'URL base da API UazapiGO (ex: https://api.uazapi.com)';
COMMENT ON COLUMN whatsapp_configs.uazapi_token IS 'Token de autenticação da UazapiGO';
COMMENT ON COLUMN whatsapp_configs.uazapi_session IS 'Session ID da instância UazapiGO';
```

### Criar tabelas para conversas e mensagens

```sql
-- Tabela de conversas
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, phone)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES whatsapp_conversations(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document')),
  media_url TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  external_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_whatsapp_conversations_company ON whatsapp_conversations(company_id);
CREATE INDEX idx_whatsapp_messages_conversation ON whatsapp_messages(conversation_id);
CREATE INDEX idx_whatsapp_messages_sent_at ON whatsapp_messages(sent_at DESC);

-- RLS
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Políticas (similar às outras tabelas do sistema)
CREATE POLICY "Users can view conversations of their companies"
  ON whatsapp_conversations FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Users can view messages of their companies"
  ON whatsapp_messages FOR SELECT
  USING (company_id IN (SELECT company_id FROM user_companies WHERE user_id = auth.uid()));
```

---

## Fase 2: Interface de Configuração Multi-Provider

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/whatsapp/WhatsAppProviderTabs.tsx` | Tabs para alternar entre Z-API e UazapiGO |
| `src/components/whatsapp/UazapiConnectionCard.tsx` | Card de configuração específico para UazapiGO |
| `src/components/whatsapp/UazapiQRCodeModal.tsx` | Modal para exibir QR Code da UazapiGO |

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/whatsapp/WhatsAppSettings.tsx` | Adicionar tabs de provider, renderizar card correto |
| `src/hooks/useWhatsAppConfig.tsx` | Adicionar campos da UazapiGO na interface e mutations |

### Detalhes de Implementação

**WhatsAppProviderTabs.tsx**
- Tabs: "Z-API" | "UazapiGO"
- Estado controlado para provider ativo
- Salva escolha de provider no banco

**UazapiConnectionCard.tsx**
- Campos:
  - URL Base (endpoint): ex: `https://api.uazapi.com`
  - Token: token de autenticação
  - Session ID: identificador da sessão
- Botões:
  - "Ver QR Code" - abre modal com QR
  - "Testar Conexão" - verifica status
  - "Salvar" - persiste configuração
- Status de conexão igual ao Z-API

**UazapiQRCodeModal.tsx**
- Exibe imagem do QR Code via endpoint `/getQrCode`
- Auto-refresh a cada 30 segundos
- Mostra status: "Aguardando leitura" / "Conectado"

---

## Fase 3: Edge Functions Multi-Provider

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/test-uazapi-connection/index.ts` | Testar conexão com UazapiGO |
| `supabase/functions/get-uazapi-qrcode/index.ts` | Obter QR Code para conexão |
| `supabase/functions/whatsapp-webhook/index.ts` | Receber webhooks de mensagens |

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `supabase/functions/send-whatsapp-notification/index.ts` | Adicionar lógica para UazapiGO |
| `supabase/functions/test-whatsapp-connection/index.ts` | Redirecionar para provider correto |

### Endpoints UazapiGO a Utilizar

**Autenticação:**
- Header: `Token: {uazapi_token}` ou `apitoken: {uazapi_token}`

**Endpoints principais:**

| Ação | Método | Endpoint |
|------|--------|----------|
| Obter QR Code | GET | `{endpoint}/getQrCode?session={session}` |
| Status da sessão | POST | `{endpoint}/getSessionStatus` |
| Verificar conexão | POST | `{endpoint}/getSessionState` |
| Enviar texto | POST | `{endpoint}/sendText` |
| Enviar imagem | POST | `{endpoint}/sendImage` |
| Desconectar | POST | `{endpoint}/closeSession` |

**Payload para sendText:**
```json
{
  "session": "session_id",
  "number": "5511999999999",
  "text": "Mensagem aqui"
}
```

**Resposta de status:**
```json
{
  "status": "CONNECTED",
  "phone": "5511999999999",
  "pushname": "Nome do Usuário"
}
```

### Lógica send-whatsapp-notification Atualizada

```typescript
// Verificar provider e chamar API correta
if (config.provider === 'uazapi') {
  const uazapiUrl = `${config.uazapi_endpoint}/sendText`;
  const response = await fetch(uazapiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Token": config.uazapi_token,
    },
    body: JSON.stringify({
      session: config.uazapi_session,
      number: formattedPhone,
      text: message,
    }),
  });
} else {
  // Lógica Z-API existente
}
```

---

## Fase 4: WhatsApp Web Interno (Widget)

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/whatsapp/WhatsAppInboxDrawer.tsx` | Drawer lateral com inbox completo |
| `src/components/whatsapp/WhatsAppConversationList.tsx` | Lista de conversas com busca |
| `src/components/whatsapp/WhatsAppConversationItem.tsx` | Item individual de conversa |
| `src/components/whatsapp/WhatsAppChatWindow.tsx` | Janela de chat com mensagens |
| `src/components/whatsapp/WhatsAppMessageBubble.tsx` | Bolha de mensagem (entrada/saída) |
| `src/components/whatsapp/WhatsAppMessageInput.tsx` | Input para enviar mensagem |
| `src/hooks/useWhatsAppConversations.tsx` | Hook para listar conversas |
| `src/hooks/useWhatsAppMessages.tsx` | Hook para mensagens de uma conversa |
| `src/hooks/useWhatsAppRealtime.tsx` | Hook para real-time via Supabase |

### Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/components/dashboard/DashboardHeader.tsx` | Adicionar botão WhatsApp que abre drawer |

### Componentes em Detalhes

**WhatsAppInboxDrawer.tsx**
- Drawer do lado direito (Sheet do shadcn)
- Largura: 600px em desktop, full em mobile
- Divide em: lista de conversas (35%) + chat (65%)
- Estado: conversa selecionada

**WhatsAppConversationList.tsx**
- Input de busca no topo
- Lista de conversas ordenadas por `last_message_at`
- Badge de não lidas
- Click seleciona conversa

**WhatsAppChatWindow.tsx**
- Header: nome do contato, telefone, botão de ações
- Área de mensagens com scroll
- Input fixo no rodapé
- Carrega mais mensagens ao scrollar

**useWhatsAppRealtime.tsx**
- Subscribe em `whatsapp_messages` e `whatsapp_conversations`
- Atualiza lista automaticamente quando nova mensagem chega
- Usa Supabase Realtime

### Fluxo de Dados

```text
1. Usuário clica no ícone WhatsApp no header
   ↓
2. WhatsAppInboxDrawer abre
   ↓
3. useWhatsAppConversations busca conversas da company
   ↓
4. Usuário seleciona conversa
   ↓
5. useWhatsAppMessages busca mensagens da conversa
   ↓
6. Usuário digita e envia mensagem
   ↓
7. Mutation chama Edge Function send-whatsapp-notification
   ↓
8. Edge Function envia via provider (Z-API ou UazapiGO)
   ↓
9. Mensagem salva em whatsapp_messages
   ↓
10. Realtime atualiza UI automaticamente
```

---

## Fase 5: Webhook para Sincronização de Mensagens

### Edge Function: whatsapp-webhook/index.ts

Recebe webhooks de ambos os providers e salva mensagens no banco.

**Payload UazapiGO (wh_message):**
```json
{
  "event": "message",
  "session": "session_id",
  "data": {
    "key": {
      "remoteJid": "5511999999999@s.whatsapp.net",
      "fromMe": false,
      "id": "ABC123"
    },
    "message": {
      "conversation": "Texto da mensagem"
    },
    "pushName": "Nome do Contato"
  }
}
```

**Lógica do webhook:**
1. Identificar company pelo session ID
2. Buscar/criar conversa pelo telefone
3. Salvar mensagem com direction = 'incoming'
4. Atualizar `last_message_at` e `unread_count` da conversa
5. Retornar 200 OK

**Configuração no UazapiGO:**
- URL do webhook: `https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/whatsapp-webhook`

---

## Resumo de Arquivos

### Criar (14 arquivos)

| Tipo | Arquivo |
|------|---------|
| Component | `src/components/whatsapp/WhatsAppProviderTabs.tsx` |
| Component | `src/components/whatsapp/UazapiConnectionCard.tsx` |
| Component | `src/components/whatsapp/UazapiQRCodeModal.tsx` |
| Component | `src/components/whatsapp/WhatsAppInboxDrawer.tsx` |
| Component | `src/components/whatsapp/WhatsAppConversationList.tsx` |
| Component | `src/components/whatsapp/WhatsAppConversationItem.tsx` |
| Component | `src/components/whatsapp/WhatsAppChatWindow.tsx` |
| Component | `src/components/whatsapp/WhatsAppMessageBubble.tsx` |
| Component | `src/components/whatsapp/WhatsAppMessageInput.tsx` |
| Hook | `src/hooks/useWhatsAppConversations.tsx` |
| Hook | `src/hooks/useWhatsAppMessages.tsx` |
| Hook | `src/hooks/useWhatsAppRealtime.tsx` |
| Edge Fn | `supabase/functions/test-uazapi-connection/index.ts` |
| Edge Fn | `supabase/functions/get-uazapi-qrcode/index.ts` |
| Edge Fn | `supabase/functions/whatsapp-webhook/index.ts` |

### Modificar (4 arquivos)

| Arquivo | Alterações |
|---------|------------|
| `src/components/whatsapp/WhatsAppSettings.tsx` | Adicionar tabs de provider |
| `src/hooks/useWhatsAppConfig.tsx` | Campos e mutations da UazapiGO |
| `src/components/dashboard/DashboardHeader.tsx` | Botão WhatsApp no header |
| `supabase/functions/send-whatsapp-notification/index.ts` | Suporte multi-provider |

---

## Ordem de Implementação

1. **Banco de Dados** - Adicionar colunas e criar tabelas
2. **Edge Functions UazapiGO** - test-connection, get-qrcode
3. **UI de Configuração** - Tabs + UazapiConnectionCard
4. **Modificar send-notification** - Lógica multi-provider
5. **Hooks de Conversas** - useWhatsAppConversations, useWhatsAppMessages
6. **Widget WhatsApp** - WhatsAppInboxDrawer + componentes
7. **Botão no Header** - Integrar no DashboardHeader
8. **Webhook** - Receber e salvar mensagens
9. **Realtime** - Atualização automática da UI

---

## Considerações Técnicas

### Autenticação UazapiGO

A API aceita token via header:
```
Token: seu_token_aqui
```

### Formato de Telefone

Ambas as APIs usam formato E.164 sem símbolos:
- Correto: `5511999999999`
- Incorreto: `+55 (11) 99999-9999`

### Limitações Conhecidas

1. **Listagem de conversas**: Nenhuma API oferece endpoint para listar histórico completo. O histórico será construído via webhooks (novas mensagens) + mensagens enviadas pelo sistema.

2. **Sincronização inicial**: Conversas antigas do WhatsApp não serão importadas automaticamente. Apenas novas mensagens (recebidas após configuração do webhook) aparecerão no sistema.

### Segurança

- Tokens armazenados criptografados no banco
- Webhook valida origem da requisição
- RLS aplicado em todas as tabelas
