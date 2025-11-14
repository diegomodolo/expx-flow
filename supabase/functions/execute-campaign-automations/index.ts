// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AutomationRule {
  id: string;
  rule_name: string;
  company_id: string;
  client_id?: string;
  entity_type: 'campaign' | 'adset' | 'ad';
  action_type: string;
  conditions: any;
  action_config: any;
  time_window_days: number;
  scope_filters?: any;
  safety_limits?: any;
  campaign_objectives?: string[];
  is_active: boolean;
}

interface FacebookCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  effective_status: string;
}

interface FacebookAdSet {
  id: string;
  name: string;
  status: string;
  effective_status: string;
}

interface FacebookAd {
  id: string;
  name: string;
  status: string;
  effective_status: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let executionId: string | undefined;
  let companyId: string | undefined;
  let client_id: string | undefined;
  let scheduled_execution: boolean = false;
  let logEntryId: string | undefined;
  let execStartTime: number = Date.now();

  try {
    const body = await req.json();
    const { client_id: bodyClientId, scheduled_execution: bodyScheduled = false } = body;
    client_id = bodyClientId;
    scheduled_execution = bodyScheduled;
    
    // Usar execution_id passado ou gerar um novo (para execuções manuais)
    executionId = body.execution_id || crypto.randomUUID();

    console.log('🚀 Starting automation execution:', { client_id, execution_id: executionId });

    // Buscar regras ativas
    const { data: rules, error: rulesError } = await supabase
      .from('campaign_automation_rules')
      .select('*')
      .eq('is_active', true)
      .or(`client_id.eq.${client_id},client_id.is.null`);

    if (rulesError) throw rulesError;
    if (!rules || rules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'Nenhuma regra ativa encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 Found ${rules.length} active rules`);

    // Se não for execução agendada, criar registro no log principal
    if (!scheduled_execution) {
      const { data: logEntry, error: logError } = await supabase
        .from('automation_execution_logs')
        .insert({
          company_id: rules[0].company_id,
          client_id: client_id,
          execution_id: executionId,
          status: 'running',
          actions_taken: 0,
          total_rules_evaluated: 0,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      
      if (logError) {
        console.error('❌ Error creating execution log:', logError);
      } else {
        logEntryId = logEntry?.id;
        console.log(`📝 Execution log created: ${logEntryId}`);
      }
    }

    // Buscar integração do Facebook
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, company_id')
      .eq('company_id', rules[0].company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integração com Facebook não encontrada ou inativa');
    }

    const accessToken = integration.access_token;
    companyId = integration.company_id;

    // Buscar configurações de automação para obter o prefixo
    const { data: automationSettings } = await supabase
      .from('automation_settings')
      .select('campaign_name_prefix')
      .eq('company_id', companyId)
      .single();

    const namePrefix = automationSettings?.campaign_name_prefix || 'SHEGrowth';
    console.log(`📝 Nome prefixo: ${namePrefix}`);

    // Buscar Ad Account do cliente
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        facebook_ad_accounts!inner(account_id)
      `)
      .eq('id', client_id)
      .single();

    if (clientError || !clientData || !clientData.facebook_ad_accounts) {
      throw new Error('Cliente ou conta de anúncios não encontrada');
    }

    const adAccountId = clientData.facebook_ad_accounts.account_id;
    console.log(`📱 Ad Account: ${adAccountId}`);

    let totalProcessed = 0;
    let totalActioned = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Agrupar regras por entity_type
    const rulesByType: Record<string, AutomationRule[]> = {
      campaign: (rules as AutomationRule[]).filter(r => r.entity_type === 'campaign'),
      adset: (rules as AutomationRule[]).filter(r => r.entity_type === 'adset'),
      ad: (rules as AutomationRule[]).filter(r => r.entity_type === 'ad')
    };

    // ========== BUSCAR CAMPANHAS ATIVAS DO FACEBOOK ==========
    console.log('\n🚀 Buscando campanhas ativas do Facebook...');
    
    // 1️⃣ INSERIR log inicial e GUARDAR o ID
    const { data: campaignsProgressLog } = await supabase
      .from('automation_execution_progress')
      .insert({
        execution_id: executionId,
        company_id: companyId,
        client_id: client_id,
        entity_type: 'campaign',
        entity_name: 'Facebook API',
        status: 'processing',
        rule_name: 'Consulta',
        message: `📡 Consultando campanhas ativas no Facebook (Ad Account: ${adAccountId})...`
      })
      .select('id')
      .single();
    
    const campaignsProgressLogId = campaignsProgressLog?.id;
    let campaigns: FacebookCampaign[] = [];
    
    try {
      // 2️⃣ Fazer a operação
      campaigns = await fetchActiveCampaignsFromFacebook(adAccountId, accessToken);
      console.log(`📦 Encontradas ${campaigns.length} campanhas ativas no Facebook`);
      
      // 3️⃣ ATUALIZAR o mesmo log (não inserir novo)
      if (campaignsProgressLogId) {
        await supabase
          .from('automation_execution_progress')
          .update({
            status: 'actioned',
            message: `✅ Encontradas ${campaigns.length} campanhas ativas. Processando com delays para respeitar rate limit...`
          })
          .eq('id', campaignsProgressLogId);
      }
      
      // Delay após buscar campanhas
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      console.error('❌ Error fetching campaigns:', error);
      
      // 4️⃣ ATUALIZAR com status 'error'
      if (campaignsProgressLogId) {
        await supabase
          .from('automation_execution_progress')
          .update({
            status: 'error',
            message: `❌ Erro ao consultar Facebook: ${error.message}`
          })
          .eq('id', campaignsProgressLogId);
      }
      
      throw error;
    }
    

    // ========== PROCESSAR EM CASCATA ==========
    for (const campaign of campaigns) {
      console.log(`\n📢 Processando campanha: ${campaign.name} (${campaign.objective})`);

      // Delay antes de processar cada campanha
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 1️⃣ APLICAR REGRAS DE CAMPANHA
      if (rulesByType.campaign.length > 0) {
        totalProcessed++;

        for (const rule of rulesByType.campaign) {
          // Verificar se o objetivo da campanha está nas campaign_objectives da regra
          if (rule.campaign_objectives && rule.campaign_objectives.length > 0) {
            if (!rule.campaign_objectives.includes(campaign.objective)) {
              console.log(`  ⏭️  Regra "${rule.rule_name}" não se aplica ao objetivo ${campaign.objective}`);
              
              // Log de regra não aplicável
              await supabase.from('automation_execution_progress').insert({
                execution_id: executionId,
                company_id: rule.company_id,
                client_id: client_id,
                entity_type: rule.entity_type,
                entity_name: campaign.name,
                status: 'skipped',
                rule_name: rule.rule_name,
                message: `⏭️ Regra não se aplica ao objetivo ${campaign.objective}`
              });
              
              totalSkipped++;
              continue;
            }
          }
          
          // 1️⃣ INSERIR log inicial e GUARDAR o ID
          const { data: metricsProgressLog } = await supabase
            .from('automation_execution_progress')
            .insert({
              execution_id: executionId,
              company_id: companyId,
              client_id: client_id,
              entity_type: 'campaign',
              entity_name: campaign.name,
              status: 'processing',
              rule_name: rule.rule_name,
              message: `📊 Consultando métricas (janela de ${rule.time_window_days} dias)...`
            })
            .select('id')
            .single();
          
          const metricsProgressLogId = metricsProgressLog?.id;
          
          // Delay antes de buscar métricas
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 2️⃣ Buscar métricas COM A JANELA ESPECÍFICA DA REGRA
          const metrics = await fetchFacebookMetrics(
            campaign.id,
            rule.time_window_days,
            accessToken,
            executionId,
            supabase,
            companyId
          );
          
          // 3️⃣ ATUALIZAR o mesmo log
          if (metricsProgressLogId) {
            if (metrics) {
              await supabase
                .from('automation_execution_progress')
                .update({
                  status: 'processing',
                  message: `✅ Métricas consultadas (CPA: R$ ${metrics.cpa.toFixed(2)}, Conv: ${metrics.conversions})`
                })
                .eq('id', metricsProgressLogId);
            } else {
              await supabase
                .from('automation_execution_progress')
                .update({
                  status: 'skipped',
                  message: `⏭️ Sem dados de métricas disponíveis para esta janela`
                })
                .eq('id', metricsProgressLogId);
              totalSkipped++;
              continue;
            }
          }
          
          // Delay após buscar métricas
          await new Promise(resolve => setTimeout(resolve, 1000));

          const result = await processEntityWithRule(
            {
              id: campaign.id,
              name: campaign.name,
              facebook_id: campaign.id,
              client_id,
              campaign_id: campaign.id,
              objective: campaign.objective
            },
            rule,
            metrics,
            executionId,
            accessToken,
            supabase,
            namePrefix
          );

          if (result === 'actioned') totalActioned++;
          else if (result === 'skipped') totalSkipped++;
          else if (result === 'error') totalErrors++;
        }
      }

      // 2️⃣ BUSCAR E PROCESSAR AD SETS DESTA CAMPANHA
      // Verificar se existe ALGUMA regra de adset aplicável a este objetivo
      const hasApplicableAdSetRules = hasApplicableRules(rulesByType.adset, campaign.objective);

      if (hasApplicableAdSetRules) {
        console.log(`  🔍 Buscando ad sets ativos da campanha (regras aplicáveis encontradas)...`);
        
        // Delay antes de buscar ad sets
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const adsets = await fetchActiveAdSetsFromFacebook(campaign.id, accessToken);
        console.log(`  📦 Encontrados ${adsets.length} ad sets ativos`);
        
        // Delay após buscar ad sets
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        for (const adset of adsets) {
          console.log(`    💼 Processando ad set: ${adset.name}`);
          
          // Delay antes de processar cada ad set
          await new Promise(resolve => setTimeout(resolve, 2000));

          for (const rule of rulesByType.adset) {
            // Verificar campaign_objectives
            if (rule.campaign_objectives && rule.campaign_objectives.length > 0) {
              if (!rule.campaign_objectives.includes(campaign.objective)) {
                await supabase.from('automation_execution_progress').insert({
                  execution_id: executionId,
                  company_id: rule.company_id,
                  client_id: client_id,
                  entity_type: rule.entity_type,
                  entity_name: adset.name,
                  status: 'skipped',
                  rule_name: rule.rule_name,
                  message: `⏭️ Regra não se aplica ao objetivo ${campaign.objective}`
                });
                totalSkipped++;
                continue;
              }
            }
            
            // Log de início
            const { data: metricsProgressLog } = await supabase
              .from('automation_execution_progress')
              .insert({
                execution_id: executionId,
                company_id: companyId,
                client_id: client_id,
                entity_type: 'adset',
                entity_name: adset.name,
                status: 'processing',
                rule_name: rule.rule_name,
                message: `📊 Consultando métricas (janela de ${rule.time_window_days} dias)...`
              })
              .select('id')
              .single();
            
            const metricsProgressLogId = metricsProgressLog?.id;
            
            // Delay antes de buscar métricas
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Buscar métricas COM A JANELA ESPECÍFICA DA REGRA
            const adsetMetrics = await fetchFacebookMetrics(
              adset.id,
              rule.time_window_days,
              accessToken,
              executionId,
              supabase,
              companyId
            );
            
            // Atualizar log
            if (metricsProgressLogId) {
              if (adsetMetrics) {
                await supabase
                  .from('automation_execution_progress')
                  .update({
                    status: 'processing',
                    message: `✅ Métricas consultadas (CPA: R$ ${adsetMetrics.cpa.toFixed(2)}, Conv: ${adsetMetrics.conversions})`
                  })
                  .eq('id', metricsProgressLogId);
              } else {
                await supabase
                  .from('automation_execution_progress')
                  .update({
                    status: 'skipped',
                    message: `⏭️ Sem dados de métricas disponíveis para esta janela`
                  })
                  .eq('id', metricsProgressLogId);
                totalSkipped++;
                continue;
              }
            }
            
            // Delay após buscar métricas
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            totalProcessed++;

            const result = await processEntityWithRule(
              {
                id: adset.id,
                name: adset.name,
                facebook_id: adset.id,
                client_id,
                campaign_id: campaign.id,
                ad_set_id: adset.id,
                objective: campaign.objective
              },
              rule,
              adsetMetrics,
              executionId,
              accessToken,
              supabase,
              namePrefix
            );

            if (result === 'actioned') totalActioned++;
            else if (result === 'skipped') totalSkipped++;
            else if (result === 'error') totalErrors++;
          }

          // 3️⃣ BUSCAR E PROCESSAR ADS DESTE AD SET
          // Verificar se existe ALGUMA regra de ad aplicável a este objetivo
          const hasApplicableAdRules = hasApplicableRules(rulesByType.ad, campaign.objective);

          if (hasApplicableAdRules) {
            console.log(`      🔍 Buscando ads ativos do ad set (regras aplicáveis encontradas)...`);
            
            // Delay antes de buscar ads
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const ads = await fetchActiveAdsFromFacebook(adset.id, accessToken);
            console.log(`      📦 Encontrados ${ads.length} ads ativos`);
            
            // Delay após buscar ads
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            for (const ad of ads) {
              console.log(`        🎨 Processando ad: ${ad.name}`);
              
              // Delay antes de processar cada ad
              await new Promise(resolve => setTimeout(resolve, 2000));

              for (const rule of rulesByType.ad) {
                // Verificar campaign_objectives
                if (rule.campaign_objectives && rule.campaign_objectives.length > 0) {
                  if (!rule.campaign_objectives.includes(campaign.objective)) {
                    await supabase.from('automation_execution_progress').insert({
                      execution_id: executionId,
                      company_id: rule.company_id,
                      client_id: client_id,
                      entity_type: rule.entity_type,
                      entity_name: ad.name,
                      status: 'skipped',
                      rule_name: rule.rule_name,
                      message: `⏭️ Regra não se aplica ao objetivo ${campaign.objective}`
                    });
                    totalSkipped++;
                    continue;
                  }
                }
                
                // Log de início
                const { data: metricsProgressLog } = await supabase
                  .from('automation_execution_progress')
                  .insert({
                    execution_id: executionId,
                    company_id: companyId,
                    client_id: client_id,
                    entity_type: 'ad',
                    entity_name: ad.name,
                    status: 'processing',
                    rule_name: rule.rule_name,
                    message: `📊 Consultando métricas (janela de ${rule.time_window_days} dias)...`
                  })
                  .select('id')
                  .single();
                
                const metricsProgressLogId = metricsProgressLog?.id;
                
                // Delay antes de buscar métricas
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                // Buscar métricas COM A JANELA ESPECÍFICA DA REGRA
                const adMetrics = await fetchFacebookMetrics(
                  ad.id,
                  rule.time_window_days,
                  accessToken,
                  executionId,
                  supabase,
                  companyId
                );
                
                // Atualizar log
                if (metricsProgressLogId) {
                  if (adMetrics) {
                    await supabase
                      .from('automation_execution_progress')
                      .update({
                        status: 'processing',
                        message: `✅ Métricas consultadas (CPA: R$ ${adMetrics.cpa.toFixed(2)}, Conv: ${adMetrics.conversions})`
                      })
                      .eq('id', metricsProgressLogId);
                  } else {
                    await supabase
                      .from('automation_execution_progress')
                      .update({
                        status: 'skipped',
                        message: `⏭️ Sem dados de métricas disponíveis para esta janela`
                      })
                      .eq('id', metricsProgressLogId);
                    totalSkipped++;
                    continue;
                  }
                }
                
                // Delay após buscar métricas
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                totalProcessed++;

                const result = await processEntityWithRule(
                  {
                    id: ad.id,
                    name: ad.name,
                    facebook_id: ad.id,
                    client_id,
                    campaign_id: campaign.id,
                    ad_set_id: adset.id,
                    objective: campaign.objective
                  },
                  rule,
                  adMetrics,
                  executionId,
                  accessToken,
                  supabase,
                  namePrefix
                );

                if (result === 'actioned') totalActioned++;
                else if (result === 'skipped') totalSkipped++;
                else if (result === 'error') totalErrors++;
              }

              // Delay entre ads
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else if (rulesByType.ad.length > 0) {
            console.log(`      ⏭️  Nenhuma regra de ad se aplica ao objetivo ${campaign.objective} - pulando busca de ads`);
            
            await supabase.from('automation_execution_progress').insert({
              execution_id: executionId,
              company_id: companyId,
              client_id: client_id,
              entity_type: 'ad',
              entity_name: adset.name,
              status: 'skipped',
              rule_name: 'Validação',
              message: `⏭️ Nenhuma regra de ad aplicável ao objetivo ${campaign.objective}`
            });
          }

          // Delay entre ad sets
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } else if (rulesByType.adset.length > 0) {
        console.log(`  ⏭️  Nenhuma regra de ad set se aplica ao objetivo ${campaign.objective} - pulando busca de ad sets`);
        
        await supabase.from('automation_execution_progress').insert({
          execution_id: executionId,
          company_id: companyId,
          client_id: client_id,
          entity_type: 'adset',
          entity_name: campaign.name,
          status: 'skipped',
          rule_name: 'Validação',
          message: `⏭️ Nenhuma regra de ad set aplicável ao objetivo ${campaign.objective}`
        });
      }

      // Delay maior entre campanhas
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    console.log('\n✨ Automation execution completed:', { 
      totalProcessed, 
      totalActioned, 
      totalSkipped, 
      totalErrors,
      scheduled_execution
    });

    // Log final de conclusão (apenas se não for execução agendada OU se houve ações)
    if (!scheduled_execution || totalActioned > 0) {
      await supabase.from('automation_execution_progress').insert({
        execution_id: executionId,
        company_id: companyId,
        client_id: client_id,
        entity_type: 'campaign',
        entity_name: 'Sistema',
        status: totalActioned > 0 ? 'actioned' : 'skipped',
        rule_name: 'Conclusão',
        message: scheduled_execution
          ? `✨ Execução agendada: ${totalActioned} ações, ${totalSkipped} ignorados, ${totalErrors} erros`
          : `✨ Execução concluída: ${totalActioned} ações, ${totalSkipped} ignorados, ${totalErrors} erros`
      });
    } else {
      console.log('⏭️ Scheduled execution with no actions - no log entry created');
    }

    // Atualizar log principal (se não for execução agendada)
    if (!scheduled_execution && logEntryId) {
      const execDuration = Date.now() - execStartTime;
      
      await supabase
        .from('automation_execution_logs')
        .update({
          status: totalErrors > 0 
            ? (totalActioned > 0 ? 'partial' : 'failed')
            : 'completed',
          completed_at: new Date().toISOString(),
          duration_ms: execDuration,
          actions_taken: totalActioned,
          total_rules_evaluated: totalProcessed + totalSkipped,
          execution_details: {
            totalProcessed,
            totalActioned,
            totalSkipped,
            totalErrors
          }
        })
        .eq('id', logEntryId);
      
      console.log(`✅ Execution log updated: ${logEntryId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        totalActioned,
        totalSkipped,
        totalErrors,
        rulesEvaluatedCount: totalProcessed + totalSkipped,
        total_actioned: totalActioned // Para compatibilidade com scheduled-automation-execution
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('❌ Error in execute-campaign-automations:', error);
    
    // Inserir log de erro se temos as informações necessárias
    if (executionId && companyId && client_id) {
      await supabase.from('automation_execution_progress').insert({
        execution_id: executionId,
        company_id: companyId,
        client_id: client_id,
        entity_type: 'campaign',
        entity_name: 'Sistema',
        status: 'error',
        rule_name: 'Execução',
        message: `❌ Erro: ${error.message}`
      });
    }
    
    // Atualizar log principal em caso de erro
    if (!scheduled_execution && logEntryId) {
      const execDuration = Date.now() - execStartTime;
      
      await supabase
        .from('automation_execution_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: execDuration,
          error_message: error.message
        })
        .eq('id', logEntryId);
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// ============ FUNÇÕES AUXILIARES ============

// Função para verificar se existe alguma regra que se aplica ao objetivo
function hasApplicableRules(
  rules: AutomationRule[], 
  campaignObjective: string
): boolean {
  if (rules.length === 0) return false;
  
  // Se alguma regra não tem filtro de objetivos, ela se aplica a todos
  const hasUniversalRule = rules.some(r => 
    !r.campaign_objectives || r.campaign_objectives.length === 0
  );
  
  if (hasUniversalRule) return true;
  
  // Verifica se alguma regra específica se aplica a este objetivo
  return rules.some(r => 
    r.campaign_objectives && 
    r.campaign_objectives.includes(campaignObjective)
  );
}

// Buscar campanhas ativas do Facebook
async function fetchWithRetry(
  url: string,
  maxRetries: number = 5,
  initialDelay: number = 5000
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.error) {
        // Se for rate limit, espera MUITO mais tempo e tenta novamente
        if (data.error.code === 4 || 
            data.error.code === 17 || 
            data.error.message?.toLowerCase().includes('rate limit') || 
            data.error.message?.toLowerCase().includes('user request limit') ||
            data.error.message?.toLowerCase().includes('too many calls')) {
          if (attempt < maxRetries - 1) {
            // Backoff exponencial com delays muito maiores (5s, 10s, 20s, 40s, 80s)
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`⏳ Rate limit do Facebook atingido! Aguardando ${delay/1000}s antes de tentar novamente (tentativa ${attempt + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        throw new Error(`Facebook API Error: ${data.error.message}`);
      }

      return data;
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`⏳ Erro na requisição, aguardando ${delay/1000}s antes de tentar novamente...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function fetchActiveCampaignsFromFacebook(
  adAccountId: string,
  accessToken: string
): Promise<FacebookCampaign[]> {
  const allCampaigns: FacebookCampaign[] = [];
  let url = `https://graph.facebook.com/v20.0/${adAccountId}/campaigns?` +
    `fields=id,name,status,objective,effective_status&` +
    `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&` +
    `limit=100&` +
    `access_token=${accessToken}`;

  try {
    while (url) {
      const data = await fetchWithRetry(url);
      
      if (data.data && data.data.length > 0) {
        allCampaigns.push(...data.data);
        console.log(`  📦 Buscadas ${data.data.length} campanhas (total: ${allCampaigns.length})`);
      }
      
      // Verificar se há próxima página
      url = data.paging?.next || null;
      
      // Delay entre páginas para respeitar rate limit
      if (url) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log(`✅ Total de campanhas ativas encontradas: ${allCampaigns.length}`);
    return allCampaigns;
  } catch (error: any) {
    console.error('❌ Error fetching campaigns from Facebook:', error);
    throw error;
  }
}

// Buscar ad sets ativos do Facebook
async function fetchActiveAdSetsFromFacebook(
  campaignId: string,
  accessToken: string
): Promise<FacebookAdSet[]> {
  try {
    const url = `https://graph.facebook.com/v20.0/${campaignId}/adsets?` +
      `fields=id,name,status,effective_status&` +
      `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&` +
      `access_token=${accessToken}`;

    const data = await fetchWithRetry(url);
    return data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching ad sets from Facebook:', error);
    throw error;
  }
}

// Buscar ads ativos do Facebook
async function fetchActiveAdsFromFacebook(
  adSetId: string,
  accessToken: string
): Promise<FacebookAd[]> {
  try {
    const url = `https://graph.facebook.com/v20.0/${adSetId}/ads?` +
      `fields=id,name,status,effective_status&` +
      `filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]&` +
      `access_token=${accessToken}`;

    const data = await fetchWithRetry(url);
    return data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching ads from Facebook:', error);
    throw error;
  }
}

// Buscar métricas do Facebook
async function fetchFacebookMetrics(
  facebookId: string,
  timeWindowDays: number,
  accessToken: string,
  executionId: string,
  supabase: any,
  companyId: string
): Promise<any | null> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeWindowDays);
  const endDate = new Date();

  const sinceStr = startDate.toISOString().split('T')[0];
  const untilStr = endDate.toISOString().split('T')[0];

  const insightsUrl = `https://graph.facebook.com/v20.0/${facebookId}/insights?` +
    `fields=impressions,clicks,spend,actions,frequency,reach,ctr,cpc,cost_per_action_type&` +
    `time_range={"since":"${sinceStr}","until":"${untilStr}"}&` +
    `access_token=${accessToken}`;

  try {
    const insightsData = await fetchWithRetry(insightsUrl);

    if (!insightsData) {
      return null;
    }

    if (!insightsData.data || insightsData.data.length === 0) {
      console.log(`⏭️  No insights data`);
      return null;
    }

    const insights = insightsData.data[0];

    const impressions = parseFloat(insights.impressions || '0');
    const clicks = parseFloat(insights.clicks || '0');
    const spend = parseFloat(insights.spend || '0');
    const reach = parseFloat(insights.reach || '0');
    const frequency = parseFloat(insights.frequency || '0');
    
    let conversions = 0;
    if (insights.actions) {
      const leadAction = insights.actions.find((a: any) => 
        a.action_type === 'offsite_conversion.fb_pixel_lead' ||
        a.action_type === 'lead' ||
        a.action_type === 'onsite_conversion.post_save'
      );
      conversions = leadAction ? parseFloat(leadAction.value) : 0;
    }

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;

    console.log(`      📈 CPA=${cpa.toFixed(2)}, CTR=${ctr.toFixed(2)}%, Conv=${conversions}`);

    return {
      impressions,
      clicks,
      spend,
      conversions,
      reach,
      frequency,
      ctr,
      cpc,
      cpa
    };
  } catch (error: any) {
    console.error(`❌ Error fetching metrics:`, error);
    return null;
  }
}

// Processar entidade com regra
async function processEntityWithRule(
  entity: any,
  rule: AutomationRule,
  metrics: any,
  executionId: string,
  accessToken: string,
  supabase: any,
  namePrefix: string
): Promise<'skipped' | 'actioned' | 'error'> {
  console.log(`\n⚙️  Applying rule: ${rule.rule_name} to ${entity.name}`);

  try {
    const conditionsMet = evaluateConditions(rule.conditions, metrics);

    if (conditionsMet) {
      console.log(`✅ Conditions met, executing action: ${rule.action_type}`);

      const actionResult = await executeAction(
        entity.facebook_id,
        entity.name,
        rule.action_type,
        rule.action_config,
        rule.entity_type,
        rule.rule_name,
        namePrefix,
        accessToken
      );

      if (actionResult.success) {
      const { error: progressError } = await supabase.from('automation_execution_progress').insert({
        execution_id: executionId,
        company_id: rule.company_id,
        client_id: entity.client_id,
        entity_type: rule.entity_type,
        entity_name: entity.name,
        entity_id: entity.id,
        facebook_id: entity.facebook_id,
        status: 'actioned',
        rule_name: rule.rule_name,
        message: `✓ ${getActionDescription(rule.action_type)} (CPA: R$ ${metrics.cpa.toFixed(2)}, Conversões: ${metrics.conversions})`,
        metadata: {
          campaign_id: entity.campaign_id,
          campaign_name: (entity as any).campaign_name,
          adset_id: (entity as any).adset_id,
          adset_name: (entity as any).adset_name,
          metrics: {
            cpa: metrics.cpa,
            ctr: metrics.ctr,
            conversions: metrics.conversions,
            spend: metrics.spend
          }
        }
      });

      if (progressError) {
        console.error('❌ Error inserting progress log:', progressError);
      } else {
        console.log(`✅ Progress log inserted for ${entity.name}`);
      }


        return 'actioned';
      } else {
        throw new Error(actionResult.error || 'Erro ao executar ação');
      }
    } else {
      console.log(`⏭️  Conditions not met, skipping`);
      await supabase.from('automation_execution_progress').insert({
        execution_id: executionId,
        company_id: rule.company_id,
        client_id: entity.client_id,
        entity_type: rule.entity_type,
        entity_name: entity.name,
        entity_id: entity.id,
        facebook_id: entity.facebook_id,
        status: 'skipped',
        rule_name: rule.rule_name,
        message: `Condições não atendidas (CPA: R$ ${metrics.cpa.toFixed(2)}, CTR: ${metrics.ctr.toFixed(2)}%)`
      });
      return 'skipped';
    }
  } catch (error: any) {
    console.error(`❌ Error processing ${entity.name} with rule ${rule.rule_name}:`, error);
    
    await supabase.from('automation_execution_progress').insert({
      execution_id: executionId,
      company_id: rule.company_id,
      client_id: entity.client_id,
      entity_type: rule.entity_type,
      entity_name: entity.name,
      entity_id: entity.id,
      facebook_id: entity.facebook_id,
      status: 'error',
      rule_name: rule.rule_name,
      message: `Erro: ${error.message}`
    });

    return 'error';
  }
}

// Avaliar condições
function evaluateConditions(conditions: any, metrics: any): boolean {
  if (!conditions || !conditions.conditions) return false;

  const logic = conditions.logic || 'AND';
  const conditionsList = conditions.conditions;

  const results = conditionsList.map((cond: any) => {
    const metricValue = metrics[cond.field];
    const targetValue = parseFloat(cond.value);

    switch (cond.operator) {
      case '>': return metricValue > targetValue;
      case '>=': return metricValue >= targetValue;
      case '<': return metricValue < targetValue;
      case '<=': return metricValue <= targetValue;
      case '=': return Math.abs(metricValue - targetValue) < 0.01;
      case '!=': return Math.abs(metricValue - targetValue) >= 0.01;
      default: return false;
    }
  });

  if (logic === 'AND') {
    return results.every(r => r);
  } else {
    return results.some(r => r);
  }
}

// Gerar nome da entidade com prefixo e sufixo
function generateEntityName(
  currentName: string,
  namePrefix: string,
  actionType: string,
  ruleName: string,
  budgetChange?: number
): string {
  // Remove prefixo existente e sufixos antigos
  const cleanName = currentName
    .replace(new RegExp(`^\\[${namePrefix}\\]\\s*`, 'i'), '')
    .replace(/\s*-\s*(Pausad[oa]|Ativad[oa]|Budget\s+[\w\s%+-]+).*$/i, '');
  
  // Gerar sufixo baseado na ação
  let suffix = '';
  switch (actionType) {
    case 'pause':
    case 'pause_campaign':
    case 'pause_adset':
    case 'pause_ad':
      suffix = `Pausado (${ruleName})`;
      break;
    
    case 'activate':
    case 'activate_campaign':
    case 'activate_adset':
    case 'activate_ad':
      suffix = `Ativado (${ruleName})`;
      break;
    
    case 'increase_budget':
      suffix = `Budget +${percentChange}% (${ruleName})`;
      break;
    
    case 'decrease_budget':
      suffix = `Budget -${percentChange}% (${ruleName})`;
      break;
    
    case 'duplicate_campaign':
    case 'duplicate_adset':
    case 'duplicate_ad':
      suffix = `Cópia (${ruleName})`;
      break;
    
    default:
      suffix = ruleName;
  }
  
  return `[${namePrefix}] ${cleanName} - ${suffix}`;
}

// Executar ação no Facebook
async function executeAction(
  facebookId: string,
  currentName: string,
  actionType: string,
  actionConfig: any,
  entityType: string,
  ruleName: string,
  namePrefix: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    let url = '';
    let body: any = {};

    switch (actionType) {
      case 'pause':
      case 'pause_campaign':
      case 'pause_adset':
      case 'pause_ad':
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        body = { 
          status: 'PAUSED',
          name: generateEntityName(currentName, namePrefix, actionType, ruleName)
        };
        break;
      
      case 'activate':
      case 'activate_campaign':
      case 'activate_adset':
      case 'activate_ad':
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        body = { 
          status: 'ACTIVE',
          name: generateEntityName(currentName, namePrefix, actionType, ruleName)
        };
        break;
      
      case 'adjust_budget':
      case 'increase_budget':
      case 'decrease_budget':
        if (entityType !== 'campaign' && entityType !== 'adset') {
          return { success: false, error: 'Ajuste de budget só disponível para campanhas e conjuntos' };
        }
        url = `https://graph.facebook.com/v20.0/${facebookId}`;
        
        // Calcular novo budget
        let newBudget = actionConfig.new_budget;
        let percentChange = 0;
        
        if (actionType === 'increase_budget' && actionConfig.increase_percentage) {
          // Buscar budget atual primeiro
          const currentResponse = await fetch(
            `https://graph.facebook.com/v20.0/${facebookId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`
          );
          const currentData = await currentResponse.json();
          const currentBudget = parseFloat(currentData.daily_budget || currentData.lifetime_budget || '0');
          percentChange = actionConfig.increase_percentage;
          newBudget = currentBudget * (1 + percentChange / 100);
        } else if (actionType === 'decrease_budget' && actionConfig.decrease_percentage) {
          const currentResponse = await fetch(
            `https://graph.facebook.com/v20.0/${facebookId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`
          );
          const currentData = await currentResponse.json();
          const currentBudget = parseFloat(currentData.daily_budget || currentData.lifetime_budget || '0');
          percentChange = actionConfig.decrease_percentage;
          newBudget = currentBudget * (1 - percentChange / 100);
        }
        
        body = {
          daily_budget: newBudget ? Math.round(newBudget * 100) : undefined,
          name: generateEntityName(currentName, namePrefix, actionType, ruleName, percentChange)
        };
        break;
      
      case 'duplicate_campaign':
      case 'duplicate_adset':
        // Duplicar campanha ou ad set usando endpoint padrão
        url = `https://graph.facebook.com/v20.0/${facebookId}/copies`;
        
        const newName = generateEntityName(currentName, namePrefix, actionType, ruleName);
        body = {
          name: newName,
          status: 'ACTIVE'
        };
        break;
      
      case 'duplicate_ad':
        // Para anúncios, usar deep_copy para evitar problemas com specs obsoletas de imagem
        url = `https://graph.facebook.com/v20.0/${facebookId}/copies?deep_copy=1`;
        
        const newAdName = generateEntityName(currentName, namePrefix, actionType, ruleName);
        body = {
          name: newAdName,
          status: 'ACTIVE'
        };
        
        // Se tiver configuração de budget para duplicação
        if (actionConfig.duplicate_budget_percent && (entityType === 'campaign' || entityType === 'adset')) {
          const currentResponse = await fetch(
            `https://graph.facebook.com/v20.0/${facebookId}?fields=daily_budget,lifetime_budget&access_token=${accessToken}`
          );
          const currentData = await currentResponse.json();
          const currentBudget = parseFloat(currentData.daily_budget || currentData.lifetime_budget || '0');
          const newDuplicateBudget = currentBudget * (actionConfig.duplicate_budget_percent / 100);
          body.daily_budget = Math.round(newDuplicateBudget * 100);
        }
        
        console.log(`📋 Duplicating ${entityType} with new name: ${actionType === 'duplicate_ad' ? newAdName : newName}`);
        break;
      
      default:
        console.log(`⚠️  Action type not implemented yet: ${actionType}`);
        return { success: false, error: `Tipo de ação não implementado: ${actionType}` };
    }

    console.log(`🔧 Executing Facebook API call:`, { url, body });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...body,
        access_token: accessToken
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Facebook API error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log(`✅ Action executed successfully. New name: ${body.name || 'unchanged'}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error executing action:', error);
    return { success: false, error: error.message };
  }
}

function getActionDescription(actionType: string): string {
  const descriptions: Record<string, string> = {
    pause: 'Pausado',
    pause_campaign: 'Campanha Pausada',
    pause_adset: 'Conjunto Pausado',
    pause_ad: 'Anúncio Pausado',
    activate: 'Ativado',
    activate_campaign: 'Campanha Ativada',
    activate_adset: 'Conjunto Ativado',
    activate_ad: 'Anúncio Ativado',
    adjust_budget: 'Budget Ajustado',
    increase_budget: 'Budget Aumentado',
    decrease_budget: 'Budget Reduzido',
    duplicate_campaign: 'Campanha Duplicada',
    duplicate_adset: 'Conjunto Duplicado',
    duplicate_ad: 'Anúncio Duplicado',
  };
  return descriptions[actionType] || actionType;
}
