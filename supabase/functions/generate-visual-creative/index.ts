import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

      // Usar texto aprovado se disponível, senão usar o copy do contexto
      const textToUse = approvedText || copy || title || theme;
      console.log('Text to use in image:', textToUse);

      // Buscar prompt personalizado da empresa ou usar o padrão
      console.log('Fetching custom or default prompt for company...');
      
      const { data: customPromptData } = await supabase
        .from('content_prompts')
        .select('custom_prompt, default_prompt')
        .eq('company_id', companyId)
        .eq('content_type', 'ideogram_creative')
        .maybeSingle();

      // Prompt padrão como fallback
  const defaultPrompt = `PROFESSIONAL PHOTOGRAPHY: Create a real marketing campaign photograph - NOT an illustration or cartoon

TEXT OVERLAY REQUIREMENT: "{textToUse}"
CRITICAL: This text must appear as a TEXT OVERLAY on top of the image - NOT as text printed on objects, clothing, mugs, or any physical items in the photo.

VISUAL CONTEXT:
- Client: {clientName} ({sectorContext} sector)
- Target audience: {audienceContext}
- Campaign theme: {theme}
- Creative type: {creativeType}
{clientBriefing}

PHOTOGRAPHY SPECIFICATIONS:
- MUST be ultra-realistic photography style - like shot with professional DSLR camera
- Professional studio lighting or natural lighting setup
- High-resolution commercial photography quality
- Corporate, professional design with clean, modern layout
- Colors and visual style aligned with the branding of the {sectorContext} sector
- Visual appeal for {audienceContext}
- Background: Clean, professional, and contextually appropriate

TEXT OVERLAY SPECIFICATIONS:
- Text "{textToUse}" must appear as a DIGITAL TEXT OVERLAY on top of the photograph
- Text should be positioned strategically (top, center, or bottom area of the image)
- Use professional, readable typography with good contrast against the background
- Text should NOT be part of the physical scene (not on signs, products, clothing, etc.)
- Text should look like it was added as a graphic element over the photo
- Ensure text is clearly legible with proper color contrast
- Use modern, clean fonts appropriate for marketing materials

STRICT TEXT RULES:
- TEXT OVERLAY MUST BE EXACTLY: "{textToUse}"
- NO extra words, slogans, or additional text beyond this
- NO English words unless specifically in the provided text
- NO spelling errors or invented words
- NO distortions or variations in the text
- Text appears as overlay/graphic element, NOT as physical text in the scene

CRITICAL REQUIREMENTS:
- NEVER use illustration, cartoon, drawing, sketch, anime, manga, comic, flat design, vector art, digital art, painting, artistic rendering, 3D render, clipart, icon, logo, symbol, or graphic design
- MUST look like an actual photograph taken by a professional photographer with text overlay added
- MUST appear as a real marketing campaign photo that could be used by a major brand
- Use realistic lighting, shadows, depth of field, and photographic composition
- The photograph itself should be clean without text, with the specified text appearing as an overlay
- Focus on creating a highly professional and realistic advertisement photograph with professional text overlay`;

      // Usar prompt personalizado ou padrão
      let promptTemplate = customPromptData?.custom_prompt && customPromptData.custom_prompt.trim()
        ? customPromptData.custom_prompt
        : defaultPrompt;

      console.log('Using prompt type:', customPromptData?.custom_prompt ? 'custom' : 'default');

      // Substituir variáveis no prompt
      const clientBriefing = clientData.ai_briefing || '';
      const sectorContext = clientData.sector || '';
      const audienceContext = clientData.target_audience || targetAudience || '';
      
      const prompt = promptTemplate
        .replace(/\{textToUse\}/g, textToUse)
        .replace(/\{clientName\}/g, clientData.name)
        .replace(/\{sectorContext\}/g, sectorContext)
        .replace(/\{audienceContext\}/g, audienceContext)
        .replace(/\{theme\}/g, theme)
        .replace(/\{creativeType\}/g, creativeType.replace('-', ' '))
        .replace(/\{clientBriefing\}/g, clientBriefing ? `- Brand context: ${clientBriefing.substring(0, 200)}` : '');

      // Chamar a API de geração de imagens do Ideogram
      console.log('Calling Ideogram API with prompt length:', prompt.length);
      
      // Determinar aspect ratio baseado no tipo de criativo
      console.log('Mapping aspect ratio for creative type:', creativeType);
      
      let aspectRatio = 'ASPECT_1_1'; // Default
      
      // Mapeamento completo dos tipos de criativo para aspect ratios
      const aspectRatioMap = {
        // Stories e formatos verticais 9:16
        'instagram-stories': 'ASPECT_9_16',
        'reels-cover': 'ASPECT_9_16',
        'tiktok-cover': 'ASPECT_9_16',
        
        // Formatos quadrados 1:1
        'instagram-feed': 'ASPECT_1_1',
        'whatsapp-business': 'ASPECT_1_1',
        'carousel-post': 'ASPECT_1_1',
        'awareness-campaign': 'ASPECT_1_1',
        'institutional-post': 'ASPECT_1_1',
        'event-promotion': 'ASPECT_1_1',
        'seasonal-post': 'ASPECT_1_1',
        'product-mockup': 'ASPECT_1_1',
        
        // Formatos horizontais 16:9
        'facebook-cover': 'ASPECT_16_9',
        'youtube-cover': 'ASPECT_16_9',
        'youtube-thumbnail': 'ASPECT_16_9',
        
        // Formatos para anúncios (aproximadamente 2:1)
        'facebook-ad': 'ASPECT_1_1', // Mantendo 1:1 para compatibilidade
        'linkedin-post': 'ASPECT_1_1',
        'remarketing-ad': 'ASPECT_1_1',
        
        // Formatos especiais
        'pinterest-pin': 'ASPECT_9_16', // Aproximado para 2:3
        'email-banner': 'ASPECT_16_9', // Aproximado para 3:1
        'website-banner': 'ASPECT_16_9' // Aproximado para 3.2:1
      };
      
      aspectRatio = aspectRatioMap[creativeType] || 'ASPECT_1_1';
      console.log('Selected aspect ratio:', aspectRatio, 'for creative type:', creativeType);
      
      // Preparar o corpo da requisição para o Ideogram
      const ideogramRequestBody: any = {
        image_request: {
          prompt: prompt,
          aspect_ratio: aspectRatio,
          model: 'V_2_TURBO', // Use latest model for better text accuracy
          magic_prompt_option: 'OFF', // ALWAYS OFF to prevent text modifications
          negative_prompt: 'illustration, cartoon, drawing, sketch, anime, manga, comic, flat design, vector art, digital art, painting, artistic rendering, 3D render, clipart, icon, logo, symbol, graphic design, extra text, random words, english words, spelling errors, blurry text, distorted text, additional content, unrealistic, fake, artificial',
          style_type: 'REALISTIC'
        }
      };

      // Adicionar imagens de referência se disponíveis
      if (references && references.length > 0) {
        console.log(`Adding ${references.length} reference images to Ideogram request`);
        
        // Converter base64 para format esperado pelo Ideogram
        const styleReferences = references.map((base64Image: string) => {
          // Remover o prefixo data:image/...;base64, se presente
          const base64Data = base64Image.split(',')[1] || base64Image;
          return {
            weight: 1.0 / references.length, // Distribuir peso igualmente entre referências
            image_base64: base64Data
          };
        });

        ideogramRequestBody.image_request.style_reference_images = styleReferences;
        
        // Ajustar prompt quando há referências - incluindo diretrizes específicas
        const enhancedPrompt = `${prompt}

STYLE REFERENCE GUIDELINES:
- Follow the visual composition, layout, and design patterns from reference images
- Adopt similar color schemes, typography styles, and visual hierarchy
- Maintain consistent visual elements and aesthetic approach
- Use reference images as inspiration for overall design quality and professional appearance

CRITICAL: Despite following style references, the text MUST remain exactly: "${textToUse}"`;
        
        ideogramRequestBody.image_request.prompt = enhancedPrompt;
        console.log('Enhanced prompt with style references for Ideogram');
      }
      
      const response = await fetch('https://api.ideogram.ai/generate', {
        method: 'POST',
        headers: {
          'Api-Key': ideogramApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ideogramRequestBody),
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