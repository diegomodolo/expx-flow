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

// Helper function to calculate next post time after a given date (in Brasília, returns UTC)
function calculateNextPostTime(scheduledDays: number[], scheduledHours: number[], afterDate?: Date): Date {
  if (!scheduledDays.length || !scheduledHours.length) {
    throw new Error('No scheduled days or hours configured');
  }

  // Get current time in Brasília or use afterDate if provided
  const nowBrasilia = afterDate ? new Date(afterDate.getTime() + BRASILIA_OFFSET_MS) : getNowInBrasilia();
  const currentDay = nowBrasilia.getDay(); // 0 = Sunday
  const currentHour = nowBrasilia.getHours();

  console.log(`Calculating next post after Brasília time: ${nowBrasilia.toISOString()}, day: ${currentDay}, hour: ${currentHour}`);

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

    // Use config reference images first, fallback to client images
    const hasConfigRefImages = config.reference_image_1 || config.reference_image_2 || config.reference_image_3;
    console.log('Using config reference images:', hasConfigRefImages);

    const client = config.clients;
    if (!client) {
      throw new Error('Client data not found');
    }

    console.log('Config loaded for client:', client.name);

    // Find the last scheduled post (pending or published) to calculate next available slot
    const { data: existingPosts } = await supabase
      .from('instagram_auto_posts')
      .select('scheduled_at')
      .eq('config_id', configId)
      .in('status', ['pending', 'publishing'])
      .order('scheduled_at', { ascending: false })
      .limit(1);

    let afterDate: Date | undefined;
    if (existingPosts && existingPosts.length > 0) {
      // Calculate next slot after the last scheduled post
      afterDate = new Date(existingPosts[0].scheduled_at);
      console.log('Last scheduled post at:', afterDate.toISOString());
    }

    // Calculate next post time (after existing posts if any)
    const scheduledAt = calculateNextPostTime(config.scheduled_days, config.scheduled_hours, afterDate);
    console.log('Next post scheduled at:', scheduledAt.toISOString());

    // Collect reference images - prefer config images, fallback to client images
    const referenceImages: string[] = [];
    
    if (hasConfigRefImages) {
      // Use config-specific reference images for auto-posts
      if (config.reference_image_1) referenceImages.push(config.reference_image_1);
      if (config.reference_image_2) referenceImages.push(config.reference_image_2);
      if (config.reference_image_3) referenceImages.push(config.reference_image_3);
      console.log('Using AUTO-POST config reference images, count:', referenceImages.length);
    } else {
      // Fallback to client's general reference images
      if (client.ai_reference_image_1) referenceImages.push(client.ai_reference_image_1);
      if (client.ai_reference_image_2) referenceImages.push(client.ai_reference_image_2);
      if (client.ai_reference_image_3) referenceImages.push(client.ai_reference_image_3);
      console.log('Using CLIENT reference images (fallback), count:', referenceImages.length);
    }

    // Generate image prompt based on post briefing ONLY (ignoring client ai_briefing)
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
            content: `Você é um especialista em direção de arte para Instagram.

Gere um prompt em INGLÊS focado 100% em elementos VISUAIS.

REGRAS OBRIGATÓRIAS:
- NUNCA peça para colocar texto, frases, letras, números, tipografia, "quotes" ou @usuários na imagem
- NUNCA descreva palavras que devem aparecer na arte
- Descreva apenas: cenário/objetos, iluminação, cores, estilo, mood e composição
- O resultado deve funcionar em 1:1 (quadrado) e ser Instagram-ready`
          },
          {
            role: 'user',
            content: `Crie UM prompt para gerar uma imagem (sem texto) de post Instagram com base nestes dados:

BRIEFING DA POSTAGEM:
${config.post_briefing}

SETOR: ${client.sector}
PÚBLICO-ALVO: ${client.target_audience || 'Geral'}

Requisitos:
- Formato quadrado 1:1 para Instagram feed
- Visual profissional e atraente
- Cores e estilo alinhados ao setor ${client.sector}
- SEM texto/letters/numbers/symbols na imagem

Responda APENAS com o prompt em inglês.`
          }
        ],
        max_completion_tokens: 220
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
    console.log('Reference images to send:', referenceImages.length);
    
    // Build message content with reference images
    const messageContent: any[] = [];
    
    // Add reference images first so Gemini uses them as style reference
    for (const refImageUrl of referenceImages) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: refImageUrl }
      });
    }
    
    // Add the text prompt
    const geminiPrompt = `Generate a square 1:1 Instagram feed image.

${imagePrompt}

${referenceImages.length > 0 ? 'IMPORTANT: Use the reference images above as style guide. Match their visual identity, color palette, and aesthetic style.' : ''}

STRICT RULES:
- DO NOT include any text, letters, numbers, symbols, typography, quotes, watermarks, logos, or @handles.
- If the prompt above mentions any text/quotes/typography/@handles, IGNORE those parts.
- Return an image only.`;

    messageContent.push({
      type: 'text',
      text: geminiPrompt
    });

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
            content: messageContent
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
    const getBase64Url = (d: any) => d?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;

    let base64Url = getBase64Url(geminiData);

    // If Gemini returned only text (no images), retry once with an even stricter prompt
    if (!base64Url) {
      const msg = geminiData?.choices?.[0]?.message;
      console.warn('Gemini returned no images. Content was:', typeof msg?.content === 'string' ? msg.content.slice(0, 500) : msg?.content);

      const retryPrompt = `Generate a square 1:1 Instagram feed image.

Theme: ${config.post_briefing}
Industry: ${client.sector}
Audience: ${client.target_audience || 'General'}

STRICT RULES:
- Image only. No text/letters/numbers/symbols.
- No logos, no watermarks.
- Photo-realistic, professional, Instagram-ready.`;

      const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [{ role: 'user', content: retryPrompt }],
          modalities: ['image', 'text']
        }),
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        console.error('Gemini retry error:', errorText);
        throw new Error(`Gemini retry API error: ${retryResponse.status}`);
      }

      const retryData = await retryResponse.json();
      base64Url = getBase64Url(retryData);

      if (!base64Url) {
        console.error('Full Gemini response (retry):', JSON.stringify(retryData).substring(0, 2000));
        throw new Error('No image generated from Gemini Nano Banana');
      }
    }

    if (!base64Url.startsWith('data:image/')) {
      console.error('Unexpected image url format from Gemini:', base64Url.slice(0, 60));
      throw new Error('Gemini returned an unsupported image format');
    }

    console.log('Got base64 image, uploading to storage...');

    // Parse base64 data
    const matches = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Failed to parse base64 image data');
    }

    const extension = matches[1] || 'png';
    const base64Data = matches[2];
    const fileName = `instagram-auto-posts/${configId}/${Date.now()}.${extension}`;

    // Decode base64 and upload
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error: uploadError } = await supabase.storage
      .from('ai-generated-images')
      .upload(fileName, bytes, {
        contentType: `image/${extension}`,
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading image:', uploadError);
      throw new Error('Failed to upload generated image');
    }

    const { data: urlData } = supabase.storage
      .from('ai-generated-images')
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;
    console.log('Image uploaded to storage:', imageUrl);

    // Generate caption with GPT (using ONLY post briefing, not client briefing)
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

BRIEFING DA POSTAGEM:
${config.post_briefing}

SETOR: ${client.sector}
PÚBLICO-ALVO: ${client.target_audience || 'Geral'}

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
        max_completion_tokens: 320
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
