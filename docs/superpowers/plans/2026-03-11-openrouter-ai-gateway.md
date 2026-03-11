# OpenRouter AI Gateway — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar todas as chamadas de IA via OpenRouter com seleção de modelo por função, configurável pela UI.

**Architecture:** Módulo `_shared/ai-gateway.ts` compartilhado por todas as Edge Functions. Configs lidas do banco (tabela `ai_model_configs` por empresa). Frontend em `/configuracoes/ia` com modal de seleção de modelos do OpenRouter.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions Deno), React 18, TypeScript, TanStack Query, shadcn/ui, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-11-openrouter-ai-gateway-design.md`

---

## Chunk 1: Database — Tabelas, RLS, Permissão

### Task 1: Migration — Criar tabelas ai_model_configs, ai_favorite_models, ai_api_keys

**Files:**

- Create: `supabase/migrations/20260311200000_create_ai_gateway_tables.sql`

- [ ] **Step 1: Escrever a migration SQL**

```sql
-- ================================================
-- AI Gateway: tabelas de configuração de modelos
-- ================================================

-- 1. Tabela de configuração de modelo por função por empresa
CREATE TABLE IF NOT EXISTS public.ai_model_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  primary_model text NOT NULL,
  fallback_model text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, function_name)
);

ALTER TABLE public.ai_model_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ai configs for their company"
  ON public.ai_model_configs FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert ai configs for their company"
  ON public.ai_model_configs FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update ai configs for their company"
  ON public.ai_model_configs FOR UPDATE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete ai configs for their company"
  ON public.ai_model_configs FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_model_configs TO authenticated;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_model_configs_updated_at
  BEFORE UPDATE ON public.ai_model_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. Tabela de modelos favoritos
CREATE TABLE IF NOT EXISTS public.ai_favorite_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  model_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, model_id)
);

ALTER TABLE public.ai_favorite_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view favorite models for their company"
  ON public.ai_favorite_models FOR SELECT
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert favorite models for their company"
  ON public.ai_favorite_models FOR INSERT
  WITH CHECK (company_id IN (SELECT get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete favorite models for their company"
  ON public.ai_favorite_models FOR DELETE
  USING (company_id IN (SELECT get_user_company_ids(auth.uid())));

GRANT SELECT, INSERT, DELETE ON public.ai_favorite_models TO authenticated;

-- 3. Tabela de API keys (RLS restritiva: apenas owners)
CREATE TABLE IF NOT EXISTS public.ai_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  openrouter_api_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.ai_api_keys ENABLE ROW LEVEL SECURITY;

-- Apenas owners podem ler/editar API keys
CREATE POLICY "Owners can view api keys"
  ON public.ai_api_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = ai_api_keys.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can insert api keys"
  ON public.ai_api_keys FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = ai_api_keys.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'owner'
    )
  );

CREATE POLICY "Owners can update api keys"
  ON public.ai_api_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.company_members
      WHERE company_members.company_id = ai_api_keys.company_id
        AND company_members.user_id = auth.uid()
        AND company_members.role = 'owner'
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_api_keys TO authenticated;

CREATE TRIGGER ai_api_keys_updated_at
  BEFORE UPDATE ON public.ai_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

- [ ] **Step 2: Executar a migration no Supabase Dashboard**

Copiar o SQL acima e executar no SQL Editor do Supabase Dashboard.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260311200000_create_ai_gateway_tables.sql
git commit -m "feat: criar tabelas ai_model_configs, ai_favorite_models, ai_api_keys"
```

### Task 2: Adicionar permissão configurar-ia

**Files:**

- Modify: `src/hooks/useEmployeePermissions.tsx` (adicionar ao type MenuItemType)
- Modify: `src/components/settings/PermissionGroupsSettings.tsx` (adicionar item)
- Modify: `src/components/settings/PermissionsSettings.tsx` (adicionar item)

**Pré-requisito:** Executar no Supabase Dashboard:

```sql
ALTER TYPE menu_item_type ADD VALUE IF NOT EXISTS 'configurar-ia';
```

- [ ] **Step 1: Adicionar ao type MenuItemType**

Em `src/hooks/useEmployeePermissions.tsx`, adicionar `"configurar-ia"` ao type `MenuItemType`:

```typescript
export type MenuItemType =
  | "dashboard"
  // ... existing values ...
  | "reportes"
  | "configurar-ia";
