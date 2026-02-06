import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scriptId, topic, style = 'mixed' } = await req.json();

    console.log('Generating titles for:', topic || 'script');

    let scriptContent = '';
    let scriptTitle = topic || '';
    
    // Fetch script if provided
    if (scriptId) {
      const { data: script } = await supabase
        .from('youtube_scripts')
        .select('*')
        .eq('id', scriptId)
        .single();

      if (script) {
        scriptContent = script.script_content;
        scriptTitle = script.title;
      }
    }

    const stylePrompts: Record<string, string> = {
      curiosity: 'Foque em gatilhos de curiosidade: segredos, revelações, mistérios, "o que ninguém te conta"',
      urgency: 'Foque em gatilhos de urgência: "agora", "hoje", "antes que", "não cometa esse erro"',
      benefit: 'Foque em benefícios claros: resultados, transformações, "como conseguir", números específicos',
      provocative: 'Foque em provocações: "pare de fazer isso", "nunca mais", "o maior erro"',
      mixed: 'Use uma variedade de gatilhos: curiosidade, urgência, benefício e provocação',
    };

    const prompt = `Gere 8 títulos altamente engajantes para um vídeo do YouTube.

TEMA/CONTEXTO:
${scriptTitle}

${scriptContent ? `RESUMO DO ROTEIRO:\n${scriptContent.substring(0, 1500)}...` : ''}

ESTILO SOLICITADO:
${stylePrompts[style] || stylePrompts.mixed}

REGRAS PARA TÍTULOS:
1. Entre 40-60 caracteres idealmente (máximo 70)
2. Use CAPS estrategicamente para palavras-chave (não exagere)
3. Inclua números quando fizer sentido
4. Evite clickbait sem entrega real
5. Provoque emoção ou curiosidade
6. Seja específico, não genérico

FORMATOS QUE FUNCIONAM:
- "Como [RESULTADO] em [TEMPO/PASSOS]"
- "[NÚMERO] [COISAS] que [BENEFÍCIO]"
- "Por que [PROBLEMA] (e como resolver)"
- "O ERRO que [CONSEQUÊNCIA NEGATIVA]"
- "[AFIRMAÇÃO CHOCANTE] - Entenda"
- "PARE de [ERRO COMUM] AGORA"

Retorne em formato JSON:
{
  "titles": [
    {
      "title": "O título aqui",
      "trigger": "curiosidade|urgência|benefício|provocação",
      "ctr_estimate": "alta|média",
      "explanation": "Por que esse título funciona"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'Você é especialista em títulos virais para YouTube. Retorne apenas JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 1500,
        temperature: 0.9,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI error:', error);
      throw new Error('Failed to generate titles');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    // Update script with new titles if provided
    if (scriptId && result.titles) {
      const newTitles = result.titles.map((t: any) => t.title);
      
      const { data: currentScript } = await supabase
        .from('youtube_scripts')
        .select('suggested_titles')
        .eq('id', scriptId)
        .single();

      const existingTitles = currentScript?.suggested_titles || [];
      const allTitles = [...new Set([...existingTitles, ...newTitles])];

      await supabase
        .from('youtube_scripts')
        .update({ suggested_titles: allTitles.slice(0, 20) }) // Keep max 20 titles
        .eq('id', scriptId);
    }

    console.log('Generated', result.titles?.length || 0, 'titles');

    return new Response(JSON.stringify({
      success: true,
      titles: result.titles || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-youtube-titles:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
