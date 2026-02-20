// Deno.serve is available natively in modern Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      token, 
      reporter_name, 
      lead_received_date, 
      disqualification_reason, 
      additional_notes, 
      conversation_link, 
      evidence_file_url 
    } = await req.json();

    console.log('Processing lead disqualification report:', { token, reporter_name, disqualification_reason });

    // Validar token primeiro
    const { data: tokenData, error: tokenError } = await supabase
      .from('lead_disqualification_tokens')
      .select('id, client_id, company_id')
      .eq('token', token)
      .single();

    if (tokenError || !tokenData) {
      console.error('Token validation error:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Token não encontrado',
          details: tokenError?.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar dados do cliente separadamente
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name, email')
      .eq('id', tokenData.client_id)
      .single();

    if (clientError || !clientData) {
      console.error('Client data error:', clientError);
      return new Response(
        JSON.stringify({ 
          error: 'Cliente não encontrado',
          details: clientError?.message 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Token and client data loaded successfully:', { 
      tokenId: tokenData.id, 
      clientId: tokenData.client_id,
      clientName: clientData.name 
    });

    // evidence_file_url já vem processado do frontend

    // Criar o report
    const { data: reportData, error: reportError } = await supabase
      .from('lead_disqualification_reports')
      .insert({
        client_id: tokenData.client_id,
        company_id: tokenData.company_id,
        token_id: tokenData.id,
        reporter_name,
        lead_received_date,
        disqualification_reason,
        additional_notes,
        evidence_file_url,
        conversation_link
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error creating report:', reportError);
      throw reportError;
    }

    // Criar entrada no histórico do cliente (se tiver tabela de histórico)
    try {
      // Assumindo que existe uma tabela de histórico ou notas do cliente
      await supabase.from('client_notes').insert({
        client_id: tokenData.client_id,
        company_id: tokenData.company_id,
        user_id: '00000000-0000-0000-0000-000000000000', // Sistema
        content: `Lead Desqualificado Reportado - ${reporter_name} reportou motivo: ${disqualification_reason}. Observações: ${additional_notes || 'Nenhuma'}`
      });
    } catch (historyError) {
      console.error('Error creating history entry:', historyError);
      // Não falha o processo principal
    }

    console.log('Report created successfully:', reportData.id);

    // ── Fase 3: Notificar usuários da empresa sobre o novo lead desqualificado ──
    try {
      // Buscar todos os membros da empresa para notificar
      const { data: members } = await supabase
        .from('company_members')
        .select('user_id')
        .eq('company_id', tokenData.company_id);

      if (members && members.length > 0) {
        const notifications = members.map((m: { user_id: string }) => ({
          company_id: tokenData.company_id,
          user_id: m.user_id,
          type: 'lead_disqualified',
          title: `Lead desqualificado — ${clientData.name}`,
          body: `Motivo: ${disqualification_reason}. Reportado por: ${reporter_name}`,
          priority: 'high',
          action_url: `/leads-desqualificados`,
          action_metadata: {
            report_id: reportData.id,
            client_id: tokenData.client_id,
          },
          source_type: 'lead_report',
          source_id: reportData.id,
        }));

        const { error: notifError } = await supabase
          .from('user_notifications')
          .insert(notifications);

        if (notifError) {
          console.error('Error inserting notifications:', notifError);
        } else {
          console.log(`Notified ${notifications.length} users about new lead disqualification`);
        }
      }
    } catch (notifErr) {
      console.error('Error creating notifications:', notifErr);
      // Não falha o processo principal
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: reportData.id,
        message: 'Report enviado com sucesso! Obrigado pelo feedback.'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in process-lead-disqualification-report function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor. Tente novamente mais tarde.',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});