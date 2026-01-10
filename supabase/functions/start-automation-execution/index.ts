// ============================================================
// EDGE FUNCTION: start-automation-execution
// Inicia a execução de automações de forma assíncrona
// Retorna imediatamente com o execution_id para acompanhamento em tempo real
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const body = await req.json();
    const clientId = body.client_id;
    const executionId = body.execution_id || crypto.randomUUID();

    console.log('🚀 Starting automation execution (async pattern):', { clientId, executionId });

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'client_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se existem regras ativas
    const { data: rules, error: rulesError } = await supabase
      .from('campaign_automation_rules')
      .select('id, company_id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .eq('is_template', false)
      .limit(1);

    if (rulesError) throw rulesError;

    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhuma regra ativa encontrada para este cliente' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = rules[0].company_id;

    // Criar log de execução inicial
    const { data: logEntry, error: logError } = await supabase
      .from('automation_execution_logs')
      .insert({
        company_id: companyId,
        client_id: clientId,
        execution_id: executionId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error creating execution log:', logError);
    }

    // Inserir log de progresso inicial
    await supabase.from('automation_execution_progress').insert({
      execution_id: executionId,
      company_id: companyId,
      client_id: clientId,
      entity_type: 'system',
      entity_name: 'Início',
      status: 'processing',
      rule_name: 'Sistema',
      message: '🚀 Iniciando execução de automações...',
      metadata: { phase: 'starting' }
    });

    // Invocar a edge function principal em background usando EdgeRuntime.waitUntil
    const executeInBackground = async () => {
      try {
        console.log('🔄 Invoking execute-campaign-automations in background...');
        
        const response = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/execute-campaign-automations`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              client_id: clientId,
              execution_id: executionId,
              background_execution: true,
              log_entry_id: logEntry?.id
            })
          }
        );

        // Tratar resposta de forma segura - pode estar vazia se conexão foi fechada
        let result = null;
        try {
          const text = await response.text();
          if (text && text.trim()) {
            result = JSON.parse(text);
          }
        } catch (parseError) {
          console.log('⚠️ Não foi possível parsear resposta (conexão pode ter sido fechada):', parseError);
        }
        
        if (result) {
          console.log('✅ Background execution completed:', result);
        } else {
          console.log('✅ Background execution completed (sem resposta - execução pode ter terminado normalmente)');
        }
      } catch (error: any) {
        console.error('❌ Background execution error:', error);
        
        // Atualizar log de erro
        await supabase.from('automation_execution_progress').insert({
          execution_id: executionId,
          company_id: companyId,
          client_id: clientId,
          entity_type: 'system',
          entity_name: 'Sistema',
          status: 'error',
          rule_name: 'Erro',
          message: `❌ Erro na execução: ${error.message}`
        });

        if (logEntry?.id) {
          await supabase
            .from('automation_execution_logs')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: error.message
            })
            .eq('id', logEntry.id);
        }
      }
    };

    // Usar EdgeRuntime.waitUntil para executar em background
    // @ts-ignore - EdgeRuntime é disponível no contexto Deno do Supabase
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(executeInBackground());
    } else {
      // Fallback: executar sem aguardar
      executeInBackground();
    }

    // Retornar imediatamente com o execution_id
    return new Response(
      JSON.stringify({
        success: true,
        execution_id: executionId,
        message: 'Execução iniciada - acompanhe o progresso em tempo real'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in start-automation-execution:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
