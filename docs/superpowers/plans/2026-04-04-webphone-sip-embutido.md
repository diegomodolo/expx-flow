# Webphone SIP Embutido (API4Com) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embutir o Webphone SIP da API4Com diretamente no sistema usando a biblioteca `libwebphone.js`, eliminando a dependência da extensão/app externo — o agente faz e recebe chamadas sem sair do Expx Flow.

**Architecture:** A biblioteca `libwebphone.js` (Kazoo Webphone) é carregada via CDN/arquivo local e inicializada com as credenciais SIP do ramal do agente (domain, extension, password). Um componente React gerencia o ciclo de vida da instância (singleton), escuta eventos de chamada e exibe controles de áudio. O dialer da API4Com continua sendo disparado via Edge Function — o webphone embutido apenas registra o ramal SIP para receber a chamada que o dialer inicia. Credenciais SIP adicionais (`api4com_domain` e `api4com_password`) são salvas em `whatsapp_configs` e exibidas nas configurações.

**Tech Stack:** React 18 + TypeScript, libwebphone.js v2 (Kazoo), SIP/WebSocket (WSS porta 6443), Supabase (whatsapp_configs), shadcn/ui

---

## Estrutura de Arquivos

| Arquivo                                                                          | Ação      | Responsabilidade                                                                           |
| -------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------ |
| `supabase/migrations/20260404120000_add_sip_credentials_to_whatsapp_configs.sql` | Criar     | Adiciona `api4com_domain` e `api4com_password` à tabela `whatsapp_configs`                 |
| `public/libwebphone.js`                                                          | Criar     | Biblioteca libwebphone.js baixada da API4Com (arquivo estático)                            |
| `src/hooks/useWebphone.tsx`                                                      | Criar     | Hook React que inicializa e gerencia instância singleton do webphone SIP                   |
| `src/components/whatsapp/WhatsAppWebphone.tsx`                                   | Criar     | Componente de softphone embutido: status SIP, controles de chamada (atender/desligar/mudo) |
| `src/components/whatsapp/WhatsAppApi4ComSettings.tsx`                            | Modificar | Adicionar campos `domain` e `password` do ramal SIP                                        |
| `src/hooks/useVoiceCalls.tsx`                                                    | Modificar | `useApi4ComConfig` passa a retornar também `domain` e `password`                           |
| `src/components/whatsapp/WhatsAppChatWindow.tsx`                                 | Modificar | Renderizar `<WhatsAppWebphone>` quando config SIP estiver completa                         |

---

### Task 1: Migration — adicionar credenciais SIP

**Files:**

- Create: `supabase/migrations/20260404120000_add_sip_credentials_to_whatsapp_configs.sql`

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Adiciona credenciais SIP do ramal para o webphone embutido
ALTER TABLE public.whatsapp_configs
  ADD COLUMN IF NOT EXISTS api4com_domain TEXT,
  ADD COLUMN IF NOT EXISTS api4com_password TEXT;

COMMENT ON COLUMN public.whatsapp_configs.api4com_domain IS 'Domínio SIP da conta API4Com (ex: expx.api4com.com)';
COMMENT ON COLUMN public.whatsapp_configs.api4com_password IS 'Senha do ramal SIP para autenticação no webphone';
```

- [ ] **Step 2: Aplicar a migration**

```bash
supabase db push
```

Expected: migration aplicada sem erros.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260404120000_add_sip_credentials_to_whatsapp_configs.sql
git commit -m "feat: adicionar campos api4com_domain e api4com_password ao whatsapp_configs"
```

---

### Task 2: Baixar e adicionar libwebphone.js

**Files:**

- Create: `public/libwebphone.js`

- [ ] **Step 1: Baixar a biblioteca libwebphone.js**

Acesse `https://docs.api4com.com` → seção "Webphone SIP" → link de download do `libwebphone.js`. Salve o arquivo em `public/libwebphone.js`.

Alternativamente, via curl (URL pode variar — verificar na documentação API4Com):

```bash
curl -L "https://cdn.api4com.com/libwebphone/libwebphone.js" -o public/libwebphone.js
```

- [ ] **Step 2: Verificar que o arquivo foi baixado corretamente**

```bash
head -5 public/libwebphone.js
```

Expected: primeiras linhas do arquivo JS (não HTML de erro).

- [ ] **Step 3: Adicionar script tag no index.html para carregar a biblioteca**

Arquivo: `index.html` (raiz do projeto). Adicionar antes do `</head>`:

```html
<script src="/libwebphone.js"></script>
```

- [ ] **Step 4: Declarar tipo global no TypeScript**

Criar arquivo `src/types/libwebphone.d.ts`:

