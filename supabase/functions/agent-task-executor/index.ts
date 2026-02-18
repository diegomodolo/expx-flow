import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date();
    const spOffset = -3 * 60 * 60 * 1000;
    const nowSP = new Date(now.getTime() + spOffset);
    const isoDateSP = nowSP.toISOString().split('T')[0];
    const timeSP = `${String(nowSP.getUTCHours()).padStart(2, '0')}:${String(nowSP.getUTCMinutes()).padStart(2, '0')}`;

    console.log(`[agent-task-executor] Running at ${isoDateSP} ${timeSP} SP time`);

    // Find all employees that are AI agents (ia_agent_id is not null)
    const { data: agentEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, ia_agent_id, company_id, name')
      .not('ia_agent_id', 'is', null)
      .eq('status', 'active');

    if (empError) throw empError;
    if (!agentEmployees || agentEmployees.length === 0) {
      console.log('[agent-task-executor] No AI agent employees found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[agent-task-executor] Found ${agentEmployees.length} AI agent employees`);

    let totalProcessed = 0;

    for (const employee of agentEmployees) {
      // Find tasks assigned to this agent that are ready to execute
      // Tasks where: user_id = employee.user_id (which is the agent id), status = 'todo', start_date <= now
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, description, checklist, start_date, deadline, related_client_id, company_id, team_id')
        .or(`user_id.eq.${employee.user_id},assigned_user_id.eq.${employee.user_id}`)
        .eq('status', 'todo')
        .lte('start_date', isoDateSP)
        .order('start_date', { ascending: true })
        .limit(5); // Process max 5 tasks per agent per run

      if (taskError) {
        console.error(`[agent-task-executor] Error fetching tasks for agent ${employee.name}:`, taskError);
        continue;
      }

      if (!tasks || tasks.length === 0) {
        console.log(`[agent-task-executor] No pending tasks for agent ${employee.name}`);
        continue;
      }

      console.log(`[agent-task-executor] Found ${tasks.length} tasks for agent ${employee.name}`);

      // Get the agent's config
      const { data: agent, error: agentError } = await supabase
        .from('ia_agents')
        .select('id, agent_name, prompt_base, additional_instructions, model, client_id, company_id')
        .eq('id', employee.ia_agent_id)
        .single();

      if (agentError || !agent) {
        console.error(`[agent-task-executor] Agent not found for employee ${employee.name}:`, agentError);
        continue;
      }

      for (const task of tasks) {
        try {
          console.log(`[agent-task-executor] Processing task "${task.title}" (${task.id})`);

          // 1. Move task to "in progress"
          await supabase.from('tasks').update({
            status: 'progress',
            updated_at: new Date().toISOString(),
          }).eq('id', task.id);

          // 2. Build prompt from task content
          const checklistText = task.checklist
            ? JSON.parse(typeof task.checklist === 'string' ? task.checklist : JSON.stringify(task.checklist))
                .map((item: any) => `- ${item.checked ? '✅' : '⬜'} ${item.text}`)
                .join('\n')
            : '';

          const taskPrompt = `
Você está executando uma tarefa automaticamente. Leia o conteúdo abaixo e execute conforme solicitado.

**TAREFA:** ${task.title}

${task.description ? `**DESCRIÇÃO:**\n${task.description}` : ''}

${checklistText ? `**CHECKLIST:**\n${checklistText}` : ''}

${task.deadline ? `**PRAZO:** ${task.deadline}` : ''}

Gere o resultado/output da execução desta tarefa de forma completa e estruturada. Seja direto e objetivo.
`.trim();

          // 3. Call ia-agent-chat to process the task
          // Create a temporary conversation for this task execution
          const { data: conversation, error: convError } = await supabase
            .from('ia_agent_conversations')
            .insert({
              agent_id: agent.id,
              company_id: agent.company_id,
              user_id: employee.user_id,
              title: `🤖 Execução: ${task.title.slice(0, 50)}`,
            })
            .select('id')
            .single();

          if (convError) {
            console.error(`[agent-task-executor] Error creating conversation:`, convError);
            // Revert to todo
            await supabase.from('tasks').update({ status: 'todo' }).eq('id', task.id);
            continue;
          }

          // Save the task message
          await supabase.from('ia_agent_messages').insert({
            conversation_id: conversation.id,
            role: 'user',
            content: taskPrompt,
          });

          // Call the agent chat function
          const chatResponse = await fetch(`${supabaseUrl}/functions/v1/ia-agent-chat`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              agent_id: agent.id,
              conversation_id: conversation.id,
              message: taskPrompt,
            }),
          });

          const chatResult = await chatResponse.json();

          if (!chatResult.success) {
            console.error(`[agent-task-executor] Agent chat failed for task ${task.id}:`, chatResult.error);
            // Revert to todo
            await supabase.from('tasks').update({ status: 'todo' }).eq('id', task.id);
            continue;
          }

          // 4. Save the output and move to "review"
          await supabase.from('tasks').update({
            status: 'review',
            ai_output: chatResult.response,
            progress: 100,
            updated_at: new Date().toISOString(),
          }).eq('id', task.id);

          console.log(`[agent-task-executor] ✅ Task "${task.title}" completed and moved to review`);
          totalProcessed++;

        } catch (taskErr) {
          console.error(`[agent-task-executor] Error processing task ${task.id}:`, taskErr);
          // Revert to todo on error
          await supabase.from('tasks').update({ status: 'todo' }).eq('id', task.id);
        }
      }
    }

    console.log(`[agent-task-executor] Done. Processed ${totalProcessed} tasks.`);

    return new Response(
      JSON.stringify({ success: true, processed: totalProcessed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[agent-task-executor] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
