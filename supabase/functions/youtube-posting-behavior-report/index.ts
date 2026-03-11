import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { summaryData } = await req.json();

    const aiResult = await callAI({
      functionName: "youtube-posting-behavior-report",
      systemPrompt: `Você é um analista especialista em YouTube e marketing de conteúdo.
Receba os dados de comportamento de postagem de canais do YouTube e gere um relatório objetivo em português brasileiro.

O relatório deve conter:
1. **Resumo Geral**: Panorama geral da atividade dos canais monitorados.
2. **Frequência Ideal**: Com base nos dados, recomendar quantos vídeos por semana são ideais.
3. **Melhores Horários**: Quais horários apresentam mais publicações e melhor engajamento. Recomendar horários de postagem.
4. **Tipos de Conteúdo**: Quais formatos (Shorts, vídeos curtos, médios, longos) performam melhor e recomendar a proporção ideal.
5. **Padrões por Canal**: Destacar diferenças notáveis entre os canais.
6. **Recomendações Práticas**: Lista de 3-5 ações concretas baseadas nos dados.

Seja direto, use dados numéricos e formate com Markdown.`,
      userPrompt: `Aqui estão os dados de comportamento de postagem dos canais monitorados:\n\n${JSON.stringify(summaryData, null, 2)}`,
    });

    const report = aiResult.content || "Relatório não disponível.";

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
