import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const { posts } = await req.json() as { posts: PostContent[] };

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      return new Response(
        JSON.stringify({ error: "Posts array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare content for validation
    const contentToValidate = posts.map(post => {
      const fields: { postId: string; field: string; text: string }[] = [];
      
      if (post.objective?.trim()) {
        fields.push({ postId: post.postId, field: "objective", text: post.objective });
      }
      if (post.headline?.trim()) {
        fields.push({ postId: post.postId, field: "headline", text: post.headline });
      }
      if (post.subheadline?.trim()) {
        fields.push({ postId: post.postId, field: "subheadline", text: post.subheadline });
      }
      if (post.caption?.trim()) {
        fields.push({ postId: post.postId, field: "caption", text: post.caption });
      }
      
      return fields;
    }).flat();

    if (contentToValidate.length === 0) {
      return new Response(
        JSON.stringify({ results: [], totalErrors: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create prompt for validation
    const textsForPrompt = contentToValidate.map((item, idx) => 
      `[${idx}] postId: ${item.postId}, field: ${item.field}\n"${item.text}"`
    ).join("\n\n");

    console.log("Validating", contentToValidate.length, "text fields");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Você é um revisor de português profissional. Analise os textos fornecidos e identifique erros de ortografia, gramática ou concordância em português brasileiro.

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

Se um texto não tem erros, coloque hasError: false e não inclua errorDetails.`
          },
          {
            role: "user",
            content: `Analise os seguintes textos em português e identifique erros:\n\n${textsForPrompt}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("AI response:", content);

    // Parse AI response
    let validations: { index: number; hasError: boolean; errorDetails?: string }[] = [];
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
    posts.forEach(post => {
      resultsMap.set(post.postId, {
        postId: post.postId,
        errors: []
      });
    });

    // Map validations back to posts
    contentToValidate.forEach((item, idx) => {
      const validation = validations.find(v => v.index === idx);
      const result = resultsMap.get(item.postId);
      
      if (result) {
        result.errors.push({
          field: item.field,
          hasError: validation?.hasError || false,
          errorDetails: validation?.errorDetails
        });
      }
    });

    const results = Array.from(resultsMap.values());
    const totalErrors = results.reduce((sum, r) => 
      sum + r.errors.filter(e => e.hasError).length, 0
    );

    console.log("Validation complete. Total errors found:", totalErrors);

    return new Response(
      JSON.stringify({ results, totalErrors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in validate-portuguese:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
