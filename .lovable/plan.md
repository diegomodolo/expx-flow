
# Plano: Configuração de Recebimento e Análise de Grupos no WhatsApp

## Contexto do Problema

Atualmente, o sistema **ignora grupos de forma fixa no código**, independente da escolha feita ao configurar o webhook. Além disso, não existe configuração para controlar se a IA deve analisar conversas de grupo.

---

## Alterações Necessárias

### 1. Banco de Dados

**Adicionar coluna na tabela `whatsapp_instances`:**
```sql
ALTER TABLE whatsapp_instances 
ADD COLUMN receive_group_messages boolean DEFAULT false;
```

**Adicionar coluna na tabela `whatsapp_ai_agent_config`:**
```sql
ALTER TABLE whatsapp_ai_agent_config 
ADD COLUMN ignore_group_analysis boolean DEFAULT true;
```

---

### 2. Edge Function: `configure-uazapi-webhook`

Após configurar o webhook com sucesso, **salvar a preferência na tabela**:
- Atualizar a instância com `receive_group_messages = true/false`

---

### 3. Edge Function: `create-uazapi-instance`

- Alterar para usar `receive_group_messages = false` por padrão (já faz isso via `isGroupYes`)
- Salvar `receive_group_messages = false` na instância criada

---

### 4. Edge Function: `whatsapp-webhook`

Alterar a lógica de ignorar grupos para ser **condicional**:

```
ANTES (linhas 79-86):
  // Ignore groups
  if (chatId.includes("@g.us") || chat.wa_isGroup) {
    return ... "Group message ignored"
  }

DEPOIS:
  // Verificar se é grupo
  const isGroup = chatId.includes("@g.us") || chat.wa_isGroup;
  
  if (isGroup) {
    // Buscar configuração da instância para ver se deve receber grupos
    const { data: instance } = await supabase
      .from("whatsapp_instances")
      .select("receive_group_messages")
      .eq("uazapi_token", instanceToken)
      .single();
    
    if (!instance?.receive_group_messages) {
      return ... "Group message ignored (config)"
    }
    
    // Se chegou aqui, é grupo mas está configurado para receber
    console.log("[whatsapp-webhook] Processing group message");
  }
```

---

### 5. Edge Function: `sync-whatsapp-chats`

Alterar para **verificar a configuração** antes de ignorar grupos:

```
ANTES (linha 265):
  if (rawId.includes("@g.us") || ...) {
    continue;
  }

DEPOIS:
  // Buscar se a instância aceita grupos
  const { data: instanceConfig } = await supabase
    .from("whatsapp_instances")
    .select("receive_group_messages")
    .eq("id", instance_id)
    .single();
  
  const receiveGroups = instanceConfig?.receive_group_messages ?? false;
  
  // ... dentro do loop de chats:
  if ((rawId.includes("@g.us") || chat.wa_isGroup) && !receiveGroups) {
    continue;
  }
```

---

### 6. Hook: `useWhatsAppAIAgentConfig.tsx`

Adicionar o novo campo ao tipo e ao default:

```typescript
// No interface WhatsAppAIAgentConfig:
ignore_group_analysis: boolean;

// No defaultConfig:
ignore_group_analysis: true,
```

---

### 7. Componente: `WhatsAppAIAgentKnowledgePanel.tsx`

Adicionar toggle na seção "Analise em Tempo Real":

```
[x] Habilitar para todos os chats
[ ] Ignorar conversas de grupo  <-- NOVO
    "Mesmo com análise habilitada para todos, grupos não serão analisados"
```

---

### 8. Hook: `useWhatsAppRealtimeAnalysis.tsx`

Adicionar verificação se é conversa de grupo antes de analisar:

```typescript
// Receber novo parâmetro: isGroupConversation (do componente pai)
// Verificar config.ignore_group_analysis

if (isGroupConversation && config?.ignore_group_analysis) {
  console.log("[useWhatsAppRealtimeAnalysis] Skipping group analysis");
  return;
}
```

---

### 9. Componente de Chat (WhatsAppChatWindow ou similar)

Passar flag `isGroupConversation` para o hook de análise:
- Detectar se o `phone` contém `@g.us` ou `-` (formato de grupo)

---

## Fluxo Final

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURAÇÃO DE INSTÂNCIA                     │
├─────────────────────────────────────────────────────────────────┤
│  Configurar Webhook                                              │
│  ├─ "Sim, receber grupos" → receive_group_messages = true       │
│  └─ "Não, apenas privadas" → receive_group_messages = false     │
│                                                                  │
│  ↓ Salva na tabela whatsapp_instances                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    RECEBIMENTO DE MENSAGENS                      │
├─────────────────────────────────────────────────────────────────┤
│  whatsapp-webhook                                                │
│  ├─ Recebe mensagem                                             │
│  ├─ Verifica se é grupo                                          │
│  ├─ Se grupo → consulta receive_group_messages da instância     │
│  └─ Processa ou ignora baseado na configuração                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURAÇÃO DA IA                            │
├─────────────────────────────────────────────────────────────────┤
│  Análise em Tempo Real                                           │
│  ├─ [x] Habilitar para todos os chats                           │
│  └─ [x] Ignorar conversas de grupo (default: ativado)           │
│                                                                  │
│  ↓ Salva na tabela whatsapp_ai_agent_config                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    ANÁLISE DA CONVERSA                           │
├─────────────────────────────────────────────────────────────────┤
│  useWhatsAppRealtimeAnalysis                                     │
│  ├─ Detecta se conversa é de grupo                              │
│  ├─ Verifica ignore_group_analysis na config                    │
│  └─ Analisa ou pula baseado na configuração                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Tipo de Alteração |
|---------|------------------|
| `supabase/migrations/*.sql` | Criar migration para novas colunas |
| `supabase/functions/configure-uazapi-webhook/index.ts` | Salvar preferência na instância |
| `supabase/functions/create-uazapi-instance/index.ts` | Salvar default `receive_group_messages = false` |
| `supabase/functions/whatsapp-webhook/index.ts` | Consultar config antes de ignorar grupos |
| `supabase/functions/sync-whatsapp-chats/index.ts` | Consultar config antes de ignorar grupos |
| `src/hooks/useWhatsAppInstances.tsx` | Adicionar campo ao tipo |
| `src/hooks/useWhatsAppAIAgentConfig.tsx` | Adicionar `ignore_group_analysis` |
| `src/components/whatsapp/WhatsAppAIAgentKnowledgePanel.tsx` | Adicionar toggle na UI |
| `src/hooks/useWhatsAppRealtimeAnalysis.tsx` | Verificar config antes de analisar grupos |
| `src/components/whatsapp/WhatsAppChatWindow.tsx` | Passar flag de grupo para o hook |

---

## Observações Técnicas

- A coluna `receive_group_messages` na instância serve como **fonte da verdade** para o comportamento de recebimento
- A coluna `ignore_group_analysis` na config da IA é **independente** - permite receber grupos mas não analisá-los
- O default é: **não receber grupos** e **não analisar grupos** (comportamento atual preservado)
- Grupos são identificados por `@g.us` no ID ou presença de `-` no número (formato `123-456@g.us`)
