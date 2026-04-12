import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { briefing, slides_count, company_id } = await req.json();

    if (!briefing || typeof briefing !== "string" || !briefing.trim()) {
      return new Response(
        JSON.stringify({ success: false, error: "briefing é obrigatório" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const n = slides_count ?? 6;

    const result = await callAI({
      functionName: "generate-carousel-prompt",
      companyId: company_id,
      systemPrompt:
        "Você é um especialista em marketing de conteúdo para Instagram. Cria prompts precisos e eficazes para gerar carrosséis de alto engajamento.",
      userPrompt: `Com base no briefing do cliente abaixo, crie um prompt detalhado para gerar um carrossel de Instagram com ${n} slides.\n\nO prompt deve descrever: tema principal, ângulo de abordagem, tom de voz, público-alvo e objetivo de conversão. Deve ser específico, orientado a resultados e em português. Responda APENAS com o prompt, sem introdução ou explicação.\n\nBriefing:\n${briefing}`,
      maxTokens: 400,
      temperature: 0.7,
    });

    return new Response(
      JSON.stringify({ success: true, prompt: result.content.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[generate-carousel-prompt] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
