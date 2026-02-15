import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkillRecord {
  id: string;
  name: string;
  description: string;
  edge_function: string;
  tool_parameters: Record<string, unknown>;
}

function buildToolsFromSkills(skills: SkillRecord[]) {
  return skills.map((skill) => ({
    type: 'function' as const,
    function: {
      name: skill.id,
      description: skill.description,
      parameters: skill.tool_parameters || { type: 'object', properties: {} },
    },
  }));
}

async function executeSkill(
  skillId: string,
  skills: SkillRecord[],
  args: Record<string, unknown>,
  agentContext: { client_id?: string; company_id?: string; user_id?: string }
) {
  const skill = skills.find((s) => s.id === skillId);
  if (!skill) return { error: `Skill "${skillId}" não encontrada` };

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${skill.edge_function}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...args,
        client_id: agentContext.client_id,
        company_id: agentContext.company_id,
        user_id: agentContext.user_id,
      }),
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return { result: text };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error executing skill ${skillId}:`, message);
    return { error: `Erro ao executar skill: ${message}` };
  }
}

async function chatWithToolCalling(
  messages: Array<{ role: string; content: string }>,
  tools: ReturnType<typeof buildToolsFromSkills>,
  skills: SkillRecord[],
  agentContext: { client_id?: string; company_id?: string; user_id?: string },
  model: string
): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const maxIterations = 5;

  let currentMessages = [...messages];

  for (let i = 0; i < maxIterations; i++) {
    const requestBody: Record<string, unknown> = {
      model,
      messages: currentMessages,
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const choice = aiData.choices[0];

    // If no tool calls, return the content
    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return choice.message.content || '';
    }

    // Add assistant message with tool calls
    currentMessages.push(choice.message);

    // Execute each tool call
    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch { /* empty args */ }

      console.log(`Executing skill: ${fnName}`, fnArgs);
      const result = await executeSkill(fnName, skills, fnArgs, agentContext);

      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      } as any);
    }
  }

  // If we exhausted iterations, do one final call without tools
  const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages: currentMessages }),
  });

  const finalData = await finalResponse.json();
  return finalData.choices[0].message.content || '';
}

Deno.serve(async (req) => {
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

    // Service role client for skill execution context
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch agent
    const { data: agent, error: agentError } = await supabaseClient
      .from('ia_agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (agentError || !agent) {
      throw new Error('Agente não encontrado');
    }

    // Fetch knowledge docs, client data, and enabled skills in parallel
    const [knowledgeResult, enabledSkillsResult] = await Promise.all([
      supabaseClient
        .from('ia_agent_knowledge_documents')
        .select('content_text, file_name')
        .eq('agent_id', agentId),
      serviceClient
        .from('ia_agent_enabled_skills')
        .select('skill_id, ia_agent_skills(*)')
        .eq('agent_id', agentId),
    ]);

    const knowledgeDocs = knowledgeResult.data;
    const knowledgeContext = knowledgeDocs
      ?.filter(doc => doc.content_text)
      .map(doc => `[Documento: ${doc.file_name}]\n${doc.content_text}`)
      .join('\n\n---\n\n');

    // Client context
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

    // Save user message
    const { error: userMsgError } = await supabaseClient
      .from('ia_agent_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        content: message
      });

    if (userMsgError) throw userMsgError;

    // Fetch message history
    const { data: previousMessages } = await supabaseClient
      .from('ia_agent_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Build enabled skills list
    const enabledSkills: SkillRecord[] = (enabledSkillsResult.data || [])
      .map((row: any) => row.ia_agent_skills)
      .filter(Boolean);

    const tools = buildToolsFromSkills(enabledSkills);

    // Build skill instructions for the system prompt
    const skillInstructions = enabledSkills.length > 0
      ? `\n\n[SKILLS DISPONÍVEIS]
Você tem acesso a ${enabledSkills.length} skills que pode executar quando o usuário pedir. Use-as chamando as funções disponíveis.
As skills serão executadas automaticamente e você receberá o resultado para formular sua resposta.
`
      : '';

    // Build enriched system prompt
    const systemPrompt = `${agent.prompt_base}

${agent.additional_instructions || ''}

${knowledgeContext ? `\n\n[BIBLIOTECA DE CONHECIMENTO]\n${knowledgeContext}\n` : ''}

${clientContext ? `\n\n${clientContext}\n` : ''}
${skillInstructions}
INSTRUÇÕES IMPORTANTES:
- Use as informações da biblioteca de conhecimento quando relevante
${agent.client_id ? '- Use os dados do cliente para contextualizar suas respostas' : ''}
${agent.client_id ? '- Mencione métricas específicas quando pertinente' : ''}
- Seja preciso e baseie suas respostas nos dados fornecidos
`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...(previousMessages || []).map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // Get user info for context
    const { data: { user } } = await supabaseClient.auth.getUser();

    const assistantMessage = await chatWithToolCalling(
      aiMessages,
      tools,
      enabledSkills,
      {
        client_id: agent.client_id,
        company_id: agent.company_id,
        user_id: user?.id,
      },
      agent.model || 'google/gemini-2.5-flash'
    );

    // Save assistant response
    const { error: assistantMsgError } = await supabaseClient
      .from('ia_agent_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      });

    if (assistantMsgError) throw assistantMsgError;

    // Update conversation title if first message
    if (previousMessages?.length === 1) {
      const conversationTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      await supabaseClient
        .from('ia_agent_conversations')
        .update({ title: conversationTitle })
        .eq('id', conversationId);
    }

    // Update conversation timestamp
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
