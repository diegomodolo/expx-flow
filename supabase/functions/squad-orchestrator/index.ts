import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

async function callAgent(
  agent: SquadMember['agent'],
  squadInstructions: string | null,
  role: string,
  message: string,
  previousSteps: StepResult[],
  nextAgents: SquadMember[],
): Promise<{ output: string; should_delegate: boolean }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

  const stepsContext = previousSteps.length > 0
    ? `\n\n[CONTEXTO DA SQUAD - Respostas anteriores dos agentes]\n${previousSteps.map(s =>
        `--- ${s.agent_name} (${s.role}) ---\n${s.output}`
      ).join('\n\n')}\n`
    : '';

  const nextAgentsList = nextAgents.length > 0
    ? `\n\nAgentes disponíveis para delegação: ${nextAgents.map(a => `${a.agent.agent_name} (${a.role})`).join(', ')}`
    : '\n\nVocê é o último agente na cadeia, não há para quem delegar.';

  const systemPrompt = `${agent.prompt_base}

${agent.additional_instructions || ''}

[SEU PAPEL NA SQUAD]
Você é o "${role}" desta squad de agentes de IA.
${squadInstructions ? `Instruções específicas para você nesta squad: ${squadInstructions}` : ''}
${stepsContext}
${nextAgentsList}

INSTRUÇÕES CRÍTICAS DE DELEGAÇÃO:
- Analise a mensagem/solicitação recebida e decida se você consegue responder sozinho ou se precisa delegar para outros agentes.
- Para mensagens simples (saudações como "oi", "olá", perguntas básicas, agradecimentos), responda diretamente SEM delegar.
- Delegue APENAS quando a tarefa realmente necessitar da expertise de outro agente.
- Para indicar sua decisão, termine sua resposta EXATAMENTE com uma destas tags:
  [DELEGAR] - se a tarefa precisa ser passada adiante para outros agentes
  [FINALIZAR] - se você já resolveu a solicitação e não precisa de mais ninguém

INSTRUÇÕES DE RESPOSTA:
- Seja objetivo e agregue valor com sua especialidade.
- Se você é o líder, coordene e sintetize. Se é gerente, organize. Se é executor, execute a tarefa.
`;

  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: agent.model || 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  });

  if (!aiResponse.ok) {
    const err = await aiResponse.text();
    console.error('AI error:', err);
    throw new Error(`AI error: ${aiResponse.status}`);
  }

  const data = await aiResponse.json();
  const rawOutput = data.choices[0].message.content || '';

  // Parse delegation decision
  const should_delegate = rawOutput.includes('[DELEGAR]');
  // Clean the tags from the output shown to the user
  const output = rawOutput.replace(/\[DELEGAR\]/g, '').replace(/\[FINALIZAR\]/g, '').trim();

  return { output, should_delegate };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { squadId, message } = await req.json();
    if (!squadId || !message) {
      throw new Error('squadId e message são obrigatórios');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });
    const { data: { user } } = await supabaseClient.auth.getUser();

    // 1. Load squad members
    const { data: members, error: membersErr } = await serviceClient
      .from('ia_agent_squad_members')
      .select('id, agent_id, role, squad_instructions, agent:ia_agents(id, agent_name, prompt_base, additional_instructions, model, client_id, company_id)')
      .eq('squad_id', squadId);

    if (membersErr) throw membersErr;
    if (!members || members.length === 0) throw new Error('Squad sem membros');

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

    // 3. Create execution record
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

    // 4. Build execution order using BFS from the leader
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
      for (const edge of outgoing) {
        if (!visited.has(edge.target_member_id)) {
          visited.add(edge.target_member_id);
          queue.push(edge.target_member_id);
        }
      }
    }

    for (const m of typedMembers) {
      if (!visited.has(m.id)) executionOrder.push(m);
    }

    // 5. SSE streaming — execute agents and stream each step
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (eventData: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
        };

        const steps: StepResult[] = [];

        for (let i = 0; i < executionOrder.length; i++) {
          const member = executionOrder[i];
          const stepInput = i === 0 ? message : steps[steps.length - 1].output;

          // Determine next agents available for delegation
          const nextAgents = executionOrder.slice(i + 1);

          console.log(`[squad-orchestrator] Step ${i + 1}: ${member.agent.agent_name} (${member.role})`);

          // Send "thinking" event
          sendEvent({
            type: 'thinking',
            agent_name: member.agent.agent_name,
            role: member.role,
            step_order: i + 1,
          });

          try {
            const { output, should_delegate } = await callAgent(
              member.agent,
              member.squad_instructions,
              member.role,
              stepInput,
              steps,
              nextAgents,
            );

            const step: StepResult = {
              agent_id: member.agent_id,
              agent_name: member.agent.agent_name,
              role: member.role,
              input: stepInput,
              output,
              step_order: i + 1,
              should_delegate,
            };
            steps.push(step);

            // Save step to DB
            await serviceClient.from('ia_agent_squad_execution_steps').insert({
              execution_id: execution.id,
              agent_id: member.agent_id,
              member_id: member.id,
              step_order: i + 1,
              input: stepInput,
              output,
              status: 'completed',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            });

            // Send step result event
            sendEvent({
              type: 'step',
              agent_name: member.agent.agent_name,
              role: member.role,
              output,
              step_order: i + 1,
              should_delegate,
            });

            // If agent decided NOT to delegate, stop the chain
            if (!should_delegate) {
              console.log(`[squad-orchestrator] ${member.agent.agent_name} decided to FINALIZE. Stopping chain.`);
              break;
            }
          } catch (err) {
            console.error(`[squad-orchestrator] Error at step ${i + 1}:`, err);
            await serviceClient.from('ia_agent_squad_execution_steps').insert({
              execution_id: execution.id,
              agent_id: member.agent_id,
              member_id: member.id,
              step_order: i + 1,
              input: stepInput,
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
              step_order: i + 1,
            });

            steps.push({
              agent_id: member.agent_id,
              agent_name: member.agent.agent_name,
              role: member.role,
              input: stepInput,
              output: `⚠️ Erro: ${err.message}`,
              step_order: i + 1,
              should_delegate: false,
            });
            break;
          }
        }

        // Mark execution as completed
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
