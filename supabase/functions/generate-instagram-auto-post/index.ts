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

    // Fetch config with optional client data
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

    // Client is now optional - can be null for standalone automations
    const client = config.clients;
    
    // Use defaults when no client is linked
    const clientName = client?.name || config.name || 'Automação';
    const clientSector = client?.sector || 'Geral';
    const clientTargetAudience = client?.target_audience || 'Geral';

    console.log('Config loaded:', clientName, '| Has client:', !!client);

    // Use config reference images first, fallback to client images (if client exists)
    const hasConfigRefImages = config.reference_image_1 || config.reference_image_2 || config.reference_image_3;
    console.log('Using config reference images:', hasConfigRefImages);

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

    // Collect reference images - prefer config images, fallback to client images if available
    const referenceImages: string[] = [];
    
    if (hasConfigRefImages) {
      // Use config-specific reference images for auto-posts
      if (config.reference_image_1) referenceImages.push(config.reference_image_1);
      if (config.reference_image_2) referenceImages.push(config.reference_image_2);
      if (config.reference_image_3) referenceImages.push(config.reference_image_3);
      console.log('Using AUTO-POST config reference images, count:', referenceImages.length);
    } else if (client) {
      // Fallback to client's general reference images only if client exists
      if (client.ai_reference_image_1) referenceImages.push(client.ai_reference_image_1);
      if (client.ai_reference_image_2) referenceImages.push(client.ai_reference_image_2);
      if (client.ai_reference_image_3) referenceImages.push(client.ai_reference_image_3);
      console.log('Using CLIENT reference images (fallback), count:', referenceImages.length);
    } else {
      console.log('No reference images available (standalone automation without config images)');
    }

    // Format current date in Brazilian Portuguese (DD/MM/YYYY) for use in prompts
    const nowBrasilia = getNowInBrasilia();
    const currentDateFormatted = `${String(nowBrasilia.getDate()).padStart(2, '0')}/${String(nowBrasilia.getMonth() + 1).padStart(2, '0')}/${nowBrasilia.getFullYear()}`;
    console.log('Current date for image generation:', currentDateFormatted);

    // Generate image prompt based on post briefing ONLY (ignoring client ai_briefing)
    // The AI analyzes the briefing to determine if it should generate typographic or visual content
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

Analise o briefing do usuário e determine automaticamente o TIPO de imagem a gerar:

TIPO A - TIPOGRÁFICO (quando o briefing menciona frases, citações, quotes, textos motivacionais, mensagens, reflexões):
- Descreva uma imagem com TEXTO/FRASE visível
- Especifique: cor de fundo, estilo tipográfico (fonte, peso, tamanho), cores do texto, layout
- Exemplo: "Dark background with large bold sans-serif motivational quote in cyan color..."

TIPO B - VISUAL (quando o briefing pede fotos, produtos, cenários, ilustrações, sem menção a texto):
- Descreva apenas elementos visuais SEM texto
- Especifique: cenário, objetos, iluminação, cores, estilo, composição
- Exemplo: "Professional product photography with soft lighting..."

REGRAS:
- Gere o prompt em INGLÊS
- Formato quadrado 1:1 para Instagram
- Adapte-se 100% ao que o briefing pede
- Seja específico sobre cores, estilos e composição
- Se o briefing mencionar uso de data atual, use EXATAMENTE: ${currentDateFormatted}`
          },
          {
            role: 'user',
            content: `Crie UM prompt para gerar uma imagem de post Instagram:

BRIEFING DA POSTAGEM:
${config.post_briefing}

SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

DATA ATUAL (caso o briefing mencione uso de data): ${currentDateFormatted}

Analise o briefing acima e gere o prompt adequado (tipográfico se pede frases/textos, visual se pede fotos/imagens).
Se o briefing mencionar para incluir data na imagem, use EXATAMENTE: ${currentDateFormatted}
NÃO copie datas de imagens de referência - use sempre a data atual fornecida quando aplicável.

Responda APENAS com o prompt em inglês.`
          }
        ],
        max_completion_tokens: 300
      }),
    });

    if (!imagePromptResponse.ok) {
      throw new Error('Failed to generate image prompt');
    }

    const imagePromptData = await imagePromptResponse.json();
    const imagePrompt = imagePromptData.choices[0].message.content.trim();
    console.log('Generated image prompt:', imagePrompt.substring(0, 200) + '...');

    // Generate image with Gemini (google/gemini-3-pro-image-preview for better text rendering)
    console.log('Generating image with Gemini...');
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
    
    // Add the text prompt - flexible based on what GPT determined, with current date context
    const geminiPrompt = `Generate a square 1:1 Instagram feed image.

${imagePrompt}

IMPORTANT - CURRENT DATE: ${currentDateFormatted}
If the image should contain a date (as indicated in the prompt or reference images layout), use EXACTLY this date: ${currentDateFormatted}
Do NOT copy dates from reference images - always use the current date provided above when a date is needed.

${referenceImages.length > 0 ? `CRITICAL - REFERENCE IMAGES PROVIDED:
Study the reference images above carefully and match their EXACT visual style:
- If references contain text/typography → include text with same style (fonts, colors, layout)
- If references are photographs → create similar photographic content
- Match their color palette, aesthetic, and overall design language
- The generated image should look like it belongs to the same visual brand
- If reference images show a date in a specific position, put the CURRENT DATE (${currentDateFormatted}) in that same position` : ''}

Generate the image now. Return image only.`;

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
        model: 'google/gemini-3-pro-image-preview',
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

      // Retry with a simpler prompt but still flexible, with current date
      const retryPrompt = `Generate a square 1:1 Instagram feed image.

Theme/Briefing: ${config.post_briefing}
Industry: ${clientSector}
Audience: ${clientTargetAudience}

CURRENT DATE: ${currentDateFormatted}
If a date should appear in the image, use EXACTLY: ${currentDateFormatted}

Create a professional, Instagram-ready image based on the theme above.
If the theme mentions quotes/phrases/text, include readable text in the image.
If the theme is about products/photos/visuals, create that without text.`;

      const retryResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-pro-image-preview',
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

SETOR: ${clientSector}
PÚBLICO-ALVO: ${clientTargetAudience}

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
