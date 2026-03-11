import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, texts, targetLanguage = "pt-BR" } = await req.json();

    // Handle batch translation
    if (texts && Array.isArray(texts)) {
      console.log(`Translating batch of ${texts.length} texts`);

      const translations: Record<string, string> = {};

      // Process in chunks of 10
      const chunks = [];
      for (let i = 0; i < texts.length; i += 10) {
        chunks.push(texts.slice(i, i + 10));
      }

      for (const chunk of chunks) {
        const prompt = `Translate the following titles from English to Brazilian Portuguese.
Keep them natural and engaging for YouTube content.
Return ONLY a JSON object where keys are the original texts and values are the translations.
Do not add any explanation or markdown.

Titles to translate:
${chunk.map((t: string, i: number) => `${i + 1}. "${t}"`).join("\n")}`;

        try {
          const result = await callAI({
            functionName: "translate-text",
            systemPrompt:
              "You are a professional translator specializing in YouTube content. Translate titles naturally and engagingly.",
            userPrompt: prompt,
            temperature: 0.3,
          });

          const content = result.content;

          try {
            // Parse JSON from response
            const cleanContent = content
              .replace(/```json\n?|\n?```/g, "")
              .trim();
            const chunkTranslations = JSON.parse(cleanContent);
            Object.assign(translations, chunkTranslations);
          } catch (parseError) {
            console.error("Parse error:", parseError, "Content:", content);
          }
        } catch (chunkError) {
          console.error("AI error for chunk:", chunkError);
          continue;
        }
      }

      return new Response(JSON.stringify({ success: true, translations }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle single text translation
    if (text) {
      console.log(`Translating single text: ${text.substring(0, 50)}...`);

      const result = await callAI({
        functionName: "translate-text",
        systemPrompt:
          "You are a professional translator. Translate the given text naturally to Brazilian Portuguese. Return only the translation, nothing else.",
        userPrompt: `Translate this YouTube title to Brazilian Portuguese: "${text}"`,
        temperature: 0.3,
      });

      const translatedText = result.content.trim();

      return new Response(JSON.stringify({ success: true, translatedText }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("No text provided for translation");
  } catch (error: unknown) {
    console.error("Error in translate-text:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
