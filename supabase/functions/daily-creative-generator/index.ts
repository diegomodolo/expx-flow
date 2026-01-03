import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreativeGenerationSchedule {
  id: string;
  client_id: string;
  company_id: string;
  creatives_per_day: number;
  concept_percentage: number;
  iteration_percentage: number;
  always_include_text_in_images: boolean;
  custom_image_prompt: string | null;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  reference_image_4: string | null;
  reference_image_5: string | null;
  reference_image_6: string | null;
}

interface ClientData {
  id: string;
  name: string;
  company: string;
  sector: string;
  ai_briefing: string | null;
  target_audience: string | null;
  voice_tone: string | null;
  product_name: string | null;
  website_url: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let historyId: string | null = null;
  let client_id: string;
  let company_id: string;
  let schedule: CreativeGenerationSchedule | null = null;
  let creativesToGenerate = 0;

  try {
    const body = await req.json();
    client_id = body.client_id;
    company_id = body.company_id;
    const user_id = body.user_id;
    const generation_type = body.generation_type; // 'concept' or 'iteration' or null for all
    const count = body.count;

    console.log('[daily-creative-generator] Starting generation:', { client_id, company_id, generation_type, count });

    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[daily-creative-generator] Client not found:', clientError);
      throw new Error('Client not found');
    }

    console.log('[daily-creative-generator] Client data loaded:', client.name);

    // Get generation schedule or use defaults
    const { data: scheduleData } = await supabase
      .from('creative_generation_schedules')
      .select('*')
      .eq('client_id', client_id)
      .single();

    schedule = scheduleData;

    creativesToGenerate = count || schedule?.creatives_per_day || 5;
    const conceptPercentage = schedule?.concept_percentage ?? 70;
    const iterationPercentage = schedule?.iteration_percentage ?? 30;

    console.log('[daily-creative-generator] Percentages:', { conceptPercentage, iterationPercentage });

    // Calculate distribution
    const conceptCount = Math.round(creativesToGenerate * conceptPercentage / 100);
    const iterationCount = creativesToGenerate - conceptCount;

    console.log('[daily-creative-generator] Distribution:', { conceptCount, iterationCount });

    // Update last_generation_at to prevent re-execution
    if (schedule) {
      await supabase
        .from('creative_generation_schedules')
        .update({
          last_generation_at: new Date().toISOString(),
          next_generation_at: getNextGenerationTime(schedule.generation_time),
        })
        .eq('id', schedule.id);
      console.log('[daily-creative-generator] Updated last_generation_at');
    }

    // Create history entry
    const historyEntry = {
      client_id,
      company_id,
      schedule_id: schedule?.id || null,
      creatives_requested: creativesToGenerate,
      creatives_generated: 0,
      execution_type: generation_type ? 'manual' : 'scheduled',
      status: 'in_progress',
      error_message: null,
      execution_details: {
        distribution: { concepts: 0, iterations: 0 },
        requested_distribution: { conceptCount, iterationCount },
        started_at: new Date().toISOString(),
      },
    };

    const { data: historyData, error: historyError } = await supabase
      .from('creative_generation_history')
      .insert(historyEntry)
      .select()
      .single();

    if (historyError) {
      console.error('[daily-creative-generator] Error creating history:', historyError);
    } else {
      historyId = historyData.id;
      console.log('[daily-creative-generator] Created history entry:', historyId);
    }

    const generatedCreatives: any[] = [];
    const errors: string[] = [];
    const currentDistribution = { concepts: 0, iterations: 0 };

    // Helper to save creative and update history
    const saveCreativeAndUpdateHistory = async (creative: any) => {
      const creativeToInsert = {
        client_id,
        company_id,
        user_id,
        generation_type: creative.type,
        creative_type: creative.creative_type || 'post_unico',
        image_url: creative.image_url || null,
        video_url: creative.video_url || null,
        caption: creative.caption || null,
        hashtags: creative.hashtags || null,
        theme: creative.theme || null,
        generated_content: creative.content || {},
        source_creative_id: creative.source_creative_id || null,
        research_theme_id: creative.research_theme_id || null,
        quality_score: null,
        status: 'pending',
      };

      const { data: savedCreative, error: insertError } = await supabase
        .from('creative_generation_queue')
        .insert(creativeToInsert)
        .select('id')
        .single();

      if (insertError) {
        console.error('[daily-creative-generator] Error inserting creative:', insertError);
        return false;
      }

      console.log('[daily-creative-generator] Saved creative:', savedCreative?.id, 'type:', creative.type);

      // Update history
      if (historyId) {
        const totalGenerated = currentDistribution.concepts + currentDistribution.iterations;
        await supabase
          .from('creative_generation_history')
          .update({
            creatives_generated: totalGenerated,
            execution_details: {
              distribution: currentDistribution,
              requested_distribution: { conceptCount, iterationCount },
              started_at: historyEntry.execution_details.started_at,
              last_update: new Date().toISOString(),
            },
          })
          .eq('id', historyId);
      }

      return true;
    };

