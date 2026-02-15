import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const prompt = body.prompt || body.topic || '';
    const clientId = body.client_id || body.clientId;
    const companyId = body.company_id || body.companyId;
    const style = body.style || 'professional marketing';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Fetch client data including reference images
    let clientContext = '';
    const referenceImageUrls: string[] = [];

    if (clientId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: client } = await supabase
        .from('clients')
        .select('name, company, sector, ai_briefing, voice_tone, ai_reference_image_1, ai_reference_image_2, ai_reference_image_3, avatar')
        .eq('id', clientId)
        .single();

      if (client) {
        clientContext = `Contexto da marca: ${client.company || client.name}, setor: ${client.sector || 'geral'}. ${client.ai_briefing ? `Identidade visual e briefing: ${client.ai_briefing.substring(0, 800)}` : ''}`;

        // Collect reference images
        for (const key of ['ai_reference_image_1', 'ai_reference_image_2', 'ai_reference_image_3'] as const) {
          const url = client[key];
          if (url && typeof url === 'string' && url.startsWith('http')) {
            referenceImageUrls.push(url);
          }
        }
      }
    }

    // Build the message content - multimodal if we have reference images
    const textInstruction = referenceImageUrls.length > 0
      ? `Crie uma imagem no estilo "${style}" para: ${prompt}. ${clientContext}. 

INSTRUÇÕES CRÍTICAS DE ESTILO: 
- As imagens de referência anexadas mostram o estilo visual e identidade da marca. 
- Você DEVE seguir o mesmo estilo, cores, tipografia e linguagem visual dessas referências.
- A nova imagem deve parecer que foi feita pelo mesmo designer que criou as referências.
- Mantenha a paleta de cores, estilo de ilustração/fotografia e elementos visuais consistentes.
- Alta qualidade, profissional, adequada para marketing em redes sociais.
- IMPORTANTE: Todo texto na imagem DEVE estar em português brasileiro correto, sem erros de ortografia ou gramática. Revise cada palavra antes de renderizar.`
      : `Create a ${style} image for: ${prompt}. ${clientContext}. High quality, professional, suitable for social media marketing. IMPORTANT: All text in the image MUST be in correct Brazilian Portuguese with no spelling or grammar errors.`;

    // Build message content array
    const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      { type: 'text', text: textInstruction },
    ];

    // Add reference images as visual input
    for (const imgUrl of referenceImageUrls) {
      messageContent.push({
        type: 'image_url',
        image_url: { url: imgUrl },
      });
    }

    console.log(`Generating image with ${referenceImageUrls.length} reference images. Prompt: ${textInstruction.substring(0, 200)}`);

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
            content: messageContent,
          },
        ],
        modalities: ['image', 'text'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.', success: false }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Add credits to your workspace.', success: false }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const images = message?.images || [];
    const textContent = message?.content || '';

    if (images.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No image was generated. The model returned only text.',
        text: textContent,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base64ImageUrl = images[0]?.image_url?.url || '';
    console.log('Image generated successfully, base64 length:', base64ImageUrl.length);

    // Upload to Supabase Storage so we have a persistent URL
    let persistentUrl = base64ImageUrl;
    if (base64ImageUrl.startsWith('data:image/')) {
      try {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        // Extract base64 data
        const matches = base64ImageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const base64Data = matches[2];
          const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

          const fileName = `ai-generated/${clientId || 'general'}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('ai-generated-images')
            .upload(fileName, binaryData, {
              contentType: `image/${matches[1]}`,
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('ai-generated-images')
              .getPublicUrl(fileName);
            persistentUrl = publicUrlData.publicUrl;
            console.log('Image uploaded to storage:', persistentUrl);
          } else {
            console.warn('Failed to upload image to storage:', uploadError.message);
          }
        }
      } catch (uploadErr) {
        console.warn('Error uploading generated image:', uploadErr);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      image_url: persistentUrl,
      text: textContent,
      reference_images_used: referenceImageUrls.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-image-ai:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal error',
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
