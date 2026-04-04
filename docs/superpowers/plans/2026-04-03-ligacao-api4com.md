# Ligação via API4Com — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que usuários iniciem ligações telefônicas diretamente do chat WhatsApp usando a API4Com, com registro automático do histórico de chamadas.

**Architecture:** Fase 1 configura credenciais API4Com por empresa em `whatsapp_configs`. Fase 2 adiciona botão de ligação no header do chat que chama edge function `initiate-voice-call`. Fase 3 recebe o webhook `channel-hangup` da API4Com e salva o histórico de chamadas. A tabela `voice_calls` centraliza o histórico, isolada por `company_id`.

**Tech Stack:** React 18 + TypeScript, Supabase Edge Functions (Deno), API4Com REST API, shadcn/ui, Sonner toasts, date-fns.

---

## Contexto do Projeto

- **company_id**: SEMPRE `activeCompany.company_id`, nunca `activeCompany.id`
- **Edge Function boilerplate**: sempre incluir `corsHeaders` + handler `OPTIONS`
- **Autenticação API4Com**: header `Authorization: <token>` (sem "Bearer")
- **Iniciar chamada**: `POST https://api.api4com.com/api/v1/dialer` com `{ extension, phone, metadata }`
- **Webhook**: evento `channel-hangup` com campos `startedAt`, `answeredAt`, `endedAt`, `duration`, `hangupCause`, `recordUrl`, `metadata`
- **Phone number**: disponível em `whatsapp_conversations.phone`
- **WhatsApp settings**: `src/components/whatsapp/WhatsAppSettings.tsx` usa `WhatsAppProviderTabs.tsx` com 3 abas (Z-API, UazapiGO, Meta)
- **whatsapp_configs**: tabela com `UNIQUE(company_id)` — usa upsert para salvar

---

## File Structure

| Arquivo                                                                  | Ação      | Responsabilidade                                                      |
| ------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------- |
| `supabase/migrations/20260403130000_add_api4com_to_whatsapp_configs.sql` | Criar     | Colunas API4Com em `whatsapp_configs` + tabela `voice_calls` + RLS    |
| `supabase/functions/initiate-voice-call/index.ts`                        | Criar     | Proxy para `POST /dialer` da API4Com                                  |
| `supabase/functions/api4com-webhook/index.ts`                            | Criar     | Receber `channel-hangup` e salvar em `voice_calls`                    |
| `supabase/config.toml`                                                   | Modificar | Registrar as 2 novas edge functions (`verify_jwt = false` no webhook) |
| `src/hooks/useVoiceCalls.tsx`                                            | Criar     | Hook para iniciar chamada e buscar histórico                          |
| `src/components/whatsapp/WhatsAppCallButton.tsx`                         | Criar     | Botão de ligação com modal de confirmação + histórico                 |
| `src/components/whatsapp/WhatsAppChatWindow.tsx`                         | Modificar | Inserir `WhatsAppCallButton` no header do chat                        |
| `src/components/whatsapp/WhatsAppApi4ComSettings.tsx`                    | Criar     | Formulário de configuração API4Com (token + extension)                |
| `src/components/whatsapp/WhatsAppSettings.tsx`                           | Modificar | Adicionar seção de configuração API4Com abaixo das abas de provider   |

---

## Fase 1 — Banco de dados

### Task 1: Migration — colunas API4Com + tabela voice_calls

**Files:**

- Create: `supabase/migrations/20260403130000_add_api4com_to_whatsapp_configs.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Adicionar credenciais API4Com na tabela whatsapp_configs existente
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS api4com_token TEXT,
  ADD COLUMN IF NOT EXISTS api4com_extension TEXT;

COMMENT ON COLUMN public.whatsapp_configs.api4com_token IS 'Token de autenticação da API4Com (POST /users/login → id)';
COMMENT ON COLUMN public.whatsapp_configs.api4com_extension IS 'Ramal do agente para chamadas saintes (ex: 1000)';

-- Tabela de histórico de chamadas
CREATE TABLE IF NOT EXISTS public.voice_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  contact_name TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  status TEXT NOT NULL DEFAULT 'initiated',
  api4com_call_id TEXT,
  started_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  hangup_cause TEXT,
  record_url TEXT,
  metadata JSONB DEFAULT '{}',
  initiated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_calls_company ON public.voice_calls(company_id);
CREATE INDEX idx_voice_calls_conversation ON public.voice_calls(conversation_id);
CREATE INDEX idx_voice_calls_created ON public.voice_calls(created_at DESC);

ALTER TABLE public.voice_calls ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.voice_calls TO authenticated;

CREATE POLICY "Company members can view voice calls"
ON public.voice_calls FOR SELECT
TO authenticated
USING (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Company members can insert voice calls"
ON public.voice_calls FOR INSERT
TO authenticated
WITH CHECK (company_id IN (
  SELECT company_id FROM public.company_members WHERE user_id = auth.uid()
));

CREATE POLICY "Service role can manage voice calls"
ON public.voice_calls FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

- [ ] **Step 2: Executar a migration no SQL Editor do Supabase Dashboard**

Cole o SQL acima no SQL Editor e execute. Deve retornar sem erros.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260403130000_add_api4com_to_whatsapp_configs.sql
git commit -m "feat: migration — colunas api4com em whatsapp_configs + tabela voice_calls"
```

