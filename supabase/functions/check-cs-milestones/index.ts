import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Milestone trigger conditions
const milestoneConditions = {
  first_campaign: async (supabase: any, clientId: string) => {
    const { data } = await supabase
      .from('campaigns')
      .select('id')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .limit(1);
    return data && data.length > 0;
  },
  first_lead: async (supabase: any, clientId: string) => {
    const { data } = await supabase
      .from('campaigns')
      .select('conversions')
      .eq('client_id', clientId);
    const totalConversions = data?.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0) || 0;
    return totalConversions >= 1;
  },
  monthly_goal: async (supabase: any, clientId: string) => {
    // Check if client reached monthly goal (simplified: check if ROAS > 2)
    const { data } = await supabase
      .from('campaigns')
      .select('spend, conversions')
      .eq('client_id', clientId)
      .eq('is_active', true);
    
    const totalSpend = data?.reduce((sum: number, c: any) => sum + (c.spend || 0), 0) || 0;
    const totalConversions = data?.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0) || 0;
    
    // Assuming average ticket of R$100 for ROI calculation
    const estimatedReturn = totalConversions * 100;
    const roas = totalSpend > 0 ? estimatedReturn / totalSpend : 0;
    
    return roas >= 2;
  },
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('[CS Milestone Checker] Starting milestone trigger check...');

  try {
    const triggeredMilestones = [];

    // Get all pending milestones grouped by client
    const { data: milestones, error: milestonesError } = await supabase
      .from('client_milestones')
      .select(`
        id,
        client_id,
        company_id,
        milestone_type,
        title,
        status,
        clients (name)
      `)
      .eq('status', 'pending');

    if (milestonesError) {
      console.error('[CS Milestone Checker] Error fetching milestones:', milestonesError);
      throw milestonesError;
    }

    console.log(`[CS Milestone Checker] Checking ${milestones?.length || 0} pending milestones`);

    for (const milestone of milestones || []) {
      const conditionFn = milestoneConditions[milestone.milestone_type as keyof typeof milestoneConditions];
      
      if (!conditionFn) {
        console.log(`[CS Milestone Checker] No condition defined for milestone type: ${milestone.milestone_type}`);
        continue;
      }

      try {
        const conditionMet = await conditionFn(supabase, milestone.client_id);

        if (conditionMet) {
          console.log(`[CS Milestone Checker] Milestone triggered: ${milestone.title} for client ${milestone.client_id}`);

          // Update milestone status to completed
          const { error: updateError } = await supabase
            .from('client_milestones')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', milestone.id);

          if (!updateError) {
            triggeredMilestones.push({
              milestoneId: milestone.id,
              milestoneType: milestone.milestone_type,
              clientId: milestone.client_id,
              clientName: (milestone.clients as any)?.name,
              title: milestone.title,
            });

            // Create a system alert for the CS team
            await supabase
              .from('system_alerts')
              .insert({
                company_id: milestone.company_id,
                client_id: milestone.client_id,
                alert_type: 'cs_milestone_completed',
                severity: 'info',
                title: `🎉 Milestone alcançado: ${milestone.title}`,
                message: `O cliente ${(milestone.clients as any)?.name} alcançou o milestone "${milestone.title}". Considere enviar uma celebração!`,
                details: { milestoneId: milestone.id, milestoneType: milestone.milestone_type },
                related_entity_type: 'milestone',
                related_entity_id: milestone.id,
                is_read: false,
                is_resolved: false,
              });
          }
        }
      } catch (conditionError) {
        console.error(`[CS Milestone Checker] Error checking condition for milestone ${milestone.id}:`, conditionError);
      }
    }

    console.log(`[CS Milestone Checker] Triggered ${triggeredMilestones.length} milestones`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        triggeredCount: triggeredMilestones.length,
        milestones: triggeredMilestones 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CS Milestone Checker] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
