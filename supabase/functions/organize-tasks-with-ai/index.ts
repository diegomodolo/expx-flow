import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tasks, timeSlots, startDate, daysToOrganize = 7, scope, employees = [] } = await req.json();
    
    console.log(`🤖 Organizing ${tasks.length} tasks across ${timeSlots.length} slots for ${daysToOrganize} days`);
    console.log(`📊 Scope: ${scope?.type || 'all'}, Employees: ${employees.length}, Include unassigned: ${scope?.includeUnassigned}`);
    console.log('📝 Tasks details:', tasks.map(t => ({ id: t.id, title: t.title, user_id: t.user_id, deadline: t.deadline })));
    console.log('⏰ Time slots:', timeSlots.map(s => ({ id: s.id, name: s.name, start_time: s.start_time, end_time: s.end_time })));

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (daysToOrganize - 1));
    const endDateStr = endDate.toISOString().split('T')[0];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Organize tarefas nos slots disponíveis. Considere prioridade e deadlines. Responda APENAS com JSON válido:
{
  "organizedTasks": [
    {
      "taskId": "string",
      "slotId": "string",
      "date": "YYYY-MM-DD",
      "estimatedMinutes": number,
      "reason": "string",
      "assignedTo": "string",
      "reassignmentReason": "string"
    }
  ],
  "statistics": {
    "totalTasks": number,
    "totalTimeMinutes": number,
    "tasksPerDay": {},
    "reassignments": number
  },
  "warnings": []
}`
          },
          {
            role: 'user',
            content: `TAREFAS (${tasks.length}):
${tasks.map(task => `${task.id}: ${task.title} (${task.priority || 'medium'}, deadline: ${task.deadline || 'none'})`).join('\n')}

COLABORADORES:
${employees.map(emp => `${emp.user_id}: ${emp.name}`).join('\n')}

SLOTS:
${timeSlots.map(slot => `${slot.id}: ${slot.name} (${slot.start_time}-${slot.end_time})`).join('\n')}

PERÍODO: ${startDate} a ${endDateStr}
ESCOPO: ${scope?.type || 'all'}

Distribua as tarefas equilibradamente nos slots considerando prioridade. APENAS JSON:`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('🤖 AI Response:', aiResponse);

    // Tentar parsear a resposta JSON com validação robusta
    let organizationPlan;
    try {
      // Remover possíveis marcadores de código markdown e limpar a resposta
      let cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      
      // Verificar se a resposta parece estar truncada
      if (!cleanResponse.endsWith('}') && !cleanResponse.endsWith(']')) {
        console.warn('⚠️ Response appears to be truncated:', cleanResponse.slice(-100));
        throw new Error('AI response appears to be truncated');
      }
      
      // Tentar encontrar JSON válido dentro da resposta
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }
      
      console.log('🧹 Cleaned response length:', cleanResponse.length);
      organizationPlan = JSON.parse(cleanResponse);
      
    } catch (parseError) {
      console.error('❌ Error parsing AI response:', parseError);
      console.error('📝 Raw response:', aiResponse.slice(0, 500) + '...');
      throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
    }

    // Validar e processar o plano
    if (!organizationPlan.organizedTasks || !Array.isArray(organizationPlan.organizedTasks)) {
      throw new Error('Invalid organization plan format');
    }

    // Adicionar informações adicionais para cada tarefa organizada
    const enrichedPlan = {
      ...organizationPlan,
      organizedTasks: organizationPlan.organizedTasks.map(item => {
        const task = tasks.find(t => t.id === item.taskId);
        const slot = timeSlots.find(s => s.id === item.slotId);
        
        console.log(`🔍 Processing task ${item.taskId}, assignedTo: "${item.assignedTo}"`);
        
        // Busca melhorada do colaborador
        let assignedEmployee = null;
        if (item.assignedTo) {
          // Primeiro, tenta buscar por user_id
          assignedEmployee = employees.find(e => e.user_id === item.assignedTo);
          
          // Se não encontrar, tenta buscar por nome
          if (!assignedEmployee) {
            assignedEmployee = employees.find(e => 
              e.name && (
                e.name.toLowerCase().includes(item.assignedTo.toLowerCase()) ||
                item.assignedTo.toLowerCase().includes(e.name.toLowerCase()) ||
                e.name.toLowerCase() === item.assignedTo.toLowerCase()
              )
            );
          }
        }
        
        // Se ainda não encontrou e há colaboradores disponíveis, usa o primeiro
        if (!assignedEmployee && employees.length > 0) {
          assignedEmployee = employees[0];
          console.log(`🔄 Using fallback employee: ${assignedEmployee.name} for task ${item.taskId}`);
        }
        
        const result = {
          ...item,
          taskTitle: task?.title || 'Tarefa não encontrada',
          slotName: slot?.name || 'Slot não encontrado',
          slotTime: slot ? `${slot.start_time} - ${slot.end_time}` : 'Horário não definido',
          priority: task?.priority || 'medium',
          assignedToName: assignedEmployee?.name || task?.responsible_name || 'Não atribuído',
          assignedTo: assignedEmployee?.user_id || item.assignedTo || null
        };
        
        console.log(`✅ Final assignment for task ${item.taskId}: ${result.assignedToName}`);
        return result;
      })
    };

    console.log('✅ Organization plan created successfully');

    return new Response(JSON.stringify(enrichedPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in organize-tasks-with-ai function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to organize tasks with AI'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Função auxiliar para identificar tipo de slot baseado no nome e descrição
function getSlotType(slot: any): string {
  const name = slot.name?.toLowerCase() || '';
  const description = slot.description?.toLowerCase() || '';
  const combined = `${name} ${description}`;

  if (combined.includes('reunião') || combined.includes('meeting') || combined.includes('alinhamento')) {
    return 'Reunião/Comunicação';
  }
  if (combined.includes('foco') || combined.includes('desenvolvimento') || combined.includes('operacional')) {
    return 'Foco/Operacional';
  }
  if (combined.includes('revisão') || combined.includes('validação') || combined.includes('correção')) {
    return 'Revisão/Controle';
  }
  if (combined.includes('planejamento') || combined.includes('estratégico') || combined.includes('organização')) {
    return 'Planejamento/Estratégia';
  }
  return 'Geral';
}

function getSlotTypeFunction(): string {
  return `
function getSlotType(slot) {
  const name = slot.name?.toLowerCase() || '';
  const description = slot.description?.toLowerCase() || '';
  const combined = name + ' ' + description;
  
  if (combined.includes('reunião') || combined.includes('meeting')) return 'Reunião';
  if (combined.includes('foco') || combined.includes('desenvolvimento')) return 'Foco';
  if (combined.includes('revisão') || combined.includes('validação')) return 'Revisão';
  if (combined.includes('planejamento') || combined.includes('estratégico')) return 'Planejamento';
  return 'Geral';
}`;
}