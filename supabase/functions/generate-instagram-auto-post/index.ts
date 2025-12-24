import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

// Brasília timezone offset (UTC-3)
const BRASILIA_OFFSET_MS = -3 * 60 * 60 * 1000;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to get current time in Brasília
function getNowInBrasilia(): Date {
  const now = new Date();
  // Convert UTC to Brasília time
  return new Date(now.getTime() + BRASILIA_OFFSET_MS);
}

// Helper to convert Brasília time to UTC for storage
function brasiliaToUTC(brasiliaDate: Date): Date {
  return new Date(brasiliaDate.getTime() - BRASILIA_OFFSET_MS);
}

// Helper function to calculate next post time (in Brasília, returns UTC)
function calculateNextPostTime(scheduledDays: number[], scheduledHours: number[]): Date {
  if (!scheduledDays.length || !scheduledHours.length) {
    throw new Error('No scheduled days or hours configured');
  }

  // Get current time in Brasília
  const nowBrasilia = getNowInBrasilia();
  const currentDay = nowBrasilia.getDay(); // 0 = Sunday
  const currentHour = nowBrasilia.getHours();

  console.log(`Current Brasília time: ${nowBrasilia.toISOString()}, day: ${currentDay}, hour: ${currentHour}`);

  // Sort hours for proper iteration
  const sortedHours = [...scheduledHours].sort((a, b) => a - b);

  // Check today first if it's a scheduled day
  if (scheduledDays.includes(currentDay)) {
    for (const hour of sortedHours) {
      if (hour > currentHour) {
        const nextPost = new Date(nowBrasilia);
        nextPost.setHours(hour, 0, 0, 0);
        console.log(`Next post in Brasília: ${nextPost.toISOString()}`);
        return brasiliaToUTC(nextPost); // Return UTC for storage
      }
    }
  }

  // Check next 7 days
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const futureDay = (currentDay + daysAhead) % 7;
    if (scheduledDays.includes(futureDay)) {
      const nextPost = new Date(nowBrasilia);
      nextPost.setDate(nowBrasilia.getDate() + daysAhead);
      nextPost.setHours(sortedHours[0], 0, 0, 0);
      console.log(`Next post in Brasília: ${nextPost.toISOString()}`);
      return brasiliaToUTC(nextPost); // Return UTC for storage
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

    // Generate image with Gemini Nano Banana (google/gemini-2.5-flash-image-preview)
    console.log('Generating image with Gemini Nano Banana...');
    
    const geminiPrompt = `${imagePrompt}

Create a professional, high-quality Instagram post image. Format: square 1:1 aspect ratio. 
Style: Professional photography, vibrant colors, engaging visual composition.
Important: Do NOT include any text, watermarks, or logos in the image.`;

    const geminiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: geminiPrompt
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini Nano Banana error:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response keys:', JSON.stringify(Object.keys(geminiData)));
    
    // Extract image from Gemini response - format: message.images[0].image_url.url
    let imageUrl: string | null = null;
    const message = geminiData.choices?.[0]?.message;
    
    if (message?.images && message.images.length > 0) {
      const base64Url = message.images[0]?.image_url?.url;
      
      if (base64Url && base64Url.startsWith('data:image/')) {
        console.log('Got base64 image, uploading to storage...');
        
        // Parse base64 data
        const matches = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const extension = matches[1] || 'png';
          const base64Data = matches[2];
          const fileName = `instagram-auto-posts/${configId}/${Date.now()}.${extension}`;
          
          // Decode base64 and upload
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('ai-generated-images')
            .upload(fileName, bytes, {
              contentType: `image/${extension}`,
              upsert: true
            });
          
          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw new Error('Failed to upload generated image');
          }
          
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('ai-generated-images')
            .getPublicUrl(fileName);
          
          imageUrl = urlData.publicUrl;
          console.log('Image uploaded to storage:', imageUrl);
        }
      }
    }

    if (!imageUrl) {
      console.error('Full Gemini response:', JSON.stringify(geminiData).substring(0, 1000));
      throw new Error('No image generated from Gemini Nano Banana');
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
