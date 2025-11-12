import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientMetrics {
  current_week_leads: number;
  previous_week_leads: number;
  leads_last_7_days: number;
  leads_last_30_days: number;
  average_cpl: number;
  average_ctr: number;
  average_cpa: number;
  current_week_cpa: number;
  current_week_spend: number;
  active_campaigns_count: number;
  recent_campaigns_count: number;
  days_since_last_optimization: number;
  lead_drop_percentage: number;
  has_funding_issues: boolean;
  has_quality_issues: boolean;
  has_reproved_ads: boolean;
  account_balance: number;
  account_status: number;
  days_without_changes: number;
  manual_inactive_status: boolean;
}

// Function to calculate client status based on metrics and rules
async function calculateClientStatus(
  supabase: any,
  clientId: string,
  companyId: string
): Promise<{ status: string; explanation: string }> {
  try {
    // Fetch metrics
    const metrics = await getClientMetrics(supabase, clientId, companyId);

    // Fetch custom rules
    const { data: rules } = await supabase
      .from('client_status_rules')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('rule_order', { ascending: true });

    console.log(`[Client ${clientId}] Found ${rules?.length || 0} rules to evaluate`);

    // Evaluate rules in order
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        const ruleMatched = evaluateRule(rule, metrics);
        console.log(`[Client ${clientId}] Rule "${rule.rule_name}" (${rule.status_output}): ${ruleMatched ? 'MATCHED ✓' : 'not matched'}`);
        
        if (ruleMatched) {
          const result = {
            status: rule.status_output,
            explanation: generateExplanation(rule.status_output, metrics, rule.rule_name),
          };
          console.log(`[Client ${clientId}] Final status: ${result.status}`);
          return result;
        }
      }
    }

    // Default status
    console.log(`[Client ${clientId}] No rules matched, using default status: atencao`);
    return {
      status: 'atencao',
      explanation: generateExplanation('atencao', metrics, 'Nenhuma regra correspondente'),
    };
  } catch (error) {
    console.error('Error calculating status for client:', clientId, error);
    return {
      status: 'atencao',
      explanation: '⚠️ Erro ao calcular status. Requer análise manual.',
    };
  }
}

