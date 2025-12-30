import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert URL to base64
async function urlToBase64(url: string): Promise<string | null> {
  try {
    // If already base64, return as-is
    if (url.startsWith('data:image/')) {
      return url;
    }
    
    // Fetch the image
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image from URL: ${url.substring(0, 100)}...`);
      return null;
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Detect content type
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    
    // Convert to base64
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.warn(`Error converting URL to base64: ${error}`);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting generate-visual-creative function');
    
    const { 
      creativeType,
      clientId,
      theme,
      context,
      companyId,
      references = [],
      approvedText
    } = await req.json();

    console.log('Request data received:', {
      creativeType,
      clientId,
      theme,
      companyId,
      contextKeys: Object.keys(context || {}),
      hasReferences: references && references.length > 0,
      referencesCount: references ? references.length : 0,
      hasApprovedText: !!approvedText
    });

    // Validar dados obrigatórios
    if (!creativeType) throw new Error('Creative type is required');
    if (!clientId) throw new Error('Client ID is required');
    if (!companyId) throw new Error('Company ID is required');
    if (!context) throw new Error('Context is required');
    if (!lovableApiKey) throw new Error('LOVABLE_API_KEY is not configured');

    // Buscar dados completos do cliente incluindo logo e imagens de referência
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        name, 
        sector, 
        ai_briefing, 
        target_audience,
        avatar,
        ai_reference_image_1,
        ai_reference_image_2,
        ai_reference_image_3
      `)
      .eq('id', clientId)
      .eq('company_id', companyId)
      .single();

    if (clientError || !clientData) {
      console.error('Error fetching client data:', clientError);
      throw new Error('Cliente não encontrado');
    }

    console.log('Client data retrieved:', {
      clientName: clientData.name,
      sector: clientData.sector,
      hasAvatar: !!clientData.avatar,
      hasReferenceImages: !!(clientData.ai_reference_image_1 || clientData.ai_reference_image_2 || clientData.ai_reference_image_3)
    });

    // Extrair informações do contexto
    const {
      title = '',
      description = '',
      copy = '',
      targetAudience = '',
      objective = ''
    } = context;

    const textToUse = approvedText || copy || title || theme;
    console.log('Text to use in image:', textToUse);

    // Normalizar creativeType (front usa snake_case; manter compatibilidade com kebab-case)
    const normalizedCreativeType = String(creativeType || '').trim().replace(/-/g, '_');

    // Determinar aspect ratio baseado no tipo de criativo
    // Instagram Feed e Facebook Feed usam 3:4 (1080x1440)
    const aspectRatioMap: Record<string, string> = {
      instagram_story: '9:16',
      instagram_reels: '9:16',
      tiktok_video: '9:16',
      facebook_story: '9:16',
      whatsapp_status: '9:16',

      instagram_feed: '3:4',
      facebook_feed: '3:4',
      linkedin_post: '3:4',

      youtube_thumbnail: '16:9',
      twitter_post: '16:9',

      banner_horizontal: '32:10',
      banner_vertical: '1:2',
    };

    const aspectRatio = aspectRatioMap[normalizedCreativeType] || '1:1';
    console.log('Selected aspect ratio:', aspectRatio, 'for type:', normalizedCreativeType);

    // Dimensões exatas a serem solicitadas no prompt
    const sizeMap: Record<string, { width: number; height: number }> = {
      instagram_feed: { width: 1080, height: 1440 },
      facebook_feed: { width: 1080, height: 1440 },
      linkedin_post: { width: 1080, height: 1440 },

      instagram_story: { width: 1080, height: 1920 },
      instagram_reels: { width: 1080, height: 1920 },
      facebook_story: { width: 1080, height: 1920 },
      whatsapp_status: { width: 1080, height: 1920 },
      tiktok_video: { width: 1080, height: 1920 },

      youtube_thumbnail: { width: 1280, height: 720 },
      twitter_post: { width: 1200, height: 675 },

      banner_horizontal: { width: 1920, height: 600 },
      banner_vertical: { width: 600, height: 1200 },
    };

    const targetSize = sizeMap[normalizedCreativeType] || null;

    // Coletar todas as imagens de referência (do request + do cliente)
    const allReferenceImages: string[] = [...references];
    
    // Adicionar imagens de referência do cliente se não houver do request
    if (allReferenceImages.length === 0) {
      if (clientData.ai_reference_image_1) allReferenceImages.push(clientData.ai_reference_image_1);
      if (clientData.ai_reference_image_2) allReferenceImages.push(clientData.ai_reference_image_2);
      if (clientData.ai_reference_image_3) allReferenceImages.push(clientData.ai_reference_image_3);
    }

    console.log('Total reference images:', allReferenceImages.length);

    // Montar o prompt para geração de imagem
    const creativeTypeName = normalizedCreativeType.replace(/[_-]/g, ' ');
    const sectorContext = clientData.sector || '';
    const audienceContext = clientData.target_audience || targetAudience || '';
    const clientBriefing = clientData.ai_briefing || '';

    // Build message content for Gemini multimodal request
    const messageContent: any[] = [];

    // Convert all images to base64 first (Gemini can't access external URLs like Facebook/Instagram)
    console.log('Converting images to base64...');
    
    // Adicionar logo do cliente se disponível (para que a IA respeite)
    if (clientData.avatar && clientData.avatar.startsWith('http')) {
      console.log('Converting client logo to base64');
      const logoBase64 = await urlToBase64(clientData.avatar);
      if (logoBase64) {
        messageContent.push({
          type: 'image_url',
          image_url: { url: logoBase64 }
        });
      }
    }

    // Adicionar imagens de referência (convertidas para base64)
    for (const refImage of allReferenceImages) {
      if (refImage.startsWith('data:image/')) {
        // Already base64
        messageContent.push({
          type: 'image_url',
          image_url: { url: refImage }
        });
      } else if (refImage.startsWith('http')) {
        // Convert URL to base64
        const base64Image = await urlToBase64(refImage);
        if (base64Image) {
          messageContent.push({
            type: 'image_url',
            image_url: { url: base64Image }
          });
        }
      }
    }

    console.log(`Successfully converted ${messageContent.length} images to base64`);

    // Construir o prompt principal
    const geminiPrompt = `Generate a professional marketing creative image with the following specifications:

IMAGE FORMAT:
- Aspect ratio: ${aspectRatio}
- Output size: ${targetSize ? `${targetSize.width}x${targetSize.height} pixels (exact)` : 'Follow the correct pixel dimensions for the chosen format'}
- Type: ${creativeTypeName}

BRAND CONTEXT:
- Client: ${clientData.name}
- Industry/Sector: ${sectorContext}
- Target Audience: ${audienceContext}
${clientBriefing ? `- Brand Guidelines: ${clientBriefing.substring(0, 300)}` : ''}

CAMPAIGN DETAILS:
- Theme: ${theme}
- Title: ${title}
- Description: ${description}
- Objective: ${objective}

${textToUse ? `TEXT TO INCLUDE IN THE IMAGE:
"${textToUse}"
- This text MUST appear as readable typography/overlay on the image
- Use professional, modern fonts with excellent legibility
- Ensure high contrast for readability
- Position the text strategically within the composition` : ''}

${messageContent.length > 0 ? `REFERENCE IMAGES PROVIDED:
- Study the reference images carefully and match their visual style
- Follow the same color palette, typography style, and design language
${clientData.avatar ? '- The first image is the client LOGO - incorporate it subtly if appropriate' : ''}
- The generated image should look like it belongs to the same brand family` : ''}

STYLE REQUIREMENTS:
- Ultra-professional marketing quality
- Clean, modern design
- High-resolution commercial photography or design quality
- Colors and aesthetic aligned with ${sectorContext} industry standards
- Visually appealing for ${audienceContext}

CRITICAL RULES:
- If text is provided, it MUST be spelled EXACTLY as given - NO spelling errors
- Text should be in the SAME language as provided (Portuguese if the text is in Portuguese)
- NO random English words unless specifically in the provided text
- Professional, polished final result suitable for real marketing campaigns

Generate the image now.`;

    messageContent.push({
      type: 'text',
      text: geminiPrompt
    });

    console.log('Calling Gemini google/gemini-3-pro-image-preview...');
    console.log('Message content items:', messageContent.length);

    // Call Lovable AI Gateway with Gemini model
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
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (geminiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your Lovable AI workspace.');
      }
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received');

    // Extract image from response
    const getBase64Url = (d: any) => d?.choices?.[0]?.message?.images?.[0]?.image_url?.url as string | undefined;
    let base64Url = getBase64Url(geminiData);

    // Retry if no image returned
    if (!base64Url) {
      console.warn('Gemini returned no images on first attempt, retrying...');
      
      const retryPrompt = `Generate a ${aspectRatio} (${targetSize ? `${targetSize.width}x${targetSize.height}px` : 'use correct pixel size'}) professional marketing image for ${creativeTypeName}.

Theme: ${theme}
Brand: ${clientData.name} (${sectorContext})
${textToUse ? `Include this text prominently: "${textToUse}"` : ''}

Create a clean, professional, marketing-ready visual.
Generate the image now.`;

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
        throw new Error(`Gemini retry failed: ${retryResponse.status}`);
      }

      const retryData = await retryResponse.json();
      base64Url = getBase64Url(retryData);

      if (!base64Url) {
        console.error('No image after retry');
        throw new Error('Failed to generate image with Gemini');
      }
    }

    if (!base64Url.startsWith('data:image/')) {
      throw new Error('Gemini returned an unsupported image format');
    }

    console.log('Image generated successfully, uploading to storage...');

    // Parse and upload to Supabase Storage
    const matches = base64Url.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error('Failed to parse base64 image data');
    }

    const extension = matches[1] || 'png';
    const base64Data = matches[2];
    const fileName = `visual-creatives/${clientId}/${Date.now()}.${extension}`;

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
    console.log('Image uploaded:', imageUrl);

    // Generate caption with GPT
    console.log('Generating caption...');
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
            content: 'Você é um especialista em marketing digital e copywriting. Crie legendas envolventes e persuasivas para redes sociais em português brasileiro.' 
          },
          { 
            role: 'user', 
            content: `Crie uma legenda para redes sociais:

CLIENTE: ${clientData.name} (${clientData.sector})
PÚBLICO: ${audienceContext}
TEMA: ${theme}
TÍTULO: ${title}
COPY: ${copy}
OBJETIVO: ${objective}
TIPO: ${creativeTypeName}

REQUISITOS:
- 120-250 caracteres
- Emojis relevantes
- 2-4 hashtags estratégicas
- Call-to-action clara
- Tom profissional e acessível

Responda APENAS com a legenda.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    let suggestedCaption = `🚀 ${clientData.name} apresenta: ${title || theme}! #${clientData.sector.replace(/\s+/g, '')} #Marketing`;
    
    if (captionResponse.ok) {
      const captionData = await captionResponse.json();
      if (captionData.choices?.[0]?.message?.content) {
        suggestedCaption = captionData.choices[0].message.content.trim();
      }
    }

    console.log('Function completed successfully');
    return new Response(JSON.stringify({ 
      imageUrl,
      suggestedCaption 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-visual-creative function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      imageUrl: null,
      suggestedCaption: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
