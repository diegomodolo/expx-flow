import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { instanceId } = await req.json();

    if (!instanceId) {
      return new Response(JSON.stringify({ error: 'Instance ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get instance
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .maybeSingle();

    if (instanceError || !instance) {
      console.error('Instance not found:', instanceError);
      return new Response(JSON.stringify({ error: 'Instance not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get the global config for this company (contains the UazapiGO base URL)
    const { data: config, error: configError } = await supabase
      .from('whatsapp_configs')
      .select('*')
      .eq('company_id', instance.company_id)
      .maybeSingle();

    // Use uazapi_endpoint from config, or fallback to a default pattern if needed
    const baseUrl = config?.uazapi_endpoint?.replace(/\/$/, '');
    const apiToken = instance.uazapi_token;

    if (!baseUrl || !apiToken) {
      console.error('Missing config:', { baseUrl: !!baseUrl, apiToken: !!apiToken });
      return new Response(JSON.stringify({ error: 'Instance not configured properly' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch quick replies from UazapiGO
    const response = await fetch(`${baseUrl}/quickreply/showall`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apitoken': apiToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UazapiGO error:', errorText);
      return new Response(JSON.stringify({ error: 'Failed to fetch quick replies', details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const quickReplies = await response.json();
    console.log('Quick replies fetched:', quickReplies?.length || 0);

    return new Response(JSON.stringify({ quickReplies: quickReplies || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching quick replies:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
