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
    // Use full ISO timestamp for comparison (SP timezone = UTC-3)
    const now = new Date();
    const nowISO = now.toISOString();

    console.log(`[agent-task-executor] Running at ${nowISO} (UTC)`);

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
      // Tasks where: user_id = employee.user_id, status = 'todo', start_date <= now (full timestamp)
      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select('id, title, description, checklist, start_date, due_date, related_client_id, company_id, team_id, quadro_column_id')
        .or(`user_id.eq.${employee.user_id},assigned_user_id.eq.${employee.user_id}`)
        .eq('status', 'todo')
        .not('start_date', 'is', null)
        .lte('start_date', nowISO)
        .order('start_date', { ascending: true })
        .limit(5);

      if (taskError) {
        console.error(`[agent-task-executor] Error fetching tasks for agent ${employee.name}:`, taskError);
        continue;
      }

      if (!tasks || tasks.length === 0) {
        console.log(`[agent-task-executor] No pending tasks for agent ${employee.name}`);
        continue;
      }

      console.log(`[agent-task-executor] Found ${tasks.length} tasks for agent ${employee.name}`);

      // Get the agent's board columns to find "progress" and "review" columns
      const { data: boardColumns } = await supabase
        .from('task_board_columns')
        .select('id, name, status, order_index')
        .eq('user_id', employee.user_id)
        .eq('company_id', employee.company_id)
        .order('order_index', { ascending: true });

      const progressColumn = boardColumns?.find(c => c.status === 'progress');
      const reviewColumn = boardColumns?.find(c => c.status === 'review');

      console.log(`[agent-task-executor] Board columns for ${employee.name}: progress=${progressColumn?.name || 'NOT FOUND'}, review=${reviewColumn?.name || 'NOT FOUND'}`);

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

          // 1. Move task to "in progress" + update board column
          const progressUpdate: any = {
            status: 'progress',
            updated_at: new Date().toISOString(),
          };
          if (progressColumn) {
            progressUpdate.quadro_column_id = progressColumn.id;
            progressUpdate.etapa = progressColumn.name;
          }
          await supabase.from('tasks').update(progressUpdate).eq('id', task.id);

          // Log status change in task history
          await supabase.from('task_history').insert({
            task_id: task.id,
            company_id: task.company_id || employee.company_id,
            user_id: employee.user_id,
            user_name: employee.name,
            history_type: 'automatic',
            description: `🤖 Agente iniciou a execução da tarefa`,
            field_changed: 'status',
            old_value: 'todo',
            new_value: 'progress',
          });

          // 2. Build prompt from task content
          let checklistText = '';
          try {
            const parsed = task.checklist
              ? JSON.parse(typeof task.checklist === 'string' ? task.checklist : JSON.stringify(task.checklist))
              : [];
            if (Array.isArray(parsed)) {
              checklistText = parsed.map((item: any) => `- ${item.checked || item.completed || item.done ? '✅' : '⬜'} ${item.text}`).join('\n');
            }
          } catch { /* ignore checklist parse errors */ }

          const taskPrompt = `
Você está executando uma tarefa automaticamente. Leia o conteúdo abaixo e execute conforme solicitado.

**TAREFA:** ${task.title}

${task.description ? `**DESCRIÇÃO:**\n${task.description}` : ''}

${checklistText ? `**CHECKLIST:**\n${checklistText}` : ''}

${task.due_date ? `**PRAZO:** ${task.due_date}` : ''}

Gere o resultado/output da execução desta tarefa de forma completa e estruturada. Seja direto e objetivo.
`.trim();

          // 3. Call ia-agent-chat to process the task
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
            await supabase.from('tasks').update({ status: 'todo', quadro_column_id: task.quadro_column_id }).eq('id', task.id);
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
            await supabase.from('tasks').update({ status: 'todo', quadro_column_id: task.quadro_column_id }).eq('id', task.id);

            // Log failure
            await supabase.from('task_history').insert({
              task_id: task.id,
              company_id: task.company_id || employee.company_id,
              user_id: employee.user_id,
              user_name: employee.name,
              history_type: 'automatic',
              description: `🤖 Erro na execução: ${chatResult.error || 'Falha desconhecida'}`,
              field_changed: 'ai_execution',
              old_value: 'progress',
              new_value: 'todo',
            });
            continue;
          }

          // 4. Save the output and move to "review" + update board column
          const reviewUpdate: any = {
            status: 'review',
            ai_output: chatResult.response,
            progress: 100,
            updated_at: new Date().toISOString(),
          };
          if (reviewColumn) {
            reviewUpdate.quadro_column_id = reviewColumn.id;
            reviewUpdate.etapa = reviewColumn.name;
          }
          await supabase.from('tasks').update(reviewUpdate).eq('id', task.id);

          // Log completion in task history
          await supabase.from('task_history').insert({
            task_id: task.id,
            company_id: task.company_id || employee.company_id,
            user_id: employee.user_id,
            user_name: employee.name,
            history_type: 'automatic',
            description: `🤖 Agente concluiu a execução da tarefa. Output salvo.`,
            field_changed: 'status',
            old_value: 'progress',
            new_value: 'review',
          });

          console.log(`[agent-task-executor] ✅ Task "${task.title}" completed and moved to review`);
          totalProcessed++;

        } catch (taskErr) {
          console.error(`[agent-task-executor] Error processing task ${task.id}:`, taskErr);
          await supabase.from('tasks').update({ status: 'todo', quadro_column_id: task.quadro_column_id }).eq('id', task.id);
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
