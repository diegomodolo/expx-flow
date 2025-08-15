import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      creativeType,
      clientId,
      theme,
      context,
      companyId
    } = await req.json();

    console.log('Generating visual creative with data:', {
      creativeType,
      clientId,
      theme,
      companyId,
      contextKeys: Object.keys(context || {})
    });

    // Validar dados obrigatórios
    if (!creativeType) {
      throw new Error('Creative type is required');
    }
    
    if (!clientId) {
      throw new Error('Client ID is required');
    }
    
    if (!companyId) {
      throw new Error('Company ID is required');
    }
    
    if (!context) {
      console.error('Context is missing, received:', context);
      throw new Error('Context is required');
    }

    console.log('Searching for client with ID:', clientId, 'and company ID:', companyId);

    // Buscar dados completos do cliente
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name, sector, briefing, target_audience, ai_briefing')
      .eq('id', clientId)
      .eq('company_id', companyId)
      .single();

    if (clientError) {
      console.error('Error fetching client data:', clientError);
      throw new Error(`Erro ao buscar dados do cliente: ${clientError.message}`);
    }

    if (!clientData) {
      console.error('No client data found for ID:', clientId);
      throw new Error('Cliente não encontrado');
    }

    console.log('Client data retrieved:', {
      clientName: clientData?.name,
      sector: clientData?.sector,
      hasTargetAudience: !!clientData?.target_audience,
      hasBriefing: !!clientData?.ai_briefing
    });

    // Extrair informações do contexto
    const {
      title = '',
      description = '',
      copy = '',
      targetAudience = '',
      objective = ''
    } = context;

    // Criar prompt detalhado para geração da imagem
    const prompt = `
Crie uma imagem profissional para ${creativeType} com as seguintes especificações:

CONTEXTO DO CLIENTE:
- Nome: ${clientData.name}
- Setor: ${clientData.sector}
- Público-alvo: ${clientData.target_audience || targetAudience}
- Briefing: ${clientData.briefing || 'Não especificado'}

DETALHES DA CAMPANHA:
- Tema: ${theme}
- Título/Headline: ${title}
- Descrição: ${description}
- Copy para imagem: ${copy}
- Objetivo: ${objective}

INSTRUÇÕES PARA A IMAGEM:
- Style: Profissional, moderno e atrativo para o setor ${clientData.sector}
- Layout: Limpo e bem organizado
- Cores: Use paleta de cores adequada ao setor ${clientData.sector} e que transmita confiança
- Texto: ${copy ? `Incluir o copy "${copy}" de forma legível e destacada` : 'Foco visual sem texto sobreposto'}
- Qualidade: Ultra alta resolução, adequada para ${creativeType}
- Composição: Equilibrada e visualmente atrativa para o público ${clientData.target_audience || targetAudience}
- Tema: Incorporar elementos visuais relacionados ao tema "${theme}"

REQUISITOS ESPECÍFICOS:
- A imagem deve ser adequada para: ${creativeType}
- Deve comunicar efetivamente para: ${clientData.target_audience || targetAudience}
- Deve refletir o posicionamento do cliente no setor: ${clientData.sector}
- Deve transmitir a mensagem: ${objective || title}

Crie uma imagem que capture a atenção do público-alvo específico e comunique efetivamente a proposta de valor do cliente.`;

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

    // Gerar uma legenda sugerida baseada no contexto completo
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
            content: 'Você é um especialista em marketing digital e copywriting. Crie legendas envolventes e persuasivas para redes sociais em português brasileiro, sempre considerando o público-alvo específico e o posicionamento da marca.' 
          },
          { 
            role: 'user', 
            content: `Crie uma legenda envolvente para redes sociais baseada no seguinte contexto:

CLIENTE:
- Nome: ${clientData.name}
- Setor: ${clientData.sector}
- Público-alvo: ${clientData.target_audience || targetAudience}
- Briefing: ${clientData.briefing || 'Não especificado'}

CAMPANHA:
- Tema: ${theme}
- Título: ${title}
- Descrição: ${description}
- Copy da imagem: ${copy}
- Objetivo: ${objective}
- Tipo de criativo: ${creativeType}

REQUISITOS PARA A LEGENDA:
- Ter entre 120-250 caracteres
- Incluir emojis relevantes ao setor ${clientData.sector}
- Ter 2-4 hashtags estratégicas para o público ${clientData.target_audience || targetAudience}
- Ser persuasiva e incluir uma call-to-action clara
- Refletir o tom profissional mas acessível
- Conectar com a proposta de valor do cliente
- Ser adequada para o tipo de criativo: ${creativeType}

Responda APENAS com a legenda, sem explicações ou comentários adicionais.`
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    let suggestedCaption = `🚀 Transforme seus resultados com ${clientData.name}! Soluções inovadoras para ${clientData.sector}. #${clientData.sector.replace(/\s+/g, '')} #Inovação #Resultados`;
    
    if (captionResponse.ok) {
      const captionData = await captionResponse.json();
      if (captionData.choices && captionData.choices[0] && captionData.choices[0].message) {
        suggestedCaption = captionData.choices[0].message.content.trim();
      }
    } else {
      console.error('Caption generation failed:', await captionResponse.text());
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