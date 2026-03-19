# Enquete WhatsApp (UAZAPI) — Plano de Implementação

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir envio de enquetes (polls) via WhatsApp com visualização de votos em tempo real, usando UAZAPI.

**Architecture:** Nova Edge Function para envio, webhook handler para votos, UI de criação e visualização. Dados de voto em JSONB na mensagem existente.

**Tech Stack:** React + TypeScript, Supabase (PostgreSQL, Edge Functions Deno), UAZAPI API, Tailwind + shadcn/ui

---

## Task 1: Migration — Adicionar suporte a poll no schema

**Files:**

- Create: `supabase/migrations/YYYYMMDDHHMMSS_add_whatsapp_poll_support.sql`

- [ ] **Step 1: Criar migration**

```sql
-- Remover CHECK constraint antigo e recriar com 'poll'
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_message_type_check;
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'sticker', 'gif', 'poll'));

-- Adicionar coluna para votos da enquete
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS poll_votes JSONB DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.whatsapp_messages.poll_votes IS 'Votos da enquete: { "opção": ["phone1", "phone2"] }';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add poll message type and poll_votes column (#222)"
```

---

## Task 2: Edge Function — send-whatsapp-poll

**Files:**

- Create: `supabase/functions/send-whatsapp-poll/index.ts`
- Modify: `supabase/config.toml` (adicionar entry)

- [ ] **Step 1: Criar Edge Function**

Seguir o padrão de `send-whatsapp-notification`:

- CORS headers padrão
- Receber: `{ company_id, recipient_phone, question, options, allow_multiple, instance_id }`
- Buscar config UAZAPI: `whatsapp_configs` por company_id onde provider = 'uazapi'
- Buscar instance token: `whatsapp_instances` por instance_id ou primeiro ativo
- Formatar telefone (limpar, prefixo 55)
- Chamar UAZAPI:

```typescript
const uazapiUrl = `${cleanEndpoint}/message/sendPoll`;

const apiResponse = await fetch(uazapiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    token: instanceToken,
  },
  body: JSON.stringify({
    number: formattedPhone,
    name: question,
    values: options,
    selectableCount: allow_multiple ? 0 : 1,
  }),
});
```

- Retornar `{ success: true, message_id }` ou erro

- [ ] **Step 2: Adicionar ao config.toml**

```toml
[functions.send-whatsapp-poll]
verify_jwt = true
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/send-whatsapp-poll/ supabase/config.toml
git commit -m "feat: add send-whatsapp-poll Edge Function (#222)"
```

---

## Task 3: Webhook — Captura de votos de poll

**Files:**

- Modify: `supabase/functions/whatsapp-webhook/index.ts`

- [ ] **Step 1: Adicionar handler para pollVoteMessage**

No webhook handler, após a detecção de UAZAPI, adicionar tratamento para votos de poll. Procurar onde os tipos de mensagem são roteados e adicionar:

```typescript
// Detectar se é um voto de enquete
if (
  payload.EventType === "pollVoteMessage" ||
  message.type === "pollVoteMessage"
) {
  const pollMessageId = message.pollMessageId || message.key?.id;
  const voterPhone = message.voter || message.sender_pn || "";
  const selectedOptions =
    message.selectedOptions || message.vote?.selectedOptions || [];

  if (pollMessageId && voterPhone && selectedOptions.length > 0) {
    // Buscar mensagem da enquete pelo external_id
    const { data: pollMessage } = await supabase
      .from("whatsapp_messages")
      .select("id, poll_votes")
      .eq("external_id", pollMessageId)
      .maybeSingle();

    if (pollMessage) {
      const currentVotes = pollMessage.poll_votes || {};

      // Remover votos anteriores deste votante
      for (const option of Object.keys(currentVotes)) {
        currentVotes[option] = (currentVotes[option] || []).filter(
          (phone: string) => phone !== voterPhone,
        );
      }

      // Adicionar novos votos
      for (const option of selectedOptions) {
        if (!currentVotes[option]) currentVotes[option] = [];
        currentVotes[option].push(voterPhone);
      }

      await supabase
        .from("whatsapp_messages")
        .update({ poll_votes: currentVotes })
        .eq("id", pollMessage.id);
    }
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/whatsapp-webhook/
git commit -m "feat: handle poll vote events in WhatsApp webhook (#222)"
```

---

## Task 4: Hook — sendPoll() em useWhatsAppMessages

**Files:**

- Modify: `src/hooks/useWhatsAppMessages.tsx`

- [ ] **Step 1: Adicionar função sendPoll**

Após `sendMedia()`, adicionar `sendPoll()` seguindo o mesmo padrão otimista:

