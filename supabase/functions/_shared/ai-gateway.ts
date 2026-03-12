import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========================================
// AI Gateway — Módulo compartilhado
// Todas as Edge Functions devem usar este
// módulo para chamar LLMs via OpenRouter.
// ========================================

const DEFAULT_MODEL = "google/gemini-2.5-flash";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const CACHE_TTL_MS = 60_000; // 1 minuto

// Defaults por função — usado quando empresa não tem config específica
const FUNCTION_DEFAULTS: Record<
  string,
  { primary: string; fallback: string | null }
> = {
  // Análise
  "score-generated-ad": {
    primary: "openai/gpt-4o",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-campaign-presentation-analysis": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o",
  },
  "scrape-competitor-ads": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "youtube-posting-behavior-report": {
    primary: "google/gemini-2.5-pro",
    fallback: "openai/gpt-4o",
  },

  // Campanhas
  "generate-campaign-strategy": {
    primary: "anthropic/claude-3-opus",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-campaign-recommendation": {
    primary: "openai/gpt-4o",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-ai-campaign": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o",
  },
  "generate-ai-campaign-image": {
    primary: "openai/gpt-4o-mini",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-campaign-creatives": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o",
  },
  "generate-client-briefing": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "google/gemini-2.5-pro",
  },
  "generate-creative-context": {
    primary: "google/gemini-2.5-pro",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-visual-creative": {
    primary: "google/gemini-2.5-flash-image-preview",
    fallback: "google/gemini-2.5-flash-image-preview",
  },

  // Vídeo & YouTube
  "generate-video-script": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "google/gemini-2.5-pro",
  },
  "generate-video-suggestions": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o",
  },
  "generate-youtube-description": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "generate-youtube-titles": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o-mini",
  },
  "generate-youtube-thumbnail": {
    primary: "openai/gpt-4o",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-presentation-slides": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "google/gemini-2.5-pro",
  },
  "generate-slide-image": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "transcribe-youtube-video": {
    primary: "google/gemini-2.5-flash",
    fallback: "openai/gpt-4o-mini",
  },

  // Imagens & Carrosséis
  "generate-image-ai": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o-mini",
  },
  "regenerate-carousel-images": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o",
  },
  "daily-carousel-generator": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "google/gemini-2.5-pro",
  },
  "daily-carousel-generator-stream": {
    primary: "google/gemini-2.5-flash",
    fallback: "openai/gpt-4o-mini",
  },
  "daily-ad-generator": {
    primary: "openai/gpt-4o",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "daily-creative-generator": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "meta-llama/llama-3.1-70b-instruct",
  },
  "validate-image-text": {
    primary: "google/gemini-2.5-flash",
    fallback: "openai/gpt-4o-mini",
  },

  // Utilitários
  "translate-text": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "validate-text-grammar": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "validate-portuguese": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o-mini",
  },
  "organize-tasks-with-ai": {
    primary: "openai/gpt-4o",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "prioritize-notification": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "extract-image-text": {
    primary: "google/gemini-2.5-flash",
    fallback: "openai/gpt-4o",
  },
  "sync-release-notes": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "openai/gpt-4o",
  },
  "google-meet-process-summary": {
    primary: "google/gemini-2.5-pro",
    fallback: "openai/gpt-4o",
  },
  "prospect-google-leads": {
    primary: "openai/gpt-4o-mini",
    fallback: "google/gemini-2.5-flash",
  },
  "shotstack-webhook": {
    primary: "openai/gpt-4o-mini",
    fallback: "meta-llama/llama-3.1-8b-instruct",
  },
  "squad-orchestrator": {
    primary: "openai/gpt-4o",
    fallback: "anthropic/claude-3.5-sonnet",
  },
  "generate-weekly-insights": {
    primary: "anthropic/claude-3.5-sonnet",
    fallback: "google/gemini-2.5-pro",
  },
};

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
  modalities?: ("text" | "image")[];
  imageConfig?: {
    aspectRatio?: string;
    resolution?: string;
  };
}

export interface CallAIVisionOptions extends CallAIOptions {
  images: string[];
}

export interface CallAIResponse {
  content: string;
  model: string;
  provider: "openrouter";
  images?: string[];
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
  const fnDefault = FUNCTION_DEFAULTS[functionName];

  if (!companyId) {
    return {
      primaryModel: fnDefault?.primary || DEFAULT_MODEL,
      fallbackModel: fnDefault?.fallback || null,
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
    primaryModel: config?.primary_model || fnDefault?.primary || DEFAULT_MODEL,
    fallbackModel: config?.fallback_model || fnDefault?.fallback || null,
    apiKey: keyData?.openrouter_api_key || fallbackApiKey,
    cachedAt: Date.now(),
  };

  // Save to cache
  configCache.set(getCacheKey(companyId, functionName), result);

  return result;
}

// --- OpenRouter Call ---

interface OpenRouterResult {
  content: string;
  images?: string[];
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: unknown }>,
  maxTokens: number,
  temperature: number,
  responseFormat?: { type: "json_object" | "text" },
  modalities?: ("text" | "image")[],
  imageConfig?: { aspectRatio?: string; resolution?: string },
): Promise<OpenRouterResult> {
  const body: Record<string, unknown> = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  if (responseFormat) {
    body.response_format = responseFormat;
  }

  if (modalities) {
    body.modalities = modalities;
  }

  if (imageConfig) {
    const cfg: Record<string, string> = {};
    if (imageConfig.aspectRatio) cfg.aspect_ratio = imageConfig.aspectRatio;
    if (imageConfig.resolution) cfg.resolution = imageConfig.resolution;
    if (Object.keys(cfg).length > 0) body.image_config = cfg;
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
  const message = data.choices[0].message;

  // Extract images if present (OpenRouter returns images in message.images array)
  const images: string[] = [];
  if (message.images && Array.isArray(message.images)) {
    for (const img of message.images) {
      if (img.image_url?.url) {
        images.push(img.image_url.url);
      }
    }
  }

  return {
    content: message.content || "",
    images: images.length > 0 ? images : undefined,
  };
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
    modalities,
    imageConfig,
  } = options;

  const config = await resolveConfig(functionName, companyId);
  const startTime = Date.now();

  const messages = customMessages || [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Try primary model
  try {
    const result = await callOpenRouter(
      config.apiKey,
      config.primaryModel,
      messages,
      maxTokens,
      temperature,
      responseFormat,
      modalities,
      imageConfig,
    );

    const latency = Date.now() - startTime;
    console.log(
      `[AI Gateway] ${functionName} | model=${config.primaryModel} | ${latency}ms | success`,
    );

    return {
      content: result.content,
      model: config.primaryModel,
      provider: "openrouter",
      images: result.images,
    };
  } catch (primaryError) {
    console.warn(
      `[AI Gateway] ${functionName} | model=${config.primaryModel} | FAILED: ${(primaryError as Error).message}`,
    );

    // Try fallback if available
    if (config.fallbackModel) {
      try {
        const result = await callOpenRouter(
          config.apiKey,
          config.fallbackModel,
          messages,
          maxTokens,
          temperature,
          responseFormat,
          modalities,
          imageConfig,
        );

        const latency = Date.now() - startTime;
        console.log(
          `[AI Gateway] ${functionName} | fallback=${config.fallbackModel} | ${latency}ms | success`,
        );

        return {
          content: result.content,
          model: config.fallbackModel,
          provider: "openrouter",
          images: result.images,
        };
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