---

## Fase 2 — Edge Functions

### Task 2: Edge Function — initiate-voice-call

**Files:**

- Create: `supabase/functions/initiate-voice-call/index.ts`
- Modify: `supabase/config.toml`

- [ ] **Step 1: Criar a edge function**

```typescript
// supabase/functions/initiate-voice-call/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { companyId, conversationId, phone, contactName } = await req.json();

    if (!companyId || !phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "companyId e phone são obrigatórios",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Buscar credenciais API4Com da empresa
    const { data: config, error: configError } = await supabase
      .from("whatsapp_configs")
      .select("api4com_token, api4com_extension")
      .eq("company_id", companyId)
      .maybeSingle();

    if (configError) throw configError;

    if (!config?.api4com_token || !config?.api4com_extension) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "API4Com não configurada. Acesse Configurações > WhatsApp para configurar.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Criar registro de chamada no banco antes de iniciar
    const { data: callRecord, error: insertError } = await supabase
      .from("voice_calls")
      .insert({
        company_id: companyId,
        conversation_id: conversationId || null,
        phone,
        contact_name: contactName || null,
        direction: "outbound",
        status: "initiated",
        metadata: { conversation_id: conversationId },
      })
      .select("id")
      .single();

    if (insertError) throw insertError;

    // Chamar API4Com
    const api4comResponse = await fetch(
      "https://api.api4com.com/api/v1/dialer",
      {
        method: "POST",
        headers: {
          Authorization: config.api4com_token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          extension: config.api4com_extension,
          phone,
          metadata: {
            voice_call_id: callRecord.id,
            company_id: companyId,
            conversation_id: conversationId || null,
          },
        }),
      },
    );

    if (!api4comResponse.ok) {
      const errorText = await api4comResponse.text();
      // Atualizar status para falha
      await supabase
        .from("voice_calls")
        .update({ status: "failed" })
        .eq("id", callRecord.id);
      throw new Error(
        `API4Com error (${api4comResponse.status}): ${errorText}`,
      );
    }

    const api4comData = await api4comResponse.json();

    // Atualizar com o ID retornado pela API4Com
    await supabase
      .from("voice_calls")
      .update({
        api4com_call_id: api4comData.id || null,
        status: "ringing",
      })
      .eq("id", callRecord.id);

    console.log(
      `[initiate-voice-call] Chamada iniciada: ${callRecord.id} → ${phone}`,
    );

    return new Response(
      JSON.stringify({ success: true, callId: callRecord.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[initiate-voice-call] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

- [ ] **Step 2: Registrar no config.toml**

Adicionar ao final do arquivo `supabase/config.toml`:

```toml
[functions.initiate-voice-call]
verify_jwt = true