```typescript
const sendPoll = useCallback(
  async (
    question: string,
    options: string[],
    allowMultiple: boolean = false,
  ) => {
    if (!conversationId || !companyId || !phone) return;

    const pollData = { question, options, allow_multiple: allowMultiple };

    // 1. Criar mensagem otimista no DB
    const { data: newMessage } = await supabase
      .from("whatsapp_messages")
      .insert({
        conversation_id: conversationId,
        company_id: companyId,
        direction: "outgoing",
        content: JSON.stringify(pollData),
        message_type: "poll",
        status: "sending",
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!newMessage) return;

    // 2. Atualizar cache otimista
    queryClient.setQueryData(
      ["whatsapp-messages", conversationId],
      (old: any) => [...(old || []), newMessage],
    );

    // 3. Chamar Edge Function
    try {
      const data = await invokeWithRetry(supabase, "send-whatsapp-poll", {
        body: {
          company_id: companyId,
          recipient_phone: phone,
          question,
          options,
          allow_multiple: allowMultiple,
          instance_id: instanceId,
        },
      });

      // 4. Atualizar status e external_id
      await supabase
        .from("whatsapp_messages")
        .update({
          status: "sent",
          external_id: data?.message_id || null,
        })
        .eq("id", newMessage.id);
    } catch (error) {
      await supabase
        .from("whatsapp_messages")
        .update({ status: "failed" })
        .eq("id", newMessage.id);

      toast.error("Erro ao enviar enquete", {
        description: getEdgeFunctionErrorMessage(error),
      });
    }
  },
  [conversationId, companyId, phone, instanceId, queryClient],
);
```

- [ ] **Step 2: Retornar sendPoll no hook**

Adicionar `sendPoll` ao objeto retornado pelo hook.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWhatsAppMessages.tsx
git commit -m "feat: add sendPoll to useWhatsAppMessages hook (#222)"
```

---

## Task 5: UI — WhatsAppPollDialog (novo componente)

**Files:**

- Create: `src/components/whatsapp/WhatsAppPollDialog.tsx`

- [ ] **Step 1: Criar componente de criação de enquete**

```typescript
interface WhatsAppPollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (question: string, options: string[], allowMultiple: boolean) => void;
  isSending: boolean;
}
```

Modal com:

- Dialog do shadcn/ui
- Input para pergunta (obrigatório)
- Lista de opções com inputs dinâmicos (min 2, max 12)
- Botão "+" para adicionar opção
- Botão "X" para remover opção (desabilitado se <= 2)
- Switch/Toggle "Permitir múltiplas respostas"
- Botão "Enviar Enquete" (desabilitado se pergunta vazia ou < 2 opções preenchidas)
- Textos em PT-BR

- [ ] **Step 2: Commit**

```bash
git add src/components/whatsapp/WhatsAppPollDialog.tsx
git commit -m "feat: add WhatsAppPollDialog component (#222)"
```

---

## Task 6: UI — Integrar botão de enquete no MessageInput

**Files:**

- Modify: `src/components/whatsapp/WhatsAppMessageInput.tsx`

- [ ] **Step 1: Adicionar estado e import**

```typescript
import { WhatsAppPollDialog } from "./WhatsAppPollDialog";
// Adicionar prop:
onSendPoll?: (question: string, options: string[], allowMultiple: boolean) => void;
// Adicionar estado:
const [pollDialogOpen, setPollDialogOpen] = useState(false);
```

- [ ] **Step 2: Adicionar item "Enquete" no dropdown de anexos**

No dropdown de mídia (perto de Image, Video, Document, Audio), adicionar:

```tsx
<DropdownMenuItem onClick={() => setPollDialogOpen(true)}>
  <BarChart3 className="h-4 w-4 mr-2" />
  Enquete
</DropdownMenuItem>
```

- [ ] **Step 3: Renderizar o dialog**

```tsx
<WhatsAppPollDialog
  open={pollDialogOpen}
  onOpenChange={setPollDialogOpen}
  onSend={(question, options, allowMultiple) => {
    onSendPoll?.(question, options, allowMultiple);
    setPollDialogOpen(false);
  }}
  isSending={isSending}