```typescript
declare class libwebphone {
  constructor(config: Record<string, unknown>): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
  onAny(callback: (event: string, ...data: unknown[]) => void): void;
  getUserAgent(): {
    renderAddTarget(config: Record<string, unknown>): void;
  } | null;
}

interface Window {
  libwebphone: typeof libwebphone;
}
```

- [ ] **Step 5: Commit**

```bash
git add public/libwebphone.js index.html src/types/libwebphone.d.ts
git commit -m "feat: adicionar libwebphone.js e tipos TypeScript para webphone SIP"
```

---

### Task 3: Hook useWebphone

**Files:**

- Create: `src/hooks/useWebphone.tsx`

O hook gerencia o ciclo de vida singleton do webphone: inicializa quando as credenciais SIP estão disponíveis, mantém status de conexão e chamada ativa, e expõe controles (answer, hangup, mute).

- [ ] **Step 1: Criar o hook**

```typescript
import { useEffect, useRef, useState, useCallback } from "react";

export type WebphoneStatus =
  | "disconnected"
  | "connecting"
  | "registered"
  | "ringing"
  | "in-call";

interface SipCredentials {
  domain: string;
  extension: string;
  password: string;
}

interface UseWebphoneReturn {
  status: WebphoneStatus;
  isMuted: boolean;
  answer: () => void;
  hangup: () => void;
  toggleMute: () => void;
}

// Singleton global — impede múltiplas instâncias
let globalWebphoneInstance: InstanceType<typeof window.libwebphone> | null =
  null;

export function useWebphone(
  credentials: SipCredentials | null,
): UseWebphoneReturn {
  const [status, setStatus] = useState<WebphoneStatus>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const currentCallRef = useRef<unknown>(null);

  useEffect(() => {
    if (!credentials || !window.libwebphone) return;
    if (globalWebphoneInstance) return; // já inicializado

    const { domain, extension, password } = credentials;

    setStatus("connecting");

    globalWebphoneInstance = new window.libwebphone({
      userAgent: {
        transport: {
          sockets: [`wss://${domain}:6443`],
          recovery_max_interval: 30,
          recovery_min_interval: 2,
        },
        authentication: {
          username: extension,
          password,
          realm: domain,
        },
        user_agent: {
          instance_id: `expxflow-${extension}-${domain}`,
          no_answer_timeout: 30,
          register: true,
          register_expires: 600,
          user_agent: "expxflow-libwebphone",
        },
      },
    });

    globalWebphoneInstance.on("userAgent.registered", () => {
      setStatus("registered");
    });

    globalWebphoneInstance.on("userAgent.unregistered", () => {
      setStatus("disconnected");
    });

    globalWebphoneInstance.on(
      "call.created",
      (_lwp: unknown, call: unknown) => {
        const c = call as {
          isPrimary: () => boolean;
          isInProgress: () => boolean;
          getCustomHeaders: () => Record<string, string> | null;
          answer: () => void;
          reject: () => void;
        };

        if (!c.isPrimary()) {
          c.reject();
          return;
        }

        currentCallRef.current = c;
        setStatus("ringing");

        // Atende automaticamente chamadas originadas pelo dialer API4Com
        if (c.isInProgress()) {
          const headers = c.getCustomHeaders();
          if (headers?.["X-Api4comintegratedcall"] === "true") {
            c.answer();
            setStatus("in-call");
          }
        }
      },
    );

    globalWebphoneInstance.on("call.terminated", () => {
      currentCallRef.current = null;
      setIsMuted(false);
      setStatus("registered");
    });

    return () => {
      // Não destruir no unmount — singleton deve persistir
    };
  }, [credentials?.domain, credentials?.extension, credentials?.password]);

  const answer = useCallback(() => {
    const call = currentCallRef.current as {
      answer: () => void;
    } | null;
    call?.answer();
    setStatus("in-call");
  }, []);

  const hangup = useCallback(() => {
    const call = currentCallRef.current as {
      hangup: () => void;
    } | null;
    call?.hangup();
    currentCallRef.current = null;
    setStatus("registered");
  }, []);

  const toggleMute = useCallback(() => {
    const call = currentCallRef.current as {
      mute: () => void;
      unmute: () => void;
    } | null;
    if (!call) return;
    if (isMuted) {
      call.unmute();
      setIsMuted(false);
    } else {
      call.mute();
      setIsMuted(true);
    }
  }, [isMuted]);

  return { status, isMuted, answer, hangup, toggleMute };
}
```

- [ ] **Step 2: Verificar que o arquivo compila sem erros**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: nenhum erro de TypeScript relacionado ao arquivo.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWebphone.tsx
git commit -m "feat: hook useWebphone para gerenciar instância SIP singleton"
```

---

### Task 4: Atualizar useApi4ComConfig para retornar credenciais SIP