```

- [ ] **Step 2: Adicionar em PermissionGroupsSettings.tsx**

Encontrar o array `MENU_ITEMS` e adicionar no final (ou na categoria "Configurações"):

```typescript
{ key: 'configurar-ia', label: 'Configurar IA', category: 'Configurações' },
```

- [ ] **Step 3: Adicionar em PermissionsSettings.tsx**

Encontrar o array `MENU_ITEMS` e adicionar:

```typescript
{ key: 'configurar-ia', label: 'Configurar IA', description: 'Configurar modelos de IA por função do sistema', category: 'Configurações' },
```

- [ ] **Step 4: Verificar build**

```bash
npm run build
```

Expected: Build sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useEmployeePermissions.tsx src/components/settings/PermissionGroupsSettings.tsx src/components/settings/PermissionsSettings.tsx
git commit -m "feat: adicionar permissão configurar-ia"
```

---

## Chunk 2: AI Gateway — Módulo compartilhado

### Task 3: Criar \_shared/ai-gateway.ts

**Files:**

- Create: `supabase/functions/_shared/ai-gateway.ts`

- [ ] **Step 1: Criar o módulo do gateway**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========================================
// AI Gateway — Módulo compartilhado
// Todas as Edge Functions devem usar este
// módulo para chamar LLMs via OpenRouter.
// ========================================

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const CACHE_TTL_MS = 60_000; // 1 minuto

// --- Types ---

export interface CallAIOptions {
  functionName: string;
  companyId?: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  responseFormat?: { type: "json_object" | "text" };
  messages?: Array<{ role: string; content: unknown }>;
}

export interface CallAIVisionOptions extends CallAIOptions {
  images: string[];
}

export interface CallAIResponse {
  content: string;
  model: string;
  provider: "openrouter";
}

interface CachedConfig {
  primaryModel: string;
  fallbackModel: string | null;
  apiKey: string;
  cachedAt: number;
}

// --- Cache ---

const configCache = new Map<string, CachedConfig>();

function getCacheKey(companyId: string, functionName: string): string {
  return `${companyId}:${functionName}`;
}

function getCachedConfig(
  companyId: string,
  functionName: string,
): CachedConfig | null {
  const key = getCacheKey(companyId, functionName);
  const cached = configCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    configCache.delete(key);
    return null;
  }
  return cached;
}

// --- Config Resolution ---

async function resolveConfig(
  functionName: string,
  companyId?: string,
): Promise<{
  primaryModel: string;
  fallbackModel: string | null;
  apiKey: string;
}> {
  const fallbackApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";

  if (!companyId) {
    return {
      primaryModel: DEFAULT_MODEL,
      fallbackModel: null,
      apiKey: fallbackApiKey,
    };
  }

  // Check cache
  const cached = getCachedConfig(companyId, functionName);
  if (cached) return cached;

  // Query database
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Fetch model config
  const { data: config } = await supabase
    .from("ai_model_configs")
    .select("primary_model, fallback_model")
    .eq("company_id", companyId)
    .eq("function_name", functionName)
    .eq("is_active", true)
    .maybeSingle();

  // Fetch API key
  const { data: keyData } = await supabase
    .from("ai_api_keys")
    .select("openrouter_api_key")
    .eq("company_id", companyId)
    .maybeSingle();

  const result: CachedConfig = {
    primaryModel: config?.primary_model || DEFAULT_MODEL,
    fallbackModel: config?.fallback_model || null,
    apiKey: keyData?.openrouter_api_key || fallbackApiKey,
    cachedAt: Date.now(),
  };

  // Save to cache
  configCache.set(getCacheKey(companyId, functionName), result);

  return result;
}

// --- OpenRouter Call ---

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
  temperature: number,
  responseFormat?: { type: "json_object" | "text" },
): Promise<string> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  const response = await fetch(OPENROUTER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// --- Public API ---

export async function callAI(options: CallAIOptions): Promise<CallAIResponse> {
  const {
    functionName,
    companyId,
    systemPrompt,
    userPrompt,
    maxTokens = 1500,
    temperature = 0.7,
    responseFormat,
    messages: customMessages,
  } = options;

  const config = await resolveConfig(functionName, companyId);
  const startTime = Date.now();

  const messages = customMessages || [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Try primary model
  try {
    const content = await callOpenRouter(
      config.apiKey,
      config.primaryModel,
      messages,
      maxTokens,
      temperature,
      responseFormat,
    );

    const latency = Date.now() - startTime;
    console.log(
      `[AI Gateway] ${functionName} | model=${config.primaryModel} | ${latency}ms | success`,
    );

    return { content, model: config.primaryModel, provider: "openrouter" };
  } catch (primaryError) {
    console.warn(
      `[AI Gateway] ${functionName} | model=${config.primaryModel} | FAILED: ${(primaryError as Error).message}`,
    );

    // Try fallback if available
    if (config.fallbackModel) {
      try {
        const content = await callOpenRouter(
          config.apiKey,
          config.fallbackModel,
          messages,
          maxTokens,
          temperature,
          responseFormat,
        );

        const latency = Date.now() - startTime;
        console.log(
          `[AI Gateway] ${functionName} | fallback=${config.fallbackModel} | ${latency}ms | success`,
        );

        return { content, model: config.fallbackModel, provider: "openrouter" };
      } catch (fallbackError) {
        console.error(
          `[AI Gateway] ${functionName} | fallback=${config.fallbackModel} | FAILED: ${(fallbackError as Error).message}`,
        );
        throw fallbackError;
      }
    }

    throw primaryError;
  }
}

export async function callAIVision(
  options: CallAIVisionOptions,
): Promise<CallAIResponse> {
  const { images, systemPrompt, userPrompt, ...rest } = options;

  const imageContent = images.map((url) => ({
    type: "image_url" as const,
    image_url: { url },
  }));

  const messages = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [{ type: "text" as const, text: userPrompt }, ...imageContent],
    },
  ];

  return callAI({ ...rest, systemPrompt, userPrompt, messages });
}
```

- [ ] **Step 2: Verificar que o arquivo está acessível**

```bash
ls supabase/functions/_shared/ai-gateway.ts
```

Expected: Arquivo listado.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/_shared/ai-gateway.ts
git commit -m "feat: criar AI Gateway compartilhado (_shared/ai-gateway.ts)"
```