    // Generate concept creatives (based on research themes)
    if (!generation_type || generation_type === 'concept') {
      const targetCount = generation_type === 'concept' ? (count || 1) : conceptCount;
      
      for (let i = 0; i < targetCount; i++) {
        try {
          const creative = await generateConceptCreative(supabase, client, schedule);
          if (creative) {
            currentDistribution.concepts++;
            await saveCreativeAndUpdateHistory(creative);
            generatedCreatives.push(creative);
          }
        } catch (error: any) {
          console.error('[daily-creative-generator] Error generating concept:', error);
          errors.push(`Concept ${i + 1}: ${error.message}`);
        }
      }
    }

    // Generate iteration creatives (based on previous successful creatives)
    if (!generation_type || generation_type === 'iteration') {
      const targetCount = generation_type === 'iteration' ? (count || 1) : iterationCount;
      
      for (let i = 0; i < targetCount; i++) {
        try {
          const creative = await generateIterationCreative(supabase, client, schedule);
          if (creative) {
            currentDistribution.iterations++;
            await saveCreativeAndUpdateHistory(creative);
            generatedCreatives.push(creative);
          }
        } catch (error: any) {
          console.error('[daily-creative-generator] Error generating iteration:', error);
          errors.push(`Iteration ${i + 1}: ${error.message}`);
        }
      }
    }

    // Final history update
    if (historyId) {
      const finalStatus = generatedCreatives.length === creativesToGenerate ? 'completed' : (generatedCreatives.length > 0 ? 'partial' : 'failed');
      await supabase
        .from('creative_generation_history')
        .update({
          creatives_generated: generatedCreatives.length,
          status: finalStatus,
          error_message: errors.length > 0 ? errors.join('; ') : null,
          execution_details: {
            distribution: currentDistribution,
            requested_distribution: { conceptCount, iterationCount },
            started_at: historyEntry.execution_details.started_at,
            completed_at: new Date().toISOString(),
          },
        })
        .eq('id', historyId);
      console.log('[daily-creative-generator] Final status:', finalStatus);
    }

    console.log('[daily-creative-generator] Generation completed');

