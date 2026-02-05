import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      .select('id, company_id, is_active, uazapi_token')
      .eq('id', instanceId)
      .eq('is_active', true)
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
      .select('uazapi_endpoint, is_active, provider')
      .eq('company_id', instance.company_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error('Config query error:', configError);
    }

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
        // UazapiGO expects `token` header (same as other endpoints already used in this project)
        'token': apiToken
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UazapiGO error:', errorText);
      
      // If "No session", return empty array instead of error (instance not connected)
      if (errorText.includes('No session')) {
        console.log('Instance has no active session, returning empty quick replies');
        return new Response(JSON.stringify({ quickReplies: [], noSession: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
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