[functions.api4com-webhook]
verify_jwt = false
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/initiate-voice-call/index.ts supabase/config.toml
git commit -m "feat: edge function initiate-voice-call — proxy para API4Com dialer"
```

---

### Task 3: Edge Function — api4com-webhook

**Files:**

- Create: `supabase/functions/api4com-webhook/index.ts`

- [ ] **Step 1: Criar a edge function**

```typescript
// supabase/functions/api4com-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    console.log("[api4com-webhook] Payload recebido:", JSON.stringify(payload));

    // Só processa channel-hangup por enquanto
    if (payload.eventType !== "channel-hangup") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Recuperar voice_call_id do metadata enviado no dialer
    const voiceCallId = payload.metadata?.voice_call_id as string | undefined;
    const companyId = payload.metadata?.company_id as string | undefined;

    if (!voiceCallId) {
      console.warn("[api4com-webhook] Nenhum voice_call_id no metadata");
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determinar status final baseado no hangupCause
    const hangupCause = payload.hangupCause || "";
    let status = "completed";
    if (hangupCause === "USER_BUSY") status = "busy";
    else if (hangupCause === "UNALLOCATED_NUMBER") status = "failed";
    else if (hangupCause === "ORIGINATOR_CANCEL") status = "cancelled";
    else if (hangupCause === "NO_ANSWER" || hangupCause === "ALLOTTED_TIMEOUT")
      status = "no_answer";

    const { error: updateError } = await supabase
      .from("voice_calls")
      .update({
        status,
        started_at: payload.startedAt
          ? new Date(payload.startedAt).toISOString()
          : null,
        answered_at: payload.answeredAt
          ? new Date(payload.answeredAt).toISOString()
          : null,
        ended_at: payload.endedAt
          ? new Date(payload.endedAt).toISOString()
          : null,
        duration_seconds: payload.duration || null,
        hangup_cause: hangupCause,
        record_url: payload.recordUrl || null,
      })
      .eq("id", voiceCallId);

    if (updateError) {
      console.error(
        "[api4com-webhook] Erro ao atualizar voice_call:",
        updateError,
      );
    } else {
      console.log(
        `[api4com-webhook] voice_call ${voiceCallId} atualizado: ${status} (${payload.duration}s)`,
      );
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[api4com-webhook] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/api4com-webhook/index.ts
git commit -m "feat: edge function api4com-webhook — recebe channel-hangup e atualiza voice_calls"
```

- [ ] **Step 3: Deploy das duas edge functions**

```bash
supabase functions deploy initiate-voice-call
supabase functions deploy api4com-webhook
```

---

## Fase 3 — Frontend

### Task 4: Hook useVoiceCalls

**Files:**

- Create: `src/hooks/useVoiceCalls.tsx`

- [ ] **Step 1: Criar o hook**

```typescript
// src/hooks/useVoiceCalls.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VoiceCall {
  id: string;
  company_id: string;
  conversation_id: string | null;
  phone: string;
  contact_name: string | null;
  direction: string;
  status: string;
  api4com_call_id: string | null;
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
  hangup_cause: string | null;
  record_url: string | null;
  created_at: string;
}

interface InitiateCallParams {
  companyId: string;
  conversationId: string;
  phone: string;
  contactName?: string;
}

export function useVoiceCalls(
  companyId: string | undefined,
  conversationId?: string,
) {
  const queryClient = useQueryClient();

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["voice-calls", companyId, conversationId],
    queryFn: async () => {
      let query = supabase
        .from("voice_calls")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);

      if (conversationId) {
        query = query.eq("conversation_id", conversationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as VoiceCall[];
    },
    enabled: !!companyId,
  });

  const { mutate: initiateCall, isPending: isInitiating } = useMutation({
    mutationFn: async (params: InitiateCallParams) => {
      const { data, error } = await supabase.functions.invoke(
        "initiate-voice-call",
        {
          body: {
            companyId: params.companyId,
            conversationId: params.conversationId,
            phone: params.phone,
            contactName: params.contactName,
          },
        },
      );
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Erro ao iniciar chamada");
      return data;
    },
    onSuccess: () => {
      toast.success("Ligação iniciada!", {
        description: "Atenda o telefone para ser conectado ao contato.",
      });
      queryClient.invalidateQueries({ queryKey: ["voice-calls", companyId] });
    },
    onError: (error: Error) => {
      if (error.message.includes("API4Com não configurada")) {
        toast.error("API4Com não configurada", {
          description: error.message,
          action: {
            label: "Configurar",
            onClick: () => {
              window.location.href = "/configuracoes/whatsapp";
            },
          },
          duration: 8000,
        });
      } else {
        toast.error("Erro ao iniciar ligação", { description: error.message });
      }
    },
  });

  return { calls, isLoading, initiateCall, isInitiating };
}