    return new Response(
      JSON.stringify({
        success: true,
        generated: generatedCreatives.length,
        errors: errors.length > 0 ? errors : undefined,
        distribution: currentDistribution,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[daily-creative-generator] Error:', error);

    if (historyId) {
      await supabase
        .from('creative_generation_history')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', historyId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getNextGenerationTime(generationTime: string): string {
  const now = new Date();
  const [hours, minutes] = generationTime.split(':').map(Number);
  
  const next = new Date(now);
  next.setUTCHours(hours + 3, minutes, 0, 0); // Convert BRT to UTC
  
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next.toISOString();
}

function getScheduleReferenceImages(schedule: CreativeGenerationSchedule | null): string[] {
  const images: string[] = [];
  if (schedule?.reference_image_1) images.push(schedule.reference_image_1);
  if (schedule?.reference_image_2) images.push(schedule.reference_image_2);
  if (schedule?.reference_image_3) images.push(schedule.reference_image_3);
  if (schedule?.reference_image_4) images.push(schedule.reference_image_4);
  if (schedule?.reference_image_5) images.push(schedule.reference_image_5);
  if (schedule?.reference_image_6) images.push(schedule.reference_image_6);
  return images;
}

async function generateConceptCreative(supabase: any, client: ClientData, schedule: CreativeGenerationSchedule | null): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Get a random research theme
  const { data: themes } = await supabase
    .from('market_research_insights')
    .select('*')
    .eq('client_id', client.id)
    .limit(10);

  const theme = themes && themes.length > 0 
    ? themes[Math.floor(Math.random() * themes.length)]
    : null;

  const themeContext = theme 
    ? `TEMA DE PESQUISA: ${theme.title || theme.topic}\nINSIGHT: ${theme.insight || theme.description || ''}`
    : '';

  // Generate caption and hashtags using AI
  const captionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em social media e criação de conteúdo para Instagram e Facebook.
Crie conteúdo envolvente e autêntico para posts orgânicos.`,
        },
        {
          role: 'user',
          content: `Crie um post para Instagram/Facebook para a marca "${client.company}" (${client.sector}).

${themeContext}

BRIEFING: ${client.ai_briefing || 'Criar conteúdo relevante para a marca'}
PÚBLICO-ALVO: ${client.target_audience || 'Público geral'}
TOM DE VOZ: ${client.voice_tone || 'Profissional e amigável'}

Responda APENAS em JSON válido:
{
  "caption": "Legenda do post (máx 300 caracteres para melhor engajamento)",
  "hashtags": "5-10 hashtags relevantes separadas por espaço",
  "creative_type": "post_unico ou carrossel ou reels",
  "image_prompt": "Descrição detalhada para gerar a imagem do post"
}`,
        },
      ],
    }),
  });

  if (!captionResponse.ok) {
    throw new Error('Failed to generate caption');
  }

  const captionData = await captionResponse.json();
  let content;
  try {
    const responseText = captionData.choices?.[0]?.message?.content || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    content = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch {
    content = {
      caption: `Conteúdo especial da ${client.company}! 🎯`,
      hashtags: '#marketing #digital #conteudo',
      creative_type: 'post_unico',
      image_prompt: `Imagem profissional para ${client.company}`,
    };
  }

  // Generate image
  const imageUrl = await generateCreativeImage(client, content, schedule);

  return {
    type: 'concept',
    creative_type: content.creative_type || 'post_unico',
    image_url: imageUrl,
    caption: content.caption,
    hashtags: content.hashtags,
    theme: theme?.title || theme?.topic || null,
    research_theme_id: theme?.id || null,
    content: {
      ...content,
      generated_at: new Date().toISOString(),
    },
  };
}

async function generateIterationCreative(supabase: any, client: ClientData, schedule: CreativeGenerationSchedule | null): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // Get a previous approved/published creative
  const { data: previousCreatives } = await supabase
    .from('creative_generation_queue')
    .select('*')
    .eq('client_id', client.id)
    .in('status', ['approved', 'published'])
    .order('created_at', { ascending: false })
    .limit(10);

  const sourceCreative = previousCreatives && previousCreatives.length > 0
    ? previousCreatives[Math.floor(Math.random() * previousCreatives.length)]
    : null;

  const sourceContext = sourceCreative
    ? `POST ANTERIOR DE SUCESSO:
LEGENDA: ${sourceCreative.caption}
HASHTAGS: ${sourceCreative.hashtags}
TIPO: ${sourceCreative.creative_type}`
    : '';

  // Generate improved version
  const captionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: `Você é um especialista em social media. Crie variações de posts de sucesso mantendo o que funciona.`,
        },
        {
          role: 'user',
          content: `Crie uma NOVA VERSÃO de post para "${client.company}" (${client.sector}).

${sourceContext}

${sourceContext ? 'Crie uma variação que mantenha os elementos de sucesso mas seja ORIGINAL.' : 'Crie um post original e envolvente.'}

BRIEFING: ${client.ai_briefing || 'Criar conteúdo relevante'}
TOM DE VOZ: ${client.voice_tone || 'Profissional'}

Responda APENAS em JSON válido:
{
  "caption": "Nova legenda criativa (máx 300 caracteres)",
  "hashtags": "5-10 hashtags relevantes",
  "creative_type": "post_unico ou carrossel ou reels",
  "image_prompt": "Descrição para gerar imagem"
}`,
        },
      ],
    }),
  });

  if (!captionResponse.ok) {
    throw new Error('Failed to generate iteration');
  }

  const captionData = await captionResponse.json();
  let content;
  try {
    const responseText = captionData.choices?.[0]?.message?.content || '{}';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    content = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
  } catch {
    content = {
      caption: `Novidade da ${client.company}! ✨`,
      hashtags: '#novidade #lancamento #destaque',
      creative_type: 'post_unico',
      image_prompt: `Nova imagem para ${client.company}`,
    };
  }

  // Generate image
  const imageUrl = await generateCreativeImage(client, content, schedule);

  return {
    type: 'iteration',
    creative_type: content.creative_type || 'post_unico',
    image_url: imageUrl,
    caption: content.caption,
    hashtags: content.hashtags,
    source_creative_id: sourceCreative?.id || null,
    content: {
      ...content,
      source_creative_id: sourceCreative?.id,
      generated_at: new Date().toISOString(),
    },
  };
}

async function generateCreativeImage(client: ClientData, content: any, schedule: CreativeGenerationSchedule | null): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  const referenceImages = getScheduleReferenceImages(schedule);
  const customPrompt = schedule?.custom_image_prompt || '';

  const imagePrompt = `
Crie uma imagem para post de Instagram/Facebook.

MARCA: ${client.company}
SETOR: ${client.sector}

CONCEITO DO POST: ${content.caption || ''}

DIRETRIZES:
- Formato quadrado 1:1 (1080x1080 pixels)
- Cores vibrantes e atraentes
- Estilo moderno para redes sociais
- NÃO inclua texto na imagem
- Ultra high resolution

${customPrompt ? `INSTRUÇÕES PERSONALIZADAS: ${customPrompt}` : ''}
${content.image_prompt ? `SUGESTÃO: ${content.image_prompt}` : ''}
`;

  try {
    if (referenceImages.length > 0) {
      console.log('[daily-creative-generator] Generating with reference image');
      
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Crie uma nova imagem inspirada nesta referência visual, mantendo estilo e identidade.

${imagePrompt}`,
                },
                {
                  type: 'image_url',
                  image_url: { url: referenceImages[0] },
                },
              ],
            },
          ],
          modalities: ['image', 'text'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (imageUrl) {
          console.log('[daily-creative-generator] Image generated with reference');
          return imageUrl;
        }
      }
    }

    // Fallback without reference
    console.log('[daily-creative-generator] Generating without reference');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: imagePrompt,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (imageUrl) {
        console.log('[daily-creative-generator] Image generated');
        return imageUrl;
      }
    }

    return null;
  } catch (error) {
    console.error('[daily-creative-generator] Image generation error:', error);
    return null;
  }
}
