import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    // Called via webhook/trigger with the new message record
    const { message_id, channel_id, user_id: sender_user_id, content } = body;

    console.log(`[dm-agent-responder] New message in channel ${channel_id} from user ${sender_user_id}: "${content}"`);

    // 1. Fetch the DM channel and check if partner is an AI agent
    const { data: channel, error: channelError } = await supabase
      .from('internal_channels')
      .select('id, channel_type, reference_id, company_id')
      .eq('id', channel_id)
      .eq('channel_type', 'dm')
      .single();

    if (channelError || !channel) {
      console.log('[dm-agent-responder] Not a DM channel or channel not found, skipping');
      return new Response(JSON.stringify({ skipped: true }), { headers: corsHeaders });
    }

    // 2. Extract the OTHER user from the reference_id pair (sorted: "uuid1:uuid2")
    const [id1, id2] = channel.reference_id.split(':');
    const agentCandidateId = id1 === sender_user_id ? id2 : id1;

    console.log(`[dm-agent-responder] Agent candidate ID: ${agentCandidateId}`);

    // 3. Check if the other participant is an AI agent (collaborator)
    const { data: agent, error: agentError } = await supabase
      .from('ia_agents')
      .select('id, agent_name, prompt_base, additional_instructions, model, output_instructions')
      .eq('id', agentCandidateId)
      .eq('is_collaborator', true)
      .eq('company_id', channel.company_id)
      .single();

    if (agentError || !agent) {
      console.log('[dm-agent-responder] Other participant is not an AI agent, skipping');
      return new Response(JSON.stringify({ skipped: true }), { headers: corsHeaders });
    }

    console.log(`[dm-agent-responder] Found AI agent: ${agent.agent_name}`);

    // 4. Fetch conversation history from this channel (last 20 messages)
    const { data: history } = await supabase
      .from('internal_messages')
      .select('user_id, content, created_at')
      .eq('channel_id', channel_id)
      .is('thread_parent_id', null)
      .order('created_at', { ascending: false })
      .limit(20);

    const previousMessages = (history || []).reverse();

    // Build conversation history for the AI
    const conversationHistory = previousMessages.map((msg: { user_id: string; content: string }) => ({
      role: msg.user_id === agent.id ? 'assistant' : 'user',
      content: msg.content,
    }));

    // 5. Fetch agent enabled skills
    const { data: enabledSkills } = await supabase
      .from('ia_agent_enabled_skills')
      .select('skill_id')
      .eq('agent_id', agent.id);

    let skills: Array<{ id: string; name: string; description: string; edge_function: string; tool_parameters: Record<string, unknown>; requires_client?: boolean }> = [];
    if (enabledSkills && enabledSkills.length > 0) {
      const skillIds = enabledSkills.map((s: { skill_id: string }) => s.skill_id);
      const { data: skillData } = await supabase
        .from('ia_agent_skills')
        .select('id, name, description, edge_function, tool_parameters, requires_client')
        .in('id', skillIds);
      skills = skillData || [];
    }

    // 6. Fetch knowledge documents
    const { data: knowledgeDocs } = await supabase
      .from('ia_agent_knowledge_documents')
      .select('content_text, file_name')
      .eq('agent_id', agent.id)
      .limit(5);

    const knowledgeText = (knowledgeDocs || [])
      .map((doc: { file_name: string; content_text: string }) => `[${doc.file_name}]\n${doc.content_text}`)
      .join('\n\n');

    // 7. Build system prompt
    const nowSP = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const isoDateSP = nowSP.toISOString().split('T')[0];
    const timeSP = nowSP.toTimeString().slice(0, 5);

    const systemPrompt = `Você é ${agent.agent_name}, um agente de IA colaborador desta empresa.
Data e hora atual em São Paulo: ${isoDateSP} ${timeSP} (UTC-3).

${agent.prompt_base}

${agent.additional_instructions ? `\nInstruções adicionais:\n${agent.additional_instructions}` : ''}

${agent.output_instructions ? `\nFormato de saída:\n${agent.output_instructions}` : ''}

${knowledgeText ? `\nBase de conhecimento:\n${knowledgeText}` : ''}

CONTEXTO: Você está em uma conversa direta (DM) no chat interno da empresa com um colaborador humano.
Responda de forma natural, direta e útil. Seja proativo e ofereça ajuda específica baseado na sua especialidade.
Não use formatação excessiva. Use linguagem natural e amigável.`;

    // 8. Call the AI model via Lovable AI Gateway (same as ia-agent-chat)
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const model = agent.model || 'gemini-2.0-flash';

    const requestBody = {
      model,
      messages,
    };

    const aiResponse = await fetch('https://gateway.lovable.app/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      agentReply = aiData?.choices?.[0]?.message?.content || '';
    } else {
      const errorText = await aiResponse.text();
      console.error('[dm-agent-responder] AI Gateway error:', aiResponse.status, errorText);
      agentReply = `Olá! Sou ${agent.agent_name}. Estou com dificuldades técnicas no momento, mas já fui notificado. Tente novamente em instantes!`;
    }

    if (!agentReply) {
      agentReply = `Olá! Sou ${agent.agent_name}. Como posso ajudar?`;
    }

    console.log(`[dm-agent-responder] Agent reply: "${agentReply.substring(0, 100)}..."`);

    // 9. Insert the agent's reply into the channel
    const { error: insertError } = await supabase
      .from('internal_messages')
      .insert({
        channel_id: channel_id,
        user_id: agent.id,
        content: agentReply,
      });

    if (insertError) {
      console.error('[dm-agent-responder] Failed to insert agent reply:', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log('[dm-agent-responder] Agent reply inserted successfully');

    return new Response(JSON.stringify({ success: true, agent: agent.agent_name }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[dm-agent-responder] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
