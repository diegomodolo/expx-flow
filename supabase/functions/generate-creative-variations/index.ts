import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VariationOptions {
  changePoseExpression: boolean;
  varyComposition: boolean;
  alterColorPalette: boolean;
  varyBackground: boolean;
}

interface VariationRequest {
  baseImage: string;
  personImage?: string;
  text: string;
  designGuidance: string;
  variationOptions: VariationOptions;
  format: string;
  variationIndex: number;
  modelType?: "flash" | "pro";
  clientId?: string;
  companyId?: string;
}

// Generate image using Gemini API
async function generateImage(
  apiKey: string,
  prompt: string,
  contentArray: any[],
  model: string
): Promise<string | null> {
  console.log(`Calling Gemini API with model: ${model}`);
  
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: contentArray,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Gemini API error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your account.");
      }
      
      return null;
    }

    let data: any;
    try {
      const responseText = await response.text();
      if (!responseText || responseText.trim() === '') {
        console.error('Empty response from Gemini API');
        return null;
      }
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      return null;
    }

    const base64Url = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    const finishReason = data?.choices?.[0]?.finish_reason;
    if (
      finishReason === "IMAGE_OTHER" ||
      finishReason === "content_filter" ||
      finishReason === "safety"
    ) {
      console.log(`Model refused: ${finishReason}`);
      return null;
    }

    return base64Url || null;
  } catch (error) {
    console.error("Error in generateImage:", error);
    throw error;
  }
}

