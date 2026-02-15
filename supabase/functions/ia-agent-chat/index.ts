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
  requires_client?: boolean;
}

const LOOKUP_CLIENT_TOOL = {
  type: 'function' as const,
  function: {
    name: '_lookup_client',
    description: 'Busca um cliente pelo nome na base de dados da empresa. Use quando precisar identificar qual cliente o usuário está se referindo. Retorna id, nome e empresa do cliente.',
    parameters: {
      type: 'object',
      properties: {
        search_query: {
          type: 'string',
          description: 'Nome ou parte do nome do cliente para buscar',
        },
      },
      required: ['search_query'],
    },
  },
};

function buildToolsFromSkills(skills: SkillRecord[], hasFixedClient: boolean) {
  const skillTools = skills.map((skill) => ({
    type: 'function' as const,
    function: {
      name: skill.id,
      description: skill.description,
      parameters: skill.tool_parameters || { type: 'object', properties: {} },
    },
  }));

  // Add lookup_client tool if agent has no fixed client and has skills that need one
  if (!hasFixedClient && skills.some(s => s.requires_client !== false)) {
    skillTools.push(LOOKUP_CLIENT_TOOL);
  }

  return skillTools;
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

async function handleLookupClient(
  args: Record<string, unknown>,
  companyId: string
): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const query = (args.search_query as string || '').trim();
  if (!query) return { error: 'Nenhum termo de busca informado' };

  const { data, error } = await supabase
    .from('clients')
    .select('id, name, company, sector, status')
    .eq('company_id', companyId)
    .or(`name.ilike.%${query}%,company.ilike.%${query}%`)
    .limit(5);

  if (error) return { error: error.message };
  if (!data || data.length === 0) return { clients: [], message: 'Nenhum cliente encontrado com esse nome. Peça ao usuário para informar o nome correto.' };

  return { clients: data };
}