async function getClientMetrics(
  supabase: any,
  clientId: string,
  companyId: string
): Promise<ClientMetrics> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch client data including funding and manual status
  const { data: clientData } = await supabase
    .from('clients')
    .select(`
      status,
      inactive_reason,
      facebook_ad_accounts!ad_account_id (
        balance,
        account_status,
        has_funding_issues,
        disable_reason
      )
    `)
    .eq('id', clientId)
    .maybeSingle();

  // Fetch campaigns data
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', clientId)
    .eq('company_id', companyId);

  // Fetch ads data for quality rankings
  const { data: ads } = await supabase
    .from('ads')
    .select('quality_ranking, engagement_rate_ranking, conversion_rate_ranking, status')
    .eq('client_id', clientId)
    .eq('company_id', companyId);

  // Fetch last optimization
  const { data: lastOptimization } = await supabase
    .from('optimization_history')
    .select('performed_at')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('performed_at', { ascending: false })
    .limit(1);

  const { data: lastChange } = await supabase
    .from('change_audit_log')
    .select('created_at')
    .eq('client_id', clientId)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1);

  // Extract funding information
  const adAccount = clientData?.facebook_ad_accounts?.[0];
  const hasFundingIssues = adAccount ? (
    adAccount.account_status !== 1 || 
    adAccount.balance <= 0 || 
    adAccount.has_funding_issues ||
    (adAccount.disable_reason && adAccount.disable_reason.toLowerCase().includes('funding'))
  ) : false;
  const accountBalance = adAccount?.balance || 0;
  const accountStatus = adAccount?.account_status || 0;

  // Extract manual status
  const manualInactiveStatus = clientData?.status === 'red' && !!clientData?.inactive_reason;

  if (!campaigns) {
    return {
      current_week_leads: 0,
      previous_week_leads: 0,
      leads_last_7_days: 0,
      leads_last_30_days: 0,
      average_cpl: 0,
      average_ctr: 0,
      average_cpa: 0,
      current_week_cpa: 0,
      current_week_spend: 0,
      active_campaigns_count: 0,
      recent_campaigns_count: 0,
      days_since_last_optimization: 999,
      lead_drop_percentage: 0,
      has_funding_issues: hasFundingIssues,
      has_quality_issues: false,
      has_reproved_ads: false,
      account_balance: accountBalance,
      account_status: accountStatus,
      days_without_changes: 999,
      manual_inactive_status: manualInactiveStatus,
    };
  }

  // Calculate metrics
  const activeCampaigns = campaigns.filter((c: any) => 
    c.is_active && c.status === 'active' && new Date(c.updated_at) >= sevenDaysAgo
  );

  const recentCampaigns = campaigns.filter((c: any) => 
    new Date(c.updated_at) >= thirtyDaysAgo
  );

  const currentWeekLeads = campaigns
    .filter((c: any) => new Date(c.updated_at) >= sevenDaysAgo)
    .reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);

  const previousWeekLeads = campaigns
    .filter((c: any) => new Date(c.updated_at) >= fourteenDaysAgo && new Date(c.updated_at) < sevenDaysAgo)
    .reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);

  const leads30Days = campaigns
    .filter((c: any) => new Date(c.updated_at) >= thirtyDaysAgo)
    .reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);

  const totalCTR = activeCampaigns.reduce((sum: number, c: any) => sum + (c.ctr || 0), 0);
  const averageCTR = activeCampaigns.length > 0 ? totalCTR / activeCampaigns.length : 0;

  const currentWeekSpend = campaigns
    .filter((c: any) => new Date(c.updated_at) >= sevenDaysAgo)
    .reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
  
  const currentWeekCPA = currentWeekLeads > 0 ? currentWeekSpend / currentWeekLeads : 0;

  const lastOptimizationDate = lastOptimization?.[0]?.performed_at 
    ? new Date(lastOptimization[0].performed_at)
    : lastChange?.[0]?.created_at 
    ? new Date(lastChange[0].created_at)
    : null;

  const daysSinceLastOptimization = lastOptimizationDate 
    ? Math.floor((now.getTime() - lastOptimizationDate.getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  const hasQualityIssues = ads?.some((ad: any) => 
    ad.quality_ranking === 'BELOW_AVERAGE' || 
    ad.engagement_rate_ranking === 'BELOW_AVERAGE' ||
    ad.conversion_rate_ranking === 'BELOW_AVERAGE'
  ) || false;

  const hasReprovedAds = ads?.some((ad: any) => ad.status === 'disapproved') || false;

  const leadDropPercentage = previousWeekLeads > 0 
    ? ((previousWeekLeads - currentWeekLeads) / previousWeekLeads) * 100 
    : 0;

  console.log(`[Client ${clientId}] Metrics calculated:`, {
    current_week_leads: currentWeekLeads,
    active_campaigns_count: activeCampaigns.length,
    current_week_cpa: currentWeekCPA,
    has_funding_issues: hasFundingIssues,
    lead_drop_percentage: leadDropPercentage,
  });

  return {
    current_week_leads: currentWeekLeads,
    previous_week_leads: previousWeekLeads,
    leads_last_7_days: currentWeekLeads,
    leads_last_30_days: leads30Days,
    average_cpl: 0,
    average_ctr: averageCTR,
    average_cpa: 0,
    current_week_cpa: currentWeekCPA,
    current_week_spend: currentWeekSpend,
    active_campaigns_count: activeCampaigns.length,
    recent_campaigns_count: recentCampaigns.length,
    days_since_last_optimization: daysSinceLastOptimization,
    lead_drop_percentage: leadDropPercentage,
    has_funding_issues: hasFundingIssues,
    has_quality_issues: hasQualityIssues,
    has_reproved_ads: hasReprovedAds,
    account_balance: accountBalance,
    account_status: accountStatus,
    days_without_changes: daysSinceLastOptimization,
    manual_inactive_status: manualInactiveStatus,
  };
}

function evaluateRule(rule: any, metrics: ClientMetrics): boolean {
  const { conditions } = rule.conditions;
  const logic = rule.conditions.logic;
  
  if (!conditions || conditions.length === 0) return false;

  const results = conditions.map((condition: any) => {
    const value = (metrics as any)[condition.field];
    
    switch (condition.operator) {
      case '<': return Number(value) < Number(condition.value);
      case '>': return Number(value) > Number(condition.value);
      case '<=': return Number(value) <= Number(condition.value);
      case '>=': return Number(value) >= Number(condition.value);
      case '=': 
        if (condition.type === 'boolean') {
          return Boolean(value) === Boolean(condition.value);
        }
        return value === condition.value;
      case '!=': return value !== condition.value;
      default: return false;
    }
  });
  
  return logic === 'AND' 
    ? results.every((r: boolean) => r === true)
    : results.some((r: boolean) => r === true);
}

function generateExplanation(status: string, metrics: ClientMetrics, ruleName?: string): string {
  const statusEmojis: Record<string, string> = {
    sem_fundos: '💳',
    inativo: '⚫',
    emergencial: '🚨',
    atencao: '⚠️',
    excelente: '✅'
  };

  const emoji = statusEmojis[status] || 'ℹ️';
  const baseExplanations: Record<string, string> = {
    sem_fundos: 'Conta sem fundos suficientes para rodar anúncios',
    inativo: 'Cliente inativo há mais de 30 dias',
    emergencial: 'Situação crítica! Cliente precisa de atenção urgente',
    atencao: 'Cliente requer monitoramento',
    excelente: 'Performance excelente! Cliente em ótimo estado'
  };

  let explanation = `${emoji} ${baseExplanations[status] || 'Status calculado baseado em regras customizadas'}`;
  
  if (ruleName) {
    explanation += `\n\nRegra aplicada: ${ruleName}`;
  }
  
  // Add relevant metrics
  explanation += `\n\nMétricas principais:`;
  if (metrics.current_week_leads !== undefined) {
    explanation += `\n• Leads esta semana: ${metrics.current_week_leads}`;
  }
  if (metrics.previous_week_leads !== undefined) {
    explanation += `\n• Leads semana anterior: ${metrics.previous_week_leads}`;
  }
  if (metrics.average_ctr !== undefined) {
    explanation += `\n• CTR médio: ${metrics.average_ctr.toFixed(2)}%`;
  }
  if (metrics.current_week_cpa !== undefined && metrics.current_week_cpa > 0) {
    explanation += `\n• CPA esta semana: R$ ${metrics.current_week_cpa.toFixed(2)}`;
  }
  if (metrics.active_campaigns_count !== undefined) {
    explanation += `\n• Campanhas ativas: ${metrics.active_campaigns_count}`;
  }
  if (metrics.days_since_last_optimization !== undefined && metrics.days_since_last_optimization < 999) {
    explanation += `\n• Última otimização: há ${metrics.days_since_last_optimization} dias`;
  }
  
  // Special flags
  if (metrics.has_funding_issues) {
    explanation += `\n\n⚠️ Problema de fundos detectado`;
  }
  if (metrics.has_reproved_ads) {
    explanation += `\n⚠️ Anúncios reprovados detectados`;
  }
  if (metrics.has_quality_issues) {
    explanation += `\n⚠️ Problemas de qualidade detectados`;
  }
  if (metrics.manual_inactive_status) {
    explanation += `\n⚠️ Cliente marcado como inativo manualmente`;
  }

  return explanation;
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId } = await req.json();

    console.log('Recalculating client statuses for company:', companyId);

    // Fetch all clients for the company
    const { data: clients, error: clientsError } = await supabaseClient
      .from('clients')
      .select('id, company_id')
      .eq('company_id', companyId);

    if (clientsError) {
      throw new Error(`Failed to fetch clients: ${clientsError.message}`);
    }

    console.log(`Found ${clients?.length || 0} clients to recalculate`);

    let successCount = 0;
    let errorCount = 0;

    // Recalculate status for each client
    for (const client of clients || []) {
      try {
        const { status, explanation } = await calculateClientStatus(
          supabaseClient,
          client.id,
          client.company_id
        );

        // Update client with calculated status
        const { error: updateError } = await supabaseClient
          .from('clients')
          .update({
            calculated_status: status,
            status_explanation: explanation,
            status_calculated_at: new Date().toISOString(),
          })
          .eq('id', client.id);

        if (updateError) {
          console.error(`Error updating client ${client.id}:`, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing client ${client.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Recalculation complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        totalClients: clients?.length || 0,
        successCount,
        errorCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in recalculate-client-statuses:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