export function useApi4ComConfig(companyId: string | undefined) {
  return useQuery({
    queryKey: ["api4com-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_configs")
        .select("api4com_token, api4com_extension")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return {
        hasConfig: !!(data?.api4com_token && data?.api4com_extension),
        token: data?.api4com_token || "",
        extension: data?.api4com_extension || "",
      };
    },
    enabled: !!companyId,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useVoiceCalls.tsx
git commit -m "feat: hook useVoiceCalls — iniciar chamada e buscar histórico"
```

---

### Task 5: Componente WhatsAppCallButton

**Files:**

- Create: `src/components/whatsapp/WhatsAppCallButton.tsx`

- [ ] **Step 1: Criar o componente**

```typescript
// src/components/whatsapp/WhatsAppCallButton.tsx
import { useState } from "react";
import { Phone, PhoneCall, PhoneOff, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVoiceCalls, VoiceCall } from "@/hooks/useVoiceCalls";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppCallButtonProps {
  companyId: string;
  conversationId: string;
  phone: string;
  contactName?: string;
  hasApi4ComConfig: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Phone }> = {
  initiated: { label: "Iniciando...", color: "text-yellow-500", icon: PhoneCall },
  ringing: { label: "Chamando...", color: "text-blue-500", icon: PhoneCall },
  completed: { label: "Concluída", color: "text-green-500", icon: Phone },
  busy: { label: "Ocupado", color: "text-red-500", icon: PhoneOff },
  failed: { label: "Falhou", color: "text-red-500", icon: PhoneOff },
  cancelled: { label: "Cancelada", color: "text-muted-foreground", icon: PhoneOff },
  no_answer: { label: "Sem resposta", color: "text-orange-500", icon: PhoneOff },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function CallHistoryItem({ call }: { call: VoiceCall }) {
  const config = STATUS_CONFIG[call.status] || STATUS_CONFIG.failed;
  const Icon = config.icon;
  const date = parseISO(call.created_at);

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className={cn("mt-0.5 shrink-0", config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {format(date, "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {call.duration_seconds !== null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration_seconds)}
            </span>
          )}
          {call.record_url && (
            <a
              href={call.record_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Mic className="h-3 w-3" />
              Gravação
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsAppCallButton({
  companyId,
  conversationId,
  phone,
  contactName,
  hasApi4ComConfig,
}: WhatsAppCallButtonProps) {
  const [open, setOpen] = useState(false);
  const { calls, isLoading, initiateCall, isInitiating } = useVoiceCalls(
    companyId,
    conversationId,
  );

  const handleCall = () => {
    initiateCall({ companyId, conversationId, phone, contactName });
    setOpen(false);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Ligar para contato"
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setOpen(true)}
          >
            <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ligar</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Ligar para {contactName || phone}
            </DialogTitle>
            <DialogDescription>
              {hasApi4ComConfig
                ? `Iniciar ligação para ${phone} via API4Com.`
                : "Configure a API4Com em Configurações > WhatsApp antes de ligar."}
            </DialogDescription>
          </DialogHeader>

          {/* Histórico de chamadas */}
          {calls.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Histórico de chamadas
              </p>
              <ScrollArea className="h-[160px] rounded border p-2">
                {calls.map((call) => (
                  <CallHistoryItem key={call.id} call={call} />
                ))}
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCall}
              disabled={!hasApi4ComConfig || isInitiating}
              className="gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              {isInitiating ? "Iniciando..." : "Ligar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/whatsapp/WhatsAppCallButton.tsx
git commit -m "feat: componente WhatsAppCallButton com modal de confirmação e histórico"
```

---

### Task 6: Integrar botão no WhatsAppChatWindow

**Files:**

- Modify: `src/components/whatsapp/WhatsAppChatWindow.tsx`

- [ ] **Step 1: Ler o arquivo para identificar os imports e o header**

Abrir `src/components/whatsapp/WhatsAppChatWindow.tsx` e localizar:

1. Bloco de imports no topo (linha ~1-50)
2. A linha onde aparece `<WhatsAppAssignmentPicker` (por volta da linha 675)
3. A linha onde aparece `isGroup` (a variável que detecta grupos)

- [ ] **Step 2: Adicionar import do WhatsAppCallButton e useApi4ComConfig**

No topo do arquivo, adicionar após os imports existentes de componentes whatsapp:

```typescript
import { WhatsAppCallButton } from "./WhatsAppCallButton";
import { useApi4ComConfig } from "@/hooks/useVoiceCalls";
```

- [ ] **Step 3: Adicionar hook useApi4ComConfig**

Localizar onde outros hooks são chamados no corpo do componente (procurar por `useCompany`, `useAuth`, etc.) e adicionar:

```typescript
const { data: api4ComConfig } = useApi4ComConfig(companyId);
```

- [ ] **Step 4: Inserir o botão no header do chat**

Localizar o bloco do `<WhatsAppAssignmentPicker` e inserir o `<WhatsAppCallButton>` logo antes dele, com a condição de só mostrar para conversas individuais (não grupos):

```typescript
{/* Call button — só para contatos individuais */}
{!isGroup && (
  <WhatsAppCallButton
    companyId={companyId}
    conversationId={conversation.id}
    phone={conversation.phone}
    contactName={conversation.contact_name || undefined}
    hasApi4ComConfig={api4ComConfig?.hasConfig ?? false}
  />
)}

{/* Assignment picker */}
<WhatsAppAssignmentPicker
  ...
/>
```

- [ ] **Step 5: Verificar que não há erros de TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/components/whatsapp/WhatsAppChatWindow.tsx
git commit -m "feat: adicionar botão de ligação no header do chat WhatsApp"
```

---

### Task 7: Configuração API4Com nas Settings

**Files:**

- Create: `src/components/whatsapp/WhatsAppApi4ComSettings.tsx`
- Modify: `src/components/whatsapp/WhatsAppSettings.tsx`

- [ ] **Step 1: Criar o componente de configuração**

```typescript
// src/components/whatsapp/WhatsAppApi4ComSettings.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Phone, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useApi4ComConfig } from "@/hooks/useVoiceCalls";

interface WhatsAppApi4ComSettingsProps {
  companyId: string;
}

export function WhatsAppApi4ComSettings({ companyId }: WhatsAppApi4ComSettingsProps) {
  const queryClient = useQueryClient();
  const { data: config } = useApi4ComConfig(companyId);
  const [token, setToken] = useState(config?.token || "");
  const [extension, setExtension] = useState(config?.extension || "");
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when config loads
  if (config && !token && config.token) setToken(config.token);
  if (config && !extension && config.extension) setExtension(config.extension);

  const handleSave = async () => {
    if (!token.trim() || !extension.trim()) {
      toast.error("Preencha o token e o ramal");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("whatsapp_configs")
        .upsert(
          { company_id: companyId, api4com_token: token.trim(), api4com_extension: extension.trim() },
          { onConflict: "company_id" },
        );
      if (error) throw error;
      toast.success("Configuração API4Com salva!");
      queryClient.invalidateQueries({ queryKey: ["api4com-config", companyId] });
    } catch (err) {
      toast.error("Erro ao salvar", { description: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4" />
          Ligações — API4Com
          {config?.hasConfig && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </CardTitle>
        <CardDescription>
          Configure as credenciais API4Com para habilitar ligações diretamente do chat WhatsApp.
          Obtenha o token em{" "}
          <a
            href="https://developers.api4com.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            developers.api4com.com
          </a>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api4com-token">Token de autenticação</Label>
          <div className="relative">
            <Input
              id="api4com-token"
              type={showToken ? "text" : "password"}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Cole o token obtido no login da API4Com"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowToken((v) => !v)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api4com-extension">Ramal do agente</Label>
          <Input
            id="api4com-extension"
            type="text"
            value={extension}
            onChange={(e) => setExtension(e.target.value)}
            placeholder="Ex: 1000"
          />
          <p className="text-xs text-muted-foreground">
            Número do ramal configurado na API4Com (aparece como chamador nas ligações).
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? "Salvando..." : "Salvar configuração"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Adicionar o componente em WhatsAppSettings.tsx**

Localizar o final do return em `src/components/whatsapp/WhatsAppSettings.tsx` e adicionar o componente de configuração API4Com logo abaixo das abas de provider existentes:

```typescript
import { WhatsAppApi4ComSettings } from "./WhatsAppApi4ComSettings";

// ... dentro do return, após o bloco </WhatsAppProviderTabs> ou o bloco da seção de instâncias:
{companyId && (
  <WhatsAppApi4ComSettings companyId={companyId} />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/whatsapp/WhatsAppApi4ComSettings.tsx src/components/whatsapp/WhatsAppSettings.tsx
git commit -m "feat: configuração API4Com em Configurações > WhatsApp"
```

- [ ] **Step 4: Push e fechar a issue**

```bash
git push origin main
gh issue close 301 --repo bittencourtthulio/controledetrafego --comment "Implementado: ligações via API4Com diretamente do chat WhatsApp. Fases: config em settings, botão no header do chat, histórico de chamadas, webhook para registrar resultado (duração, gravação, status)."
```

---

## Self-Review

**1. Spec coverage:**

- ✅ Ligação iniciada a partir do chat WhatsApp
- ✅ Histórico de chamadas por conversa
- ✅ Gravação acessível quando disponível
- ✅ Configuração de credenciais (token + ramal)
- ✅ Feedback ao usuário (toast de sucesso/erro)
- ✅ Não aparece para grupos

**2. Placeholder scan:** Nenhum encontrado — todos os passos têm código completo.

**3. Type consistency:**

- `VoiceCall` definido em `useVoiceCalls.tsx` e usado em `WhatsAppCallButton.tsx` ✅
- `useApi4ComConfig` exportado de `useVoiceCalls.tsx` e importado em `WhatsAppChatWindow.tsx` e `WhatsAppApi4ComSettings.tsx` ✅
- `hasApi4ComConfig: boolean` passado corretamente para `WhatsAppCallButton` ✅
