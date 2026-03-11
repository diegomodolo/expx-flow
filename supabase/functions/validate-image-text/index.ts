import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAI, callAIVision } from "../_shared/ai-gateway.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Extract text from image using AI Vision
async function extractTextFromImage(imageUrl: string): Promise<string> {
  console.log("Extracting text from image:", imageUrl);

  const userPrompt = `Extraia TODO o texto visível em português nesta imagem.
                     Se não houver texto em português, responda "SEM_TEXTO".
                     Responda APENAS com o texto encontrado, sem explicações.
                     Mantenha a formatação original (quebras de linha, etc).`;

  const result = await callAIVision({
    functionName: "validate-image-text",
    systemPrompt: "",
    userPrompt,
    images: [imageUrl],
  });

  const extractedText = result.content.trim() || "SEM_TEXTO";
  console.log("Extracted text:", extractedText.substring(0, 100) + "...");

  return extractedText;
}

// Validate text grammar using AI Gateway
async function validateGrammar(
  text: string,
): Promise<{ hasErrors: boolean; correctedText: string; errors: string[] }> {
  console.log("Validating grammar for text:", text.substring(0, 100) + "...");

  const systemPrompt = `Você é um revisor especializado em português brasileiro.
                    Analise o texto e identifique APENAS erros claros de ortografia e gramática.

                    IGNORAR:
                    - Estilo coloquial propositado
                    - Abreviações intencionais
                    - Gírias e expressões informais
                    - Uso criativo de linguagem em marketing
                    - Hashtags
                    - Emojis

                    REPORTAR:
                    - Erros de ortografia evidentes
                    - Concordância verbal/nominal incorreta
                    - Acentuação errada
                    - Palavras escritas incorretamente

                    Responda em JSON:
                    {
                      "hasErrors": boolean,
                      "correctedText": "texto corrigido ou original se não houver erros",
                      "errors": ["lista de erros encontrados com explicação breve"]
                    }`;

  try {
    const result = await callAI({
      functionName: "validate-image-text",
      systemPrompt,
      userPrompt: `Verifique este texto:\n\n${text}`,
    });

    const content = result.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        hasErrors: parsed.hasErrors === true,
        correctedText: parsed.correctedText || text,
        errors: parsed.errors || [],
      };
    }
  } catch (e) {
    console.error("Grammar validation failed:", e);
  }

  return { hasErrors: false, correctedText: text, errors: [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageUrls, postId } = await req.json();

    const urlsToValidate = imageUrls || (imageUrl ? [imageUrl] : []);

    if (urlsToValidate.length === 0) {
      throw new Error("No image URL(s) provided");
    }

    console.log(`Validating ${urlsToValidate.length} image(s)...`);

    const allErrors: string[] = [];
    let hasTextInAnyImage = false;

    for (let i = 0; i < urlsToValidate.length; i++) {
      const url = urlsToValidate[i];
      console.log(`Processing image ${i + 1}/${urlsToValidate.length}...`);

      try {
        const extractedText = await extractTextFromImage(url);

        if (
          extractedText &&
          extractedText !== "SEM_TEXTO" &&
          extractedText.length > 3
        ) {
          hasTextInAnyImage = true;
          const validation = await validateGrammar(extractedText);

          if (validation.hasErrors) {
            for (const error of validation.errors) {
              allErrors.push(`Imagem ${i + 1}: ${error}`);
            }
          }
        }
      } catch (imgError) {
        console.error(`Error processing image ${i + 1}:`, imgError);
        // Continue with other images
      }
    }

    const result = {
      success: true,
      hasText: hasTextInAnyImage,
      hasErrors: allErrors.length > 0,
      errors: allErrors,
      validatedAt: new Date().toISOString(),
    };

    // If postId provided, update the post record
    if (postId) {
      const { error: updateError } = await supabase
        .from("instagram_auto_posts")
        .update({
          grammar_validated: true,
          grammar_errors: allErrors.length > 0 ? allErrors : null,
        })
        .eq("id", postId);

      if (updateError) {
        console.error("Error updating post:", updateError);
      }
    }

    console.log("Validation result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in validate-image-text:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
