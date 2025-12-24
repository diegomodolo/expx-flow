import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
const ideogramApiKey = Deno.env.get('IDEOGRAM_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to calculate next post time
function calculateNextPostTime(scheduledDays: number[], scheduledHours: number[]): Date {
  if (!scheduledDays.length || !scheduledHours.length) {
    throw new Error('No scheduled days or hours configured');
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday
  const currentHour = now.getHours();

  // Sort hours for proper iteration
  const sortedHours = [...scheduledHours].sort((a, b) => a - b);

  // Check today first if it's a scheduled day
  if (scheduledDays.includes(currentDay)) {
    for (const hour of sortedHours) {
      if (hour > currentHour) {
        const nextPost = new Date(now);
        nextPost.setHours(hour, 0, 0, 0);
        return nextPost;
      }
    }
  }

  // Check next 7 days
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDay = (currentDay + daysAhead) % 7;
    if (scheduledDays.includes(futureDay)) {
      const nextPost = new Date(now);
      nextPost.setDate(now.getDate() + daysAhead);
      nextPost.setHours(sortedHours[0], 0, 0, 0);
      return nextPost;
    }
  }

  throw new Error('Could not calculate next post time');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { configId, clientId, companyId } = await req.json();

    console.log('Generating Instagram auto post for config:', configId);

    if (!configId) {
      throw new Error('Config ID is required');
    }

    // Fetch config with client data
    const { data: config, error: configError } = await supabase
      .from('instagram_auto_post_configs')
      .select(`
        *,
        clients (
          id,
          name,
          sector,
          ai_briefing,
          target_audience,
          ai_reference_image_1,
          ai_reference_image_2,
          ai_reference_image_3
        )
      `)
      .eq('id', configId)
      .single();

    if (configError || !config) {
      console.error('Error fetching config:', configError);
      throw new Error('Config not found');
    }

    const client = config.clients;
    if (!client) {
      throw new Error('Client data not found');
    }

    console.log('Config loaded for client:', client.name);

    // Calculate next post time
    const scheduledAt = calculateNextPostTime(config.scheduled_days, config.scheduled_hours);
    console.log('Next post scheduled at:', scheduledAt.toISOString());

    // Collect reference images
    const referenceImages: string[] = [];
    if (client.ai_reference_image_1) referenceImages.push(client.ai_reference_image_1);
    if (client.ai_reference_image_2) referenceImages.push(client.ai_reference_image_2);
    if (client.ai_reference_image_3) referenceImages.push(client.ai_reference_image_3);

    console.log('Reference images count:', referenceImages.length);

    // Generate image prompt based on briefings
    const imagePromptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `Você é um especialista em marketing visual para Instagram. Gere prompts CURTOS (máximo 150 palavras) para criação de imagens profissionais.`
          },
          {
            role: 'user',
            content: `Crie um prompt para gerar uma imagem de post Instagram baseado nestes dados:

CLIENTE:
- Nome: ${client.name}
- Setor: ${client.sector}
- Público-alvo: ${client.target_audience || 'Geral'}
- Briefing: ${client.ai_briefing || 'Sem briefing específico'}

TEMA DO POST:
${config.post_briefing}

Requisitos:
- Formato quadrado 1:1 para Instagram feed
- Visual profissional e atraente
- Cores e estilo alinhados ao setor ${client.sector}
- SEM texto na imagem (a legenda será separada)
- Foco em elementos visuais que engajam

Responda APENAS com o prompt em inglês para geração de imagem.`
          }
        ],
        temperature: 0.8,
        max_tokens: 200,
      }),
    });

    if (!imagePromptResponse.ok) {
      throw new Error('Failed to generate image prompt');
    }

    const imagePromptData = await imagePromptResponse.json();
    const imagePrompt = imagePromptData.choices[0].message.content.trim();
    console.log('Generated image prompt:', imagePrompt.substring(0, 100) + '...');

    // Generate image with Ideogram
    const ideogramRequestBody: any = {
      image_request: {
        prompt: imagePrompt + ' Professional photography, high quality, Instagram-ready, square format, no text, ultra detailed.',
        aspect_ratio: 'ASPECT_1_1',
        model: 'V_2_TURBO',
        magic_prompt_option: 'ON',
        negative_prompt: 'text, watermark, logo, words, letters, blurry, low quality, distorted',
        style_type: 'REALISTIC'
      }
    };

    // Add style references if available
    if (referenceImages.length > 0) {
      console.log('Adding reference images to Ideogram request');
      
      // Fetch and convert reference images to base64
      const styleReferences = [];
      for (const imageUrl of referenceImages.slice(0, 2)) { // Max 2 references
        try {
          const imageResponse = await fetch(imageUrl);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            styleReferences.push({
              weight: 0.5,
              image_base64: base64
            });
          }
        } catch (e) {
          console.warn('Failed to fetch reference image:', e);
        }
      }

      if (styleReferences.length > 0) {
        ideogramRequestBody.image_request.style_reference_images = styleReferences;
      }
    }

    const ideogramResponse = await fetch('https://api.ideogram.ai/generate', {
      method: 'POST',
      headers: {
        'Api-Key': ideogramApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ideogramRequestBody),
    });

    if (!ideogramResponse.ok) {
      const errorText = await ideogramResponse.text();
      console.error('Ideogram error:', errorText);
      throw new Error(`Ideogram API error: ${ideogramResponse.status}`);
    }

    const ideogramData = await ideogramResponse.json();
    const imageUrl = ideogramData.data?.[0]?.url;

    if (!imageUrl) {
      throw new Error('No image URL returned from Ideogram');
    }

    console.log('Image generated:', imageUrl);

    // Generate caption with GPT
    const captionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um especialista em marketing para Instagram. Crie legendas envolventes em português brasileiro.'
          },
          {
            role: 'user',
            content: `Crie uma legenda para post do Instagram:

CLIENTE:
- Nome: ${client.name}
- Setor: ${client.sector}
- Público-alvo: ${client.target_audience || 'Geral'}
- Briefing: ${client.ai_briefing || 'Sem briefing específico'}

TEMA DO POST:
${config.post_briefing}

REQUISITOS:
- 150-280 caracteres
- 3-5 emojis estratégicos
- 3-5 hashtags relevantes
- Call-to-action sutil
- Tom profissional mas acessível
- Gerar engajamento

Responda APENAS com a legenda pronta.`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!captionResponse.ok) {
      throw new Error('Failed to generate caption');
    }

    const captionData = await captionResponse.json();
    const caption = captionData.choices[0].message.content.trim();
    console.log('Caption generated:', caption.substring(0, 50) + '...');

    // Save to instagram_auto_posts
    const { data: newPost, error: postError } = await supabase
      .from('instagram_auto_posts')
      .insert({
        config_id: configId,
        client_id: clientId || config.client_id,
        company_id: companyId || config.company_id,
        image_url: imageUrl,
        caption: caption,
        status: 'pending',
        scheduled_at: scheduledAt.toISOString()
      })
      .select()
      .single();

    if (postError) {
      console.error('Error saving post:', postError);
      throw new Error('Failed to save post');
    }

    console.log('Post saved with ID:', newPost.id);

    // Update config with next_post_at
    await supabase
      .from('instagram_auto_post_configs')
      .update({ next_post_at: scheduledAt.toISOString() })
      .eq('id', configId);

    return new Response(JSON.stringify({
      success: true,
      post: newPost
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-instagram-auto-post:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
