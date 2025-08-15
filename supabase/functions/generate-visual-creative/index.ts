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
      title,
      description,
      copy,
      creativeType,
      clientSector,
      voiceTone 
    } = await req.json();

    console.log('Generating visual creative for:', {
      title,
      creativeType,
      clientSector
    });

    // Criar prompt detalhado para geração da imagem
    const prompt = `
Crie uma imagem profissional para ${creativeType} com as seguintes especificações:

TÍTULO/HEADLINE: ${title}
DESCRIÇÃO: ${description}
COPY PARA IMAGEM: ${copy}
SETOR DO CLIENTE: ${clientSector}
TOM DE VOZ: ${voiceTone}

INSTRUÇÕES PARA A IMAGEM:
- Style: Profissional, moderno e atrativo
- Layout: Limpo e bem organizado
- Cores: Use cores adequadas ao setor ${clientSector}
- Texto: Incluir o copy "${copy}" de forma legível e destacada
- Qualidade: Alta resolução, adequada para redes sociais
- Composição: Equilibrada e visualmente atrativa

A imagem deve ser adequada para o tipo de criativo: ${creativeType}
Tom de comunicação: ${voiceTone}

Crie uma imagem que capture a atenção do público-alvo e comunique efetivamente a mensagem.`;

    // Chamar a API de geração de imagens do OpenAI
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-image-1',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'high',
        response_format: 'url'
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].url) {
      throw new Error('Invalid response from OpenAI API');
    }

    const imageUrl = data.data[0].url;

    console.log('Image generated successfully:', imageUrl);

    // Gerar uma legenda sugerida baseada no contexto
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
            content: 'Você é um especialista em marketing digital. Crie legendas envolventes para redes sociais em português brasileiro.' 
          },
          { 
            role: 'user', 
            content: `Crie uma legenda envolvente para redes sociais baseada em:
            
            Título: ${title}
            Descrição: ${description}
            Setor: ${clientSector}
            Tom: ${voiceTone}
            
            A legenda deve:
            - Ter entre 100-200 caracteres
            - Incluir emojis relevantes
            - Ter 2-3 hashtags estratégicas
            - Ser persuasiva e chamar para ação
            
            Responda apenas com a legenda, sem explicações.`
          }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
    });

    let suggestedCaption = "🚀 Transforme seus resultados! Conheça nossa solução. #Marketing #Inovação";
    
    if (captionResponse.ok) {
      const captionData = await captionResponse.json();
      suggestedCaption = captionData.choices[0].message.content.trim();
    }

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