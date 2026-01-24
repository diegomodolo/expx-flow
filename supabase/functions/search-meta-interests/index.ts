import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { clientId, query } = await req.json();

    if (!clientId || !query) {
      return new Response(
        JSON.stringify({ error: 'clientId and query are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching interests for client ${clientId}: "${query}"`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client's Facebook access token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('ad_account_id, company_id')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Facebook access token from company
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('facebook_access_token')
      .eq('id', client.company_id)
      .single();

    if (companyError || !company?.facebook_access_token) {
      console.error('No Facebook access token found');
      return new Response(
        JSON.stringify({ error: 'Facebook access token not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = company.facebook_access_token;

    // Search interests via Meta Marketing API
    const searchUrl = new URL('https://graph.facebook.com/v21.0/search');
    searchUrl.searchParams.append('type', 'adinterest');
    searchUrl.searchParams.append('q', query);
    searchUrl.searchParams.append('limit', '25');
    searchUrl.searchParams.append('access_token', accessToken);

    console.log('Searching Meta interests...');

    const response = await fetch(searchUrl.toString());
    const data = await response.json();

    if (data.error) {
      console.error('Meta API error:', data.error);
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map response to our interest format
    const interests = (data.data || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      audience_size_lower_bound: item.audience_size_lower_bound,
      audience_size_upper_bound: item.audience_size_upper_bound,
      path: item.path || [],
    }));

    console.log(`Found ${interests.length} interests`);

    return new Response(
      JSON.stringify({ interests }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error searching interests:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