**Files:**

- Modify: `src/hooks/useVoiceCalls.tsx` (linha 102-120)

- [ ] **Step 1: Atualizar a função useApi4ComConfig**

Substituir a implementação atual de `useApi4ComConfig` (linhas 102-120):

```typescript
export function useApi4ComConfig(companyId: string | undefined) {
  return useQuery({
    queryKey: ["api4com-config", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_configs")
        .select(
          "api4com_token, api4com_extension, api4com_domain, api4com_password",
        )
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return {
        hasConfig: !!(data?.api4com_token && data?.api4com_extension),
        hasSipConfig: !!(
          data?.api4com_token &&
          data?.api4com_extension &&
          data?.api4com_domain &&
          data?.api4com_password
        ),
        token: data?.api4com_token || "",
        extension: data?.api4com_extension || "",
        domain: data?.api4com_domain || "",
        password: data?.api4com_password || "",
      };
    },
    enabled: !!companyId,
  });
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useVoiceCalls.tsx
git commit -m "feat: useApi4ComConfig retorna credenciais SIP (domain, password)"
```

---

### Task 5: Componente WhatsAppWebphone

**Files:**

- Create: `src/components/whatsapp/WhatsAppWebphone.tsx`

Componente flutuante/fixo que mostra o status SIP e controles de chamada quando há uma chamada ativa ou o ramal está registrado.

- [ ] **Step 1: Criar o componente**

```typescript
import { Phone, PhoneOff, Mic, MicOff, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWebphone, WebphoneStatus } from "@/hooks/useWebphone";

interface WhatsAppWebphoneProps {
  domain: string;
  extension: string;
  password: string;
}

const STATUS_LABEL: Record<WebphoneStatus, string> = {
  disconnected: "Desconectado",
  connecting: "Conectando...",
  registered: "Pronto para ligar",
  ringing: "Chamada recebida",
  "in-call": "Em chamada",
};

const STATUS_COLOR: Record<WebphoneStatus, string> = {
  disconnected: "bg-muted text-muted-foreground",
  connecting: "bg-yellow-100 text-yellow-800",
  registered: "bg-green-100 text-green-800",
  ringing: "bg-blue-100 text-blue-800",
  "in-call": "bg-green-600 text-white",
};

export function WhatsAppWebphone({
  domain,
  extension,
  password,
}: WhatsAppWebphoneProps) {
  const { status, isMuted, answer, hangup, toggleMute } = useWebphone({
    domain,
    extension,
    password,
  });

  const showControls = status === "ringing" || status === "in-call";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background/80 backdrop-blur-sm text-xs">
      <Phone className={cn("h-3.5 w-3.5", status === "registered" || status === "in-call" ? "text-green-500" : "text-muted-foreground")} />
      <Badge
        variant="outline"
        className={cn("text-[10px] px-1.5 py-0 border-0", STATUS_COLOR[status])}
      >
        {STATUS_LABEL[status]}
      </Badge>

      {showControls && (
        <div className="flex items-center gap-1 ml-1">
          {status === "ringing" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={answer}
              title="Atender"
            >
              <PhoneCall className="h-3.5 w-3.5" />
            </Button>
          )}
          {status === "in-call" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={toggleMute}
              title={isMuted ? "Desmutar" : "Mutar"}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5 text-orange-500" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={hangup}
            title="Desligar"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add src/components/whatsapp/WhatsAppWebphone.tsx
git commit -m "feat: componente WhatsAppWebphone com status SIP e controles de chamada"
```

---

### Task 6: Atualizar WhatsAppApi4ComSettings com campos SIP

**Files:**

- Modify: `src/components/whatsapp/WhatsAppApi4ComSettings.tsx`

Adicionar campos `Domínio SIP` e `Senha do ramal` ao formulário de configuração.

- [ ] **Step 1: Substituir o conteúdo do arquivo**

