import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message, agentId } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Buscar informações do agente
    const { data: agent, error: agentError } = await supabaseClient
      .from('ia_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agente não encontrado');
    }

    // Buscar documentos de conhecimento
    const { data: knowledgeDocs } = await supabaseClient
      .from('ia_agent_knowledge_documents')
      .select('content_text, file_name')
      .eq('agent_id', agentId);

    const knowledgeContext = knowledgeDocs
      ?.filter(doc => doc.content_text)
      .map(doc => `[Documento: ${doc.file_name}]\n${doc.content_text}`)
      .join('\n\n---\n\n');

    // Buscar dados do cliente se houver associação
    let clientContext = '';
    
    if (agent.client_id) {
      const { data: client } = await supabaseClient
        .from('clients')
        .select(`
          *,
          facebook_ad_accounts!ad_account_id (
            account_name, balance, account_status
          )
        `)
        .eq('id', agent.client_id)
        .single();

      if (client) {
        // Buscar campanhas ativas do cliente
        const { data: campaigns } = await supabaseClient
          .from('campaigns')
          .select('*')
          .eq('client_id', agent.client_id)
          .eq('status', 'active')
          .order('spend', { ascending: false })
          .limit(10);

        clientContext = `
[INFORMAÇÕES DO CLIENTE ASSOCIADO]

Nome: ${client.name}
Empresa: ${client.company || 'Não informado'}
Setor: ${client.sector || 'Não informado'}
Website: ${client.website_url || 'Não informado'}

[BRIEFING]
Público-alvo: ${client.target_audience || 'Não definido'}
Produto/Serviço: ${client.product_name || 'Não definido'}
Tom de voz: ${client.voice_tone || 'Não definido'}
Objetivos: ${client.objectives || 'Não definido'}

${client.ai_briefing ? `\n[BRIEFING DETALHADO]\n${client.ai_briefing}\n` : ''}

[CAMPANHAS ATIVAS]
Total de campanhas ativas: ${campaigns?.length || 0}
${campaigns?.map(c => `
- ${c.name}
  Gasto: R$ ${c.spend?.toFixed(2) || 0}
  CPC: R$ ${c.cpc?.toFixed(2) || 0}
  CTR: ${c.ctr?.toFixed(2) || 0}%
  Conversões: ${c.conversions || 0}
  CPA: R$ ${c.cpa?.toFixed(2) || 0}
`).join('\n') || 'Nenhuma campanha ativa'}

[STATUS DA CONTA]
Status: ${client.status || 'Não definido'}
Budget Mensal: R$ ${client.monthly_budget || 'Não definido'}
Leads Gerados: ${client.leads_generated || 0}
Última Sincronização: ${client.last_sync_at ? new Date(client.last_sync_at).toLocaleString('pt-BR') : 'Nunca'}
`;
      }
    }

    // Salvar mensagem do usuário
    const { error: userMsgError } = await supabaseClient
      .from('ia_agent_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });

    if (userMsgError) throw userMsgError;

    // Buscar histórico de mensagens
    const { data: previousMessages } = await supabaseClient
      .from('ia_agent_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Construir prompt enriquecido com contexto
    const systemPrompt = `${agent.prompt_base}

${agent.additional_instructions || ''}

${knowledgeContext ? `\n\n[BIBLIOTECA DE CONHECIMENTO]\n${knowledgeContext}\n` : ''}

${clientContext ? `\n\n${clientContext}\n` : ''}

INSTRUÇÕES IMPORTANTES:
- Use as informações da biblioteca de conhecimento quando relevante
${agent.client_id ? '- Use os dados do cliente para contextualizar suas respostas' : ''}
${agent.client_id ? '- Mencione métricas específicas quando pertinente' : ''}
- Seja preciso e baseie suas respostas nos dados fornecidos
`;

    // Construir array de mensagens para a API
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      ...(previousMessages || []).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Chamar Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: agent.model || 'google/gemini-2.5-flash',
        messages: messages,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const assistantMessage = aiData.choices[0].message.content;

    // Salvar resposta do assistente
    const { error: assistantMsgError } = await supabaseClient
      .from('ia_agent_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      });

    if (assistantMsgError) throw assistantMsgError;

    // Atualizar título da conversa se for a primeira mensagem
    if (previousMessages?.length === 1) {
      const conversationTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      await supabaseClient
        .from('ia_agent_conversations')
        .update({ title: conversationTitle })
        .eq('id', conversationId);
    }

    // Atualizar updated_at da conversa
    await supabaseClient
      .from('ia_agent_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return new Response(
      JSON.stringify({ success: true, response: assistantMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ia-agent-chat:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
