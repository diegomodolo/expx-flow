import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const ideogramApiKey = Deno.env.get('IDEOGRAM_API_KEY');
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
    console.log('Starting generate-visual-creative function');
    
    const { 
      creativeType,
      clientId,
      theme,
      context,
      companyId
    } = await req.json();

    console.log('Request data received:', {
      creativeType,
      clientId,
      theme,
      companyId,
      contextKeys: Object.keys(context || {})
    });

    // Validar dados obrigatórios
    if (!creativeType) {
      console.error('Missing creativeType');
      throw new Error('Creative type is required');
    }
    
    if (!clientId) {
      console.error('Missing clientId');
      throw new Error('Client ID is required');
    }
    
    if (!companyId) {
      console.error('Missing companyId');
      throw new Error('Company ID is required');
    }
    
    if (!context) {
      console.error('Missing context, received:', context);
      throw new Error('Context is required');
    }

    if (!openAIApiKey) {
      console.error('Missing OpenAI API key');
      throw new Error('OpenAI API key is not configured');
    }

    if (!ideogramApiKey) {
      console.error('Missing Ideogram API key');
      throw new Error('Ideogram API key is not configured');
    }

     console.log('Searching for client with ID:', clientId, 'and company ID:', companyId);

    // Buscar dados completos do cliente
    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name, sector, ai_briefing, target_audience')
        .eq('id', clientId)
        .eq('company_id', companyId)
        .single();

      console.log('Supabase query result:', { 
        hasData: !!clientData, 
        hasError: !!clientError,
        errorMessage: clientError?.message,
        errorCode: clientError?.code
      });

      if (clientError) {
        console.error('Error fetching client data:', clientError);
        throw new Error(`Erro ao buscar dados do cliente: ${clientError.message}`);
      }

      if (!clientData) {
        console.error('No client data found for ID:', clientId);
        throw new Error('Cliente não encontrado');
      }

      console.log('Client data retrieved successfully:', {
        clientName: clientData?.name,
        sector: clientData?.sector,
        hasTargetAudience: !!clientData?.target_audience,
        hasBriefing: !!clientData?.ai_briefing
      });

      // Extrair informações do contexto
      console.log('Extracting context data...');
      const {
        title = '',
        description = '',
        copy = '',
        targetAudience = '',
        objective = ''
      } = context;

      console.log('Context extracted:', { title, description, copy, targetAudience, objective });

      // Criar prompt detalhado para geração da imagem
      console.log('Creating prompt for image generation...');

      // Processar copy para melhor formatação na imagem
      const formattedCopy = copy ? copy.replace(/\n/g, ' | ') : '';
      
      // Criar prompt detalhado e contextualizado
      const prompt = `Create a professional ${creativeType} advertisement image with the following specifications:

BRAND & CONTEXT:
- Company: ${clientData.name}
- Industry: ${clientData.sector}
- Campaign Theme: ${theme}
- Main Title: ${title}
- Key Message: ${description}

VISUAL ELEMENTS:
- Style: Modern, professional design appropriate for ${clientData.sector} industry
- Layout: Clean composition with clear visual hierarchy
- Colors: Professional color palette that conveys trust and innovation for ${clientData.sector}
- Typography: Bold, readable fonts for headlines and supporting text

TEXT CONTENT TO INCLUDE:
${formattedCopy ? `- Main copy text: "${formattedCopy}"` : '- Focus on visual elements without overlapping text'}
- Headline: "${title}"

TARGET AUDIENCE: ${targetAudience}

SPECIFIC REQUIREMENTS:
- Format: Optimized for ${creativeType} (1080x1080px if square format)
- Message: Must communicate "${objective}"
- Industry relevance: Include visual elements that resonate with ${clientData.sector} professionals
- Call-to-action feel: Should inspire action towards the campaign objective

VISUAL STYLE:
- Professional photography or illustration style
- High contrast for text readability
- Balanced composition with clear focal points
- Modern gradient or solid backgrounds that don't compete with text
- Include relevant industry iconography or metaphors for ${clientData.sector}

Create an engaging, conversion-focused image that clearly communicates the value proposition to ${targetAudience}.`;

      // Chamar a API de geração de imagens do Ideogram
      console.log('Calling Ideogram API with prompt length:', prompt.length);
      
      // Determinar aspect ratio baseado no tipo de criativo
      let aspectRatio = 'ASPECT_1_1'; // Default para Facebook Ad
      if (creativeType === 'instagram-story') {
        aspectRatio = 'ASPECT_9_16';
      } else if (creativeType === 'facebook-cover') {
        aspectRatio = 'ASPECT_16_9';
      }
      
      const response = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_request: {
            prompt: prompt,
            aspect_ratio: aspectRatio,
            model: 'V_2',
            magic_prompt_option: 'AUTO'
          }
        }),
      });

      console.log('Ideogram response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Ideogram API error:', response.status, errorData);
        throw new Error(`Ideogram API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      console.log('Ideogram response received, checking data structure...');
      
      if (!data.data || !data.data[0] || !data.data[0].url) {
        console.error('Invalid Ideogram response structure:', data);
        throw new Error('Invalid response from Ideogram API');
      }

      const imageUrl = data.data[0].url;
      console.log('Image generated successfully:', imageUrl);

      // Gerar uma legenda sugerida baseada no contexto completo
      console.log('Generating caption with GPT...');
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
- Briefing: ${clientData.ai_briefing || 'Não especificado'}

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

      console.log('Function completed successfully');
      return new Response(JSON.stringify({ 
        imageUrl,
        suggestedCaption 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      throw new Error(`Erro na consulta ao banco: ${dbError.message}`);
    }

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