```typescript
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Phone, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useApi4ComConfig } from "@/hooks/useVoiceCalls";

interface WhatsAppApi4ComSettingsProps {
  companyId: string;
}

export function WhatsAppApi4ComSettings({
  companyId,
}: WhatsAppApi4ComSettingsProps) {
  const queryClient = useQueryClient();
  const { data: config } = useApi4ComConfig(companyId);
  const [token, setToken] = useState("");
  const [extension, setExtension] = useState("");
  const [domain, setDomain] = useState("");
  const [password, setPassword] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setToken(config.token);
      setExtension(config.extension);
      setDomain(config.domain);
      setPassword(config.password);
    }
  }, [config]);

  const handleSave = async () => {
    if (!token.trim() || !extension.trim()) {
      toast.error("Preencha o token e o ramal");
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from("whatsapp_configs").upsert(
        {
          company_id: companyId,
          api4com_token: token.trim(),
          api4com_extension: extension.trim(),
          api4com_domain: domain.trim() || null,
          api4com_password: password.trim() || null,
        },
        { onConflict: "company_id" },
      );
      if (error) throw error;
      toast.success("Configuração API4Com salva!");
      queryClient.invalidateQueries({
        queryKey: ["api4com-config", companyId],
      });
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
          {config?.hasSipConfig && (
            <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
          )}
        </CardTitle>
        <CardDescription>
          Configure as credenciais API4Com para habilitar ligações diretamente
          do chat WhatsApp. Obtenha o token em{" "}
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
              {showToken ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
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
            Número do ramal configurado na API4Com.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api4com-domain">Domínio SIP</Label>
          <Input
            id="api4com-domain"
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Ex: expx.api4com.com"
          />
          <p className="text-xs text-muted-foreground">
            Domínio da sua conta API4Com (termina com .api4com.com). Necessário para o webphone embutido.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="api4com-password">Senha do ramal SIP</Label>
          <div className="relative">
            <Input
              id="api4com-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha do ramal (gerada automaticamente pela API4Com)"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Senha SIP do ramal. Encontrada em Configurar Ramal no painel API4Com.
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

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: nenhum erro.

- [ ] **Step 3: Commit**

```bash
git add src/components/whatsapp/WhatsAppApi4ComSettings.tsx
git commit -m "feat: adicionar campos domain e password SIP nas configurações API4Com"
```

---

### Task 7: Integrar WhatsAppWebphone no WhatsAppChatWindow

**Files:**

- Modify: `src/components/whatsapp/WhatsAppChatWindow.tsx`

Renderizar o `<WhatsAppWebphone>` no header do chat quando as credenciais SIP estiverem completas.

- [ ] **Step 1: Adicionar import do WhatsAppWebphone**

No topo do arquivo, junto com os outros imports de componentes whatsapp, adicionar:

```typescript
import { WhatsAppWebphone } from "@/components/whatsapp/WhatsAppWebphone";
```

- [ ] **Step 2: Renderizar o webphone no header**

Localizar onde `<WhatsAppCallButton>` é renderizado no JSX. Logo antes dele (ainda dentro do bloco `{!isGroupConversation && ...}`), adicionar o webphone:

```tsx
{
  !isGroupConversation && api4ComConfig?.hasSipConfig && (
    <WhatsAppWebphone
      domain={api4ComConfig.domain}
      extension={api4ComConfig.extension}
      password={api4ComConfig.password}
    />
  );
}
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: nenhum erro.

- [ ] **Step 4: Commit**

```bash
git add src/components/whatsapp/WhatsAppChatWindow.tsx
git commit -m "feat: integrar WhatsAppWebphone no chat — webphone SIP embutido"
```

---

### Task 8: Remover abertura automática do webphone externo

**Files:**

- Modify: `src/components/whatsapp/WhatsAppCallButton.tsx`

Agora que o webphone está embutido, não é mais necessário abrir `expx.api4com.com` em nova aba. Reverter `handleCall` para disparar a chamada imediatamente.

- [ ] **Step 1: Atualizar handleCall**

Localizar em `src/components/whatsapp/WhatsAppCallButton.tsx` a função `handleCall` e substituir:

```typescript
const handleCall = () => {
  initiateCall({ companyId, conversationId, phone, contactName });
  setOpen(false);
};
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -20
```

Expected: nenhum erro.

- [ ] **Step 3: Commit e push**

```bash
git add src/components/whatsapp/WhatsAppCallButton.tsx
git commit -m "feat: remover abertura do webphone externo — webphone agora é embutido"
git push
```

---

## Notas de Implementação

### Senha do ramal SIP

A senha do ramal SIP está visível no painel da API4Com em **Gerenciar Integrações → Api4Com → Configurar Ramal → Senha**. O usuário precisa copiar essa senha e salvar nas configurações do Expx Flow.

### Singleton do webphone

A instância do webphone deve ser **única por sessão**. A variável `globalWebphoneInstance` no módulo garante isso. Se o usuário abrir múltiplas abas, cada aba terá sua instância — a API4Com desconecta instâncias anteriores automaticamente (comportamento esperado).

### Auto-atender chamadas do dialer

O evento `call.created` verifica o header `X-Api4comintegratedcall: true` para identificar chamadas originadas pelo dialer e atende automaticamente. Chamadas SIP diretas (não via dialer) ficam em estado `ringing` aguardando o usuário clicar em atender.

### libwebphone.js

O arquivo deve ser obtido direto da documentação API4Com. Não existe no npm. É um arquivo estático servido pelo Vite via pasta `public/`.
