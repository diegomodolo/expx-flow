
# Plano: Sincronizar Conversas do WhatsApp na Abertura do Modal

## Problema Identificado
Quando o modal do WhatsApp e aberto, a lista de conversas esta vazia porque:
1. A tabela `whatsapp_conversations` nao possui nenhum registro
2. As conversas so sao criadas quando chegam mensagens via webhook
3. Nao existe uma funcao para buscar e sincronizar os chats existentes da instancia WhatsApp (UazapiGO)

## Solucao

Criar uma edge function e um mecanismo no frontend para sincronizar os chats existentes na instancia UazapiGO com a tabela `whatsapp_conversations`.

---

## Etapa 1: Criar Edge Function `sync-whatsapp-chats`

**Arquivo:** `supabase/functions/sync-whatsapp-chats/index.ts`

Esta funcao ira:
1. Receber `company_id` e `instance_id`
2. Buscar a configuracao da empresa e token da instancia
3. Chamar a API UazapiGO no endpoint `/chats` (ou similar como `/chat/findChats`)
4. Para cada chat retornado, inserir ou atualizar na tabela `whatsapp_conversations`

**Endpoints UazapiGO provaveis (baseado na Evolution API):**
- `GET /chats` - Lista todos os chats
- `POST /chat/findChats` - Busca chats com filtros

**Exemplo de resposta esperada:**
```json
[
  {
    "id": "5511999999999@s.whatsapp.net",
    "name": "Contato Nome",
    "unreadCount": 2,
    "lastMessage": {
      "content": "Ultima mensagem...",
      "timestamp": 1706789456
    }
  }
]
```

---

## Etapa 2: Criar Hook `useSyncWhatsAppChats`

**Arquivo:** `src/hooks/useSyncWhatsAppChats.ts`

Hook que expoe uma funcao `syncChats(instanceId)` para chamar a edge function e atualizar o cache de conversas.

---

## Etapa 3: Integrar Sincronizacao no `WhatsAppInboxDrawer`

**Arquivo:** `src/components/whatsapp/WhatsAppInboxDrawer.tsx`

Alteracoes:
1. Importar o novo hook `useSyncWhatsAppChats`
2. Chamar `syncChats` automaticamente quando:
   - O drawer abrir (`isOpen` mudar para `true`)
   - A instancia selecionada mudar
3. Adicionar botao de "Atualizar" manual para re-sincronizar
4. Mostrar indicador de loading durante a sincronizacao

---

## Detalhes Tecnicos

### Edge Function: sync-whatsapp-chats

```typescript
// Estrutura basica
serve(async (req) => {
  const { company_id, instance_id } = await req.json();
  
  // 1. Buscar config e token da instancia
  const { data: config } = await supabase
    .from("whatsapp_configs")
    .select("uazapi_endpoint")
    .eq("company_id", company_id)
    .single();
    
  const { data: instance } = await supabase
    .from("whatsapp_instances")
    .select("uazapi_token")
    .eq("id", instance_id)
    .single();
  
  // 2. Chamar API UazapiGO
  const response = await fetch(`${config.uazapi_endpoint}/chats`, {
    headers: { "token": instance.uazapi_token }
  });
  const chats = await response.json();
  
  // 3. Upsert nas conversas
  for (const chat of chats) {
    await supabase
      .from("whatsapp_conversations")
      .upsert({
        company_id,
        instance_id,
        phone: chat.id.replace("@s.whatsapp.net", ""),
        contact_name: chat.name,
        unread_count: chat.unreadCount || 0,
        last_message_preview: chat.lastMessage?.content,
        last_message_at: new Date(chat.lastMessage?.timestamp * 1000)
      }, { onConflict: "company_id,instance_id,phone" });
  }
  
  return Response({ success: true, synced: chats.length });
});
```

### Alteracoes no WhatsAppInboxDrawer

```typescript
// Adicionar ao componente
const { syncChats, isSyncing } = useSyncWhatsAppChats(activeCompany?.company_id);

// Sincronizar ao abrir ou trocar instancia
useEffect(() => {
  if (isOpen && selectedInstanceId) {
    syncChats(selectedInstanceId);
  }
}, [isOpen, selectedInstanceId]);

// Botao de refresh no header
<Button onClick={() => syncChats(selectedInstanceId)} disabled={isSyncing}>
  <RefreshCw className={isSyncing ? "animate-spin" : ""} />
</Button>
```

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/sync-whatsapp-chats/index.ts` | Criar |
| `src/hooks/useSyncWhatsAppChats.ts` | Criar |
| `src/components/whatsapp/WhatsAppInboxDrawer.tsx` | Modificar |

## Observacao Importante

A API UazapiGO possui um endpoint `/chats` (conforme documentacao com 6 endpoints na categoria Chats). Durante a implementacao, irei verificar o formato exato da resposta e ajustar o mapeamento conforme necessario. Se a API retornar um formato diferente, adaptarei a logica de sincronizacao.
