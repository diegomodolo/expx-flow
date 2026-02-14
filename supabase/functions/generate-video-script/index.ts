import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateScript(topic: string, clientContext: string, referenceVideos: any[], durationTarget: number): Promise<string> {
  const durationMinutes = Math.round(durationTarget / 60);
  
  const prompt = `Crie um roteiro completo para vídeo do YouTube sobre "${topic}".

CONTEXTO DO CLIENTE/CANAL:
${clientContext}

REFERÊNCIAS DE VÍDEOS DE SUCESSO (analisar estilo e abordagem):
${referenceVideos.map(v => `- "${v.title}" (${v.view_count?.toLocaleString()} views, ${v.engagement_rate?.toFixed(2)}% engajamento)`).join('\n')}

DURAÇÃO ALVO: ${durationMinutes} minutos

ESTRUTURA OBRIGATÓRIA DO ROTEIRO:

## 🎬 HOOK (0-15 segundos)
[Gancho inicial impactante para prender atenção imediatamente]
- Frase de abertura poderosa
- Pergunta provocativa ou dado surpreendente
- Promessa do que o vídeo entregará

## 📌 INTRODUÇÃO (15-45 segundos)
[Apresentação do tema e promessa de valor]
- O que será abordado
- Por que isso é importante
- O que o espectador vai aprender/ganhar

## 📖 DESENVOLVIMENTO

### Ponto 1 - [Nome do tópico]
**Timestamp sugerido:** XX:XX
[Conteúdo detalhado do primeiro ponto principal]

### Ponto 2 - [Nome do tópico]
**Timestamp sugerido:** XX:XX
[Conteúdo detalhado do segundo ponto principal]

### Ponto 3 - [Nome do tópico]
**Timestamp sugerido:** XX:XX
[Conteúdo detalhado do terceiro ponto principal]

(Adicione mais pontos conforme necessário para a duração)

## 🎯 CTA (últimos 30 segundos)
[Call to action claro e convincente]
- Pedido de like e inscrição
- Comentário sugerido
- Próximo vídeo recomendado

## 📝 NOTAS DE PRODUÇÃO
- **B-roll sugerido:** [Lista de imagens/vídeos de apoio]
- **Gráficos/Texto na tela:** [Momentos para inserir elementos visuais]
- **Tom de voz:** [Descrição do estilo de apresentação]
- **Música:** [Sugestão de estilo/mood da trilha]

---

Escreva o roteiro completo, detalhado e pronto para gravação. Use linguagem natural e envolvente.`;

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
          content: 'Você é um roteirista profissional especializado em vídeos para YouTube. Crie roteiros envolventes, bem estruturados e otimizados para retenção de audiência. Use técnicas de storytelling e gatilhos de engajamento.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 4000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI error:', error);
    throw new Error('Failed to generate script');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function generateTitles(topic: string, referenceVideos: any[]): Promise<string[]> {
  const prompt = `Gere 5 títulos altamente engajantes para um vídeo do YouTube sobre: "${topic}"

REFERÊNCIAS DE TÍTULOS DE SUCESSO:
${referenceVideos.slice(0, 5).map(v => `- "${v.title}"`).join('\n')}

Use gatilhos mentais como:
- Curiosidade (números, segredos, revelações)
- Urgência (agora, hoje, antes que)
- Benefício claro (como, por que, resultado)
- Provocação (pare de, nunca mais, erro)
- Exclusividade (poucos sabem, revelado)

IMPORTANTE:
- Títulos com 40-60 caracteres performam melhor
- Use CAPS para palavras-chave importantes
- Inclua números quando apropriado
- Evite clickbait sem entrega

Retorne apenas os 5 títulos, um por linha, sem numeração.`;

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
          content: 'Você é especialista em títulos virais para YouTube. Crie títulos que maximizam CTR e engajamento.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 500,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI error:', error);
    throw new Error('Failed to generate titles');
  }

  const data = await response.json();
  const titles = data.choices[0].message.content
    .split('\n')
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 0);

  return titles;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      topic, 
      clientId, 
      companyId, 
      suggestionId,
      clientContext,
      referenceVideoIds,
      durationTarget = 600, // 10 minutes default
      sourceVideoTitle,
    } = await req.json();

    console.log('Generating script for topic:', topic);

    if (!topic || !clientId || !companyId) {
      throw new Error('Topic, Client ID and Company ID are required');
    }

    // Fetch reference videos if provided
    let referenceVideos: any[] = [];
    if (referenceVideoIds && referenceVideoIds.length > 0) {
      const { data: videos } = await supabase
        .from('youtube_video_analyses')
        .select('*')
        .in('id', referenceVideoIds);
      
      if (videos) {
        referenceVideos = videos;
      }
    } else {
      // Get top performing videos from client's monitored channels
      const { data: videos } = await supabase
        .from('youtube_video_analyses')
        .select('*')
        .eq('client_id', clientId)
        .order('engagement_rate', { ascending: false })
        .limit(5);
      
      if (videos) {
        referenceVideos = videos;
      }
    }

    console.log('Using', referenceVideos.length, 'reference videos');

    // Generate script
    const scriptContent = await generateScript(
      topic,
      clientContext || 'Canal de conteúdo educativo e informativo',
      referenceVideos,
      durationTarget
    );

    console.log('Script generated, length:', scriptContent.length);

    // Generate title suggestions
    const suggestedTitles = await generateTitles(topic, referenceVideos);
    console.log('Generated', suggestedTitles.length, 'title suggestions');

    // Get reference thumbnails
    const referenceThumbnails = referenceVideos
      .filter(v => v.thumbnail_url)
      .slice(0, 6)
      .map(v => v.thumbnail_url);

    // Save script to database
    const { data: script, error: saveError } = await supabase
      .from('youtube_scripts')
      .insert({
        client_id: clientId,
        company_id: companyId,
        suggestion_id: suggestionId || null,
        source_video_id: sourceVideoTitle || null,
        title: suggestedTitles[0] || topic,
        script_content: scriptContent,
        suggested_titles: suggestedTitles,
        reference_thumbnails: referenceThumbnails,
        video_duration_target: durationTarget,
        status: 'draft',
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving script:', saveError);
      throw new Error('Failed to save script');
    }

    console.log('Script saved with ID:', script.id);

    // Update suggestion status if provided
    if (suggestionId) {
      await supabase
        .from('youtube_content_suggestions')
        .update({ status: 'scripted' })
        .eq('id', suggestionId);
    }

    // Add initial assistant message to chat
    await supabase
      .from('youtube_script_messages')
      .insert({
        script_id: script.id,
        role: 'assistant',
        content: `Roteiro criado com sucesso! 🎬\n\nEste roteiro foi baseado na análise de ${referenceVideos.length} vídeos de alto engajamento. Você pode me pedir para:\n\n- Tornar a abertura mais impactante\n- Adicionar mais exemplos práticos\n- Ajustar o tom (mais formal/informal)\n- Expandir alguma seção específica\n- Reduzir a duração do roteiro\n\nComo posso ajudar a melhorar o roteiro?`,
      });

    return new Response(JSON.stringify({
      success: true,
      script: {
        id: script.id,
        title: script.title,
        content: scriptContent,
        suggestedTitles,
        referenceThumbnails,
        durationTarget,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-video-script:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
