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

    // Fetch client data for context if available
    let clientContext = '';
    if (clientId && companyId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: client } = await supabase
        .from('clients')
        .select('name, company, sector, ai_briefing, voice_tone')
        .eq('id', clientId)
        .single();

      if (client) {
        clientContext = `Contexto da marca: ${client.company || client.name}, setor: ${client.sector || 'geral'}. ${client.ai_briefing ? `Identidade visual: ${client.ai_briefing.substring(0, 500)}` : ''}`;
      }
    }

    const imagePrompt = clientContext
      ? `Create a ${style} image for: ${prompt}. ${clientContext}. High quality, professional, suitable for social media marketing.`
      : `Create a ${style} image for: ${prompt}. High quality, professional, suitable for social media marketing.`;

    console.log('Generating image with prompt:', imagePrompt.substring(0, 200));

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: imagePrompt,
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

    // Return the base64 image data
    const imageUrl = images[0]?.image_url?.url || '';

    console.log('Image generated successfully, base64 length:', imageUrl.length);

    return new Response(JSON.stringify({
      success: true,
      image_url: imageUrl,
      text: textContent,
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
