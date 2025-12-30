import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    
    // Detectar qual tipo de chamada está sendo feita
    // Novo formato: type = 'theme' | 'copy'
    // Antigo formato: creativeType para sugestões múltiplas
    
    if (body.type === 'theme' || body.type === 'copy') {
      // NOVO FORMATO - Geração simples de tema ou copy
      return await handleSimpleSuggestion(body);
    } else {
      // FORMATO ANTIGO - Múltiplas sugestões de tema
      return await handleMultipleSuggestions(body);
    }

  } catch (error: any) {
    console.error('Error in generate-creative-suggestions:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      suggestions: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Novo formato - gerar um único tema ou copy
async function handleSimpleSuggestion(body: any) {
  const { clientId, companyId, briefing, theme, type, creativeTypes } = body;

  console.log('Generate simple suggestion:', { clientId, type, creativeTypes });

  if (!clientId || !companyId) {
    throw new Error('Client ID and Company ID are required');
  }

  // Buscar dados do cliente se não tiver briefing
  let clientBriefing = briefing;
  let clientData = null;
  
  if (!clientBriefing) {
    const { data, error } = await supabase
      .from('clients')
      .select('name, ai_briefing, sector, target_audience, voice_tone, product_name')
      .eq('id', clientId)
      .eq('company_id', companyId)
      .single();
    
    if (error) throw error;
    clientData = data;
    clientBriefing = data?.ai_briefing;
  }

  if (!clientBriefing && !theme) {
    throw new Error('Client briefing or theme is required');
  }

  const creativeTypesStr = creativeTypes?.join(', ') || 'Post para redes sociais';

  let prompt = '';
  
  if (type === 'theme') {
    prompt = `Você é um especialista em marketing digital e criação de conteúdo.

Com base no briefing do cliente abaixo, sugira UM tema criativo e envolvente para uma peça visual de marketing.

BRIEFING DO CLIENTE:
${clientBriefing}

${clientData ? `
INFORMAÇÕES ADICIONAIS:
- Nome: ${clientData.name}
- Setor: ${clientData.sector || 'Não informado'}
- Público-alvo: ${clientData.target_audience || 'Não informado'}
- Tom de voz: ${clientData.voice_tone || 'Profissional'}
- Produto/Serviço: ${clientData.product_name || 'Não informado'}
` : ''}

TIPO DE CRIATIVO: ${creativeTypesStr}

INSTRUÇÕES:
1. Crie um tema que seja relevante para o momento atual (promoções, datas comemorativas, tendências)
2. O tema deve ser específico e acionável (não genérico)
3. Considere o público-alvo e tom de voz do cliente
4. Seja criativo mas mantenha alinhamento com a marca

Responda APENAS com o tema sugerido, em 1-2 frases. Nada mais.`;
  } else if (type === 'copy') {
    prompt = `Você é um copywriter especialista em anúncios visuais.

Crie UM texto curto e impactante para aparecer DENTRO de uma peça visual de marketing.

${clientBriefing ? `BRIEFING DO CLIENTE:\n${clientBriefing}\n` : ''}
${theme ? `TEMA DA PEÇA:\n${theme}\n` : ''}

TIPO DE CRIATIVO: ${creativeTypesStr}

INSTRUÇÕES:
1. O texto deve ser MUITO curto (máximo 5-7 palavras)
2. Deve ser impactante e chamar atenção
3. Use técnicas de copywriting (urgência, benefício, CTA)
4. Exemplos: "50% OFF Hoje", "Última Chance!", "Frete Grátis", "Compre Agora"

Responda APENAS com o texto da imagem. Nada mais.`;
  } else {
    throw new Error('Invalid suggestion type');
  }

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lovableApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('AI Gateway error:', errorText);
    throw new Error('Failed to generate suggestion');
  }

  const data = await response.json();
  const suggestion = data.choices?.[0]?.message?.content?.trim();

  if (!suggestion) {
    throw new Error('No suggestion generated');
  }

  console.log('Generated suggestion:', suggestion);

  return new Response(
    JSON.stringify({ 
      success: true,
      [type]: suggestion 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Formato antigo - múltiplas sugestões de tema
async function handleMultipleSuggestions(body: any) {
  const { 
    clientId, 
    creativeType, 
    clientBriefing, 
    clientSector, 
    targetAudience, 
    voiceTone,
    hasReferences 
  } = body;

  console.log('Generating multiple suggestions for:', {
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

  // Usar OpenAI se disponível, senão Lovable AI
  let response;
  
  if (openAIApiKey) {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'Você é um especialista em marketing digital e criação de conteúdo. Sempre responda em português brasileiro com JSON válido.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
      }),
    });
  } else {
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'Você é um especialista em marketing digital e criação de conteúdo. Sempre responda em português brasileiro com JSON válido.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
      }),
    });
  }

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Parse the JSON response
  let suggestions;
  try {
    let cleanContent = content.trim();
    
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const parsed = JSON.parse(cleanContent);
    suggestions = parsed.suggestions;
  } catch (error) {
    console.error('Error parsing AI response:', content);
    throw new Error('Invalid JSON response from AI');
  }

  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    throw new Error('Invalid suggestions format');
  }

  console.log('Generated suggestions successfully:', suggestions.length);

  return new Response(JSON.stringify({ suggestions }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}