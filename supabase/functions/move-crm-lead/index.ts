// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento de temperatura PT -> EN
const temperatureMap: Record<string, string> = {
  'frio': 'cold',
  'morno': 'warm',
  'quente': 'hot',
};

Deno.serve(async (req) => {
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

    // Se a stage tem temperatura configurada, atualizar o lead
    if (toStage.auto_temperature_change && toStage.target_temperature) {
      // Converter temperatura de português para inglês
      const temperatureEN = temperatureMap[toStage.target_temperature] || toStage.target_temperature;
      leadUpdates.temperature = temperatureEN;
      console.log('[move-crm-lead] Auto-updating lead temperature to:', temperatureEN, '(from:', toStage.target_temperature + ')');
    }

    // Preparar atividades a serem registradas
    const activities = [
      {
        lead_id: leadId,
        activity_type: 'stage_change',
        from_stage_id: fromStageId,
        to_stage_id: toStageId,
        event_sent: !!conversionId,
        conversion_id: conversionId,
        notes: toStage.event_mapping ? `Evento ${toStage.event_mapping} enviado ao Meta` : null,
        is_manual: false,
      }
    ];

    // Adicionar atividade de mudança de temperatura se aplicável
    if (toStage.auto_temperature_change && toStage.target_temperature) {
      activities.push({
        lead_id: leadId,
        activity_type: 'temperature_change',
        from_stage_id: null,
        to_stage_id: null,
        event_sent: false,
        conversion_id: null,
        notes: `Temperatura alterada automaticamente para ${toStage.target_temperature}`,
        is_manual: false,
      });
    }

    // Executar operações em paralelo para melhor performance
    const [updateResult, activityResult] = await Promise.all([
      // Atualizar lead
      supabase
        .from('crm_leads')
        .update(leadUpdates)
        .eq('id', leadId),
      
      // Registrar atividades
      supabase.from('crm_lead_activities').insert(activities),
    ]);

    if (updateResult.error) {
      console.error('[move-crm-lead] Error updating lead:', updateResult.error);
      return new Response(JSON.stringify({ error: 'Failed to update lead' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (activityResult.error) {
      console.error('[move-crm-lead] Error creating activity:', activityResult.error);
    }

    // === WORKFLOW: Verificar se deve duplicar lead ===
    if (toStage.workflow_enabled && toStage.workflow_target_stage_id) {
      console.log('[move-crm-lead] Workflow enabled, duplicating lead...');
      
      try {
        // Buscar stage de destino com info do board
        const { data: targetStage, error: targetStageError } = await supabase
          .from('crm_stages')
          .select(`
            id,
            name,
            board_id,
            workspace_id,
            board:crm_boards!crm_stages_board_id_fkey(
              id,
              name
            )
          `)
          .eq('id', toStage.workflow_target_stage_id)
          .single();
        
        if (targetStageError || !targetStage) {
          console.error('[move-crm-lead] Target stage not found:', targetStageError);
        } else {
          // Criar cópia do lead
          const leadCopy = {
            workspace_id: targetStage.workspace_id,
            stage_id: targetStage.id,
            full_name: lead.full_name,
            email: lead.email,
            phone: lead.phone,
            company_name: lead.company_name,
            status: lead.status,
            temperature: lead.temperature,
            value: lead.value,
            external_id: `${lead.external_id || lead.id}_copy_${Date.now()}`,
            facebook: lead.facebook,
            instagram: lead.instagram,
            website: lead.website,
            city: lead.city,
            state: lead.state,
            utm_source: lead.utm_source,
            utm_media: lead.utm_media,
            utm_campaign: lead.utm_campaign,
            start_date: lead.start_date,
            expected_close_date: lead.expected_close_date,
            quantity: lead.quantity,
            notes: lead.notes,
            responsible_id: lead.responsible_id,
            workflow_id: lead.workflow_id,
          };
          
          const { data: newLead, error: createError } = await supabase
            .from('crm_leads')
            .insert(leadCopy)
            .select()
            .single();
          
          if (createError) {
            console.error('[move-crm-lead] Error creating lead copy:', createError);
          } else {
            console.log('[move-crm-lead] Lead duplicated successfully:', newLead.id);
            
            // Criar vínculo entre leads (garantir ordem)
            const [leadA, leadB] = [leadId, newLead.id].sort();
            const { error: linkError } = await supabase
              .from('crm_lead_links')
              .insert({
                lead_a_id: leadA,
                lead_b_id: leadB,
                created_by: null,
              });
            
            if (linkError) {
              console.error('[move-crm-lead] Error creating lead link:', linkError);
            }
            
            // Registrar atividades em paralelo
            await Promise.all([
              supabase.from('crm_lead_activities').insert({
                lead_id: leadId,
                activity_type: 'workflow_duplicate',
                notes: `Lead duplicado para ${targetStage.board.name} → ${targetStage.name}`,
                is_manual: false,
              }),
              supabase.from('crm_lead_activities').insert({
                lead_id: newLead.id,
                activity_type: 'workflow_created',
                notes: `Criado automaticamente por workflow vindo de ${toStage.name}`,
                is_manual: false,
              }),
            ]);
            
            console.log('[move-crm-lead] Workflow completed successfully');
          }
        }
      } catch (workflowError) {
        console.error('[move-crm-lead] Workflow error:', workflowError);
        // Não falhar a movimentação principal se o workflow falhar
      }
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
