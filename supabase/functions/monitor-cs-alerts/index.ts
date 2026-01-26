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

  console.log('[CS Alerts Monitor] Starting CS alerts check...');

  try {
    const alerts = [];

    // 1. Check for QBR overdue (> 85 days without presentation)
    const { data: allClients } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        company_id,
        qbr_reports (
          id,
          presented_at,
          status
        )
      `)
      .eq('is_canceled', false);

    for (const client of allClients || []) {
      if (!client.company_id) continue;

      const presentedQbrs = client.qbr_reports?.filter((q: any) => q.status === 'presented') || [];
      const lastPresented = presentedQbrs.sort((a: any, b: any) => 
        new Date(b.presented_at).getTime() - new Date(a.presented_at).getTime()
      )[0];

      let daysSinceQbr = 999;
      if (lastPresented?.presented_at) {
        daysSinceQbr = Math.floor((Date.now() - new Date(lastPresented.presented_at).getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysSinceQbr > 85) {
        const { error } = await supabase
          .from('system_alerts')
          .upsert({
            company_id: client.company_id,
            client_id: client.id,
            alert_type: 'cs_qbr_overdue',
            severity: 'warning',
            title: `QBR atrasado: ${client.name}`,
            message: daysSinceQbr === 999 
              ? `Nenhum QBR foi apresentado para ${client.name}. Agende uma reunião estratégica.`
              : `Faz ${daysSinceQbr} dias que não apresentamos QBR para ${client.name}.`,
            details: { daysSinceQbr },
            related_entity_type: 'client',
            related_entity_id: client.id,
            is_read: false,
            is_resolved: false,
          }, { onConflict: 'company_id,client_id,alert_type' });

        if (!error) {
          alerts.push({ type: 'qbr_overdue', clientId: client.id, clientName: client.name, daysSinceQbr });
        }
      }
    }

    // 2. Check for NPS detractors without follow-up
    const { data: npsDetractors } = await supabase
      .from('client_nps_responses')
      .select(`
        id,
        client_id,
        company_id,
        score,
        follow_up_done,
        responded_at,
        clients (name)
      `)
      .lte('score', 6)
      .eq('follow_up_done', false);

    for (const nps of npsDetractors || []) {
      const { error } = await supabase
        .from('system_alerts')
        .upsert({
          company_id: nps.company_id,
          client_id: nps.client_id,
          alert_type: 'cs_nps_detractor',
          severity: 'critical',
          title: `Detrator NPS: ${(nps.clients as any)?.name}`,
          message: `Cliente ${(nps.clients as any)?.name} deu nota ${nps.score} no NPS. Requer ação de recuperação urgente.`,
          details: { npsScore: nps.score, respondedAt: nps.responded_at },
          related_entity_type: 'nps_response',
          related_entity_id: nps.id,
          is_read: false,
          is_resolved: false,
        }, { onConflict: 'company_id,client_id,alert_type' });

      if (!error) {
        alerts.push({ type: 'nps_detractor', clientId: nps.client_id, score: nps.score });
      }
    }

    // 3. Check for clients with no contact in 14+ days
    const { data: healthConfigs } = await supabase
      .from('client_health_config')
      .select(`
        id,
        client_id,
        company_id,
        last_cs_contact_at,
        clients (name)
      `);

    for (const config of healthConfigs || []) {
      const lastContact = config.last_cs_contact_at;
      let daysSinceContact = 999;

      if (lastContact) {
        daysSinceContact = Math.floor((Date.now() - new Date(lastContact).getTime()) / (1000 * 60 * 60 * 24));
      }

      if (daysSinceContact > 14) {
        const { error } = await supabase
          .from('system_alerts')
          .upsert({
            company_id: config.company_id,
            client_id: config.client_id,
            alert_type: 'cs_no_contact',
            severity: 'warning',
            title: `Sem contato: ${(config.clients as any)?.name}`,
            message: daysSinceContact === 999
              ? `Nenhum contato registrado com ${(config.clients as any)?.name}. Entre em contato.`
              : `Faz ${daysSinceContact} dias sem contato com ${(config.clients as any)?.name}.`,
            details: { daysSinceContact },
            related_entity_type: 'client',
            related_entity_id: config.client_id,
            is_read: false,
            is_resolved: false,
          }, { onConflict: 'company_id,client_id,alert_type' });

        if (!error) {
          alerts.push({ type: 'no_contact', clientId: config.client_id, daysSinceContact });
        }
      }
    }

    console.log(`[CS Alerts Monitor] Created/updated ${alerts.length} alerts`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsProcessed: alerts.length,
        alerts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[CS Alerts Monitor] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
