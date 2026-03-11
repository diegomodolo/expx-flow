# Google Meet Per-User Integration — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar integração Google Meet de per-company para per-user, permitindo cada usuário conectar sua própria conta Google.

**Architecture:** Adicionar `user_id` nullable à tabela `google_meet_integrations`. Edge functions tentam token do usuário primeiro, fallback para token da empresa. Nova seção "Integrações" na página de perfil para conectar conta pessoal.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions), React + TypeScript, TanStack React Query, shadcn/ui

---

## File Structure

| Ação   | Arquivo                                                       | Responsabilidade                              |
| ------ | ------------------------------------------------------------- | --------------------------------------------- |
| Create | `supabase/migrations/20260312000000_google_meet_per_user.sql` | Migration: user_id, constraints, RLS          |
| Modify | `supabase/functions/google-meet-oauth/index.ts`               | Aceitar userId no exchange e refresh          |
| Modify | `supabase/functions/google-meet-create/index.ts`              | getValidAccessToken com fallback user→company |
| Modify | `supabase/functions/google-meet-check-transcript/index.ts`    | Mesma lógica de fallback                      |
| Modify | `src/hooks/useGoogleMeetIntegration.tsx`                      | Aceitar userId, state no OAuth URL            |
| Create | `src/components/profile/ProfileGoogleMeetCard.tsx`            | Card de conexão Google Meet no perfil         |
| Modify | `src/components/profile/ProfileLayout.tsx`                    | Adicionar nav item "Integrações"              |
| Modify | `src/pages/Perfil.tsx`                                        | Adicionar rota /perfil/integracoes            |
| Modify | `src/pages/GoogleMeetCallback.tsx`                            | Extrair userId do state, redirect dinâmico    |
| Modify | `src/components/google/GoogleMeetIntegrationCard.tsx`         | Nota informativa sobre per-user               |

---

## Chunk 1: Database Migration

### Task 1: Criar migration SQL

**Files:**

- Create: `supabase/migrations/20260312000000_google_meet_per_user.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- Adicionar user_id à tabela de integrações Google Meet
ALTER TABLE public.google_meet_integrations
  ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT NULL;

-- Remover constraint UNIQUE antiga (company_id)
ALTER TABLE public.google_meet_integrations
  DROP CONSTRAINT IF EXISTS google_meet_integrations_company_id_key;

-- Nova constraint: 1 integração por user por empresa + 1 da empresa (user_id=NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_meet_integrations_company_user
  ON public.google_meet_integrations (company_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'));

-- Atualizar RLS policies
DROP POLICY IF EXISTS "Users can view google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can view google meet integrations"
ON public.google_meet_integrations FOR SELECT
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "Users can insert google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can insert google meet integrations"
ON public.google_meet_integrations FOR INSERT
WITH CHECK (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "Users can update google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can update google meet integrations"
ON public.google_meet_integrations FOR UPDATE
USING (
  company_id IN (SELECT company_id FROM public.company_members WHERE user_id = auth.uid())
  AND (user_id = auth.uid() OR user_id IS NULL)
);

DROP POLICY IF EXISTS "Users can delete google meet integrations" ON public.google_meet_integrations;
CREATE POLICY "Users can delete google meet integrations"
ON public.google_meet_integrations FOR DELETE
USING (
  user_id = auth.uid()
  OR (user_id IS NULL AND company_id IN (
    SELECT cm.company_id FROM public.company_members cm
    WHERE cm.user_id = auth.uid() AND cm.role = 'owner'
  ))
);
```

- [ ] **Step 2: Executar migration no Supabase Dashboard**

Copiar o SQL acima e executar no SQL Editor do Supabase Dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260312000000_google_meet_per_user.sql
git commit -m "feat: migration para Google Meet per-user (user_id + RLS)"
```

---

## Chunk 2: Edge Functions (Backend)

### Task 2: Atualizar google-meet-oauth

**Files:**

- Modify: `supabase/functions/google-meet-oauth/index.ts`

- [ ] **Step 1: Modificar action "exchange" para aceitar userId**

No body destructuring (linha 32), adicionar `userId`:

```typescript
const { action, code, companyId, redirectUri, userId } = body;
```

No upsert (linhas 86-103), trocar para:

```typescript
// Determine conflict target based on whether this is per-user or per-company
const upsertData = {
  company_id: companyId,
  user_id: userId || null,
  access_token: tokens.access_token,
  refresh_token: tokens.refresh_token,
  expires_at: expiresAt,
  is_active: true,
  user_email: userEmail,
};

