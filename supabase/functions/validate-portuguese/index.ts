import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PostContent {
  postId: string;
  objective?: string;
  headline?: string;
  subheadline?: string;
  caption?: string;
}

interface ValidationResult {
  postId: string;
  errors: {
    field: string;
    hasError: boolean;
    errorDetails?: string;
  }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { posts } = (await req.json()) as { posts: PostContent[] };

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Posts array is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prepare content for validation
    const contentToValidate = posts
      .map((post) => {
        const fields: { postId: string; field: string; text: string }[] = [];

        if (post.objective?.trim()) {
          fields.push({
            postId: post.postId,
            field: "objective",
            text: post.objective,
          });
        }
        if (post.headline?.trim()) {
          fields.push({
            postId: post.postId,
            field: "headline",
            text: post.headline,
          });
        }
        if (post.subheadline?.trim()) {
          fields.push({
            postId: post.postId,
            field: "subheadline",
            text: post.subheadline,
          });
        }
        if (post.caption?.trim()) {
          fields.push({
            postId: post.postId,
            field: "caption",
            text: post.caption,
          });
        }

        return fields;
      })
      .flat();

    if (contentToValidate.length === 0) {
      return new Response(JSON.stringify({ results: [], totalErrors: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create prompt for validation
    const textsForPrompt = contentToValidate
      .map(
        (item, idx) =>
          `[${idx}] postId: ${item.postId}, field: ${item.field}\n"${item.text}"`,
      )
      .join("\n\n");

    console.log("Validating", contentToValidate.length, "text fields");

    const result = await callAI({
      functionName: "validate-portuguese",
      systemPrompt: `Você é um revisor de português profissional. Analise os textos fornecidos e identifique erros de ortografia, gramática ou concordância em português brasileiro.

IMPORTANTE:
- Analise CADA texto individualmente
- Identifique APENAS erros reais de português (ortografia, gramática, concordância, pontuação incorreta)
- NÃO considere como erro: gírias intencionais, abreviações de internet, hashtags, emojis, estilo informal para redes sociais
- Seja rigoroso mas justo

Responda APENAS com um JSON válido no formato:
{
  "validations": [
    {
      "index": 0,
      "hasError": true,
      "errorDetails": "Descrição breve do erro encontrado"
    }
  ]
}

Se um texto não tem erros, coloque hasError: false e não inclua errorDetails.`,
      userPrompt: `Analise os seguintes textos em português e identifique erros:\n\n${textsForPrompt}`,
      temperature: 0.1,
      responseFormat: { type: "json_object" },
    });

    const content = result.content;

    console.log("AI response:", content);

    // Parse AI response
    let validations: {
      index: number;
      hasError: boolean;
      errorDetails?: string;
    }[] = [];
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        validations = parsed.validations || [];
      }
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
    }

    // Build results grouped by postId
    const resultsMap = new Map<string, ValidationResult>();

    // Initialize results for all posts
    posts.forEach((post) => {
      resultsMap.set(post.postId, {
        postId: post.postId,
        errors: [],
      });
    });

    // Map validations back to posts
    contentToValidate.forEach((item, idx) => {
      const validation = validations.find((v) => v.index === idx);
      const result = resultsMap.get(item.postId);

      if (result) {
        result.errors.push({
          field: item.field,
          hasError: validation?.hasError || false,
          errorDetails: validation?.errorDetails,
        });
      }
    });

    const results = Array.from(resultsMap.values());
    const totalErrors = results.reduce(
      (sum, r) => sum + r.errors.filter((e) => e.hasError).length,
      0,
    );

    console.log("Validation complete. Total errors found:", totalErrors);

    return new Response(JSON.stringify({ results, totalErrors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in validate-portuguese:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
