

# Plano: Integração Harmônica entre WhatsApp Gold (UazapiGO) e Meta Cloud API

## Resumo Executivo

O sistema atual possui dois provedores funcionando de forma isolada. Este plano unifica a experiência para que ambos apareçam de forma transparente na tela do WhatsApp, permitindo:
- Visualizar conversas de ambos os provedores
- Enviar mensagens independente do provedor  
- Selecionar qual "instância" usar (incluindo números Meta)

## Arquitetura Proposta

Tratar cada número do Meta Cloud API como uma "instância virtual" na tabela `whatsapp_instances`, unificando a experiência independente do provedor.

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        WhatsApp Inbox Drawer                           │
├────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Seletor de Instâncias (Unificado)                              │   │
│  │  ┌───────────────────────────────────────────────────────────┐  │   │
│  │  │  ▼ Selecione uma instância                               │  │   │
│  │  ├───────────────────────────────────────────────────────────┤  │   │
│  │  │  📱 Squad #01 - Renata (UazapiGO)                         │  │   │
│  │  │  📱 CS - Azeredo (UazapiGO)                               │  │   │
│  │  │  📘 Meta Business (+55 31 9999-1234)                      │  │   │
│  │  └───────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Lista de Conversas  │  │  Janela de Chat                       │  │
│  │  (filtrada por       │  │  (envia via provedor correto          │  │
│  │   instância)         │  │   automaticamente)                    │  │
│  └──────────────────────┘  └────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

## Etapas de Implementação

### Fase 1: Criar Instância Virtual para Meta

**1.1 Atualizar hook `useWhatsAppInstances`**
- Adicionar campo `provider` ao type `WhatsAppInstance` 
- Incluir na query instâncias Meta (onde `meta_phone_number_id` está preenchido)
- Ordenar por nome mantendo instâncias UazapiGO e Meta juntas

**1.2 Auto-criar instância Meta ao salvar configuração**
- Quando salvar config Meta em `whatsapp_configs`, criar/atualizar registro correspondente em `whatsapp_instances` com:
  - `meta_phone_number_id` 
  - `meta_access_token`
  - `instance_name`: "Meta Business (+XX XXXX-XXXX)"
  - `is_connected`: baseado no teste de conexão
  - `connected_phone`: número conectado

### Fase 2: Restaurar e Unificar Seletor de Instâncias

**2.1 Atualizar `WhatsAppInboxDrawer`**
- Remover condição `isUazapi` do seletor de instâncias
- Mostrar seletor sempre que houver instâncias disponíveis
- Adicionar ícone visual diferenciando provider:
  - 📱 para UazapiGO
  - 📘 para Meta

**2.2 Detectar provedor da instância selecionada**
- Adicionar lógica para identificar se instância é Meta ou UazapiGO
- Propagar provider para componentes filhos (ChatWindow, MessageInput)

### Fase 3: Suporte a Envio de Mensagens via Meta

**3.1 Atualizar `send-whatsapp-notification`**
- Adicionar branch para `provider === "meta"` 
- Implementar envio via Graph API do Meta
- Respeitar regra de 24h (dentro da janela: texto livre; fora: template obrigatório)

**3.2 Atualizar `send-whatsapp-media`**
- Adicionar suporte para envio de mídia via Meta Cloud API
- Fazer upload para Graph API e enviar

**3.3 Tratar janela de 24h no Frontend**
- Verificar `last_message_at` da conversa
- Se > 24h sem resposta do cliente, exibir aviso e forçar seleção de template

### Fase 4: Associar Conversas à Instância Meta

**4.1 Atualizar webhook `meta-whatsapp-webhook`**
- Ao receber mensagem, buscar a instância Meta correspondente via `meta_phone_number_id`
- Salvar `instance_id` na conversa (não mais `null`)

**4.2 Filtrar conversas por instância**
- O hook `useWhatsAppConversations` já filtra por `instance_id` 
- Garantir que conversas Meta sejam filtradas corretamente

### Fase 5: Sincronização e Status

**5.1 Atualizar teste de conexão Meta**
- Ao testar, atualizar `is_connected` e `connected_phone` na instância
- Sincronizar status visual no seletor

**5.2 Ajustar função de sincronização**
- `sync-whatsapp-chats` já retorna 200 OK para Meta (não precisa sync manual)
- Pode adicionar funcionalidade futura de sincronização de contatos

---

## Detalhes Técnicos

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/hooks/useWhatsAppInstances.tsx` | Modificar | Incluir instâncias Meta na query |
| `src/hooks/useWhatsAppConfig.tsx` | Modificar | Auto-criar instância ao salvar Meta |
| `src/components/whatsapp/WhatsAppInboxDrawer.tsx` | Modificar | Seletor unificado, remover condição `isUazapi` |
| `src/components/whatsapp/WhatsAppConversationList.tsx` | Verificar | Já recebe `instanceSelector` como prop |
| `src/components/whatsapp/WhatsAppChatWindow.tsx` | Modificar | Detectar provider e ajustar comportamento |
| `supabase/functions/send-whatsapp-notification/index.ts` | Modificar | Adicionar branch Meta |
| `supabase/functions/send-whatsapp-media/index.ts` | Modificar | Adicionar branch Meta |
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Modificar | Associar instância correta |

### Exemplo de Query Unificada (useWhatsAppInstances)

```typescript
// Buscar instâncias UazapiGO + Meta
const { data: instances } = await supabase
  .from("whatsapp_instances")
  .select("*")
  .eq("company_id", companyId)
  .eq("is_active", true)
  .or("uazapi_token.not.is.null,meta_phone_number_id.not.is.null")
  .order("instance_name");
```

### Exemplo de Detecção de Provider

```typescript
const getInstanceProvider = (instance: WhatsAppInstance): "uazapi" | "meta" => {
  if (instance.meta_phone_number_id) return "meta";
  if (instance.uazapi_token) return "uazapi";
  return "uazapi"; // fallback
};
```

### Envio via Meta Cloud API

```typescript
// POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
const metaUrl = `https://graph.facebook.com/v18.0/${instance.meta_phone_number_id}/messages`;
const response = await fetch(metaUrl, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${instance.meta_access_token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    messaging_product: "whatsapp",
    to: formattedPhone,
    type: "text",
    text: { body: message }
  })
});
```

---

## Considerações de UX

1. **Indicador visual de provider**: Usar ícones diferentes (📱 UazapiGO, 📘 Meta) para facilitar identificação
2. **Aviso de janela de 24h**: Quando fora da janela, mostrar banner e forçar uso de template
3. **Status de conexão unificado**: Mesmo indicador visual (verde/amarelo) para ambos os provedores
4. **Sem quebra de compatibilidade**: Usuários com apenas UazapiGO ou apenas Meta continuam funcionando normalmente

---

## Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Janela de 24h do Meta | Implementar verificação e forçar uso de templates |
| Templates não sincronizados | Usar tabela `whatsapp_meta_templates` já existente |
| Conversas órfãs (sem instance_id) | Migração para associar conversas existentes à instância Meta |

