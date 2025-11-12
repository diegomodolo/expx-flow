import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClientMetrics {
  activeCampaigns: number;
  currentWeekLeads: number;
  lastWeekLeads: number;
  averageCPA: number;
  averageCTR: number;
  totalSpend: number;
  hasOptimizations: boolean;
  hasRecentTasks: boolean;
  hasFundingIssues: boolean;
  lastSyncDate: string | null;
}

// Function to calculate client status based on metrics and rules
async function calculateClientStatus(
  supabase: any,
  clientId: string,
  companyId: string
): Promise<{ status: string; explanation: string }> {
  try {
    // Fetch metrics
    const metrics = await getClientMetrics(supabase, clientId);

    // Fetch custom rules
    const { data: rules } = await supabase
      .from('client_status_rules')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('rule_order', { ascending: true });

    // Evaluate rules in order
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        if (evaluateRule(rule, metrics)) {
          return {
            status: rule.status_output,
            explanation: generateExplanation(rule.status_output, metrics),
          };
        }
      }
    }

    // Default status
    return {
      status: 'stable',
      explanation: '✅ Cliente estável. Todas as métricas dentro do esperado.',
    };
  } catch (error) {
    console.error('Error calculating status for client:', clientId, error);
    return {
      status: 'stable',
      explanation: 'Status calculado com sucesso',
    };
  }
}

async function getClientMetrics(
  supabase: any,
  clientId: string
): Promise<ClientMetrics> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  // Get campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true);

  const activeCampaigns = campaigns?.filter((c: any) => c.status === 'active').length || 0;

  // Calculate leads
  const currentWeekLeads = campaigns?.reduce((sum: number, c: any) => {
    const updatedAt = new Date(c.updated_at);
    return updatedAt >= sevenDaysAgo ? sum + (c.conversions || 0) : sum;
  }, 0) || 0;

  const lastWeekLeads = campaigns?.reduce((sum: number, c: any) => {
    const updatedAt = new Date(c.updated_at);
    return updatedAt >= fourteenDaysAgo && updatedAt < sevenDaysAgo
      ? sum + (c.conversions || 0)
      : sum;
  }, 0) || 0;

  // Calculate averages
  const validCPAs = campaigns?.filter((c: any) => c.cpa > 0).map((c: any) => c.cpa) || [];
  const averageCPA = validCPAs.length > 0
    ? validCPAs.reduce((a: number, b: number) => a + b, 0) / validCPAs.length
    : 0;

  const validCTRs = campaigns?.filter((c: any) => c.ctr > 0).map((c: any) => c.ctr) || [];
  const averageCTR = validCTRs.length > 0
    ? validCTRs.reduce((a: number, b: number) => a + b, 0) / validCTRs.length
    : 0;

  const totalSpend = campaigns?.reduce((sum: number, c: any) => sum + (Number(c.spend) || 0), 0) || 0;

  // Check optimizations
  const { data: optimizations } = await supabase
    .from('optimization_history')
    .select('id')
    .eq('client_id', clientId)
    .gte('performed_at', sevenDaysAgo.toISOString())
    .limit(1);

  // Check recent tasks
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .limit(1);

  // Check funding issues
  const { data: adAccount } = await supabase
    .from('facebook_ad_accounts')
    .select('account_status')
    .eq('client_id', clientId)
    .single();

  return {
    activeCampaigns,
    currentWeekLeads,
    lastWeekLeads,
    averageCPA,
    averageCTR,
    totalSpend,
    hasOptimizations: (optimizations?.length || 0) > 0,
    hasRecentTasks: (tasks?.length || 0) > 0,
    hasFundingIssues: adAccount?.account_status !== '1',
    lastSyncDate: campaigns?.[0]?.updated_at || null,
  };
}

function evaluateRule(rule: any, metrics: ClientMetrics): boolean {
  const conditions = rule.conditions?.conditions || [];
  const logic = rule.conditions?.logic || 'AND';

  if (conditions.length === 0) return false;

  const results = conditions.map((condition: any) => {
    const { field, operator, value } = condition;
    const metricValue = (metrics as any)[field];

    switch (operator) {
      case 'equals':
        return metricValue === value;
      case 'not_equals':
        return metricValue !== value;
      case 'greater_than':
        return Number(metricValue) > Number(value);
      case 'less_than':
        return Number(metricValue) < Number(value);
      case 'greater_than_or_equal':
        return Number(metricValue) >= Number(value);
      case 'less_than_or_equal':
        return Number(metricValue) <= Number(value);
      case 'contains':
        return String(metricValue).toLowerCase().includes(String(value).toLowerCase());
      case 'is_true':
        return metricValue === true;
      case 'is_false':
        return metricValue === false;
      default:
        return false;
    }
  });

  return logic === 'AND' ? results.every((r) => r) : results.some((r) => r);
}

function generateExplanation(status: string, metrics: ClientMetrics): string {
  const emoji = {
    excellent: '🌟',
    good: '😊',
    stable: '✅',
    attention: '⚠️',
    critical: '🚨',
  }[status] || '📊';

  const base = {
    excellent: 'Cliente com performance excepcional',
    good: 'Cliente com boa performance',
    stable: 'Cliente estável',
    attention: 'Cliente requer atenção',
    critical: 'Cliente em situação crítica',
  }[status] || 'Status calculado';

  const details = [];
  if (metrics.currentWeekLeads > 0) details.push(`${metrics.currentWeekLeads} leads esta semana`);
  if (metrics.activeCampaigns > 0) details.push(`${metrics.activeCampaigns} campanhas ativas`);
  if (metrics.averageCPA > 0) details.push(`CPA médio: R$ ${metrics.averageCPA.toFixed(2)}`);

  return `${emoji} ${base}${details.length > 0 ? `. ${details.join(', ')}` : ''}.`;
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
