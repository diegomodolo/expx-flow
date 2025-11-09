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

    // Obter autorização
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { clientId } = await req.json();

    console.log('[create-crm-workspace] Creating workspace for client:', clientId);

    // Verificar se o workspace já existe
    const { data: existingWorkspace } = await supabase
      .from('crm_workspaces')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (existingWorkspace) {
      console.log('[create-crm-workspace] Workspace already exists');
      return new Response(JSON.stringify({
        success: true,
        workspace: existingWorkspace,
        accessUrl: `${req.headers.get('origin')}/crm/${existingWorkspace.access_token}`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar company_id do cliente
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('company_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('[create-crm-workspace] Client not found:', clientError);
      return new Response(JSON.stringify({ error: 'Client not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Gerar token único usando a função do banco
    const { data: tokenData, error: tokenError } = await supabase.rpc('generate_crm_access_token');

    if (tokenError) {
      console.error('[create-crm-workspace] Error generating token:', tokenError);
      return new Response(JSON.stringify({ error: 'Failed to generate token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = tokenData;

    // Criar workspace
    const { data: workspace, error: workspaceError } = await supabase
      .from('crm_workspaces')
      .insert({
        client_id: clientId,
        company_id: client.company_id,
        access_token: accessToken,
        created_by: user.id,
      })
      .select()
      .single();

    if (workspaceError) {
      console.error('[create-crm-workspace] Error creating workspace:', workspaceError);
      return new Response(JSON.stringify({ error: 'Failed to create workspace' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create-crm-workspace] Workspace created:', workspace.id);

    // Criar estágios padrão
    const defaultStages = [
      { name: 'Lead Criado', event_mapping: 'Lead', order_index: 1, color: '#3B82F6' },
      { name: 'Lead Qualificado', event_mapping: 'LeadQualified', order_index: 2, color: '#10B981' },
      { name: 'Reunião Agendada', event_mapping: 'MeetingScheduled', order_index: 3, color: '#8B5CF6' },
      { name: 'Proposta Enviada', event_mapping: 'ProposalSent', order_index: 4, color: '#6366F1' },
      { name: 'Compra Realizada', event_mapping: 'Purchase', order_index: 5, color: '#059669' },
      { name: 'Lead Desqualificado', event_mapping: 'LeadDisqualified', order_index: 6, color: '#EF4444' },
    ];

    const { error: stagesError } = await supabase.from('crm_stages').insert(
      defaultStages.map(stage => ({ ...stage, workspace_id: workspace.id }))
    );

    if (stagesError) {
      console.error('[create-crm-workspace] Error creating stages:', stagesError);
      // Não falhar se os estágios não forem criados
    }

    console.log('[create-crm-workspace] Default stages created');

    return new Response(JSON.stringify({
      success: true,
      workspace,
      accessUrl: `${req.headers.get('origin')}/crm/${accessToken}`,
      token: accessToken,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[create-crm-workspace] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
