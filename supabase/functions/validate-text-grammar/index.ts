// Deno.serve is available natively in modern Deno
import { callAI } from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin":
    Deno.env.get("FRONTEND_URL") ?? "https://controledetrafego.com.br",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    console.log("Validating text grammar:", text);

    const result = await callAI({
      functionName: "validate-text-grammar",
      systemPrompt: `Você é um especialista em português brasileiro. Sua função é corrigir e validar textos para uso em criativos visuais.

REGRAS CRÍTICAS:
- Corrija APENAS erros ortográficos, gramaticais e de pontuação
- NÃO altere o sentido, tom ou estilo do texto
- NÃO adicione ou remova palavras desnecessariamente
- NÃO mude a estrutura das frases se não houver erro
- Mantenha quebras de linha exatamente como estão
- REJEITE textos com palavras em inglês (exceto marcas/nomes próprios)
- REJEITE textos com "palavras IA" (palavras inventadas ou sem sentido)
- REJEITE textos com erros óbvios de digitação que possam ser "lixo"
- Se o texto já estiver correto, retorne-o igual
- Para textos problemáticos, retorne "TEXTO_REJEITADO: [motivo]"

EXEMPLOS DE REJEIÇÃO:
- "açouue" → TEXTO_REJEITADO: Palavra com erro óbvio de digitação
- "buy now" → TEXTO_REJEITADO: Contém palavras em inglês
- "xkjfkdsj" → TEXTO_REJEITADO: Contém palavras sem sentido

Responda APENAS com o texto corrigido, sem explicações.`,
      userPrompt: `Corrija apenas os erros de português neste texto:\n\n${text}`,
      maxTokens: 500,
      temperature: 0.3,
    });

    const correctedText = result.content.trim();

    console.log("Text validated successfully");

    return new Response(
      JSON.stringify({
        correctedText,
        hasChanges: correctedText !== text,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in validate-text-grammar function:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
