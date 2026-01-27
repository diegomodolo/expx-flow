import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const { company_id } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Importing URLs for company: ${company_id}`);

    // Get all active campaigns with their ads
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select(`
        id,
        client_id,
        name,
        status,
        ads!inner(
          id,
          link_url,
          status
        )
      `)
      .eq('company_id', company_id)
      .eq('is_active', true)
      .in('status', ['ACTIVE', 'active', 'PAUSED', 'paused']);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`Found ${campaigns?.length || 0} active campaigns`);

    // Extract unique URLs per client
    const urlsByClient: Map<string, Set<string>> = new Map();

    for (const campaign of campaigns || []) {
      const clientId = campaign.client_id;
      
      if (!urlsByClient.has(clientId)) {
        urlsByClient.set(clientId, new Set());
      }

      for (const ad of (campaign.ads || [])) {
        if (ad.link_url && ad.link_url.trim()) {
          // Normalize URL
          let url = ad.link_url.trim();
          // Remove tracking parameters for comparison
          try {
            const urlObj = new URL(url);
            // Keep the base URL for comparison
            const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
            urlsByClient.get(clientId)!.add(url);
          } catch {
            // If URL parsing fails, add as-is
            urlsByClient.get(clientId)!.add(url);
          }
        }
      }
    }

    // Get existing URLs for the company
    const { data: existingUrls, error: existingError } = await supabase
      .from('client_urls')
      .select('url, client_id')
      .eq('company_id', company_id);

    if (existingError) {
      console.error('Error fetching existing URLs:', existingError);
      throw existingError;
    }

    // Create a set of existing URL+client combinations
    const existingSet = new Set(
      (existingUrls || []).map(u => `${u.client_id}:${u.url}`)
    );

    // Prepare new URLs to insert
    const newUrls: any[] = [];

    for (const [clientId, urls] of urlsByClient) {
      for (const url of urls) {
        const key = `${clientId}:${url}`;
        if (!existingSet.has(key)) {
          // Extract domain
          let domain = '';
          try {
            domain = new URL(url).hostname;
          } catch {
            domain = url;
          }

          newUrls.push({
            client_id: clientId,
            company_id: company_id,
            url: url,
            domain: domain,
            source: 'meta_sync',
            is_active: true,
            validation_status: 'pending',
          });
        }
      }
    }

    console.log(`Found ${newUrls.length} new URLs to import`);

    // Insert new URLs
    if (newUrls.length > 0) {
      const { error: insertError } = await supabase
        .from('client_urls')
        .insert(newUrls);

      if (insertError) {
        console.error('Error inserting URLs:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported: newUrls.length,
        scanned_campaigns: campaigns?.length || 0,
        message: newUrls.length > 0 
          ? `${newUrls.length} novas URLs importadas de ${campaigns?.length || 0} campanhas`
          : 'Nenhuma nova URL encontrada'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in import-campaign-urls:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

