
# Plano: Sincronizar Conversas e Configurar Webhook Automaticamente

## Problemas Identificados

### 1. Sincronizacao de Chats Falhando
Os logs mostram:
- `/chats` retornou **404** (endpoint nao existe)
- `/chat/findChats` retornou **405** (metodo nao permitido)

A API UazapiGO v2 provavelmente usa um endpoint diferente ou requer o nome da instancia na URL (como na Evolution API).

### 2. Webhook Nao Configurado
Quando a instancia foi criada (`create-uazapi-instance`), o webhook NAO foi configurado automaticamente. Isso significa que:
- Mensagens novas nao sao recebidas
- Conversas nao sao criadas automaticamente
- O sistema depende 100% da sincronizacao manual

---

## Solucao

### Etapa 1: Corrigir a Edge Function `sync-whatsapp-chats`

Atualizar para usar os endpoints corretos da UazapiGO v2:

**Endpoints a testar (em ordem de prioridade):**
1. `POST /chat/findChats` com corpo vazio (sem path param)
2. `GET /chat/findChats` (alternativa)
3. `POST /chat/findChats/{instanceName}` (padrao Evolution API)
4. `GET /instance/chats` (possivel endpoint UazapiGO)

**Alteracoes necessarias:**
- Buscar o `uazapi_instance_id` da tabela `whatsapp_instances` para usar como path param
- Adicionar logs detalhados para cada tentativa
- Testar multiplos formatos de resposta

### Etapa 2: Configurar Webhook Automaticamente na Criacao da Instancia

Modificar `create-uazapi-instance` para configurar o webhook apos criar a instancia:

```
Endpoint: POST /webhook
Header: token (token da instancia)
Body: {
  "url": "https://ejwpfztkspbvmuwwiwmk.supabase.co/functions/v1/whatsapp-webhook",
  "events": ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"]
}
```

### Etapa 3: Criar funcao para Configurar Webhook em Instancias Existentes

Uma nova edge function `configure-uazapi-webhook` que permite configurar o webhook em instancias ja criadas (como a sua atual).

---

## Detalhes Tecnicos

### Arquivo 1: `supabase/functions/sync-whatsapp-chats/index.ts`

**Correcoes:**
```typescript
// Buscar instanceName/uazapi_instance_id para usar na URL
const { data: instance } = await supabase
  .from("whatsapp_instances")
  .select("uazapi_token, uazapi_instance_id")
  .eq("id", instance_id)
  .single();

// Tentar diferentes endpoints
const endpoints = [
  { url: `${endpoint}/chat/findChats`, method: "POST" },
  { url: `${endpoint}/chat/findChats/${instance.uazapi_instance_id}`, method: "POST" },
  { url: `${endpoint}/instance/chats`, method: "GET" },
];

for (const ep of endpoints) {
  const response = await fetch(ep.url, {
    method: ep.method,
    headers: { "token": instance.uazapi_token, "Content-Type": "application/json" },
    ...(ep.method === "POST" ? { body: JSON.stringify({}) } : {}),
  });
  
  if (response.ok) {
    // Processar resposta...
    break;
  }
  console.log(`[sync] ${ep.url} retornou ${response.status}`);
}
```

### Arquivo 2: `supabase/functions/create-uazapi-instance/index.ts`

**Adicionar apos criar a instancia:**
```typescript
// Configurar webhook automaticamente
const webhookUrl = `${cleanEndpoint}/webhook`;
const supabaseFunctionsUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".supabase.co/functions/v1");
const webhookCallbackUrl = `${supabaseFunctionsUrl}/whatsapp-webhook`;

console.log("[create-uazapi-instance] Configurando webhook:", webhookCallbackUrl);

const webhookResponse = await fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "token": uazapiToken,
  },
  body: JSON.stringify({
    url: webhookCallbackUrl,
    events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
    webhook_by_events: false,
    enabled: true,
  }),
});

const webhookData = await webhookResponse.json();
console.log("[create-uazapi-instance] Webhook configurado:", webhookData);
```

### Arquivo 3: Nova edge function `supabase/functions/configure-uazapi-webhook/index.ts`

```typescript
// Permite configurar webhook em instancias existentes
// Recebe: { instance_id: string }
// Configura o webhook para a instancia especificada
```

---

## Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/sync-whatsapp-chats/index.ts` | Modificar - testar multiplos endpoints |
| `supabase/functions/create-uazapi-instance/index.ts` | Modificar - adicionar config de webhook |
| `supabase/functions/configure-uazapi-webhook/index.ts` | Criar - config webhook para instancias existentes |
| `supabase/config.toml` | Modificar - adicionar nova funcao |

---

## Ordem de Execucao

1. **Primeiro**: Criar `configure-uazapi-webhook` para configurar o webhook na sua instancia existente
2. **Segundo**: Atualizar `sync-whatsapp-chats` para testar multiplos endpoints
3. **Terceiro**: Atualizar `create-uazapi-instance` para futuras instancias terem webhook configurado automaticamente

---

## Teste Apos Implementacao

Apos aprovar o plano:
1. Chamar `configure-uazapi-webhook` para sua instancia existente
2. Testar `sync-whatsapp-chats` novamente
3. Verificar os logs para ver qual endpoint funcionou
4. Se nenhum endpoint funcionar, investigar a documentacao especifica do seu servidor UazapiGO

