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
    const { clientId, companyId, clientContext, count = 5 } = await req.json();

    console.log('Generating video suggestions for client:', clientId);

    if (!clientId || !companyId) {
      throw new Error('Client ID and Company ID are required');
    }

    // Fetch top performing videos from monitored channels
    const { data: topVideos } = await supabase
      .from('youtube_video_analyses')
      .select('*')
      .eq('client_id', clientId)
      .order('engagement_rate', { ascending: false })
      .limit(20);

    if (!topVideos || topVideos.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        suggestions: [],
        message: 'No analyzed videos found. Add and analyze channels first.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Analyze themes and patterns
    const videoSummary = topVideos.map(v => ({
      title: v.title,
      engagement: v.engagement_rate,
      views: v.view_count,
      theme: v.ai_theme_analysis,
    }));

    const prompt = `Analise os vídeos de maior sucesso e gere ${count} sugestões de vídeos para criar.

VÍDEOS DE ALTO ENGAJAMENTO ANALISADOS:
${videoSummary.map(v => `- "${v.title}" (${v.views?.toLocaleString()} views, ${v.engagement?.toFixed(2)}% engajamento)${v.theme ? ` - Tema: ${v.theme}` : ''}`).join('\n')}

${clientContext ? `CONTEXTO DO CLIENTE/CANAL:\n${clientContext}` : ''}

Gere ${count} sugestões de vídeos que:
1. Aproveitem os temas de maior sucesso identificados
2. Tenham potencial de alto engajamento
3. Sejam relevantes para o nicho do canal
4. Tenham diferenciação dos vídeos existentes
5. Incluam formatos variados (tutorial, listicle, storytelling, etc.)

Retorne em JSON:
{
  "analysis": "Breve análise dos padrões identificados",
  "suggestions": [
    {
      "title": "Título sugerido para o vídeo",
      "description": "Descrição do conceito e abordagem",
      "theme_category": "tutorial|listicle|storytelling|comparação|análise|entretenimento",
      "based_on": ["IDs ou títulos dos vídeos de referência"],
      "estimated_engagement": "alto|médio",
      "differentiation": "O que torna esse vídeo único"
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
            content: 'Você é um estrategista de conteúdo especializado em YouTube. Analise padrões de sucesso e sugira vídeos com alto potencial de engajamento. Retorne apenas JSON válido.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_completion_tokens: 2000,
        temperature: 0.8,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('OpenAI error:', error);
      throw new Error('Failed to generate suggestions');
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    console.log('Generated', result.suggestions?.length || 0, 'suggestions');

    // Save suggestions to database
    const savedSuggestions = [];
    for (const suggestion of result.suggestions || []) {
      const { data: saved, error } = await supabase
        .from('youtube_content_suggestions')
        .insert({
          client_id: clientId,
          company_id: companyId,
          title: suggestion.title,
          description: suggestion.description,
          based_on_videos: suggestion.based_on || [],
          theme_category: suggestion.theme_category,
          estimated_engagement: suggestion.estimated_engagement,
          status: 'pending',
        })
        .select()
        .single();

      if (!error && saved) {
        savedSuggestions.push({
          ...saved,
          differentiation: suggestion.differentiation,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      analysis: result.analysis,
      suggestions: savedSuggestions,
      analyzedVideosCount: topVideos.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-video-suggestions:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
