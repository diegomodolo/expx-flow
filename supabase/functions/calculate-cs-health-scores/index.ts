import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('[CS Health Score Calculator] Starting health score calculation...');

  try {
    // Get all active clients with their health configs
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        company,
        company_id,
        is_paused,
        is_canceled,
        client_health_config (
          target_roas,
          target_cpl,
          nps_score,
          nps_collected_at,
          last_cs_contact_at,
          onboarding_status
        )
      `)
      .eq('is_canceled', false);

    if (clientsError) {
      console.error('[CS Health Score Calculator] Error fetching clients:', clientsError);
      throw clientsError;
    }

    console.log(`[CS Health Score Calculator] Processing ${clients?.length || 0} clients`);

    const results = [];

    for (const client of clients || []) {
      if (!client.company_id) continue;

      const healthConfig = client.client_health_config?.[0];

      // Get campaign metrics for this client (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('spend, conversions, cpa')
        .eq('client_id', client.id)
        .eq('is_active', true);

      const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
      const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
      const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

      // Calculate Financial Score (40 points max)
      let financialScore = 0;
      const targetCpa = healthConfig?.target_cpl || 50;
      
      if (totalConversions > 0) {
        if (avgCpa <= targetCpa) {
          financialScore = 40;
        } else if (avgCpa <= targetCpa * 1.25) {
          financialScore = 30;
        } else if (avgCpa <= targetCpa * 2) {
          financialScore = 15;
        }
      }

      // Calculate Operational Score (30 points max)
      let operationalScore = 0;
      const onboardingStatus = healthConfig?.onboarding_status || 'pending';
      
      if (onboardingStatus === 'completed') {
        operationalScore += 15;
      } else if (onboardingStatus === 'in_progress') {
        operationalScore += 7;
      }

      // Active campaigns bonus
      if (campaigns && campaigns.length > 0) {
        operationalScore += 15;
      }

      // Calculate Relational Score (30 points max)
      let relationalScore = 0;
      const npsScore = healthConfig?.nps_score;
      
      if (npsScore !== null && npsScore !== undefined) {
        if (npsScore >= 9) {
          relationalScore += 15;
        } else if (npsScore >= 7) {
          relationalScore += 10;
        }
      }

      // CS Contact bonus
      const lastContactAt = healthConfig?.last_cs_contact_at;
      if (lastContactAt) {
        const daysSinceContact = Math.floor((Date.now() - new Date(lastContactAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceContact <= 7) {
          relationalScore += 10;
        } else if (daysSinceContact <= 14) {
          relationalScore += 5;
        }
      }

      // Get QBR status
      const { data: qbrReports } = await supabase
        .from('qbr_reports')
        .select('presented_at')
        .eq('client_id', client.id)
        .eq('status', 'presented')
        .order('presented_at', { ascending: false })
        .limit(1);

      if (qbrReports && qbrReports.length > 0) {
        const lastQbr = qbrReports[0].presented_at;
        if (lastQbr) {
          const daysSinceQbr = Math.floor((Date.now() - new Date(lastQbr).getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceQbr <= 90) {
            relationalScore += 5;
          }
        }
      }

      const totalScore = financialScore + operationalScore + relationalScore;

      // Determine churn risk level
      let churnRiskLevel = 'low';
      if (totalScore < 40) {
        churnRiskLevel = 'critical';
      } else if (totalScore < 60) {
        churnRiskLevel = 'high';
      } else if (totalScore < 75) {
        churnRiskLevel = 'medium';
      }

      // Update or create health config
      const { error: upsertError } = await supabase
        .from('client_health_config')
        .upsert({
          client_id: client.id,
          company_id: client.company_id,
          health_score_financial: financialScore,
          health_score_operational: operationalScore,
          health_score_relational: relationalScore,
          health_score_total: totalScore,
          churn_risk_level: churnRiskLevel,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'client_id' });

      if (upsertError) {
        console.error(`[CS Health Score Calculator] Error updating client ${client.id}:`, upsertError);
      } else {
        results.push({
          clientId: client.id,
          clientName: client.name,
          financialScore,
          operationalScore,
          relationalScore,
          totalScore,
          churnRiskLevel,
        });
      }

      // Create alert if client is at risk
      if (churnRiskLevel === 'critical' || churnRiskLevel === 'high') {
        await supabase
          .from('system_alerts')
          .upsert({
            company_id: client.company_id,
            client_id: client.id,
            alert_type: 'cs_churn_risk',
            severity: churnRiskLevel === 'critical' ? 'critical' : 'warning',
            title: `Cliente em risco de churn: ${client.name}`,
            message: `O Health Score do cliente ${client.name} está em ${totalScore}%. Requer atenção imediata.`,
            details: { financialScore, operationalScore, relationalScore, totalScore },
            related_entity_type: 'client',
            related_entity_id: client.id,
            is_read: false,
            is_resolved: false,
          }, { onConflict: 'company_id,client_id,alert_type' });
      }
    }

    console.log(`[CS Health Score Calculator] Updated ${results.length} clients`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CS Health Score Calculator] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
