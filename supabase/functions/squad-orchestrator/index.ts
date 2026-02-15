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

interface SquadMember {
  id: string;
  agent_id: string;
  role: string;
  squad_instructions: string | null;
  agent: {
    id: string;
    agent_name: string;
    prompt_base: string;
    additional_instructions: string | null;
    model: string;
    client_id: string | null;
    company_id: string;
  };
}

interface SquadFlow {
  source_member_id: string;
  target_member_id: string;
  label: string | null;
}

interface StepResult {
  agent_id: string;
  agent_name: string;
  role: string;
  input: string;
  output: string;
  step_order: number;
  should_delegate: boolean;
}

// ---- Skill/Tool helpers ----

const LOOKUP_CLIENT_TOOL = {
  type: 'function' as const,
  function: {
    name: '_lookup_client',
    description: 'Busca um cliente pelo nome na base de dados da empresa.',
    parameters: {
      type: 'object',
      properties: {
        search_query: { type: 'string', description: 'Nome ou parte do nome do cliente para buscar' },
      },
      required: ['search_query'],
    },
  },
};

function buildToolsFromSkills(skills: SkillRecord[], hasFixedClient: boolean) {
  const skillTools = skills.map((skill) => {
    const params = JSON.parse(JSON.stringify(skill.tool_parameters || { type: 'object', properties: {} }));
    if (!hasFixedClient && skill.requires_client !== false) {
      if (!params.properties) params.properties = {};
      params.properties.client_id = {
        type: 'string',
        description: 'ID UUID do cliente. OBRIGATÓRIO.',
      };
      if (!params.required) params.required = [];
      if (!params.required.includes('client_id')) params.required.push('client_id');
    }
    return {
      type: 'function' as const,
      function: {
        name: skill.id,
        description: skill.description,
        parameters: params,
      },
    };
  });

  if (!hasFixedClient && skills.some(s => s.requires_client !== false)) {
    skillTools.push(LOOKUP_CLIENT_TOOL);
  }
  return skillTools;
}