// Generate with retry logic and exponential backoff
async function generateWithRetry(
  apiKey: string,
  prompts: string[],
  contentArrays: any[][],
  model: string,
  maxRetries: number = 2
): Promise<string | null> {
  for (let promptIndex = 0; promptIndex < prompts.length; promptIndex++) {
    const prompt = prompts[promptIndex];
    const contentArray = contentArrays[promptIndex];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Prompt ${promptIndex + 1}/${prompts.length}, Attempt ${attempt}/${maxRetries}...`);
      
      try {
        const result = await generateImage(apiKey, prompt, contentArray, model);
        if (result) {
          console.log(`Success on prompt ${promptIndex + 1}, attempt ${attempt}`);
          return result;
        }
      } catch (error: any) {
        if (error.message?.includes("Rate limit") || error.message?.includes("Payment required")) {
          throw error;
        }
        console.error(`Attempt ${attempt} failed:`, error);
      }
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 500;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const body: VariationRequest = await req.json();
    const {
      baseImage,
      personImage,
      text,
      designGuidance,
      variationOptions,
      format,
      variationIndex,
      modelType = "flash",
      clientId,
      companyId,
    } = body;

    console.log(`Generating variation ${variationIndex + 1} for format: ${format}, model: ${modelType}`);

    // Fetch client context if clientId is provided
    let clientContext = "";
    if (clientId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

      const { data: clientData } = await supabaseAdmin
        .from("clients")
        .select("name, segment, ai_briefing")
        .eq("id", clientId)
        .maybeSingle();

      if (clientData) {
        const parts: string[] = [];
        parts.push(`Cliente: ${clientData.name}`);
        if (clientData.segment) parts.push(`Segmento: ${clientData.segment}`);
        if (clientData.ai_briefing) parts.push(`Briefing do cliente: ${clientData.ai_briefing}`);
        clientContext = parts.join("\n");
        console.log(`Client context loaded: ${clientData.name}`);
      }
    }

    const model = modelType === "pro" 
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-2.5-flash-image";

    console.log(`Using model: ${model}`);

    let aspectRatio = "4:5";
    let dimensions = { width: 1080, height: 1350 };

    if (format === "instagram_feed") {
      aspectRatio = "4:5";
      dimensions = { width: 1080, height: 1350 };
    } else if (format === "instagram_story" || format === "instagram_reels") {
      aspectRatio = "9:16";
      dimensions = { width: 1080, height: 1920 };
    } else if (format === "1:1") {
      aspectRatio = "1:1";
      dimensions = { width: 1080, height: 1080 };
    }

    // Build variation instructions
    const variationInstructions: string[] = [];
    
    const uniqueSeed = Math.random().toString(36).substring(2, 10);
    variationInstructions.push(`UNIQUE VARIATION SEED: ${uniqueSeed}`);

    if (variationOptions.varyComposition) {
      variationInstructions.push(`
COMPOSIÇÃO / LAYOUT — VARIAR:
- Mude a posição dos elementos (textos, pessoa, logo)
- Se a pessoa está à esquerda, mova para a direita ou centro
- Se o texto está em cima, mova para baixo ou lateral
- Mude o enquadramento ou zoom
- MAS MANTENHA todos os textos visíveis e legíveis`);
    }

    if (variationOptions.varyBackground) {
      variationInstructions.push(`
FUNDO / AMBIENTE — VARIAR:
- Mude o cenário de fundo
- ${clientContext ? "O novo fundo DEVE ser coerente com o segmento e briefing do cliente descrito acima" : "O novo fundo deve ser coerente com o contexto da imagem original"}
- Mantenha estética profissional de marketing
- NÃO coloque a pessoa/produto em cenários aleatórios — o fundo deve fazer sentido para o negócio do cliente`);
    }

    if (variationOptions.changePoseExpression) {
      variationInstructions.push(`
POSE / EXPRESSÃO — VARIAR (se houver pessoa):
- Mude a pose, ângulo ou expressão facial
- Mantenha a identidade da pessoa reconhecível
- Mantenha o estilo de roupa/vestuário coerente`);
    }

    if (variationOptions.alterColorPalette) {
      variationInstructions.push(`
PALETA DE CORES — VARIAR:
- Use um esquema de cores diferente
- Mantenha aspecto profissional de marketing`);
    } else {
      variationInstructions.push(`
PALETA DE CORES — PRESERVAR EXATAMENTE:
- Mantenha EXATAMENTE as mesmas cores da imagem de referência
- Mesma temperatura de cor, mesmos tons
- NÃO altere o esquema de cores de forma alguma`);
    }

    // Text preservation is ALWAYS mandatory
    const textPreservationInstruction = `
═══════════════════════════════════════════════════════════
REGRA MAIS IMPORTANTE — PRESERVAÇÃO DE TEXTOS (OBRIGATÓRIO):
═══════════════════════════════════════════════════════════

1. ANALISE a imagem de referência e IDENTIFIQUE todos os textos presentes nela (títulos, subtítulos, calls-to-action, nomes, números, etc.)

2. TODOS os textos encontrados na imagem original DEVEM aparecer na variação gerada.
   - Você pode REPOSICIONAR os textos (mudar de lugar)
   - Você pode REFORMULAR levemente o texto (parafrasear mantendo o sentido)
   - Você NÃO PODE REMOVER textos
   - Você NÃO PODE omitir nenhum texto que existia na original

3. Os textos devem ser LEGÍVEIS e com ALTO CONTRASTE:
   - Use fundo sólido ou semi-transparente atrás do texto se necessário
   - Use sombra no texto para garantir legibilidade
   - Fontes em negrito ou semibold para títulos
   - NUNCA coloque texto sobre fundo complexo sem tratamento de contraste

4. ${text ? `Texto adicional fornecido pelo usuário para incluir: "${text}"` : "Nenhum texto adicional — use APENAS os textos que já existem na imagem de referência."}

5. Os textos são a PARTE MAIS IMPORTANTE dessas imagens de marketing.
   Sem os textos, a imagem perde completamente seu propósito.
═══════════════════════════════════════════════════════════`;

    const clientContextInstruction = clientContext 
      ? `\nCONTEXTO DO CLIENTE (use para manter coerência):\n${clientContext}\n`
      : "";

    const designInstruction = designGuidance 
      ? `\nORIENTAÇÃO DE DESIGN: ${designGuidance}`
      : "";

    const identityInstruction = personImage
      ? "\nPRESERVAÇÃO DE IDENTIDADE: Mantenha a pessoa da segunda imagem de referência reconhecível."
      : "";

    const mainPrompt = `Crie a VARIAÇÃO #${variationIndex + 1} desta imagem de marketing.

FORMATO: ${aspectRatio} (${dimensions.width}x${dimensions.height}px)
Qualidade profissional de marketing para redes sociais.

${clientContextInstruction}

${textPreservationInstruction}

INSTRUÇÕES DE VARIAÇÃO:
${variationInstructions.join('\n\n')}

${designInstruction}

${identityInstruction}

RESUMO: Gere uma variação que mantenha TODOS os textos da imagem original (reposicionados se necessário), respeite as opções marcadas acima, e seja coerente com o contexto do cliente. A variação deve parecer uma versão alternativa do mesmo anúncio, NÃO uma imagem completamente diferente.`;

    const fallbackPrompt = `Crie uma variação profissional desta imagem de marketing.
Formato: ${aspectRatio}
Variação número: ${variationIndex + 1}

REGRA CRÍTICA: Copie TODOS os textos que aparecem na imagem de referência para a nova imagem. Os textos são obrigatórios e devem ser legíveis.

${text ? `Texto adicional: "${text}"` : ""}
${designGuidance ? `Estilo: ${designGuidance}` : ""}
${clientContext ? `Contexto: ${clientContext}` : ""}

A variação deve parecer uma versão alternativa do mesmo anúncio, com todos os textos preservados.`;

    const minimalPrompt = `Crie uma variação desta imagem de marketing (${aspectRatio}). COPIE TODOS OS TEXTOS da imagem original para a nova imagem. Textos devem ser legíveis. Variação ${variationIndex + 1}. ${text ? `Texto: "${text}".` : ""} Design profissional.`;

    // Build content arrays
    const baseContent: any[] = [
      { type: "text", text: mainPrompt },
      { type: "image_url", image_url: { url: baseImage } },
    ];
    if (personImage) {
      baseContent.push({ type: "image_url", image_url: { url: personImage } });
    }

    const fallbackContent: any[] = [
      { type: "text", text: fallbackPrompt },
      { type: "image_url", image_url: { url: baseImage } },
    ];
    if (personImage) {
      fallbackContent.push({ type: "image_url", image_url: { url: personImage } });
    }

    const minimalContent: any[] = [
      { type: "text", text: minimalPrompt },
      { type: "image_url", image_url: { url: baseImage } },
    ];

    const base64Url = await generateWithRetry(
      LOVABLE_API_KEY,
      [mainPrompt, fallbackPrompt, minimalPrompt],
      [baseContent, fallbackContent, minimalContent],
      model,
      2
    );

    if (!base64Url) {
      console.error("All generation attempts failed");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível gerar a imagem. Tente novamente.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload to Supabase storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const base64Data = base64Url.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `variations/${Date.now()}-${variationIndex}-${format}.png`;

    const { error: uploadError } = await supabase.storage
      .from("ai-generated-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: base64Url,
          format,
          variationIndex,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from("ai-generated-images")
      .getPublicUrl(fileName);

    console.log(`Successfully generated variation ${variationIndex + 1}`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrlData.publicUrl,
        format,
        variationIndex,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-creative-variations:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
