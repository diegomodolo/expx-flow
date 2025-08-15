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
      theme,
      creativeType, 
      clientBriefing, 
      clientSector, 
      targetAudience, 
      voiceTone 
    } = await req.json();

    console.log('Generating creative context for theme:', theme);

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
Você é um especialista em marketing digital e criação de conteúdo.

Com base no tema escolhido, gere automaticamente o contexto criativo completo:

TEMA ESCOLHIDO: "${theme}"

CONTEXTO DO CLIENTE:
- Tipo de criativo: ${creativeTypeName}
- Setor: ${clientSector}
- Tom de voz: ${voiceTone || 'Não especificado'}
- Público-alvo: ${targetAudience || 'Não especificado'}

${clientBriefing ? `BRIEFING DO CLIENTE:\n${clientBriefing}` : ''}

INSTRUÇÕES:
1. Crie um título/headline impactante baseado no tema
2. Elabore uma descrição detalhada da peça
3. Defina o objetivo específico do criativo
4. Especifique o público-alvo (pode refinar o geral do cliente)
5. Crie um copy conciso para a imagem (máximo 3-4 linhas)
6. Sugira uma legenda envolvente para redes sociais

IMPORTANTE:
- Mantenha consistência com o tema escolhido
- Considere o setor e tom de voz do cliente
- O copy deve ser direto e persuasivo
- A legenda deve incluir emojis e hashtags relevantes

Retorne EXATAMENTE neste formato JSON:
{
  "context": {
    "title": "Título/headline impactante (máximo 60 caracteres)",
    "description": "Descrição detalhada do que o criativo deve comunicar (máximo 200 caracteres)",
    "objective": "Objetivo específico do criativo (máximo 100 caracteres)",
    "targetAudience": "Público-alvo específico para este criativo (máximo 150 caracteres)",
    "copy": "Copy da imagem\\nUse \\n para quebras\\nMáximo 3-4 linhas",
    "caption": "Legenda para redes sociais com emojis e hashtags relevantes (máximo 300 caracteres)"
  }
}

Garanta que o JSON seja válido e todos os campos estejam preenchidos.`;

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
            content: 'Você é um especialista em marketing digital. Sempre responda em português brasileiro com JSON válido.' 
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

    // Parse the JSON response - remove markdown code blocks if present
    let context;
    try {
      let cleanContent = content.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsed = JSON.parse(cleanContent);
      context = parsed.context;
    } catch (error) {
      console.error('Error parsing OpenAI response:', content);
      throw new Error('Invalid JSON response from AI');
    }

    // Validate the response structure
    if (!context || typeof context !== 'object') {
      throw new Error('Invalid context format');
    }

    console.log('Generated context successfully');

    return new Response(JSON.stringify({ context }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in generate-creative-context function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      context: {
        title: "",
        description: "",
        objective: "",
        targetAudience: "",
        copy: "",
        caption: ""
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});