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
    const { tasks, timeSlots, startDate, daysToOrganize = 7 } = await req.json();
    
    console.log(`🤖 Organizing ${tasks.length} tasks across ${timeSlots.length} slots for ${daysToOrganize} days`);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Preparar contexto para a IA
    const context = `
SISTEMA DE ORGANIZAÇÃO INTELIGENTE DE TAREFAS

TAREFAS PENDENTES (${tasks.length}):
${tasks.map(task => `
• ${task.title}
  - Prioridade: ${task.priority}
  - Status: ${task.status}
  - Descrição: ${task.description || 'Sem descrição'}
  - Prazo: ${task.deadline || 'Sem prazo'}
  - ID: ${task.id}
`).join('\n')}

SLOTS DISPONÍVEIS (${timeSlots.length}):
${timeSlots.map(slot => `
• ${slot.name} (${slot.start_time} - ${slot.end_time})
  - Descrição: ${slot.description || 'Sem descrição'}
  - ID: ${slot.id}
`).join('\n')}

INSTRUÇÕES:
1. Organize as tarefas nos slots mais adequados baseado no tipo/objetivo
2. Priorize tarefas EMERGENCIAIS e de ALTA prioridade
3. Estime tempo necessário para cada tarefa (em minutos)
4. Distribua as tarefas ao longo de ${daysToOrganize} dias úteis a partir de ${startDate}
5. Não sobrecarregue nenhum slot - calcule a duração do slot e ajuste
6. Se uma tarefa não se encaixar bem em nenhum slot, use o mais próximo
7. Considere o tempo total disponível em cada slot

RESPONDA APENAS COM UM JSON VÁLIDO no formato:
{
  "organizedTasks": [
    {
      "taskId": "id_da_tarefa",
      "slotId": "id_do_slot", 
      "date": "YYYY-MM-DD",
      "estimatedMinutes": 30,
      "reason": "Motivo da alocação"
    }
  ],
  "statistics": {
    "totalTasks": 0,
    "totalEstimatedTime": 0,
    "averageTaskTime": 0,
    "daysUsed": 0
  },
  "warnings": ["Lista de avisos se houver sobrecarga ou incompatibilidades"]
}
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