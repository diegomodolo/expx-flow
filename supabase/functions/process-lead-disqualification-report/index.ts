import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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