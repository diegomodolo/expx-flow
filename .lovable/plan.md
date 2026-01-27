
# Plano: Arquitetura Multi-Instância UazapiGO

## Visão Geral do Problema

A estrutura atual (`whatsapp_configs`) armazena apenas UMA configuração por empresa, com campos como `uazapi_endpoint`, `uazapi_token` e `uazapi_session`. Você precisa de:

1. **Configuração Base Global** - URL Base + Token da API UazapiGO (1 por empresa)
2. **Múltiplas Instâncias/Sessões** - Várias sessões conectadas
3. **Atribuição de Instâncias a Usuários** - Controle de acesso
4. **Seleção de Instância por Gatilho** - Escolher qual instância envia cada notificação

---

## Nova Arquitetura de Dados

```text
┌────────────────────────────────────────────────────────────────────────┐
│                     whatsapp_configs (existente)                       │
│  - company_id                                                          │
│  - provider ('zapi' | 'uazapi')                                        │
│  - uazapi_endpoint (URL Base global)                                   │
│  - uazapi_token (Token global)                                         │
│  - [Z-API fields: instance_id, token, client_token]                    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     whatsapp_instances (NOVA)                          │
│  - id (UUID)                                                           │
│  - company_id (FK companies)                                           │
│  - instance_name (ex: "Comercial", "Suporte", "Marketing")             │
│  - session_id (session da UazapiGO)                                    │
│  - is_connected (boolean)                                              │
│  - connected_phone (número conectado)                                  │
│  - last_connection_test (timestamp)                                    │
│  - is_active (boolean)                                                 │
│  - created_at, updated_at                                              │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │ 1:N                           │ N:M
                    ▼                               ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│ whatsapp_conversations (existe) │   │  whatsapp_instance_users (NOVA) │
│  + instance_id (FK)             │   │  - instance_id (FK)             │
│  (qual instância recebeu/enviou)│   │  - user_id (FK profiles)        │
└─────────────────────────────────┘   │  - can_view (ver conversas)     │
                                      │  - can_send (enviar mensagens)  │
                                      │  - is_default (instância padrão)│
                                      └─────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│              whatsapp_notification_triggers (existente)                │
│  + instance_id (FK whatsapp_instances - NOVO)                          │
│  (qual instância deve enviar este gatilho)                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Alterações no Banco de Dados

### 1.1 Criar tabela `whatsapp_instances`

```sql
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  instance_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  is_connected BOOLEAN DEFAULT false,
  connected_phone TEXT,
  last_connection_test TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, session_id)
);

-- Índices
CREATE INDEX idx_whatsapp_instances_company ON whatsapp_instances(company_id);

-- RLS
ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view instances of their companies"
  ON whatsapp_instances FOR SELECT
  USING (company_id IN (SELECT company_id FROM company_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage instances"
  ON whatsapp_instances FOR ALL
  USING (company_id IN (
    SELECT company_id FROM company_members 
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));
```

### 1.2 Criar tabela `whatsapp_instance_users`

```sql
CREATE TABLE IF NOT EXISTS whatsapp_instance_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  can_view BOOLEAN DEFAULT true,
  can_send BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, user_id)
);

-- RLS
ALTER TABLE whatsapp_instance_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own assignments"
  ON whatsapp_instance_users FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user assignments"
  ON whatsapp_instance_users FOR ALL
  USING (instance_id IN (
    SELECT wi.id FROM whatsapp_instances wi
    JOIN company_members cm ON cm.company_id = wi.company_id
    WHERE cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
  ));
```

### 1.3 Adicionar coluna `instance_id` nas tabelas existentes

```sql
-- Adicionar instance_id ao whatsapp_conversations
ALTER TABLE whatsapp_conversations 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- Adicionar instance_id ao whatsapp_notification_triggers
ALTER TABLE whatsapp_notification_triggers 
ADD COLUMN IF NOT EXISTS instance_id UUID REFERENCES whatsapp_instances(id) ON DELETE SET NULL;