// For per-user: check if integration exists, then update or insert
let integration;
const existingQuery = supabaseClient
  .from("google_meet_integrations")
  .select("*")
  .eq("company_id", companyId)
  .eq("is_active", true);

if (userId) {
  existingQuery.eq("user_id", userId);
} else {
  existingQuery.is("user_id", null);
}

const { data: existing } = await existingQuery.maybeSingle();

if (existing) {
  const { data, error: updateError } = await supabaseClient
    .from("google_meet_integrations")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      is_active: true,
      user_email: userEmail,
    })
    .eq("id", existing.id)
    .select()
    .single();
  if (updateError) throw updateError;
  integration = data;
} else {
  const { data, error: insertError } = await supabaseClient
    .from("google_meet_integrations")
    .insert(upsertData)
    .select()
    .single();
  if (insertError) throw insertError;
  integration = data;
}
```

- [ ] **Step 2: Modificar action "refresh_token" para aceitar userId**

Na busca da integração (linhas 125-131), trocar para:

```typescript
const { userId } = body;

let query = supabaseClient
  .from("google_meet_integrations")
  .select("*")
  .eq("company_id", companyId)
  .eq("is_active", true);

if (userId) {
  query = query.eq("user_id", userId);
} else {
  query = query.is("user_id", null);
}