### Task 4: Criar Edge Function get-openrouter-models

**Files:**

- Create: `supabase/functions/get-openrouter-models/index.ts`
- Modify: `supabase/config.toml` (adicionar entrada)

- [ ] **Step 1: Criar a Edge Function**

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const fallbackApiKey = Deno.env.get("OPENROUTER_API_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId } = await req.json();

    // Resolve API key: company key > env var
    let apiKey = fallbackApiKey;
    if (companyId) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const { data: keyData } = await supabase
        .from("ai_api_keys")
        .select("openrouter_api_key")
        .eq("company_id", companyId)
        .maybeSingle();

      if (keyData?.openrouter_api_key) {
        apiKey = keyData.openrouter_api_key;
      }
    }

    if (!apiKey) {
      throw new Error("Nenhuma API key do OpenRouter configurada");
    }

    // Fetch models from OpenRouter
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();

    // Filter and map to essential fields
    const models = (data.data || []).map((m: Record<string, unknown>) => ({
      id: m.id,
      name: m.name,
      context_length: m.context_length,
      pricing: m.pricing,
      architecture: m.architecture,
    }));

    return new Response(JSON.stringify({ success: true, models }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
```

- [ ] **Step 2: Adicionar ao config.toml**

No final do arquivo `supabase/config.toml`, adicionar:

```toml
[functions.get-openrouter-models]
verify_jwt = true
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: Build sem erros.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/get-openrouter-models/index.ts supabase/config.toml
git commit -m "feat: criar Edge Function get-openrouter-models"
```

---

## Chunk 3: Frontend — Hooks

### Task 5: Hook useAIModelConfigs

**Files:**

- Create: `src/hooks/useAIModelConfigs.tsx`

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface AIModelConfig {
  id: string;
  company_id: string;
  function_name: string;
  primary_model: string;
  fallback_model: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAIModelConfigs() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ai-model-configs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ai_model_configs")
        .select("*")
        .eq("company_id", companyId)
        .order("function_name");
      if (error) throw error;
      return data as AIModelConfig[];
    },
    enabled: !!companyId,
  });

  const upsertConfig = useMutation({
    mutationFn: async ({
      functionName,
      primaryModel,
      fallbackModel,
    }: {
      functionName: string;
      primaryModel: string;
      fallbackModel?: string | null;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("ai_model_configs")
        .upsert(
          {
            company_id: companyId,
            function_name: functionName,
            primary_model: primaryModel,
            fallback_model: fallbackModel || null,
            is_active: true,
          },
          { onConflict: "company_id,function_name" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-configs"] });
      toast.success("Modelo configurado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao configurar modelo", { description: error.message });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (functionName: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { error } = await supabase
        .from("ai_model_configs")
        .delete()
        .eq("company_id", companyId)
        .eq("function_name", functionName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-configs"] });
      toast.success("Configuração removida — usará modelo padrão");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover configuração", {
        description: error.message,
      });
    },
  });

  const getConfigForFunction = (
    functionName: string,
  ): AIModelConfig | undefined => {
    return configs.find((c) => c.function_name === functionName);
  };

  return {
    configs,
    isLoading,
    upsertConfig,
    deleteConfig,
    getConfigForFunction,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAIModelConfigs.tsx
git commit -m "feat: criar hook useAIModelConfigs"
```

### Task 6: Hook useAIFavoriteModels

**Files:**

- Create: `src/hooks/useAIFavoriteModels.tsx`

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export function useAIFavoriteModels() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["ai-favorite-models", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ai_favorite_models")
        .select("model_id")
        .eq("company_id", companyId);
      if (error) throw error;
      return data.map((f) => f.model_id);
    },
    enabled: !!companyId,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (modelId: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const isFavorite = favorites.includes(modelId);
      if (isFavorite) {
        const { error } = await supabase
          .from("ai_favorite_models")
          .delete()
          .eq("company_id", companyId)
          .eq("model_id", modelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_favorite_models")
          .insert({ company_id: companyId, model_id: modelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-favorite-models"] });
    },
  });

  return { favorites, isLoading, toggleFavorite };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAIFavoriteModels.tsx
git commit -m "feat: criar hook useAIFavoriteModels"
```

### Task 7: Hook useOpenRouterModels

**Files:**

- Create: `src/hooks/useOpenRouterModels.tsx`

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    modality: string;
    tokenizer: string;
  } | null;
}

export function useOpenRouterModels() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const {
    data: models = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["openrouter-models", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-openrouter-models",
        { body: { companyId } },
      );
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.models as OpenRouterModel[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos — lista de modelos muda pouco
    enabled: !!companyId,
  });

  return { models, isLoading, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useOpenRouterModels.tsx
git commit -m "feat: criar hook useOpenRouterModels"
```

### Task 8: Hook useAIApiKey

**Files:**

- Create: `src/hooks/useAIApiKey.tsx`

- [ ] **Step 1: Criar o hook**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export function useAIApiKey() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: maskedKey, isLoading } = useQuery({
    queryKey: ["ai-api-key", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("ai_api_keys")
        .select("openrouter_api_key")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      // Mascarar: mostrar apenas últimos 4 chars
      const key = data.openrouter_api_key;
      return "••••••" + key.slice(-4);
    },
    enabled: !!companyId,
  });

  const saveKey = useMutation({
    mutationFn: async (apiKey: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { error } = await supabase
        .from("ai_api_keys")
        .upsert(
          { company_id: companyId, openrouter_api_key: apiKey },
          { onConflict: "company_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-api-key"] });
      queryClient.invalidateQueries({ queryKey: ["openrouter-models"] });
      toast.success("API key salva com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar API key", { description: error.message });
    },
  });

  return { maskedKey, isLoading, saveKey, hasKey: !!maskedKey };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAIApiKey.tsx
git commit -m "feat: criar hook useAIApiKey"
```

---

## Chunk 4: Frontend — Componentes e Página

### Task 9: Registrar definições de funções IA

**Files:**

- Create: `src/components/settings/ai/aiModelFunctions.ts`

- [ ] **Step 1: Criar arquivo com as definições**

```typescript
export interface AIFunctionDef {
  functionName: string;
  label: string;
  category: string;
}

export const AI_FUNCTION_CATEGORIES = [
  "Chat & Agentes",
  "Geração de Conteúdo",
  "Análise",
  "Campanhas",
  "Vídeo & YouTube",
  "Imagens & Carrosséis",
  "Utilitários",
] as const;

export const AI_FUNCTIONS: AIFunctionDef[] = [
  // Chat & Agentes
  {
    functionName: "ai-chat",
    label: "Chat IA — Análise de Performance",
    category: "Chat & Agentes",
  },
  {
    functionName: "ia-agent-chat",
    label: "Agentes IA — Chat",
    category: "Chat & Agentes",
  },
  {
    functionName: "dm-agent-responder",
    label: "Agente de DM",
    category: "Chat & Agentes",
  },
  {
    functionName: "telegram-agent-webhook",
    label: "Agente Telegram",
    category: "Chat & Agentes",
  },
  {
    functionName: "refine-script-chat",
    label: "Refinar Roteiro (Chat)",
    category: "Chat & Agentes",
  },
  {
    functionName: "content-plan-chat",
    label: "Planejamento de Conteúdo (Chat)",
    category: "Chat & Agentes",
  },
  {
    functionName: "whatsapp-ai-assistant",
    label: "Assistente IA WhatsApp",
    category: "Chat & Agentes",
  },

  // Geração de Conteúdo
  {
    functionName: "generate-content-ai",
    label: "Gerador de Conteúdo",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-instagram-auto-post",
    label: "Auto-Post Instagram",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-wordpress-auto-post",
    label: "Auto-Post WordPress",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-creative-texts",
    label: "Textos Criativos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-creative-variations",
    label: "Variações de Criativos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-creative-suggestions",
    label: "Sugestões de Criativos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-element",
    label: "Gerador de Elementos",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-groupops-template",
    label: "Template GroupOps",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-skill-ai",
    label: "Gerador de Skills IA",
    category: "Geração de Conteúdo",
  },
  {
    functionName: "generate-research-themes",
    label: "Temas de Pesquisa",
    category: "Geração de Conteúdo",
  },

  // Análise
  {
    functionName: "analyze-competitor-insights",
    label: "Análise de Concorrentes",
    category: "Análise",
  },
  {
    functionName: "generate-campaign-analysis",
    label: "Análise de Campanha",
    category: "Análise",
  },
  {
    functionName: "analyze-creative-caption",
    label: "Análise de Legendas",
    category: "Análise",
  },
  {
    functionName: "analyze-url-content",
    label: "Análise de URL",
    category: "Análise",
  },
  {
    functionName: "analyze-carousel-slides",
    label: "Análise de Carrossel",
    category: "Análise",
  },
  {
    functionName: "score-generated-ad",
    label: "Avaliação de Anúncios",
    category: "Análise",
  },
  {
    functionName: "generate-campaign-presentation-analysis",
    label: "Análise para Apresentação",
    category: "Análise",
  },
  {
    functionName: "scrape-competitor-ads",
    label: "Scraping de Anúncios",
    category: "Análise",
  },
  {
    functionName: "youtube-posting-behavior-report",
    label: "Relatório YouTube",
    category: "Análise",
  },

  // Campanhas
  {
    functionName: "generate-campaign-strategy",
    label: "Estratégia de Campanha",
    category: "Campanhas",
  },
  {
    functionName: "generate-campaign-recommendation",
    label: "Recomendações de Campanha",
    category: "Campanhas",
  },
  {
    functionName: "generate-ai-campaign",
    label: "Gerador de Campanha IA",
    category: "Campanhas",
  },
  {
    functionName: "generate-ai-campaign-image",
    label: "Imagem de Campanha IA",
    category: "Campanhas",
  },
  {
    functionName: "generate-campaign-creatives",
    label: "Criativos de Campanha",
    category: "Campanhas",
  },
  {
    functionName: "generate-client-briefing",
    label: "Briefing do Cliente",
    category: "Campanhas",
  },
  {
    functionName: "generate-creative-context",
    label: "Contexto Criativo",
    category: "Campanhas",
  },
  {
    functionName: "generate-visual-creative",
    label: "Criativo Visual",
    category: "Campanhas",
  },

  // Vídeo & YouTube
  {
    functionName: "generate-video-script",
    label: "Roteiro de Vídeo",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-video-suggestions",
    label: "Sugestões de Vídeo",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-youtube-description",
    label: "Descrição YouTube",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-youtube-titles",
    label: "Títulos YouTube",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-youtube-thumbnail",
    label: "Thumbnail YouTube",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-presentation-slides",
    label: "Slides de Apresentação",
    category: "Vídeo & YouTube",
  },
  {
    functionName: "generate-slide-image",
    label: "Imagem de Slide",
    category: "Vídeo & YouTube",
  },

  // Imagens & Carrosséis
  {
    functionName: "generate-image-ai",
    label: "Gerador de Imagem IA",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "regenerate-carousel-images",
    label: "Regenerar Carrossel",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-carousel-generator",
    label: "Gerador Diário de Carrossel",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-carousel-generator-stream",
    label: "Gerador Diário (Stream)",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-ad-generator",
    label: "Gerador Diário de Anúncios",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "daily-creative-generator",
    label: "Gerador Diário de Criativos",
    category: "Imagens & Carrosséis",
  },
  {
    functionName: "validate-image-text",
    label: "Validar Texto em Imagem",
    category: "Imagens & Carrosséis",
  },

  // Utilitários
  {
    functionName: "translate-text",
    label: "Tradução de Texto",
    category: "Utilitários",
  },
  {
    functionName: "validate-text-grammar",
    label: "Validação Gramatical",
    category: "Utilitários",
  },
  {
    functionName: "validate-portuguese",
    label: "Validação de Português",
    category: "Utilitários",
  },
  {
    functionName: "organize-tasks-with-ai",
    label: "Organizar Tarefas com IA",
    category: "Utilitários",
  },
  {
    functionName: "prioritize-notification",
    label: "Priorizar Notificações",
    category: "Utilitários",
  },
  {
    functionName: "extract-image-text",
    label: "Extrair Texto de Imagem",
    category: "Utilitários",
  },
  {
    functionName: "sync-release-notes",
    label: "Sincronizar Release Notes",
    category: "Utilitários",
  },
  {
    functionName: "google-meet-process-summary",
    label: "Resumo Google Meet",
    category: "Utilitários",
  },
  {
    functionName: "prospect-google-leads",
    label: "Prospecção Google Leads",
    category: "Utilitários",
  },
  {
    functionName: "shotstack-webhook",
    label: "Webhook Shotstack",
    category: "Utilitários",
  },
  {
    functionName: "squad-orchestrator",
    label: "Orquestrador de Squad",
    category: "Utilitários",
  },
  {
    functionName: "generate-weekly-insights",
    label: "Insights Semanais",
    category: "Utilitários",
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/ai/aiModelFunctions.ts
git commit -m "feat: registrar definições de funções IA"
```

### Task 10: Componente ModelSelectorModal

**Files:**

- Create: `src/components/settings/ai/ModelSelectorModal.tsx`

- [ ] **Step 1: Criar o modal de seleção**

```typescript
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Search, Loader2 } from "lucide-react";
import { useOpenRouterModels, OpenRouterModel } from "@/hooks/useOpenRouterModels";
import { useAIFavoriteModels } from "@/hooks/useAIFavoriteModels";
import { cn } from "@/lib/utils";

interface ModelSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (modelId: string) => void;
  selectedModelId?: string;
  title?: string;
}

function getProviderFromId(modelId: string): string {
  return modelId.split("/")[0] || "unknown";
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (num === 0) return "Grátis";
  if (num < 0.001) return `$${(num * 1_000_000).toFixed(2)}/M`;
  return `$${(num * 1_000_000).toFixed(2)}/M`;
}

export function ModelSelectorModal({
  open,
  onOpenChange,
  onSelect,
  selectedModelId,
  title = "Selecionar Modelo",
}: ModelSelectorModalProps) {
  const { models, isLoading } = useOpenRouterModels();
  const { favorites, toggleFavorite } = useAIFavoriteModels();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  const providers = useMemo(() => {
    const set = new Set(models.map((m) => getProviderFromId(m.id)));
    return Array.from(set).sort();
  }, [models]);

  const filteredModels = useMemo(() => {
    let result = models;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.id.toLowerCase().includes(q) ||
          m.name.toLowerCase().includes(q),
      );
    }

    if (providerFilter) {
      result = result.filter((m) => getProviderFromId(m.id) === providerFilter);
    }

    // Favoritos no topo
    result.sort((a, b) => {
      const aFav = favorites.includes(a.id) ? 0 : 1;
      const bFav = favorites.includes(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [models, search, providerFilter, favorites]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Provider filters */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={providerFilter === null ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setProviderFilter(null)}
          >
            Todos
          </Badge>
          {providers.map((p) => (
            <Badge
              key={p}
              variant={providerFilter === p ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setProviderFilter(p === providerFilter ? null : p)}
            >
              {p}
            </Badge>
          ))}
        </div>

        {/* Models list */}
        <ScrollArea className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredModels.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Nenhum modelo encontrado
            </p>
          ) : (
            <div className="space-y-1">
              {filteredModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelect(model.id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors",
                    "hover:bg-muted/50",
                    selectedModelId === model.id && "bg-primary/10 ring-1 ring-primary",
                  )}
                >
                  {/* Favorite */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite.mutate(model.id);
                    }}
                    className="shrink-0"
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        favorites.includes(model.id)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground",
                      )}
                    />
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{model.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{model.id}</p>
                  </div>

                  {/* Meta */}
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {model.context_length
                        ? `${(model.context_length / 1000).toFixed(0)}k ctx`
                        : "—"}
                    </p>
                    {model.pricing && (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(model.pricing.prompt)} in
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/ai/ModelSelectorModal.tsx
git commit -m "feat: criar componente ModelSelectorModal"
```

### Task 11: Página AISettings

**Files:**

- Create: `src/components/settings/ai/AISettings.tsx`

- [ ] **Step 1: Criar o componente da página**

```typescript
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Save, Settings2, Loader2, Trash2 } from "lucide-react";
import { useAIModelConfigs } from "@/hooks/useAIModelConfigs";
import { useAIApiKey } from "@/hooks/useAIApiKey";
import { ModelSelectorModal } from "./ModelSelectorModal";
import { AI_FUNCTIONS, AI_FUNCTION_CATEGORIES, AIFunctionDef } from "./aiModelFunctions";

export function AISettings() {
  const { configs, upsertConfig, deleteConfig } = useAIModelConfigs();
  const { maskedKey, hasKey, saveKey } = useAIApiKey();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState<{
    functionName: string;
    field: "primary" | "fallback";
  } | null>(null);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) return;
    saveKey.mutate(apiKeyInput.trim());
    setApiKeyInput("");
  };

  const handleOpenModelSelector = (functionName: string, field: "primary" | "fallback") => {
    setModalTarget({ functionName, field });
    setModalOpen(true);
  };

  const handleModelSelect = (modelId: string) => {
    if (!modalTarget) return;
    const existing = configs.find((c) => c.function_name === modalTarget.functionName);

    if (modalTarget.field === "primary") {
      upsertConfig.mutate({
        functionName: modalTarget.functionName,
        primaryModel: modelId,
        fallbackModel: existing?.fallback_model,
      });
    } else {
      upsertConfig.mutate({
        functionName: modalTarget.functionName,
        primaryModel: existing?.primary_model || modelId,
        fallbackModel: modelId,
      });
    }
  };

  const getModelLabel = (functionName: string, field: "primary" | "fallback"): string => {
    const config = configs.find((c) => c.function_name === functionName);
    if (!config) return field === "primary" ? "Padrão" : "Nenhum";
    const model = field === "primary" ? config.primary_model : config.fallback_model;
    return model || (field === "primary" ? "Padrão" : "Nenhum");
  };

  return (
    <div className="space-y-6">
      {/* API Key */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">API Key do OpenRouter</CardTitle>
          <CardDescription>
            Insira sua chave de API do OpenRouter para acessar os modelos de IA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasKey && (
            <p className="text-sm text-muted-foreground">
              Chave atual: <span className="font-mono">{maskedKey}</span>
            </p>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                placeholder={hasKey ? "Substituir chave existente..." : "sk-or-..."}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={handleSaveApiKey} disabled={!apiKeyInput.trim() || saveKey.isPending}>
              {saveKey.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de cache */}
      <p className="text-xs text-muted-foreground">
        Alterações podem levar até 1 minuto para entrar em vigor em todas as funções.
      </p>

      {/* Functions by category */}
      {AI_FUNCTION_CATEGORIES.map((category) => {
        const functions = AI_FUNCTIONS.filter((f) => f.category === category);
        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{category}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {functions.map((fn) => {
                  const hasConfig = configs.some((c) => c.function_name === fn.functionName);
                  return (
                    <div
                      key={fn.functionName}
                      className="flex items-center justify-between px-6 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{fn.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground truncate">
                            {getModelLabel(fn.functionName, "primary")}
                          </span>
                          {getModelLabel(fn.functionName, "fallback") !== "Nenhum" && (
                            <>
                              <span className="text-xs text-muted-foreground">→</span>
                              <span className="text-xs text-muted-foreground truncate">
                                {getModelLabel(fn.functionName, "fallback")}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {hasConfig && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => deleteConfig.mutate(fn.functionName)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenModelSelector(fn.functionName, "primary")}
                        >
                          <Settings2 className="h-3.5 w-3.5 mr-1.5" />
                          Modelo
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModelSelector(fn.functionName, "fallback")}
                        >
                          Fallback
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Model Selector Modal */}
      <ModelSelectorModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleModelSelect}
        selectedModelId={
          modalTarget
            ? getModelLabel(modalTarget.functionName, modalTarget.field) !== "Padrão" &&
              getModelLabel(modalTarget.functionName, modalTarget.field) !== "Nenhum"
              ? getModelLabel(modalTarget.functionName, modalTarget.field)
              : undefined
            : undefined
        }
        title={
          modalTarget
            ? `Selecionar ${modalTarget.field === "primary" ? "Modelo Principal" : "Modelo de Fallback"}`
            : "Selecionar Modelo"
        }
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/settings/ai/AISettings.tsx
git commit -m "feat: criar página AISettings"
```

### Task 12: Integrar na rota e no SettingsLayout

**Files:**

- Modify: `src/pages/Configuracoes.tsx` (adicionar rota)
- Modify: `src/components/settings/SettingsLayout.tsx` (adicionar item de nav)

- [ ] **Step 1: Adicionar rota em Configuracoes.tsx**

No topo do arquivo, adicionar import:

```typescript
import { AISettings } from "@/components/settings/ai/AISettings";
```

Dentro do `<Routes>`, adicionar:

```typescript
<Route path="ia" element={<AISettings />} />
```

- [ ] **Step 2: Adicionar item no SettingsLayout.tsx**

Importar o ícone:

```typescript
import { Brain } from "lucide-react";
```

Adicionar ao array `settingsNavItems`:

```typescript
{ title: "Inteligência Artificial", href: "/configuracoes/ia", icon: Brain, description: "Configurar modelos de IA" },
```

- [ ] **Step 3: Verificar build**

```bash
npm run build
```

Expected: Build sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Configuracoes.tsx src/components/settings/SettingsLayout.tsx
git commit -m "feat: integrar AISettings na rota /configuracoes/ia"
```

---

## Chunk 5: Migração das Edge Functions (Chat & Agentes + Análise)

> **Nota:** Este chunk migra as 16 primeiras funções. Os chunks seguintes (6, 7, 8) cobrem as demais categorias seguindo exatamente o mesmo padrão. Cada função segue os mesmos passos:
>
> 1. Substituir o fetch direto pela chamada `callAI()` ou `callAIVision()`
> 2. Remover imports de API key não mais necessários
> 3. Manter toda a lógica de negócio intacta (prompts, parsing, salvamento)

### Task 13: Migrar ai-chat

**Files:**

- Modify: `supabase/functions/ai-chat/index.ts`

- [ ] **Step 1: Adicionar import do gateway**

No topo do arquivo, após os imports existentes:

```typescript
import { callAI } from "../_shared/ai-gateway.ts";
```

- [ ] **Step 2: Substituir a chamada OpenAI**

Remover a constante `openAIApiKey` e a chamada `fetch("https://api.openai.com/...")`.

Substituir o bloco de chamada à OpenAI (linhas ~185-207) por:

```typescript
const result = await callAI({
  functionName: "ai-chat",
  companyId,
  systemPrompt,
  userPrompt,
  maxTokens: 1500,
  temperature: 0.7,
});

const aiResponse = result.content;
```

Manter todo o resto (save user message, save AI response, update title, etc.) inalterado.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/ai-chat/index.ts
git commit -m "refactor: migrar ai-chat para AI Gateway"
```

### Task 14-28: Migrar demais funções

> **Padrão idêntico para cada função.** Para cada Edge Function:
>
> 1. `import { callAI } from "../_shared/ai-gateway.ts";` (ou `callAIVision` se usa imagens)
> 2. Remover `Deno.env.get("OPENAI_API_KEY")` ou `Deno.env.get("OPENROUTER_API_KEY")`
> 3. Substituir `fetch("https://api.openai.com/...")` ou `fetch("https://openrouter.ai/...")` por `callAI()`
> 4. Manter `systemPrompt` e `userPrompt` existentes
> 5. Se usa `response_format: { type: "json_object" }`, passar `responseFormat` ao `callAI()`
> 6. Se usa imagem no content, usar `callAIVision()` com `images: [url]`
> 7. Commit individual: `git commit -m "refactor: migrar <function-name> para AI Gateway"`
>
> **Lista completa de funções a migrar (por ordem):**
>
> **Chat & Agentes (7):** ai-chat, ia-agent-chat, dm-agent-responder, telegram-agent-webhook, refine-script-chat, content-plan-chat, whatsapp-ai-assistant
>
> **Análise (9):** analyze-competitor-insights, generate-campaign-analysis, analyze-creative-caption, analyze-url-content, analyze-carousel-slides, score-generated-ad, generate-campaign-presentation-analysis, scrape-competitor-ads, youtube-posting-behavior-report
>
> **Geração de Conteúdo (10):** generate-content-ai, generate-instagram-auto-post, generate-wordpress-auto-post, generate-creative-texts, generate-creative-variations, generate-creative-suggestions, generate-element, generate-groupops-template, generate-skill-ai, generate-research-themes
>
> **Campanhas (8):** generate-campaign-strategy, generate-campaign-recommendation, generate-ai-campaign, generate-ai-campaign-image, generate-campaign-creatives, generate-client-briefing, generate-creative-context, generate-visual-creative
>
> **Vídeo & YouTube (7):** generate-video-script, generate-video-suggestions, generate-youtube-description, generate-youtube-titles, generate-youtube-thumbnail, generate-presentation-slides, generate-slide-image
>
> **Imagens & Carrosséis (7):** generate-image-ai, regenerate-carousel-images, daily-carousel-generator, daily-carousel-generator-stream, daily-ad-generator, daily-creative-generator, validate-image-text
>
> **Utilitários (12):** translate-text, validate-text-grammar, validate-portuguese, organize-tasks-with-ai, prioritize-notification, extract-image-text, sync-release-notes, google-meet-process-summary, prospect-google-leads, shotstack-webhook, squad-orchestrator, generate-weekly-insights
>
> **Total: ~60 funções** (excluindo DALL-E image gen e Whisper transcription que ficam fora do gateway)

- [ ] **Step final: Commit após cada lote de categoria**

```bash
git commit -m "refactor: migrar categoria <nome> para AI Gateway"
```

---

## Chunk 6: Deploy e Validação

### Task 29: Deploy das Edge Functions

- [ ] **Step 1: Deploy do gateway e da função auxiliar**

```bash
supabase functions deploy get-openrouter-models
```

- [ ] **Step 2: Deploy das funções migradas (por lote)**

Deploiar cada função migrada com:

```bash
supabase functions deploy <function-name>
```

- [ ] **Step 3: Testar no frontend**

1. Acessar `/configuracoes/ia`
2. Inserir API key do OpenRouter
3. Configurar modelo para `ai-chat` (ex: `anthropic/claude-sonnet-4`)
4. Ir em `/ia`, enviar mensagem e verificar que usa o modelo configurado
5. Remover configuração e verificar que volta ao modelo padrão

- [ ] **Step 4: Push final**

```bash
git push origin main
```