// Build delegation tools for a manager — one tool per child agent
function buildDelegationTools(childMembers: SquadMember[]): any[] {
  return childMembers.map(child => ({
    type: 'function' as const,
    function: {
      name: `delegate_${child.id.replace(/-/g, '_')}`,
      description: `Delegar tarefa para o agente "${child.agent.agent_name}" (${child.role}). Este agente será executado com suas próprias skills e retornará o resultado.`,
      parameters: {
        type: 'object',
        properties: {
          task: { type: 'string', description: 'A tarefa ou instrução específica para este agente executar. Inclua todo contexto necessário (dados de passos anteriores, pauta, etc.).' },
        },
        required: ['task'],
      },
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
    const response = await fetch(`${supabaseUrl}/functions/v1/execute-skill`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        skill_id: skillId,
        params: { ...args, client_id: agentContext.client_id, company_id: agentContext.company_id, user_id: agentContext.user_id },
      }),
    });

    const text = await response.text();
    try {
      const parsed = JSON.parse(text);
      return parsed.result || parsed;
    } catch {
      return { result: text };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error executing skill ${skillId}:`, message);
    return { error: `Erro ao executar skill: ${message}` };
  }
}

async function handleLookupClient(args: Record<string, unknown>, companyId: string) {
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const query = (args.search_query as string || '').trim();
  if (!query) return { error: 'Nenhum termo de busca informado' };
  const { data, error } = await supabase.from('clients').select('id, name, company, sector, status').eq('company_id', companyId).or(`name.ilike.%${query}%,company.ilike.%${query}%`).limit(5);
  if (error) return { error: error.message };
  if (!data || data.length === 0) return { clients: [], message: 'Nenhum cliente encontrado.' };
  return { clients: data };
}

async function handleBuiltinQuery(skillId: string, args: Record<string, unknown>, companyId: string, clientId?: string): Promise<Record<string, unknown>> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const limit = Math.min(Number(args.limit) || 20, 50);
  try {
    switch (skillId) {
      case 'data_clients': {
        let q = supabase.from('clients').select('id, name, company, sector, status, monthly_budget, ai_briefing').eq('company_id', companyId);
        if (args.search) q = q.or(`name.ilike.%${args.search}%,company.ilike.%${args.search}%`);
        const { data, error } = await q.order('name').limit(limit);
        if (error) return { error: error.message };
        return { clients: data, total: data?.length };
      }
      case 'data_client_details': {
        const cid = clientId || args.client_id as string;
        if (!cid) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('clients').select('*').eq('id', cid).single();
        if (error) return { error: error.message };
        return { client: data };
      }
      case 'data_campaigns': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('campaigns').select('id, name, status, objective, spend, cpc, ctr, conversions, cpa').eq('client_id', clientId).order('spend', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { campaigns: data };
      }
      case 'data_ads': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('ads').select('id, name, status, spend, cpc, ctr, impressions, clicks, conversions, creative_title, image_url').eq('client_id', clientId).order('spend', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { ads: data };
      }
      case 'data_scheduled_posts': {
        if (!clientId) return { error: 'client_id necessário' };
        const { data, error } = await supabase.from('scheduled_posts').select('id, title, platform, status, scheduled_for, post_type, caption').eq('client_id', clientId).order('scheduled_for', { ascending: false }).limit(limit);
        if (error) return { error: error.message };
        return { posts: data };
      }
      default:
        return { error: `Query builtin "${skillId}" não reconhecida` };
    }
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ---- Agent calling with tool support ----

async function loadAgentSkills(agentId: string): Promise<SkillRecord[]> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  const { data } = await supabase.from('ia_agent_enabled_skills').select('skill_id, ia_agent_skills(*)').eq('agent_id', agentId);
  if (!data) return [];
  return data.map((row: any) => row.ia_agent_skills).filter(Boolean).map((s: any) => ({
    id: s.id, name: s.name, description: s.description || s.name,
    edge_function: s.edge_function || '', tool_parameters: s.tool_parameters || {},
    requires_client: s.requires_client,
  }));
}

// Delegation handler type: called when a manager delegates to a child agent
type DelegationHandler = (memberId: string, task: string) => Promise<string>;

async function callAgentWithTools(
  agent: SquadMember['agent'],
  squadInstructions: string | null,
  role: string,
  message: string,
  previousSteps: StepResult[],
  isLeader: boolean,
  isManager: boolean,
  nextAgents: SquadMember[],
  skills: SkillRecord[],
  squadClientId: string | null,
  squadClientInfo: Record<string, unknown> | null,
  onToolCall?: (skillName: string, args: Record<string, unknown>, result: Record<string, unknown>) => void,
  delegationTools?: any[],
  onDelegation?: DelegationHandler,
): Promise<{ output: string; should_delegate: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const stepsContext = previousSteps.length > 0
    ? `\n\n[CONTEXTO DA SQUAD - Respostas anteriores dos agentes]\n${previousSteps.map(s =>
        `--- ${s.agent_name} (${s.role}) ---\n${s.output}`
      ).join('\n\n')}\n`
    : '';

  let delegationInstructions = '';
  if (isLeader) {
    const nextAgentsList = nextAgents.length > 0
      ? `Agentes disponíveis na squad: ${nextAgents.map(a => `${a.agent.agent_name} (${a.role})`).join(', ')}`
      : '';
    delegationInstructions = `
INSTRUÇÕES CRÍTICAS DE DELEGAÇÃO (APENAS PARA VOCÊ, O LÍDER):
- Analise a mensagem recebida e decida se você consegue responder sozinho ou se precisa acionar a squad.
- Para mensagens simples (saudações, perguntas básicas, agradecimentos), responda diretamente SEM delegar.
- Para QUALQUER tarefa que envolva criação de conteúdo, geração de imagens, posts, análises complexas — SEMPRE delegue para a squad trabalhar.
- Se a tarefa requer múltiplos agentes ou skills especializadas, DELEGUE.
${nextAgentsList}
- OBRIGATÓRIO: Termine sua resposta EXATAMENTE com uma destas tags:
  [DELEGAR] - se a tarefa precisa da squad (criação de conteúdo, imagens, posts, análises)
  [FINALIZAR] - APENAS para respostas simples que você resolveu sozinho (oi, olá, perguntas básicas)
- IMPORTANTE: Na dúvida, SEMPRE delegue. É melhor delegar desnecessariamente do que não delegar quando precisa.
`;
  }

  // Build client context from squad
  let clientContextInstructions = '';
  if (squadClientInfo) {
    const ci = squadClientInfo as any;
    clientContextInstructions = `
[CLIENTE DA SQUAD - CONTEXTO FIXO]
O cliente desta squad já está definido. NÃO tente buscar ou consultar quem é o cliente.
- ID: ${squadClientId}
- Nome: ${ci.name || 'N/A'}
- Empresa: ${ci.company || 'N/A'}
- Setor: ${ci.sector || 'N/A'}
${ci.ai_briefing ? `- Briefing IA: ${(ci.ai_briefing as string).substring(0, 500)}` : ''}
${ci.voice_tone ? `- Tom de Voz: ${ci.voice_tone}` : ''}
Todas as skills que requerem client_id já terão este ID injetado automaticamente.
`;
  }

  // Manager-specific instructions
  let managerDelegationInstructions = '';
  if (isManager && delegationTools && delegationTools.length > 0) {
    managerDelegationInstructions = `
INSTRUÇÕES DE ORQUESTRAÇÃO (GERENTE):
Você é o GERENTE e tem controle total sobre a execução dos agentes da sua equipe.
Você possui ferramentas de delegação (delegate_*) que acionam cada agente da equipe.
- Chame cada ferramenta de delegação na ordem que desejar, passando a tarefa específica no parâmetro "task".
- O resultado de cada agente será retornado para você. Use esse resultado para decidir o próximo passo.
- Você pode chamar o mesmo agente mais de uma vez (ex: se o resultado não ficou bom, peça correção).
- Quando quiser PARAR e aguardar input do usuário (ex: pedir confirmação ou data), simplesmente responda com texto SEM chamar nenhuma ferramenta.
- Quando todo o fluxo estiver completo, responda com seu output final SEM chamar ferramentas.
- NUNCA invente resultados. Cada delegação executa o agente de verdade.
`;
  }

  // Warning for executors (non-managers, non-leaders) to not call agents as tools
  let delegationWarning = '';
  const otherAgentNames = nextAgents.map(a => a.agent.agent_name.toLowerCase());
  if (!isLeader && !isManager && otherAgentNames.length > 0) {
    delegationWarning = `
ATENÇÃO CRÍTICA - NÃO TENTE CHAMAR OUTROS AGENTES:
Os seguintes nomes são AGENTES da squad, NÃO são ferramentas/skills que você pode chamar: ${otherAgentNames.join(', ')}.
A delegação para esses agentes é feita AUTOMATICAMENTE pelo sistema de orquestração. Você NÃO precisa e NÃO deve tentar chamá-los.
Seu trabalho é: produzir sua resposta usando APENAS suas próprias skills listadas acima. Após sua resposta, o sistema automaticamente passará o resultado para o próximo agente na cadeia.
`;
  }

  let skillInstructions = '';
  if (skills.length > 0) {
    skillInstructions = `\n\nVocê tem as seguintes FERRAMENTAS/SKILLS disponíveis para executar tarefas reais:\n${skills.map(s => `- ${s.name}: ${s.description}`).join('\n')}\nUse estas ferramentas quando precisar EXECUTAR ações (gerar imagem, agendar post, etc.). NÃO simule ou invente resultados — SEMPRE use a ferramenta.\n`;
  }

  const systemPrompt = `${agent.prompt_base}

${agent.additional_instructions || ''}

[SEU PAPEL NA SQUAD]
Você é o "${role}" desta squad de agentes de IA.
${squadInstructions ? `Instruções específicas para você nesta squad: ${squadInstructions}` : ''}
${clientContextInstructions}
${stepsContext}
${delegationInstructions}
${managerDelegationInstructions}
${skillInstructions}
${delegationWarning}

INSTRUÇÕES DE RESPOSTA:
- A SOLICITAÇÃO ORIGINAL DO USUÁRIO está na mensagem do usuário abaixo. NUNCA ignore ou substitua o pedido original.
- Considere o contexto dos agentes anteriores, mas SEMPRE mantenha o foco na solicitação original.
- Seja objetivo e agregue valor com sua especialidade.
- Se você é o líder, coordene e sintetize. Se é gerente, organize e delegue. Se é executor, execute a tarefa.
- Se você tem ferramentas disponíveis, USE-AS para executar tarefas reais. NUNCA invente URLs, dados ou resultados fictícios.
${isLeader ? '- LEMBRE-SE: Você DEVE terminar com [DELEGAR] ou [FINALIZAR]. Sem essa tag, a execução ficará incorreta.' : ''}
`;

  // Squad client_id takes priority over agent's individual client_id
  const effectiveClientId = squadClientId || agent.client_id || undefined;
  const hasFixedClient = !!effectiveClientId;
  const skillToolList = buildToolsFromSkills(skills, hasFixedClient);
  // Combine skill tools + delegation tools (for managers)
  const tools = [...skillToolList, ...(delegationTools || [])];
  const mutableContext = {
    client_id: effectiveClientId,
    company_id: agent.company_id,
    user_id: undefined as string | undefined,
  };
  let lastGeneratedImageUrl: string | null = null;

  // Managers need more iterations since each delegation is one iteration
  const maxIterations = isManager ? 20 : 5;
  let currentMessages: any[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ];

  for (let iter = 0; iter < maxIterations; iter++) {
    const requestBody: Record<string, unknown> = {
      model: agent.model || 'google/gemini-2.5-flash',
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
      const err = await aiResponse.text();
      console.error('AI error:', err);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const data = await aiResponse.json();
    const choice = data.choices[0];

    if (!choice.message.tool_calls || choice.message.tool_calls.length === 0) {
      const rawOutput = choice.message.content || '';
      let should_delegate = true;
      if (isLeader) {
        should_delegate = rawOutput.includes('[DELEGAR]');
        if (!rawOutput.includes('[DELEGAR]') && !rawOutput.includes('[FINALIZAR]') && nextAgents.length > 0) {
          console.log(`[squad-orchestrator] Leader didn't include delegation tag — defaulting to DELEGATE`);
          should_delegate = true;
        }
      }
      // Managers don't use delegation tags — when they stop calling tools, the flow is done
      if (isManager) {
        should_delegate = false; // Manager handled everything, no BFS continuation needed
      }
      const output = rawOutput.replace(/\[DELEGAR\]/g, '').replace(/\[FINALIZAR\]/g, '').trim();
      return { output, should_delegate };
    }

    currentMessages.push(choice.message);

    for (const toolCall of choice.message.tool_calls) {
      const fnName = toolCall.function.name;
      let fnArgs: Record<string, unknown> = {};
      try { fnArgs = JSON.parse(toolCall.function.arguments || '{}'); } catch { /* */ }

      console.log(`[squad-orchestrator] Tool call: ${fnName}`, fnArgs);

      // Check if this is a delegation tool call
      if (fnName.startsWith('delegate_') && onDelegation) {
        // Extract member ID from tool name (delegate_<uuid_with_underscores>)
        const memberIdWithUnderscores = fnName.replace('delegate_', '');
        // Convert back: underscores to hyphens for UUID format
        const memberId = memberIdWithUnderscores.replace(/_/g, '-');
        const task = (fnArgs.task as string) || message;

        console.log(`[squad-orchestrator] Manager delegating to member ${memberId}: ${task.substring(0, 100)}...`);

        try {
          const agentOutput = await onDelegation(memberId, task);
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: agentOutput,
          });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          currentMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Erro ao executar agente: ${errMsg}` }),
          });
        }
        continue;
      }

      let result: Record<string, unknown>;
      const skill = skills.find(s => s.id === fnName);
      const skillDisplayName = skill?.name || fnName;

      if (fnName === '_lookup_client') {
        result = await handleLookupClient(fnArgs, mutableContext.company_id || '');
        const clients = result.clients as Array<{ id: string }> | undefined;
        if (clients && clients.length === 1) mutableContext.client_id = clients[0].id;
      } else if (fnName.startsWith('data_')) {
        if (fnArgs.client_id && !mutableContext.client_id) mutableContext.client_id = fnArgs.client_id as string;
        result = await handleBuiltinQuery(fnName, fnArgs, mutableContext.company_id || '', mutableContext.client_id);
      } else {
        if (fnArgs.client_id && !mutableContext.client_id) mutableContext.client_id = fnArgs.client_id as string;
        if (fnName === 'schedule_post' && !fnArgs.image_url && !fnArgs.media_urls && lastGeneratedImageUrl) {
          fnArgs.image_url = lastGeneratedImageUrl;
        }
        result = await executeSkill(fnName, skills, fnArgs, mutableContext);
        if (result.success && result.image_url && typeof result.image_url === 'string') {
          const imgUrl = result.image_url as string;
          if (imgUrl.startsWith('http')) {
            lastGeneratedImageUrl = imgUrl;
            console.log(`[squad-orchestrator] Saved lastGeneratedImageUrl: ${lastGeneratedImageUrl}`);
          }
        }
      }

      if (onToolCall) {
        onToolCall(skillDisplayName, fnArgs, result);
      }

      currentMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Exhausted iterations
  const finalResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: agent.model || 'google/gemini-2.5-flash', messages: currentMessages }),
  });
  const finalData = await finalResponse.json();
  const rawOutput = finalData.choices[0].message.content || '';
  let should_delegate = true;
  if (isLeader) {
    should_delegate = rawOutput.includes('[DELEGAR]') || (!rawOutput.includes('[FINALIZAR]') && nextAgents.length > 0);
  }
  if (isManager) {
    should_delegate = false;
  }
  const output = rawOutput.replace(/\[DELEGAR\]/g, '').replace(/\[FINALIZAR\]/g, '').trim();
  return { output, should_delegate };
}

// ---- Main handler ----

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { squadId, message } = await req.json();
    if (!squadId || !message) throw new Error('squadId e message são obrigatórios');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 1. Load squad info and members in parallel
    const [squadResult, membersResult] = await Promise.all([
      serviceClient.from('ia_agent_squads').select('id, client_id, company_id').eq('id', squadId).single(),
      serviceClient.from('ia_agent_squad_members')
        .select('id, agent_id, role, squad_instructions, agent:ia_agents(id, agent_name, prompt_base, additional_instructions, model, client_id, company_id)')
        .eq('squad_id', squadId),
    ]);

    const squad = squadResult.data;
    const squadClientId = squad?.client_id || null;
    const { data: members, error: membersErr } = membersResult;

    if (membersErr) throw membersErr;
    if (!members || members.length === 0) throw new Error('Squad sem membros');

    // Load squad's client info if available
    let squadClientInfo: Record<string, unknown> | null = null;
    if (squadClientId) {
      const { data: clientData } = await serviceClient
        .from('clients')
        .select('name, company, sector, ai_briefing, voice_tone')
        .eq('id', squadClientId)
        .single();
      squadClientInfo = clientData;
      console.log(`[squad-orchestrator] Squad client: ${clientData?.name} (${squadClientId})`);
    }

    const typedMembers: SquadMember[] = members.map((m: any) => ({
      ...m,
      agent: Array.isArray(m.agent) ? m.agent[0] : m.agent,
    }));

    // 2. Load flows
    const { data: flows } = await serviceClient
      .from('ia_agent_squad_flows')
      .select('source_member_id, target_member_id, label')
      .eq('squad_id', squadId);
    const typedFlows: SquadFlow[] = flows || [];

    // 3. Pre-load skills for ALL agents in parallel
    const skillsMap = new Map<string, SkillRecord[]>();
    await Promise.all(
      typedMembers.map(async (m) => {
        const skills = await loadAgentSkills(m.agent_id);
        skillsMap.set(m.agent_id, skills);
        if (skills.length > 0) {
          console.log(`[squad-orchestrator] Agent ${m.agent.agent_name} has ${skills.length} skills: ${skills.map(s => s.name).join(', ')}`);
        }
      })
    );

    // 4. Check for a recent "waiting_input" execution (manager paused waiting for user response)
    const { data: waitingExecution } = await serviceClient
      .from('ia_agent_squad_executions')
      .select('id, input')
      .eq('squad_id', squadId)
      .eq('status', 'waiting_input')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // 5. Build execution order using BFS from the leader
    const leader = typedMembers.find(m => m.role === 'leader' || m.role === 'lider');
    if (!leader) throw new Error('Squad sem líder definido');

    const executionOrder: SquadMember[] = [];
    const visited = new Set<string>();
    const queue: string[] = [leader.id];
    visited.add(leader.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const member = typedMembers.find(m => m.id === currentId);
      if (member) executionOrder.push(member);
      const outgoing = typedFlows.filter(f => f.source_member_id === currentId);

      let sortedTargetIds = outgoing.map(e => e.target_member_id);
      if (member?.squad_instructions) {
        const instructions = member.squad_instructions.toLowerCase();
        sortedTargetIds.sort((a, b) => {
          const memberA = typedMembers.find(m => m.id === a);
          const memberB = typedMembers.find(m => m.id === b);
          const nameA = memberA?.agent?.agent_name?.toLowerCase() || '';
          const nameB = memberB?.agent?.agent_name?.toLowerCase() || '';
          const posA = instructions.indexOf(nameA);
          const posB = instructions.indexOf(nameB);
          if (posA !== -1 && posB !== -1) return posA - posB;
          if (posA !== -1) return -1;
          if (posB !== -1) return 1;
          return 0;
        });
      }

      for (const targetId of sortedTargetIds) {
        if (!visited.has(targetId)) {
          visited.add(targetId);
          queue.push(targetId);
        }
      }
    }
    console.log(`[squad-orchestrator] Execution order: ${executionOrder.map(m => `${m.agent.agent_name} (${m.role})`).join(' → ')}`);

    // 6. SSE streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventData: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        };

        // ============================================================
        // RESUMPTION PATH: If there's a waiting_input execution, resume from the paused manager
        // ============================================================
        if (waitingExecution) {
          console.log(`[squad-orchestrator] Found waiting_input execution ${waitingExecution.id}, resuming...`);

          // Load previous steps from the paused execution
          const { data: prevStepsData } = await serviceClient
            .from('ia_agent_squad_execution_steps')
            .select('agent_id, member_id, step_order, input, output, status')
            .eq('execution_id', waitingExecution.id)
            .order('step_order', { ascending: true });

          const previousSteps: StepResult[] = (prevStepsData || []).map((s: any) => {
            const member = typedMembers.find(m => m.agent_id === s.agent_id);
            return {
              agent_id: s.agent_id,
              agent_name: member?.agent?.agent_name || 'Unknown',
              role: member?.role || 'executor',
              input: s.input,
              output: s.output,
              step_order: s.step_order,
              should_delegate: true,
            };
          });

          // Find the manager that paused (last manager in the steps)
          let pausedManager: SquadMember | undefined;
          for (let i = previousSteps.length - 1; i >= 0; i--) {
            const stepMember = typedMembers.find(m => m.agent_id === previousSteps[i].agent_id);
            if (stepMember && (stepMember.role === 'manager' || stepMember.role === 'gerente')) {
              pausedManager = stepMember;
              break;
            }
          }

          if (!pausedManager) {
            console.log(`[squad-orchestrator] No paused manager found, falling through to normal execution`);
            // Mark the waiting execution as completed and fall through
            await serviceClient.from('ia_agent_squad_executions').update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            }).eq('id', waitingExecution.id);
          } else {
            // Update the waiting execution to running
            await serviceClient.from('ia_agent_squad_executions').update({
              status: 'running',
            }).eq('id', waitingExecution.id);

            const executedAgents = new Set<string>();
            let globalStepCounter = previousSteps.length;

            // Get the manager's children for delegation tools
            const childMemberIds = typedFlows
              .filter(f => f.source_member_id === pausedManager!.id)
              .map(f => f.target_member_id);
            const childMembers = childMemberIds
              .map(id => typedMembers.find(m => m.id === id))
              .filter(Boolean) as SquadMember[];

            // Helper to execute a single agent (same as normal flow)
            async function executeAgentResume(
              member: SquadMember,
              input: string,
              currentSteps: StepResult[],
              isManagerNode: boolean,
              children: SquadMember[],
            ): Promise<StepResult> {
              globalStepCounter++;
              const stepOrder = globalStepCounter;
              const agentSkills = skillsMap.get(member.agent_id) || [];

              sendEvent({
                type: 'thinking',
                agent_name: member.agent.agent_name,
                role: member.role,
                step_order: stepOrder,
              });

              let agentDelegationTools: any[] | undefined;
              let agentDelegationHandler: DelegationHandler | undefined;

              if (isManagerNode && children.length > 0) {
                agentDelegationTools = buildDelegationTools(children);

                agentDelegationHandler = async (memberId: string, task: string): Promise<string> => {
                  const targetMember = typedMembers.find(m => m.id === memberId);
                  if (!targetMember) {
                    return JSON.stringify({ error: `Agente com ID ${memberId} não encontrado` });
                  }

                  const targetChildren = typedFlows
                    .filter(f => f.source_member_id === targetMember.id)
                    .map(f => typedMembers.find(m => m.id === f.target_member_id))
                    .filter(Boolean) as SquadMember[];
                  const isTargetManager = (targetMember.role === 'manager' || targetMember.role === 'gerente') && targetChildren.length > 0;

                  const delegatedStep = await executeAgentResume(targetMember, task, currentSteps, isTargetManager, targetChildren);
                  currentSteps.push(delegatedStep);

                  await serviceClient.from('ia_agent_squad_execution_steps').insert({
                    execution_id: waitingExecution.id,
                    agent_id: targetMember.agent_id,
                    member_id: targetMember.id,
                    step_order: delegatedStep.step_order,
                    input: task,
                    output: delegatedStep.output,
                    status: 'completed',
                    started_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                  });

                  sendEvent({
                    type: 'step',
                    agent_name: targetMember.agent.agent_name,
                    role: targetMember.role,
                    output: delegatedStep.output,
                    step_order: delegatedStep.step_order,
                    should_delegate: delegatedStep.should_delegate,
                  });

                  return delegatedStep.output;
                };
              }

              const onToolCall = (skillName: string, args: Record<string, unknown>, result: Record<string, unknown>) => {
                sendEvent({
                  type: 'tool_call',
                  agent_name: member.agent.agent_name,
                  role: member.role,
                  skill_name: skillName,
                  step_order: stepOrder,
                  success: !result.error,
                  image_url: result.image_url || null,
                });
              };

              const { output, should_delegate } = await callAgentWithTools(
                member.agent,
                member.squad_instructions,
                member.role,
                input,
                currentSteps,
                false,
                isManagerNode,
                [],
                agentSkills,
                squadClientId,
                squadClientInfo,
                onToolCall,
                agentDelegationTools,
                agentDelegationHandler,
              );

              return {
                agent_id: member.agent_id,
                agent_name: member.agent.agent_name,
                role: member.role,
                input,
                output,
                step_order: stepOrder,
                should_delegate,
              };
            }

            // Resume: execute the manager with previous context + new message
            // The message includes the user's response (e.g., date/time)
            const resumeInput = `[CONTINUAÇÃO - O USUÁRIO RESPONDEU À SUA PERGUNTA ANTERIOR]
Mensagem original da squad: ${waitingExecution.input}
Sua pergunta anterior: ${previousSteps[previousSteps.length - 1]?.output || ''}
Resposta do usuário agora: ${message}

IMPORTANTE: Você já executou os passos anteriores (veja o contexto). NÃO repita o que já foi feito. Continue de onde parou e execute APENAS o(s) passo(s) restante(s) com base na resposta do usuário.`;

            try {
              const step = await executeAgentResume(
                pausedManager,
                resumeInput,
                previousSteps,
                true,
                childMembers,
              );

              await serviceClient.from('ia_agent_squad_execution_steps').insert({
                execution_id: waitingExecution.id,
                agent_id: pausedManager.agent_id,
                member_id: pausedManager.id,
                step_order: step.step_order,
                input: resumeInput,
                output: step.output,
                status: 'completed',
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
              });

              sendEvent({
                type: 'step',
                agent_name: pausedManager.agent.agent_name,
                role: pausedManager.role,
                output: step.output,
                step_order: step.step_order,
                should_delegate: step.should_delegate,
              });

              // Mark execution as completed
              await serviceClient.from('ia_agent_squad_executions').update({
                status: 'completed',
                final_output: step.output,
                completed_at: new Date().toISOString(),
              }).eq('id', waitingExecution.id);

            } catch (err) {
              console.error(`[squad-orchestrator] Error resuming manager:`, err);
              sendEvent({
                type: 'error',
                agent_name: pausedManager.agent.agent_name,
                role: pausedManager.role,
                output: `⚠️ Erro ao retomar: ${err.message}`,
                step_order: globalStepCounter + 1,
              });

              await serviceClient.from('ia_agent_squad_executions').update({
                status: 'failed',
                final_output: `Erro: ${err.message}`,
                completed_at: new Date().toISOString(),
              }).eq('id', waitingExecution.id);
            }

            sendEvent({ type: 'done', execution_id: waitingExecution.id });
            controller.close();
            return; // Exit early — resumption complete
          }
        }

        // ============================================================
        // NORMAL PATH: Fresh execution from leader
        // ============================================================

        // Create new execution record
        const { data: execution, error: execErr } = await serviceClient
          .from('ia_agent_squad_executions')
          .insert({
            squad_id: squadId,
            triggered_by: user?.id,
            status: 'running',
            input: message,
            started_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (execErr) throw execErr;

        const steps: StepResult[] = [];
        const executedAgents = new Set<string>();
        let globalStepCounter = 0;

        // Helper function to execute a single agent (used by both BFS loop and manager delegation)
        async function executeAgent(
          member: SquadMember,
          input: string,
          currentSteps: StepResult[],
          isLeaderNode: boolean,
          isManagerNode: boolean,
          remainingAgents: SquadMember[],
          childMembers: SquadMember[],
        ): Promise<StepResult> {
          globalStepCounter++;
          const stepOrder = globalStepCounter;
          const agentSkills = skillsMap.get(member.agent_id) || [];

          console.log(`[squad-orchestrator] Step ${stepOrder}: ${member.agent.agent_name} (${member.role}) with ${agentSkills.length} skills, isManager=${isManagerNode}`);

          sendEvent({
            type: 'thinking',
            agent_name: member.agent.agent_name,
            role: member.role,
            step_order: stepOrder,
          });

          // Build delegation tools and handler for managers
          let agentDelegationTools: any[] | undefined;
          let agentDelegationHandler: DelegationHandler | undefined;

          if (isManagerNode && childMembers.length > 0) {
            agentDelegationTools = buildDelegationTools(childMembers);
            console.log(`[squad-orchestrator] Manager ${member.agent.agent_name} has delegation tools for: ${childMembers.map(c => c.agent.agent_name).join(', ')}`);

            agentDelegationHandler = async (memberId: string, task: string): Promise<string> => {
              const targetMember = typedMembers.find(m => m.id === memberId);
              if (!targetMember) {
                return JSON.stringify({ error: `Agente com ID ${memberId} não encontrado na squad` });
              }

              const targetChildren = typedFlows
                .filter(f => f.source_member_id === targetMember.id)
                .map(f => typedMembers.find(m => m.id === f.target_member_id))
                .filter(Boolean) as SquadMember[];
              const isTargetManager = (targetMember.role === 'manager' || targetMember.role === 'gerente') && targetChildren.length > 0;

              const delegatedStep = await executeAgent(
                targetMember,
                task,
                currentSteps,
                false,
                isTargetManager,
                [],
                targetChildren,
              );

              currentSteps.push(delegatedStep);
              executedAgents.add(targetMember.id);

              await serviceClient.from('ia_agent_squad_execution_steps').insert({
                execution_id: execution.id,
                agent_id: targetMember.agent_id,
                member_id: targetMember.id,
                step_order: delegatedStep.step_order,
                input: task,
                output: delegatedStep.output,
                status: 'completed',
                started_at: new Date().toISOString(),
                completed_at: new Date().toISOString(),
              });

              sendEvent({
                type: 'step',
                agent_name: targetMember.agent.agent_name,
                role: targetMember.role,
                output: delegatedStep.output,
                step_order: delegatedStep.step_order,
                should_delegate: delegatedStep.should_delegate,
              });

              return delegatedStep.output;
            };
          }

          const onToolCall = (skillName: string, args: Record<string, unknown>, result: Record<string, unknown>) => {
            sendEvent({
              type: 'tool_call',
              agent_name: member.agent.agent_name,
              role: member.role,
              skill_name: skillName,
              step_order: stepOrder,
              success: !result.error,
              image_url: result.image_url || null,
            });
          };

          const { output, should_delegate } = await callAgentWithTools(
            member.agent,
            member.squad_instructions,
            member.role,
            input,
            currentSteps,
            isLeaderNode,
            isManagerNode,
            remainingAgents,
            agentSkills,
            squadClientId,
            squadClientInfo,
            onToolCall,
            agentDelegationTools,
            agentDelegationHandler,
          );

          return {
            agent_id: member.agent_id,
            agent_name: member.agent.agent_name,
            role: member.role,
            input,
            output,
            step_order: stepOrder,
            should_delegate,
          };
        }

        // Main BFS execution loop
        for (let i = 0; i < executionOrder.length; i++) {
          const member = executionOrder[i];
          if (executedAgents.has(member.id)) continue;
          executedAgents.add(member.id);

          const isLeaderNode = member.id === leader.id;

          const childMemberIds = typedFlows
            .filter(f => f.source_member_id === member.id)
            .map(f => f.target_member_id);
          const childMembers = childMemberIds
            .map(id => typedMembers.find(m => m.id === id))
            .filter(Boolean) as SquadMember[];
          const isManagerNode = (member.role === 'manager' || member.role === 'gerente') && childMembers.length > 0;

          const remainingAgents = executionOrder.slice(i + 1);

          try {
            const step = await executeAgent(
              member,
              message,
              steps,
              isLeaderNode,
              isManagerNode,
              remainingAgents,
              childMembers,
            );

            steps.push(step);

            await serviceClient.from('ia_agent_squad_execution_steps').insert({
              execution_id: execution.id,
              agent_id: member.agent_id,
              member_id: member.id,
              step_order: step.step_order,
              input: message,
              output: step.output,
              status: 'completed',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            });

            sendEvent({
              type: 'step',
              agent_name: member.agent.agent_name,
              role: member.role,
              output: step.output,
              step_order: step.step_order,
              should_delegate: step.should_delegate,
            });

            // If a manager handled its children, mark them as executed
            if (isManagerNode) {
              for (const childId of childMemberIds) {
                executedAgents.add(childId);
              }
              const markDescendants = (parentId: string) => {
                const descendants = typedFlows
                  .filter(f => f.source_member_id === parentId)
                  .map(f => f.target_member_id);
                for (const descId of descendants) {
                  executedAgents.add(descId);
                  markDescendants(descId);
                }
              };
              for (const childId of childMemberIds) {
                markDescendants(childId);
              }

              // Check if manager paused (has children that were NOT delegated to)
              // by comparing executedAgents before/after
              const undelegatedChildren = childMemberIds.filter(id => {
                // Check if this child was actually executed during this manager's run
                return !steps.some(s => {
                  const m = typedMembers.find(tm => tm.id === id);
                  return m && s.agent_id === m.agent_id;
                });
              });

              if (undelegatedChildren.length > 0) {
                console.log(`[squad-orchestrator] Manager ${member.agent.agent_name} PAUSED — ${undelegatedChildren.length} children not delegated. Marking as waiting_input.`);
                
                await serviceClient.from('ia_agent_squad_executions').update({
                  status: 'waiting_input',
                  final_output: step.output,
                  completed_at: new Date().toISOString(),
                }).eq('id', execution.id);

                sendEvent({ type: 'done', execution_id: execution.id });
                controller.close();
                return; // Exit early — manager is waiting for user input
              }
            }

            if (!step.should_delegate) {
              console.log(`[squad-orchestrator] ${member.agent.agent_name} decided to FINALIZE.`);
              break;
            }
          } catch (err) {
            console.error(`[squad-orchestrator] Error at step:`, err);
            globalStepCounter++;
            await serviceClient.from('ia_agent_squad_execution_steps').insert({
              execution_id: execution.id,
              agent_id: member.agent_id,
              member_id: member.id,
              step_order: globalStepCounter,
              input: message,
              output: `Erro: ${err.message}`,
              status: 'failed',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            });

            sendEvent({
              type: 'error',
              agent_name: member.agent.agent_name,
              role: member.role,
              output: `⚠️ Erro ao processar: ${err.message}`,
              step_order: globalStepCounter,
            });

            steps.push({
              agent_id: member.agent_id,
              agent_name: member.agent.agent_name,
              role: member.role,
              input: message,
              output: `⚠️ Erro: ${err.message}`,
              step_order: globalStepCounter,
              should_delegate: false,
            });
            break;
          }
        }

        const finalOutput = steps[steps.length - 1]?.output || '';
        await serviceClient.from('ia_agent_squad_executions').update({
          status: 'completed',
          final_output: finalOutput,
          completed_at: new Date().toISOString(),
        }).eq('id', execution.id);

        sendEvent({ type: 'done', execution_id: execution.id });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('[squad-orchestrator] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});