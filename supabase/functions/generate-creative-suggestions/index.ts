import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      clientId, 
      creativeType, 
      clientBriefing, 
      clientSector, 
      targetAudience, 
      voiceTone,
      hasReferences 
    } = await req.json();

    console.log('Generating creative suggestions for:', {
      clientId,
      creativeType,
      clientSector,
      hasReferences
    });

    const creativeTypeNames: Record<string, string> = {
      'instagram-feed': 'Post para Feed do Instagram',
      'instagram-stories': 'Stories do Instagram',
      'facebook-cover': 'Capa de Facebook',
      'youtube-cover': 'Capa de YouTube',
      'youtube-thumbnail': 'Thumbnail para vídeo do YouTube',
      'facebook-ad': 'Criativo para Anúncio do Facebook',
      'email-banner': 'Banner para E-mail',
      'website-banner': 'Banner para Site',
      'whatsapp-business': 'Imagem para WhatsApp Business',
      'pinterest-pin': 'Pin do Pinterest',
      'reels-cover': 'Capa para Reels',
      'tiktok-cover': 'Capa para TikTok',
      'linkedin-post': 'Post do LinkedIn',
      'carousel-post': 'Carrossel',
      'remarketing-ad': 'Criativo para Remarketing',
      'awareness-campaign': 'Campanha de Conscientização',
      'institutional-post': 'Post Institucional',
      'event-promotion': 'Divulgação de Evento',
      'seasonal-post': 'Post Comemorativo',
      'product-mockup': 'Mockup de Produto',
    };

    const creativeTypeName = creativeTypeNames[creativeType] || creativeType;

    const prompt = `
Você é um especialista em marketing digital e criação de conteúdo visual. 

Preciso de 3 sugestões criativas de TEMAS para um ${creativeTypeName}.

CONTEXTO DO CLIENTE:
- Setor: ${clientSector}
- Tom de voz: ${voiceTone || 'Não especificado'}
- Público-alvo: ${targetAudience || 'Não especificado'}
- Tem imagens de referência: ${hasReferences ? 'Sim' : 'Não'}

${clientBriefing ? `BRIEFING DETALHADO:\n${clientBriefing}` : ''}

INSTRUÇÕES:
1. Cada tema deve ser específico e actionable
2. Considere o setor do cliente e seu público-alvo
3. Os temas devem ser adequados para o tipo de criativo solicitado
4. Seja criativo mas mantenha relevância comercial
5. Considere tendências atuais de marketing digital

Retorne EXATAMENTE neste formato JSON:
{
  "suggestions": [
    {
      "title": "Nome do Tema (máximo 60 caracteres)",
      "description": "Descrição detalhada do que o criativo deve mostrar (máximo 150 caracteres)",
      "rationale": "Por que este tema é eficaz para este cliente e tipo de criativo (máximo 100 caracteres)"
    }
  ]
}

Garanta que o JSON seja válido e contenha exatamente 3 sugestões.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em marketing digital e criação de conteúdo. Sempre responda em português brasileiro com JSON válido.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    let suggestions;
    try {
      const parsed = JSON.parse(content);
      suggestions = parsed.suggestions;
    } catch (error) {
      console.error('Error parsing OpenAI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response structure
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('Invalid suggestions format');
    }

    console.log('Generated suggestions successfully:', suggestions.length);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-creative-suggestions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestions: [] // Return empty array as fallback
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});