-- Índices
CREATE INDEX idx_whatsapp_conversations_instance ON whatsapp_conversations(instance_id);
CREATE INDEX idx_whatsapp_triggers_instance ON whatsapp_notification_triggers(instance_id);
```

---

## Fase 2: Interface de Configuração

### 2.1 Tela de Configuração Base

A tela `/configuracoes/whatsapp` na tab UazapiGO terá:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Configuração Base UazapiGO                                     │
├─────────────────────────────────────────────────────────────────┤
│  URL Base: [________________________] Ex: https://api.uazapi.com│
│  Token:    [________________________] Token global da API       │
│                                                                 │
│  [Salvar Configuração Base]                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Instâncias Conectadas                      [+ Nova Instância]  │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📱 Comercial                          🟢 Conectado        │  │
│  │    Session: comercial-01              55 11 99999-1234    │  │
│  │    Usuários: João, Maria, Pedro                           │  │
│  │    [Ver QR] [Testar] [Usuários] [Editar] [Excluir]        │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 📱 Suporte                            🔴 Desconectado     │  │
│  │    Session: suporte-01                Não conectado        │  │
│  │    Usuários: Ana, Carlos                                  │  │
│  │    [Ver QR] [Testar] [Usuários] [Editar] [Excluir]        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Modal de Nova Instância

```text
┌─────────────────────────────────────────────────────────────────┐
│  Nova Instância WhatsApp                                   [×]  │
├─────────────────────────────────────────────────────────────────┤
│  Nome da Instância: [Comercial________________]                 │
│  Session ID:        [comercial-01_____________]                 │
│                                                                 │
│  ⚠️ O Session ID deve ser único e não conter espaços            │
│                                                                 │
│  [Cancelar]                              [Criar Instância]      │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Modal de Atribuição de Usuários

```text
┌─────────────────────────────────────────────────────────────────┐
│  Usuários da Instância: Comercial                          [×]  │
├─────────────────────────────────────────────────────────────────┤
│  ☑️ João Silva                      [Ver] [Enviar] [Padrão]    │
│  ☑️ Maria Santos                    [Ver] [Enviar] [ ]         │
│  ☐ Pedro Costa                      [ ]   [ ]       [ ]        │
│  ☐ Ana Oliveira                     [ ]   [ ]       [ ]        │
├─────────────────────────────────────────────────────────────────┤
│  Legenda:                                                       │
│  • Ver: pode visualizar conversas desta instância               │
│  • Enviar: pode enviar mensagens por esta instância             │
│  • Padrão: instância padrão do usuário no chat                  │
│                                                                 │
│  [Cancelar]                                        [Salvar]     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 3: Modificar Chat Interno (WhatsApp Web)

### 3.1 Seletor de Instância no Drawer

```text
┌─────────────────────────────────────────────────────────────────┐
│  WhatsApp                                              [−] [×]  │
├─────────────────────────────────────────────────────────────────┤
│  Instância: [▼ Comercial (55 11 99999-1234) ]                   │
│             ├─ Comercial (55 11 99999-1234) 🟢                  │
│             ├─ Suporte (55 11 88888-5678) 🟢                    │
│             └─ Marketing (Desconectado) 🔴                      │
├─────────────────────────────────────────────────────────────────┤
│  🔍 Buscar conversa...                                          │
├───────────────────────────┬─────────────────────────────────────┤
│  CONVERSAS (Comercial)    │  MENSAGENS                          │
│  👤 Maria Silva     11:30 │  ...                                │
│  👤 João Souza      10:15 │                                     │
└───────────────────────────┴─────────────────────────────────────┘
```

### 3.2 Conversas Filtradas por Instância

- Cada conversa tem `instance_id`
- Ao trocar instância, conversas são filtradas
- Mensagens enviadas usam a instância selecionada

---

## Fase 4: Modificar Módulo de Notificações

### 4.1 Seletor de Instância no Gatilho

No modal de edição de gatilho, adicionar campo:

```text
┌─────────────────────────────────────────────────────────────────┐
│  Configurações do Gatilho                                       │
├─────────────────────────────────────────────────────────────────┤
│  Tipo: [▼ Relatório Semanal]                                    │
│  Nome: [Relatório Semanal de Performance___________]            │
│                                                                 │
│  📱 Instância de Envio: [▼ Comercial (55 11 99999-1234)]        │
│                         ├─ Comercial                            │
│                         ├─ Suporte                              │
│                         └─ Marketing                            │
│                                                                 │
│  ⚠️ Se não selecionada, usará a primeira instância ativa        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 5: Edge Functions

### 5.1 Modificar `send-whatsapp-notification`

