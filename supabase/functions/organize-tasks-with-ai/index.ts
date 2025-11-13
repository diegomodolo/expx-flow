import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
            content: `Você é um organizador de tarefas inteligente para agência de marketing. RESPONDA APENAS JSON VÁLIDO NO FORMATO EXATO ABAIXO:

{
  "organizedTasks": [
    {
      "taskId": "uuid-da-tarefa",
      "slotId": "uuid-do-slot",
      "date": "2025-08-02",
      "estimatedMinutes": 30,
      "startOffsetMinutes": 0,
      "endOffsetMinutes": 30,
      "reason": "Razão da alocação com tempo estimado",
      "assignedTo": "user_id ou nome do colaborador",
      "reassignmentReason": "N/A ou razão da reassignação"
    }
  ],
  "statistics": {
    "totalTasks": 20,
    "totalTimeMinutes": 1200,
    "tasksPerDay": {
      "2025-08-02": 15
    },
    "reassignments": 0
  },
  "warnings": []
}

REGRAS OBRIGATÓRIAS:

1. ESTIMATIVA INTELIGENTE DE TEMPO - Analise título e descrição para determinar tempo REALISTA:
   BANCO DE CONHECIMENTO DE TEMPOS MÉDIOS:
   • ANÁLISE/OTIMIZAÇÃO: 15-40 min
     - "otimizar CPA", "verificar métricas", "analisar performance" → 20-30 min
     - "revisar dados", "conferir resultados" → 15-25 min
   • CRIAÇÃO DE CONTEÚDO: 30-60 min  
     - "criar copy", "desenvolver anúncio", "produzir criativo" → 40-50 min
     - "escrever texto", "fazer variação" → 30-40 min
   • IMPLEMENTAÇÃO: 20-45 min
     - "ajustar segmentação", "aplicar mudanças", "configurar" → 20-35 min
     - "implementar alterações", "executar ajustes" → 25-40 min
   • REVISÃO: 15-30 min
     - "revisar", "validar", "aprovar", "conferir" → 15-25 min
   • REUNIÕES: 30-60 min
     - "reunião de pauta", "alinhamento", "apresentação" → 45-60 min
     - "call", "meeting", "discussão" → 30-45 min
   • ESCALABILIDADE: 25-40 min
     - "escalar campanha", "expandir budget", "ampliar" → 25-35 min

2. MÚLTIPLAS TAREFAS POR SLOT - Um slot pode conter VÁRIAS tarefas sequenciais:
   - Use startOffsetMinutes e endOffsetMinutes para posicionar cada tarefa dentro do slot
   - Primeira tarefa: startOffset=0, endOffset=estimatedMinutes
   - Segunda tarefa: startOffset=endOffset da anterior, endOffset=startOffset+estimatedMinutes
   - Continue até ocupar ~90% da capacidade do slot (deixe 10-15min de margem)
   - NUNCA sobreponha horários - tarefas devem ser SEQUENCIAIS

3. COMPATIBILIDADE DE SLOTS - Cada slot tem objetivo específico:
   - "Check": Apenas análise, verificação, otimização de métricas
   - "Reuniao de Pauta": Apenas reuniões, planejamento, definição de pauta  
   - "Produção": Criação de conteúdo, anúncios, copy, criativos
   - "Atualização": Implementação de mudanças, ajustes, aplicação
   - "Retomada": Continuação de trabalhos, revisão, finalização, escalabilidade
   - "Monitoramento": Acompanhamento, verificação de resultados
   - "Fechamento": Conclusão, relatórios, encerramento

4. PREENCHIMENTO INTELIGENTE:
   - Priorize por deadline urgente > prioridade alta > prioridade média
   - Dentro de cada slot, organize tarefas por ordem de prioridade
   - Se sobrar espaço no slot, adicione mais tarefas compatíveis
   - Se não houver tarefas compatíveis, deixe slot vazio

5. REMANEJAMENTO: Se todas as tarefas não couberem nos slots do dia:
   - Realoque automaticamente para próximo dia no slot correspondente
   - Mantenha compatibilidade de tipo de slot
   - Distribua carga equilibradamente

IMPORTANTE: 
- Retorne APENAS o JSON válido, sem texto adicional ou marcações markdown
- startOffsetMinutes e endOffsetMinutes são OBRIGATÓRIOS para cada tarefa
- Calcule offsets considerando a duração real estimada de cada tarefa
- Deixe margem de segurança nos slots longos`
          },
          {
            role: 'user',
            content: `TAREFAS PARA ${startDate}:
${tasks.map(task => {
  const taskTypes = [];
  const title = task.title.toLowerCase();
  if (title.includes('otimizar') || title.includes('cpa') || title.includes('verificar')) taskTypes.push('análise');
  if (title.includes('criar') || title.includes('anúncio') || title.includes('produção')) taskTypes.push('produção');
  if (title.includes('reunião') || title.includes('pauta') || title.includes('meeting')) taskTypes.push('reunião');
  if (title.includes('monitorar') || title.includes('conferir')) taskTypes.push('monitoramento');
  if (title.includes('registrar') || title.includes('documentar')) taskTypes.push('atualização');
  if (title.includes('escalar') || title.includes('implementar')) taskTypes.push('implementação');
  
  const compatibleSlots = [];
  if (taskTypes.includes('análise')) compatibleSlots.push('Check', 'Monitoramento Final');
  if (taskTypes.includes('produção')) compatibleSlots.push('Produção Clientes Críticos', 'Retomada');
  if (taskTypes.includes('reunião')) compatibleSlots.push('Reuniao de Pauta');
  if (taskTypes.includes('monitoramento')) compatibleSlots.push('Monitoramento Final', 'Check');
  if (taskTypes.includes('atualização')) compatibleSlots.push('Atualização', 'Fechamento');
  if (taskTypes.includes('implementação')) compatibleSlots.push('Retomada', 'Produção Clientes Críticos');
  
  return `${task.id}: "${task.title}" (${task.priority || 'medium'}, deadline: ${task.deadline || 'sem deadline'}) [Compatível com: ${compatibleSlots.join(', ') || 'Retomada'}]`;
}).join('\n')}

COLABORADORES:
${employees.map(emp => `${emp.user_id}: ${emp.name}`).join('\n')}

SLOTS DISPONÍVEIS ${startDate}:
${timeSlots.map(slot => {
  const duration = (() => {
    const [startH, startM] = slot.start_time.split(':').map(Number);
    const [endH, endM] = slot.end_time.split(':').map(Number);
    return (endH * 60 + endM) - (startH * 60 + startM);
  })();
  return `${slot.id}: "${slot.name}" (${slot.start_time}-${slot.end_time}, ${duration}min máx)`;
}).join('\n')}

IMPORTANTE: 
- Só aloque tarefas compatíveis com o objetivo do slot
- MÚLTIPLAS tarefas sequenciais por pessoa por slot são permitidas
- Use banco de conhecimento para estimar tempo realista de cada tarefa
- Calcule startOffsetMinutes e endOffsetMinutes para cada tarefa
- Se não há tarefa compatível, deixe slot vazio
- Priorize tarefas por deadline e prioridade
- Distribua tarefas até ocupar ~90% da capacidade do slot

RETORNE APENAS JSON:`
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

    // Validar estrutura do plano de organização
    console.log('🔍 Validating organization plan structure...');
    console.log('📊 Plan keys:', Object.keys(organizationPlan));
    
    if (!organizationPlan || typeof organizationPlan !== 'object') {
      console.error('❌ Organization plan is not an object:', organizationPlan);
      throw new Error('Organization plan must be an object');
    }
    
    if (!organizationPlan.organizedTasks) {
      console.error('❌ Missing organizedTasks property:', organizationPlan);
      throw new Error('Organization plan must have organizedTasks property');
    }
    
    if (!Array.isArray(organizationPlan.organizedTasks)) {
      console.error('❌ organizedTasks is not an array:', typeof organizationPlan.organizedTasks);
      throw new Error('organizedTasks must be an array');
    }
    
    // Validar estrutura de cada tarefa organizada
    for (const [index, task] of organizationPlan.organizedTasks.entries()) {
      if (!task.taskId || !task.slotId || !task.date) {
        console.error(`❌ Invalid task at index ${index}:`, task);
        throw new Error(`Task at index ${index} is missing required fields (taskId, slotId, date)`);
      }
      
      // Validar novos campos obrigatórios
      if (typeof task.startOffsetMinutes !== 'number' || typeof task.endOffsetMinutes !== 'number') {
        console.error(`❌ Task at index ${index} missing time offsets:`, task);
        throw new Error(`Task at index ${index} must have startOffsetMinutes and endOffsetMinutes as numbers`);
      }
      
      if (task.startOffsetMinutes < 0 || task.endOffsetMinutes <= task.startOffsetMinutes) {
        console.error(`❌ Task at index ${index} has invalid time offsets:`, task);
        throw new Error(`Task at index ${index} has invalid time offsets (start: ${task.startOffsetMinutes}, end: ${task.endOffsetMinutes})`);
      }
    }
    
    console.log('✅ Organization plan structure validated successfully');

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