/>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/whatsapp/WhatsAppMessageInput.tsx
git commit -m "feat: add poll button to WhatsApp message input (#222)"
```

---

## Task 7: UI — Renderizar enquete no MessageBubble

**Files:**

- Modify: `src/components/whatsapp/WhatsAppMessageBubble.tsx`

- [ ] **Step 1: Adicionar renderização de poll**

Na seção de conteúdo do bubble, antes do texto normal, adicionar handler para `message_type === "poll"`:

```tsx
{
  message.message_type === "poll" &&
    (() => {
      let pollData;
      try {
        pollData = JSON.parse(message.content);
      } catch {
        pollData = { question: message.content, options: [] };
      }

      const votes = message.poll_votes || {};
      const totalVotes = Object.values(votes).reduce(
        (sum: number, voters: string[]) => sum + (voters?.length || 0),
        0,
      );

      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-medium text-sm">
            <BarChart3 className="h-4 w-4 shrink-0" />
            {pollData.question}
          </div>
          <div className="space-y-1.5">
            {(pollData.options || []).map((option: string, idx: number) => {
              const optionVotes = (votes[option] || []).length;
              const percentage =
                totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span>{option}</span>
                    <span className="opacity-70">{optionVotes}</span>
                  </div>
                  <div
                    className={cn(
                      "h-1.5 rounded-full",
                      isOutgoing
                        ? "bg-primary-foreground/20"
                        : "bg-muted-foreground/20",
                    )}
                  >
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        isOutgoing
                          ? "bg-primary-foreground/60"
                          : "bg-primary/60",
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          {totalVotes > 0 && (
            <p className={cn("text-xs opacity-60")}>
              {totalVotes} voto{totalVotes !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      );
    })();
}
```

- [ ] **Step 2: Adicionar 'poll' ao isMediaType check para não renderizar como texto**

Na lista de media types, adicionar poll ou criar exclusão:

```typescript
// Garantir que poll não é tratado como texto normal
if (message.message_type === "poll") {
  // Já renderizado acima, não mostrar <p> de texto
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/whatsapp/WhatsAppMessageBubble.tsx
git commit -m "feat: render poll bubble with vote progress bars (#222)"
```

---

## Task 8: Integrar sendPoll no WhatsAppChatWindow

**Files:**

- Modify: `src/components/whatsapp/WhatsAppChatWindow.tsx`

- [ ] **Step 1: Passar sendPoll do hook para o MessageInput**

Onde o `WhatsAppMessageInput` é renderizado, adicionar:

```tsx
<WhatsAppMessageInput
  // ... props existentes
  onSendPoll={(question, options, allowMultiple) => {
    sendPoll(question, options, allowMultiple);
  }}
/>
```

- [ ] **Step 2: Garantir que sendPoll é desestruturado do hook**

```typescript
const { messages, sendMessage, sendMedia, sendPoll, ... } = useWhatsAppMessages(...);
```

- [ ] **Step 3: Commit**

```bash
git add src/components/whatsapp/WhatsAppChatWindow.tsx
git commit -m "feat: wire sendPoll through WhatsAppChatWindow (#222)"
```

---

## Task 9: Realtime — Atualização de votos ao vivo

**Files:**

- Modify: `src/hooks/useWhatsAppMessages.tsx` (ou onde o Realtime subscription existe)

- [ ] **Step 1: Verificar se Realtime já atualiza mensagens por UPDATE**

O Supabase Realtime deve já estar ouvindo `whatsapp_messages` para mudanças. Verificar se UPDATEs no campo `poll_votes` propagam automaticamente para o cache do React Query.

- [ ] **Step 2: Se necessário, adicionar handler para UPDATE de poll_votes**

```typescript
// No subscription existente, garantir que UPDATE events atualizam o cache
channel.on(
  "postgres_changes",
  {
    event: "UPDATE",
    schema: "public",
    table: "whatsapp_messages",
    filter: `conversation_id=eq.${conversationId}`,
  },
  (payload) => {
    queryClient.setQueryData(
      ["whatsapp-messages", conversationId],
      (old: any[]) =>
        old?.map((msg) =>
          msg.id === payload.new.id ? { ...msg, ...payload.new } : msg,
        ),
    );
  },
);
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWhatsAppMessages.tsx
git commit -m "feat: realtime poll vote updates via Supabase Realtime (#222)"
```

---

## Task 10: Build + Verificação final

- [ ] **Step 1: Rodar build**

```bash
npm run build
```

- [ ] **Step 2: Verificar que não há erros de tipo**

- [ ] **Step 3: Commit final se necessário**

- [ ] **Step 4: Push e fechar issue**

```bash
git push
gh issue close 222 --comment "Implementado: envio de enquetes WhatsApp via UAZAPI com visualização de votos em tempo real."
```

---

## Ordem de Execução

```
Task 1  → Migration (schema)
Task 2  → Edge Function send-whatsapp-poll
Task 3  → Webhook handler para votos
Task 4  → Hook sendPoll()
Task 5  → UI WhatsAppPollDialog
Task 6  → UI botão no MessageInput
Task 7  → UI renderização no MessageBubble
Task 8  → Integração no ChatWindow
Task 9  → Realtime votos
Task 10 → Build + push
```

Tasks 1-3 (backend) são sequenciais. Tasks 4-9 (frontend) dependem da migration mas podem ser paralelizadas em pares.
