import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    console.log('Validating text grammar:', text);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em português brasileiro. Sua única função é corrigir erros de ortografia, gramática e pontuação, mantendo EXATAMENTE o mesmo sentido e estilo do texto original.

REGRAS IMPORTANTES:
- Corrija apenas erros ortográficos, gramaticais e de pontuação
- NÃO altere o sentido, tom ou estilo do texto
- NÃO adicione ou remova palavras desnecessariamente
- NÃO mude a estrutura das frases se não houver erro
- Mantenha quebras de linha exatamente como estão
- Se o texto já estiver correto, retorne-o igual

Responda APENAS com o texto corrigido, sem explicações.`
          },
          {
            role: 'user',
            content: `Corrija apenas os erros de português neste texto:\n\n${text}`
          }
        ],
        max_completion_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const correctedText = data.choices[0].message.content.trim();

    console.log('Text validated successfully');
    
    return new Response(JSON.stringify({ 
      correctedText,
      hasChanges: correctedText !== text
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in validate-text-grammar function:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});