```typescript
// Buscar instância específica ou padrão
let instance;
if (instanceId) {
  instance = await getInstanceById(instanceId);
} else {
  instance = await getDefaultInstance(companyId);
}

// Usar config base + session da instância
const endpoint = config.uazapi_endpoint;
const token = config.uazapi_token;
const session = instance.session_id;
```

### 5.2 Modificar `whatsapp-webhook`

```typescript
// Identificar instância pela session
const { data: instance } = await supabase
  .from("whatsapp_instances")
  .select("id, company_id")
  .eq("session_id", sessionId)
  .single();

// Criar conversa vinculada à instância
await supabase.from("whatsapp_conversations").insert({
  company_id: instance.company_id,
  instance_id: instance.id,
  phone: senderPhone,
  // ...
});
```

### 5.3 Nova Function `manage-whatsapp-instance`

Gerenciar CRUD de instâncias:
- Criar instância
- Testar conexão (usa config base + session)
- Obter QR Code
- Atribuir/remover usuários

---

## Resumo de Arquivos

### Criar (7 arquivos)

| Tipo | Arquivo | Descrição |
|------|---------|-----------|
| Component | `src/components/whatsapp/WhatsAppInstancesList.tsx` | Lista de instâncias |
| Component | `src/components/whatsapp/WhatsAppInstanceCard.tsx` | Card de cada instância |
| Component | `src/components/whatsapp/WhatsAppInstanceModal.tsx` | Modal criar/editar instância |
| Component | `src/components/whatsapp/WhatsAppInstanceUsersModal.tsx` | Modal atribuir usuários |
| Hook | `src/hooks/useWhatsAppInstances.tsx` | CRUD de instâncias |
| Edge Fn | `supabase/functions/manage-whatsapp-instance/index.ts` | Gerenciar instâncias |
| Migration | `supabase/migrations/xxx_multi_instance.sql` | Estrutura de tabelas |

### Modificar (8 arquivos)

| Arquivo | Alterações |
|---------|------------|
| `src/components/whatsapp/UazapiConnectionCard.tsx` | Separar config base de instâncias |
| `src/components/whatsapp/WhatsAppSettings.tsx` | Adicionar seção de instâncias |
| `src/components/whatsapp/WhatsAppInboxDrawer.tsx` | Seletor de instância |
| `src/components/whatsapp/notifications/TriggerEditModal.tsx` | Seletor de instância |
| `src/hooks/useWhatsAppConfig.tsx` | Adaptar para config base |
| `src/hooks/useWhatsAppConversations.tsx` | Filtrar por instância |
| `supabase/functions/send-whatsapp-notification/index.ts` | Suporte multi-instância |
| `supabase/functions/whatsapp-webhook/index.ts` | Identificar instância |

---

## Ordem de Implementação

1. **Banco de Dados** - Criar tabelas e adicionar colunas
2. **Hook useWhatsAppInstances** - CRUD de instâncias
3. **Edge Function manage-whatsapp-instance** - Backend
4. **Componentes de Instância** - UI de gerenciamento
5. **Modificar WhatsAppSettings** - Integrar componentes
6. **Modificar Chat** - Seletor de instância
7. **Modificar Gatilhos** - Seletor de instância para notificações
8. **Modificar Edge Functions** - Suporte multi-instância

---

## Detalhes Técnicos

### Configuração Base vs Instância

| Campo | Onde Fica | Descrição |
|-------|-----------|-----------|
| `uazapi_endpoint` | `whatsapp_configs` | URL Base da API (global) |
| `uazapi_token` | `whatsapp_configs` | Token de autenticação (global) |
| `session_id` | `whatsapp_instances` | Session ID (por instância) |
| `is_connected` | `whatsapp_instances` | Status de conexão (por instância) |

### Permissões de Usuário

- **Owner/Admin**: Gerencia instâncias e atribui usuários
- **Member**: Só acessa instâncias atribuídas a ele
- **can_view**: Pode ver conversas da instância
- **can_send**: Pode enviar mensagens pela instância
- **is_default**: Instância padrão ao abrir o chat

### Fluxo de Envio de Notificação

```text
1. Gatilho é ativado
2. Verificar se tem instance_id configurado
3. Se sim: usar essa instância
4. Se não: usar primeira instância ativa da empresa
5. Montar requisição:
   - endpoint + token da config base
   - session_id da instância
6. Enviar via UazapiGO
7. Salvar mensagem com instance_id
```
