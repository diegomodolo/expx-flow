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
    const { integrationId, companyId } = await req.json();

    if (!integrationId || !companyId) {
      return new Response(
        JSON.stringify({ success: false, error: 'integrationId and companyId are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Fetching Facebook pages for integration ${integrationId}`);

    // Get integration with access token
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('company_id', companyId)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ success: false, error: 'Integration not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const accessToken = integration.access_token;

    // Fetch Facebook pages the user manages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category,instagram_business_account&access_token=${accessToken}`
    );

    if (!pagesResponse.ok) {
      const error = await pagesResponse.json();
      console.error('Facebook API error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.error?.message || 'Failed to fetch pages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const pagesData = await pagesResponse.json();
    console.log(`Found ${pagesData.data?.length || 0} Facebook pages`);

    const pages = [];
    const instagramAccounts = [];

    for (const page of pagesData.data || []) {
      // Insert/update Facebook page
      const { data: fbPage, error: pageError } = await supabase
        .from('facebook_pages')
        .upsert({
          integration_id: integrationId,
          company_id: companyId,
          page_id: page.id,
          page_name: page.name,
          page_access_token: page.access_token,
          page_category: page.category,
          instagram_business_account_id: page.instagram_business_account?.id || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'integration_id,page_id'
        })
        .select()
        .single();

      if (pageError) {
        console.error('Error saving page:', pageError);
        continue;
      }

      pages.push(fbPage);

      // If page has Instagram Business Account, fetch its details
      if (page.instagram_business_account?.id) {
        try {
          const igResponse = await fetch(
            `https://graph.facebook.com/v20.0/${page.instagram_business_account.id}?fields=id,username,profile_picture_url,followers_count&access_token=${page.access_token}`
          );

          if (igResponse.ok) {
            const igData = await igResponse.json();
            console.log(`Found Instagram account: @${igData.username}`);

            // Insert/update Instagram account
            const { data: igAccount, error: igError } = await supabase
              .from('instagram_accounts')
              .upsert({
                facebook_page_id: fbPage.id,
                company_id: companyId,
                instagram_id: igData.id,
                username: igData.username,
                profile_picture_url: igData.profile_picture_url,
                followers_count: igData.followers_count || 0,
                is_active: true,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'facebook_page_id,instagram_id'
              })
              .select()
              .single();

            if (!igError && igAccount) {
              instagramAccounts.push(igAccount);
            }
          }
        } catch (igError) {
          console.error('Error fetching Instagram account:', igError);
        }
      }
    }

    console.log(`Successfully saved ${pages.length} pages and ${instagramAccounts.length} Instagram accounts`);

    return new Response(
      JSON.stringify({
        success: true,
        pages,
        instagramAccounts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in fetch-facebook-pages:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
