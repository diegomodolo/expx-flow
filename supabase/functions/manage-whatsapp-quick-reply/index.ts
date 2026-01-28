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

    const { instanceId, action, quickReply } = await req.json();

    if (!instanceId) {
      return new Response(JSON.stringify({ error: 'Instance ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!action || !['create', 'update', 'delete'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Valid action is required (create, update, delete)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!quickReply || !quickReply.shortCut || !quickReply.type) {
      return new Response(JSON.stringify({ error: 'Quick reply shortCut and type are required' }), {
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

    // Build request body based on action
    const body: Record<string, any> = {
      shortCut: quickReply.shortCut,
      type: quickReply.type
    };

    if (action === 'update' || action === 'delete') {
      if (!quickReply.id) {
        return new Response(JSON.stringify({ error: 'Quick reply ID is required for update/delete' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      body.id = quickReply.id;
    }

    if (action === 'delete') {
      body.delete = true;
    } else {
      // For create and update, include content fields
      if (quickReply.type === 'text') {
        body.text = quickReply.text || '';
      } else {
        // Media types: audio, myaudio, ptt, document, video, image
        if (quickReply.file) {
          body.file = quickReply.file;
        }
        if (quickReply.docName) {
          body.docName = quickReply.docName;
        }
        if (quickReply.text) {
          body.text = quickReply.text;
        }
      }
    }

    console.log('Managing quick reply:', { action, body: { ...body, file: body.file ? '[FILE]' : undefined } });

    // Call UazapiGO API
    const response = await fetch(`${baseUrl}/quickreply/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // UazapiGO expects `token` header (same as other endpoints already used in this project)
        'token': apiToken
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    if (!response.ok) {
      console.error('UazapiGO error:', responseText);
      return new Response(JSON.stringify({ 
        error: 'Failed to manage quick reply', 
        details: result 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Quick reply managed successfully:', result);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error managing quick reply:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
