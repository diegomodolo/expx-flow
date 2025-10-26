import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

    // Construir array de mensagens para a API
    const messages = [
      {
        role: 'system',
        content: `${agent.prompt_base}\n\n${agent.additional_instructions || ''}`
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
