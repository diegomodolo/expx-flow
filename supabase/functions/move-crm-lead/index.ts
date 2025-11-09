import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { leadId, toStageId, workspaceToken, fromStageId } = await req.json();

    console.log('[move-crm-lead] Moving lead:', { leadId, fromStageId, toStageId });

    // Buscar lead e workspace
    const { data: lead, error: leadError } = await supabase
      .from('crm_leads')
      .select(`
        *,
        workspace:crm_workspaces!inner(
          id,
          client_id,
          company_id,
          access_token
        )
      `)
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      console.error('[move-crm-lead] Lead not found:', leadError);
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar token do workspace
    if (lead.workspace.access_token !== workspaceToken) {
      return new Response(JSON.stringify({ error: 'Invalid workspace token' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar estágio de destino
    const { data: toStage, error: stageError } = await supabase
      .from('crm_stages')
      .select('*')
      .eq('id', toStageId)
      .single();

    if (stageError || !toStage) {
      console.error('[move-crm-lead] Stage not found:', stageError);
      return new Response(JSON.stringify({ error: 'Stage not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[move-crm-lead] Moving to stage:', toStage.name, 'Event:', toStage.event_mapping);

    let conversionId = null;

    // Se o estágio tem evento mapeado, enviar conversão
    if (toStage.event_mapping) {
      console.log('[move-crm-lead] Sending offline conversion for event:', toStage.event_mapping);

      const nameParts = lead.full_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const conversionPayload = {
        clientId: lead.workspace.client_id,
        leadId: lead.external_id || lead.id,
        eventName: toStage.event_mapping,
        userData: {
          email: lead.email,
          phone: lead.phone,
          firstName,
          lastName,
        },
        customData: {
          pipeline_stage: toStage.name,
          crm_source: 'Mini CRM',
          company_name: lead.company_name,
        },
      };

      // Adicionar value se for Purchase
      if (toStage.event_mapping === 'Purchase' && lead.value) {
        conversionPayload['value'] = lead.value;
        conversionPayload['currency'] = 'BRL';
      }

      // Adicionar disqualification_reason se for LeadDisqualified
      if (toStage.event_mapping === 'LeadDisqualified' && lead.disqualification_reason) {
        conversionPayload.customData['disqualification_reason'] = lead.disqualification_reason;
      }

      try {
        const conversionResponse = await supabase.functions.invoke('send-offline-conversion', {
          body: conversionPayload,
        });

        if (conversionResponse.error) {
          console.error('[move-crm-lead] Error calling send-offline-conversion:', conversionResponse.error);
        } else if (conversionResponse.data?.conversionId) {
          conversionId = conversionResponse.data.conversionId;
          console.log('[move-crm-lead] Conversion sent successfully:', conversionId);
        }
      } catch (error) {
        console.error('[move-crm-lead] Exception calling send-offline-conversion:', error);
      }
    }

    // Preparar updates do lead
    const leadUpdates: any = {
      stage_id: toStageId,
      updated_at: new Date().toISOString(),
    };

    // Se a stage tem status configurado, atualizar o lead
    if (toStage.auto_status_change && toStage.target_status) {
      leadUpdates.status = toStage.target_status;
      console.log('[move-crm-lead] Auto-updating lead status to:', toStage.target_status);
    }

    // Atualizar lead
    const { error: updateError } = await supabase
      .from('crm_leads')
      .update(leadUpdates)
      .eq('id', leadId);

    if (updateError) {
      console.error('[move-crm-lead] Error updating lead:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update lead' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar atividade
    const { error: activityError } = await supabase.from('crm_lead_activities').insert({
      lead_id: leadId,
      activity_type: 'stage_change',
      from_stage_id: fromStageId,
      to_stage_id: toStageId,
      event_sent: !!conversionId,
      conversion_id: conversionId,
      notes: toStage.event_mapping ? `Evento ${toStage.event_mapping} enviado ao Meta` : null,
      is_manual: false,
    });

    if (activityError) {
      console.error('[move-crm-lead] Error creating activity:', activityError);
    }

    console.log('[move-crm-lead] Lead moved successfully');

    return new Response(JSON.stringify({ 
      success: true,
      eventSent: !!conversionId,
      eventName: toStage.event_mapping,
      stageName: toStage.name,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[move-crm-lead] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
