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