const { data: integration, error: intError } = await query.single();
```

- [ ] **Step 3: Deploy e commit**

```bash
supabase functions deploy google-meet-oauth
git add supabase/functions/google-meet-oauth/index.ts
git commit -m "feat: google-meet-oauth aceita userId para integração per-user"
```

### Task 3: Atualizar google-meet-create com fallback user→company

**Files:**

- Modify: `supabase/functions/google-meet-create/index.ts`

- [ ] **Step 1: Modificar getValidAccessToken para aceitar userId**

Substituir a função `getValidAccessToken` (linhas 11-71) por:

```typescript
async function getValidAccessToken(
  supabaseClient: unknown,
  companyId: string,
  userId?: string,
) {
  let integration = null;

  // 1. Try user-specific integration first
  if (userId) {
    const { data } = await supabaseClient
      .from("google_meet_integrations")
      .select("*")
      .eq("company_id", companyId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    integration = data;
  }

  // 2. Fallback to company integration
  if (!integration) {
    const { data } = await supabaseClient
      .from("google_meet_integrations")
      .select("*")
      .eq("company_id", companyId)
      .is("user_id", null)
      .eq("is_active", true)
      .maybeSingle();
    integration = data;
  }

  if (!integration) {
    throw new Error(
      "Nenhuma integração Google Meet encontrada. Conecte sua conta Google em Perfil > Integrações, ou peça ao administrador para configurar a conta da empresa.",
    );
  }

  const expiresAt = new Date(integration.expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - now.getTime() < bufferMs) {
    console.log("Token expired or expiring soon, refreshing...");
    const clientId = Deno.env.get("GOOGLE_MEET_CLIENT_ID")?.trim();
    const clientSecret = Deno.env.get("GOOGLE_MEET_CLIENT_SECRET")?.trim();

    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: integration.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!tokenResponse.ok) {
      const err = await tokenResponse.text();
      console.error("Token refresh failed:", err);
      throw new Error(
        "Falha ao renovar token Google Meet. Reconecte sua conta em Perfil > Integrações.",
      );
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(
      Date.now() + tokens.expires_in * 1000,
    ).toISOString();

    await supabaseClient
      .from("google_meet_integrations")
      .update({ access_token: tokens.access_token, expires_at: newExpiresAt })
      .eq("id", integration.id);

    return tokens.access_token;
  }

  return integration.access_token;
}
```

- [ ] **Step 2: Passar userId (do JWT) para getValidAccessToken**

Na chamada de `getValidAccessToken` (linha ~110), trocar:

```typescript
// Antes:
const accessToken = await getValidAccessToken(supabaseClient, companyId);

// Depois:
const accessToken = await getValidAccessToken(
  supabaseClient,
  companyId,
  user.id,
);
```

- [ ] **Step 3: Deploy e commit**

```bash
supabase functions deploy google-meet-create
git add supabase/functions/google-meet-create/index.ts
git commit -m "feat: google-meet-create usa token per-user com fallback empresa"
```

### Task 4: Atualizar google-meet-check-transcript com fallback

**Files:**

- Modify: `supabase/functions/google-meet-check-transcript/index.ts`

- [ ] **Step 1: Substituir getValidAccessToken pela mesma versão com fallback**

Copiar a mesma função `getValidAccessToken` da Task 3 (com parâmetro `userId` e fallback user→company).

- [ ] **Step 2: Passar created_by da meeting como userId**

Na lógica que busca a meeting e chama `getValidAccessToken`, usar o `created_by` da meeting:

```typescript
// Após buscar a meeting do banco:
const accessToken = await getValidAccessToken(
  supabaseClient,
  meeting.company_id,
  meeting.created_by,
);
```

- [ ] **Step 3: Deploy e commit**

```bash
supabase functions deploy google-meet-check-transcript
git add supabase/functions/google-meet-check-transcript/index.ts
git commit -m "feat: google-meet-check-transcript usa token per-user com fallback"
```

---

## Chunk 3: Frontend Hook e Callback

### Task 5: Atualizar useGoogleMeetIntegration para suportar userId

**Files:**

- Modify: `src/hooks/useGoogleMeetIntegration.tsx`

- [ ] **Step 1: Adicionar parâmetro userId ao hook**

```typescript
export function useGoogleMeetIntegration(userId?: string) {
```

- [ ] **Step 2: Modificar getAuthUrl para incluir state com userId**

```typescript
const getAuthUrl = () => {
  const clientId = import.meta.env.VITE_GOOGLE_MEET_CLIENT_ID;
  const redirectUri = `${window.location.origin}/google-meet/callback`;
  const scopes = [
    "https://www.googleapis.com/auth/meetings.space.created",
    "https://www.googleapis.com/auth/meetings.space.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/calendar.events",
  ].join(" ");

  const state = userId ? JSON.stringify({ userId, from: "profile" }) : "";

  return (
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&access_type=offline` +
    `&prompt=consent` +
    (state ? `&state=${encodeURIComponent(state)}` : "")
  );
};
```

- [ ] **Step 3: Modificar handleCallback para passar userId**

```typescript
const handleCallback = async (
  code: string,
  companyId: string,
  callbackUserId?: string,
) => {
  if (processingCodeRef.current === code) {
    throw new Error("Code already being processed");
  }

  try {
    processingCodeRef.current = code;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw new Error("No active session");

    const redirectUri = `${window.location.origin}/google-meet/callback`;
    const effectiveUserId = callbackUserId || userId;

    const { data, error } = await supabase.functions.invoke(
      "google-meet-oauth",
      {
        body: {
          action: "exchange",
          code,
          companyId,
          redirectUri,
          userId: effectiveUserId,
        },
      },
    );

    if (error) throw error;
    if (data.error) throw new Error(data.error);

    toast.success("Google Meet conectado com sucesso!");
    processingCodeRef.current = null;
    return data;
  } catch (error: unknown) {
    processingCodeRef.current = null;
    const message = error instanceof Error ? error.message : "Erro ao conectar";
    toast.error(`Erro ao conectar Google Meet: ${message}`);
    throw error;
  }
};
```

- [ ] **Step 4: Modificar loadIntegration para filtrar por userId**

```typescript
const loadIntegration = async (companyId: string) => {
  try {
    setLoading(true);
    let query = supabase
      .from("google_meet_integrations" as unknown)
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true);

    if (userId) {
      query = query.eq("user_id", userId);
    } else {
      query = query.is("user_id", null);
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    setIntegration(data as unknown);
  } catch (error: unknown) {
    console.error("Error loading Meet integration:", error);
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 5: Modificar refreshToken para passar userId**

```typescript
const refreshToken = async () => {
  if (!activeCompany?.company_id) return;
  setLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke(
      "google-meet-oauth",
      {
        body: {
          action: "refresh_token",
          companyId: activeCompany.company_id,
          userId,
        },
      },
    );
    if (error) throw error;
    if (data.error) throw new Error(data.error);
    toast.success(data.message || "Token renovado!");
    await loadIntegration(activeCompany.company_id);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro ao renovar";
    toast.error(`Erro ao renovar token: ${message}`);
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useGoogleMeetIntegration.tsx
git commit -m "feat: useGoogleMeetIntegration suporta userId para integração per-user"
```

### Task 6: Atualizar GoogleMeetCallback para extrair userId do state

**Files:**

- Modify: `src/pages/GoogleMeetCallback.tsx`

- [ ] **Step 1: Extrair userId do state e redirecionar dinamicamente**

```typescript
export default function GoogleMeetCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { handleCallback } = useGoogleMeetIntegration();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasProcessedRef = useRef(false);

  // Parse state to get userId and origin
  const stateParam = searchParams.get('state');
  let stateUserId: string | undefined;
  let fromProfile = false;
  if (stateParam) {
    try {
      const parsed = JSON.parse(decodeURIComponent(stateParam));
      stateUserId = parsed.userId;
      fromProfile = parsed.from === 'profile';
    } catch {}
  }

  const redirectTo = fromProfile ? '/perfil/integracoes' : '/configuracoes/integracao-google-meet';

  useEffect(() => {
    if (!activeCompany) return;
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const processCallback = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setStatus('error');
        setError('Autorização negada pelo usuário');
        return;
      }

      if (!code) {
        setStatus('error');
        setError('Código de autorização não encontrado');
        return;
      }

      try {
        await handleCallback(code, activeCompany.company_id, stateUserId);
        setStatus('success');
        setTimeout(() => navigate(redirectTo), 2000);
      } catch (error: unknown) {
        setStatus('error');
        setError(error instanceof Error ? error.message : 'Erro ao processar callback');
        hasProcessedRef.current = false;
      }
    };

    processCallback();
  }, [activeCompany, searchParams, handleCallback, navigate, stateUserId, redirectTo]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin" />}
            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-500" />}
            {status === 'error' && <XCircle className="h-6 w-6 text-destructive" />}
            {status === 'loading' && 'Conectando ao Google Meet...'}
            {status === 'success' && 'Conectado com sucesso!'}
            {status === 'error' && 'Erro na conexão'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processando autorização...'}
            {status === 'success' && (fromProfile ? 'Redirecionando para o perfil...' : 'Redirecionando para as configurações...')}
            {status === 'error' && error}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent>
            <Button onClick={() => navigate(redirectTo)} className="w-full">
              {fromProfile ? 'Voltar para o Perfil' : 'Voltar para Configurações'}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/GoogleMeetCallback.tsx
git commit -m "feat: callback extrai userId do state e redireciona dinamicamente"
```

---

## Chunk 4: Frontend — Perfil e Card

### Task 7: Criar ProfileGoogleMeetCard

**Files:**

- Create: `src/components/profile/ProfileGoogleMeetCard.tsx`

- [ ] **Step 1: Criar componente**

```typescript
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Loader2, Unlink, CheckCircle, AlertTriangle, RefreshCw, Video } from "lucide-react";
import { useGoogleMeetIntegration } from "@/hooks/useGoogleMeetIntegration";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ProfileGoogleMeetCard() {
  const { user } = useAuth();
  const {
    loading,
    integration,
    connectGoogle,
    disconnectGoogle,
    refreshToken,
  } = useGoogleMeetIntegration(user?.id);

  const isTokenExpiring = integration?.expires_at
    ? new Date(integration.expires_at).getTime() - Date.now() < 30 * 60 * 1000
    : false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Google Meet
        </CardTitle>
        <CardDescription>
          Conecte sua conta Google para criar reuniões no seu próprio calendário.
          Reuniões criadas por você serão vinculadas à sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando...
          </div>
        ) : integration ? (
          <>
            <Alert className="border-green-500/50 bg-green-500/10">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertTitle>Conectado</AlertTitle>
              <AlertDescription className="space-y-1">
                {integration.user_email && (
                  <p>Conta: <strong>{integration.user_email}</strong></p>
                )}
                <p className="text-xs">
                  Conectado em: {format(new Date(integration.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </AlertDescription>
            </Alert>

            {isTokenExpiring && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Token expirando</AlertTitle>
                <AlertDescription>
                  O token está prestes a expirar. Renove-o para manter a integração funcionando.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={refreshToken} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Renovar Token
              </Button>
              <Button variant="outline" size="sm" onClick={disconnectGoogle} disabled={loading} className="text-destructive hover:text-destructive">
                <Unlink className="h-4 w-4 mr-1" />
                Desconectar
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ao conectar sua conta, reuniões que você criar serão adicionadas ao seu Google Calendar
              e as transcrições ficarão vinculadas ao seu Drive.
            </p>
            <Button onClick={connectGoogle} disabled={loading}>
              <Video className="h-4 w-4 mr-2" />
              Conectar minha conta Google
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/profile/ProfileGoogleMeetCard.tsx
git commit -m "feat: ProfileGoogleMeetCard para conexão Google Meet per-user"
```

### Task 8: Adicionar rota e nav item no perfil

**Files:**

- Modify: `src/components/profile/ProfileLayout.tsx`
- Modify: `src/pages/Perfil.tsx`

- [ ] **Step 1: Adicionar nav item "Integrações" no ProfileLayout**

Em `src/components/profile/ProfileLayout.tsx`, adicionar import `Video` e o nav item:

```typescript
import { User, Shield, Video } from "lucide-react";

const profileNavItems = [
  {
    title: "Meu Perfil",
    href: "/perfil",
    icon: User,
    description: "Informações pessoais e foto",
  },
  {
    title: "Segurança",
    href: "/perfil/seguranca",
    icon: Shield,
    description: "Senha e autenticação",
  },
  {
    title: "Integrações",
    href: "/perfil/integracoes",
    icon: Video,
    description: "Google Meet e outras contas",
  },
];
```

- [ ] **Step 2: Adicionar rota em Perfil.tsx**

```typescript
import { ProfileGoogleMeetCard } from "@/components/profile/ProfileGoogleMeetCard";

// Dentro de <Routes>:
<Route path="integracoes" element={<ProfileGoogleMeetCard />} />
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/profile/ProfileLayout.tsx src/pages/Perfil.tsx
git commit -m "feat: adicionar aba Integrações no perfil com Google Meet per-user"
```

### Task 9: Adicionar nota informativa na página de configurações

**Files:**

- Modify: `src/components/google/GoogleMeetIntegrationCard.tsx`

- [ ] **Step 1: Adicionar nota após o CardDescription**

Dentro do `<CardDescription>`, após o texto existente, adicionar:

```typescript
<CardDescription>
  Conta Google padrão da empresa para reuniões e transcrições.
  Cada colaborador também pode conectar sua própria conta em{" "}
  <span className="font-medium text-foreground">Perfil → Integrações</span>.
</CardDescription>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/google/GoogleMeetIntegrationCard.tsx
git commit -m "feat: nota informativa sobre integração per-user na config da empresa"
```

---

## Chunk 5: Build Final e Deploy

### Task 10: Build, teste e deploy

- [ ] **Step 1: Verificar build completo**

```bash
npm run build
```

- [ ] **Step 2: Deploy das edge functions modificadas**

```bash
supabase functions deploy google-meet-oauth
supabase functions deploy google-meet-create
supabase functions deploy google-meet-check-transcript
```

- [ ] **Step 3: Push para main**

```bash
git push origin main
```

- [ ] **Step 4: Testar manualmente**

1. Acessar `/perfil/integracoes`
2. Conectar conta Google pessoal
3. Verificar redirect de volta para `/perfil/integracoes`
4. Criar reunião no `/calendario` ou `/reunioes`
5. Verificar que a reunião foi criada no Google Calendar da conta pessoal
6. Desconectar conta pessoal
7. Criar reunião novamente — deve usar fallback da empresa
