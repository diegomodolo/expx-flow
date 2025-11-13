// Deno.serve is available natively in modern Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, clientId, companyId } = await req.json();
    
    console.log('AI Chat request:', { conversationId, clientId, companyId });

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get client context data
    console.log('Fetching client context...');
    
    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('company_id', companyId)
      .single();

    if (clientError || !client) {
      throw new Error('Cliente não encontrado');
    }

    // Fetch campaigns
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', clientId)
      .eq('company_id', companyId);

    // Fetch ad sets
    const { data: adSets } = await supabase
      .from('ad_sets')
      .select('*')
      .eq('client_id', clientId)
      .eq('company_id', companyId);

    // Fetch ads
    const { data: ads } = await supabase
      .from('ads')
      .select('*')
      .eq('client_id', clientId)
      .eq('company_id', companyId);

    // Fetch tasks related to client
    const { data: tasks } = await supabase
      .from('tasks')
      .select('title, status, priority, description')
      .eq('related_client_id', clientId)
      .eq('company_id', companyId);

    // Calculate KPIs
    const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
    const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
    const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const totalImpressions = campaigns?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 0;
    const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Build context for AI
    const clientContext = {
      client: {
        name: client.name,
        company: client.company,
        sector: client.sector,
        briefing: client.ai_briefing || 'Sem briefing disponível',
        objectives: client.objectives || 'Não especificado',
        targetAudience: client.target_audience || 'Não especificado',
        website: client.website_url || 'Não informado'
      },
      campaigns: campaigns?.map(c => ({
        name: c.name,
        status: c.status,
        spend: c.spend || 0,
        conversions: c.conversions || 0,
        cpa: c.cpa || 0,
        ctr: c.ctr || 0,
        impressions: c.impressions || 0,
        clicks: c.clicks || 0
      })) || [],
      adSets: adSets?.map(as => ({
        name: as.name,
        status: as.status,
        spend: as.spend || 0,
        conversions: as.conversions || 0,
        cpa: as.cpa || 0,
        ctr: as.ctr || 0
      })) || [],
      ads: ads?.map(ad => ({
        name: ad.name,
        status: ad.status,
        creativeType: ad.creative_type,
        spend: ad.spend || 0,
        conversions: ad.conversions || 0,
        ctr: ad.ctr || 0
      })) || [],
      kpis: {
        totalSpend,
        totalConversions,
        avgCPA: Number(avgCPA.toFixed(2)),
        avgCTR: Number(avgCTR.toFixed(2)),
        activeCampaigns: campaigns?.filter(c => c.status === 'active').length || 0
      },
      tasks: tasks?.map(t => ({
        title: t.title,
        status: t.status,
        priority: t.priority,
        description: t.description
      })) || []
    };

    console.log('Client context built successfully');

    // Save user message
    const { error: userMsgError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
    }

    // Prepare OpenAI request
    const systemPrompt = `Você é um assistente especializado em marketing digital e gestão de tráfego pago (Facebook Ads e Google Ads).

COMO RESPONDER:
- Para saudações (olá, oi, bom dia): seja amigável e pergunte como pode ajudar
- Para perguntas específicas: use APENAS os dados relevantes para responder à pergunta
- Para solicitações de análise: forneça insights detalhados com dados quando solicitado
- Seja conversacional e natural

DADOS DISPONÍVEIS:
Você tem acesso aos dados completos do cliente selecionado, mas só use quando necessário para responder à pergunta específica do usuário.

CAPACIDADES:
- Análise de performance de campanhas
- Otimização de CPA, CTR e ROI  
- Sugestões de criativos e copies
- Estratégias de segmentação
- Planejamento de orçamento

Responda apenas o que foi perguntado. Seja útil, mas não force informações não solicitadas.`;

    const userPrompt = `CONTEXTO DO CLIENTE:
${JSON.stringify(clientContext, null, 2)}

PERGUNTA DO USUÁRIO: ${message}`;

    console.log('Sending request to OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI response received');

    // Save AI response
    const { error: aiMsgError } = await supabase
      .from('ai_chat_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse
      });

    if (aiMsgError) {
      console.error('Error saving AI message:', aiMsgError);
    }

    // Update conversation title if it's the first message
    const { data: messageCount } = await supabase
      .from('ai_chat_messages')
      .select('id', { count: 'exact' })
      .eq('conversation_id', conversationId);

    if (messageCount && messageCount.length <= 2) {
      // Generate title from first user message (max 50 chars)
      const title = message.length > 50 ? message.substring(0, 47) + '...' : message;
      
      await supabase
        .from('ai_chat_conversations')
        .update({ title })
        .eq('id', conversationId);
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});