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

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Preparar contexto para a IA
    const context = `
SISTEMA DE ORGANIZAÇÃO INTELIGENTE DE TAREFAS

CONFIGURAÇÃO DO ESCOPO:
- Tipo: ${scope?.type === 'specific' ? 'Colaborador específico' : 'Todos os colaboradores'}
- Período: ${scope?.includePeriod || daysToOrganize} dias
- Incluir tarefas sem responsável: ${scope?.includeUnassigned ? 'Sim' : 'Não'}
${scope?.employeeId ? `- Colaborador selecionado: ${employees.find(e => e.user_id === scope.employeeId)?.name || 'Não encontrado'}` : ''}

TAREFAS PENDENTES (${tasks.length}):
${tasks.map(task => `
• ${task.title}
  - Prioridade: ${task.priority}
  - Status: ${task.status}
  - Responsável: ${task.responsible_name || 'Sem responsável'}
  - Descrição: ${task.description || 'Sem descrição'}
  - Prazo: ${task.deadline || 'Sem prazo'}
  - ID: ${task.id}
`).join('\n')}

COLABORADORES DISPONÍVEIS (${employees.length}):
${employees.map(emp => `
• ${emp.name}
  - Função: ${emp.role}
  - Status: ${emp.status}
  - Skills: ${emp.skills || 'Não especificado'}
  - ID: ${emp.user_id}
`).join('\n')}

SLOTS DISPONÍVEIS (${timeSlots.length}):
${timeSlots.map(slot => `
• ${slot.name} (${slot.start_time} - ${slot.end_time})
  - Descrição: ${slot.description || 'Sem descrição'}
  - Tipo sugerido: ${getSlotType(slot)}
  - ID: ${slot.id}
`).join('\n')}

INSTRUÇÕES INTELIGENTES:
1. COMPATIBILIDADE SLOT-TAREFA:
   - Slots de "Reunião" → tarefas de comunicação, alinhamento, brainstorming
   - Slots de "Foco" → tarefas operacionais, desenvolvimento, análise
   - Slots de "Revisão" → tarefas de validação, correção, otimização
   - Slots de "Planejamento" → tarefas estratégicas, organização, preparação

2. DISTRIBUIÇÃO DE COLABORADORES:
   - Analise carga de trabalho atual de cada colaborador
   - Redistribua tarefas sem responsável para quem tem menos sobrecarga
   - Considere skills e adequação do colaborador para a tarefa
   - Balance equitativamente entre a equipe

3. PRIORIZAÇÃO INTELIGENTE:
   - EMERGENCIAL: alocação imediata no próximo slot adequado
   - ALTA: prioridade nos melhores horários disponíveis
   - MÉDIA/BAIXA: preencher slots remanescentes

4. OTIMIZAÇÕES:
   - Distribua ao longo de ${scope?.includePeriod || daysToOrganize} dias úteis a partir de ${startDate}
   - Evite sobrecarga de slots (máximo 80% da duração)
   - Agrupe tarefas similares no mesmo período quando possível
   - Deixe buffer entre tarefas complexas

RESPONDA APENAS COM UM JSON VÁLIDO no formato:
{
  "organizedTasks": [
    {
      "taskId": "id_da_tarefa",
      "slotId": "id_do_slot", 
      "date": "YYYY-MM-DD",
      "estimatedMinutes": 30,
      "reason": "Explicação detalhada da decisão de alocação",
      "assignedTo": "user_id_responsavel",
      "reassignmentReason": "Motivo da reatribuição (se aplicável)"
    }
  ],
  "statistics": {
    "totalTasks": 0,
    "totalEstimatedTime": 0,
    "averageTaskTime": 0,
    "daysUsed": 0
  },
  "warnings": ["Lista de avisos se houver sobrecarga ou incompatibilidades"],
  "reassignments": [
    {
      "taskId": "id",
      "taskTitle": "nome",
      "fromUser": "nome_anterior",
      "toUser": "nome_novo", 
      "reason": "motivo da mudança"
    }
  ],
  "workloadDistribution": [
    {
      "employeeName": "nome",
      "beforeTasks": 0,
      "afterTasks": 0,
      "totalMinutes": 0
    }
  ]
}

FUNÇÃO AUXILIAR PARA IDENTIFICAR TIPO DE SLOT:
${getSlotTypeFunction()}
`;

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
            content: 'Você é um assistente especializado em organização de tarefas e produtividade. Analise as tarefas e slots fornecidos e crie uma organização otimizada. Retorne apenas JSON válido.'
          },
          {
            role: 'user',
            content: context
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    console.log('🤖 AI Response:', aiResponse);

    // Tentar parsear a resposta JSON
    let organizationPlan;
    try {
      // Remover possíveis marcadores de código markdown
      const cleanResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      organizationPlan = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI response as JSON');
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
        
        return {
          ...item,
          taskTitle: task?.title || 'Tarefa não encontrada',
          slotName: slot?.name || 'Slot não encontrado',
          slotTime: slot ? `${slot.start_time} - ${slot.end_time}` : 'Horário não definido'
        };
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