async function handleBuiltinQuery(
  skillId: string,
  args: Record<string, unknown>,
  companyId: string,
  clientId?: string
): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const limit = Math.min(Number(args.limit) || 20, 50);

  try {
    switch (skillId) {
      case 'data_clients': {
        let q = supabase.from('clients').select('id, name, company, sector, status, monthly_budget, leads_generated, last_sync_at, created_at, ai_briefing').eq('company_id', companyId);
        if (args.search) q = q.or(`name.ilike.%${args.search}%,company.ilike.%${args.search}%`);
        if (args.status) q = q.eq('status', args.status);
        const { data, error } = await q.order('name').limit(limit);
        if (error) return { error: error.message };
        return { clients: data, total: data?.length };
      }

      case 'data_client_details': {
        const cid = clientId || args.client_id as string;
        if (!cid && args.client_name) {
          const { data } = await supabase.from('clients').select('id').eq('company_id', companyId).ilike('name', `%${args.client_name}%`).limit(1);
          if (data?.[0]) return handleBuiltinQuery(skillId, { ...args, client_id: data[0].id }, companyId, data[0].id);
          return { error: 'Cliente não encontrado' };
        }
        if (!cid) return { error: 'client_id necessário' };
        const [clientRes, campaignsRes] = await Promise.all([
          supabase.from('clients').select('*').eq('id', cid).single(),
          supabase.from('campaigns').select('id, name, status, spend, cpc, ctr, conversions, cpa').eq('client_id', cid).eq('status', 'active').order('spend', { ascending: false }).limit(10),
        ]);
        return { client: clientRes.data, active_campaigns: campaignsRes.data };
      }

      case 'data_campaigns': {
        if (!clientId) return { error: 'client_id necessário' };
        let q = supabase.from('campaigns').select('id, name, status, objective, spend, cpc, ctr, conversions, cpa, impressions, clicks, daily_budget, created_at').eq('client_id', clientId);
        if (args.status) q = q.eq('status', args.status);
        const { data, error } = await q.order('spend', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { campaigns: data, total: data?.length };
      }

      case 'data_ads': {
        if (!clientId) return { error: 'client_id necessário' };
        let q = supabase.from('ads').select('id, name, status, spend, cpc, ctr, impressions, clicks, conversions, cpa, creative_title, creative_body, image_url, call_to_action').eq('client_id', clientId);
        if (args.campaign_id) q = q.eq('campaign_id', args.campaign_id as string);
        const { data, error } = await q.order('spend', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { ads: data, total: data?.length };
      }

      case 'data_client_health': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('client_health_config').select('*').eq('client_id', clientId).single();
        if (error) return { error: error.message };
        return { health: data };
      }

      case 'data_client_milestones': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('client_milestones').select('*').eq('client_id', clientId).order('milestone_order');
        if (error) return { error: error.message };
        return { milestones: data };
      }

      case 'data_leads': {
        let q = supabase.from('lead_master_pool').select('id, full_name, email, phone, city, state, lead_score, conversion_status, created_at').eq('company_id', companyId);
        if (args.min_score) q = q.gte('lead_score', args.min_score);
        const { data, error } = await q.order('lead_score', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { leads: data, total: data?.length };
      }

      case 'data_lead_segments': {
        const { data, error } = await supabase.from('lead_segments').select('*').eq('company_id', companyId).order('name');
        if (error) return { error: error.message };
        return { segments: data };
      }

      case 'data_automation_rules': {
        let q = supabase.from('campaign_automation_rules').select('id, rule_name, rule_description, entity_type, action_type, is_active, execution_count, last_execution_at').eq('company_id', companyId);
        if (args.is_active !== undefined) q = q.eq('is_active', args.is_active);
        if (args.client_id) q = q.eq('client_id', args.client_id as string);
        const { data, error } = await q.order('rule_order').limit(limit);
        if (error) return { error: error.message };
        return { rules: data, total: data?.length };
      }

      case 'data_automation_logs': {
        let q = supabase.from('campaign_automation_logs').select('id, rule_id, action_type, action_result, entity_type, old_status, new_status, old_budget, new_budget, executed_at, error_message').eq('company_id', companyId);
        if (args.client_id) q = q.eq('client_id', args.client_id as string);
        const { data, error } = await q.order('executed_at', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { logs: data, total: data?.length };
      }

      case 'data_competitors': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('competitors').select('*').eq('client_id', clientId);
        if (error) return { error: error.message };
        return { competitors: data };
      }

      case 'data_scheduled_posts': {
        if (!clientId) return { error: 'client_id necessário' };
        let q = supabase.from('scheduled_posts').select('id, title, platform, status, scheduled_for, published_at, post_type, caption').eq('client_id', clientId);
        if (args.status) q = q.eq('status', args.status as string);
        const { data, error } = await q.order('scheduled_for', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { posts: data, total: data?.length };
      }

      case 'data_activity_feed': {
        const { data, error } = await supabase.from('activity_feed').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { activities: data };
      }

      case 'data_benchmarks': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('client_metric_benchmarks').select('*').eq('client_id', clientId);
        if (error) return { error: error.message };
        return { benchmarks: data };
      }

      default:
        return { error: `Query builtin "${skillId}" não reconhecida` };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: msg };
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
  // Mutable context so _lookup_client can set client_id dynamically
  const mutableContext = { ...agentContext };

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

    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      return choice.message.content || '';
    }

    currentMessages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs: Record<string, unknown> = {};
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}');
      } catch { /* empty args */ }

      console.log(`Executing tool: ${fnName}`, fnArgs);

      let result: Record<string, unknown>;

      if (fnName === '_lookup_client') {
        result = await handleLookupClient(fnArgs, mutableContext.company_id || '');
        const clients = result.clients as Array<{ id: string }> | undefined;
        if (clients && clients.length === 1) {
          mutableContext.client_id = clients[0].id;
          console.log('Client auto-set from lookup:', mutableContext.client_id);
        }
      } else if (fnName.startsWith('data_')) {
        // Built-in data query
        if (fnArgs.client_id && !mutableContext.client_id) {
          mutableContext.client_id = fnArgs.client_id as string;
        }
        result = await handleBuiltinQuery(fnName, fnArgs, mutableContext.company_id || '', mutableContext.client_id);
      } else {
        if (fnArgs.client_id && !mutableContext.client_id) {
          mutableContext.client_id = fnArgs.client_id as string;
        }
        result = await executeSkill(fnName, skills, fnArgs, mutableContext);
      }

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

    const hasFixedClient = !!agent.client_id;
    const tools = buildToolsFromSkills(enabledSkills, hasFixedClient);

    // Build skill instructions for the system prompt
    const clientLookupInstruction = !hasFixedClient && enabledSkills.length > 0
      ? `\n- IMPORTANTE: Quando uma skill precisar de um cliente e nenhum cliente foi definido, use a ferramenta _lookup_client para buscar o cliente pelo nome. Se o usuário não informou qual cliente, PERGUNTE antes de executar a skill. Após encontrar o cliente, passe o client_id dele nas chamadas subsequentes.`
      : '';

    const skillInstructions = enabledSkills.length > 0
      ? `\n\n[SKILLS DISPONÍVEIS]
Você tem acesso a ${enabledSkills.length} skills que pode executar quando o usuário pedir. Use-as chamando as funções disponíveis.
As skills serão executadas automaticamente e você receberá o resultado para formular sua resposta.${clientLookupInstruction}
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
