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

    // Fetch ALL Facebook pages the user manages (with pagination)
    let allPagesData: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,category,instagram_business_account&limit=100&access_token=${accessToken}`;

    while (nextUrl) {
      console.log(`Fetching pages batch... (current total: ${allPagesData.length})`);
      
      const pagesResponse = await fetch(nextUrl);

      if (!pagesResponse.ok) {
        const error = await pagesResponse.json();
        console.error('Facebook API error:', error);
        return new Response(
          JSON.stringify({ success: false, error: error.error?.message || 'Failed to fetch pages' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const pagesData = await pagesResponse.json();
      const batchPages = pagesData.data || [];
      console.log(`Received ${batchPages.length} pages in this batch`);
      
      allPagesData = allPagesData.concat(batchPages);
      
      // Check if there's a next page
      nextUrl = pagesData.paging?.next || null;
      
      if (nextUrl) {
        console.log('More pages available, fetching next batch...');
      }
    }

    console.log(`Found ${allPagesData.length} Facebook pages total`);

    const pages = [];
    const instagramAccounts = [];
    const processedInstagramIds = new Set<string>();

    // Process Facebook Pages and their linked Instagram accounts
    for (const page of allPagesData) {
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
            console.log(`Found Instagram account via page: @${igData.username}`);

            // Insert/update Instagram account (source: page)
            const { data: igAccount, error: igError } = await supabase
              .from('instagram_accounts')
              .upsert({
                facebook_page_id: fbPage.id,
                company_id: companyId,
                instagram_id: igData.id,
                username: igData.username,
                profile_picture_url: igData.profile_picture_url,
                followers_count: igData.followers_count || 0,
                source: 'page',
                business_id: null,
                is_active: true,
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'company_id,instagram_id'
              })
              .select()
              .single();

            if (!igError && igAccount) {
              instagramAccounts.push(igAccount);
              processedInstagramIds.add(igData.id);
            }
          }
        } catch (igError) {
          console.error('Error fetching Instagram account from page:', igError);
        }
      }
    }

    // ========================================
    // NEW: Fetch Instagram accounts directly from Business Manager
    // ========================================
    console.log('Fetching Business Managers...');
    
    try {
      const businessesResponse = await fetch(
        `https://graph.facebook.com/v20.0/me/businesses?fields=id,name&limit=100&access_token=${accessToken}`
      );

      if (businessesResponse.ok) {
        const businessesData = await businessesResponse.json();
        const businesses = businessesData.data || [];
        console.log(`Found ${businesses.length} Business Manager(s)`);

        for (const business of businesses) {
          console.log(`Processing Business Manager: ${business.name} (${business.id})`);

          // Fetch owned_instagram_accounts (accounts the BM owns)
          try {
            let ownedIgUrl: string | null = `https://graph.facebook.com/v20.0/${business.id}/owned_instagram_accounts?fields=id,username,profile_picture_url,followers_count&limit=100&access_token=${accessToken}`;
            
            while (ownedIgUrl) {
              const ownedIgResponse = await fetch(ownedIgUrl);
              
              if (ownedIgResponse.ok) {
                const ownedIgData = await ownedIgResponse.json();
                const ownedAccounts = ownedIgData.data || [];
                console.log(`Found ${ownedAccounts.length} owned Instagram account(s) in BM ${business.name}`);

                for (const igData of ownedAccounts) {
                  // Skip if already processed via page
                  if (processedInstagramIds.has(igData.id)) {
                    console.log(`Instagram @${igData.username} already processed via page, skipping...`);
                    continue;
                  }

                  console.log(`Found Instagram account via Business Manager: @${igData.username}`);

                  const { data: igAccount, error: igError } = await supabase
                    .from('instagram_accounts')
                    .upsert({
                      facebook_page_id: null,
                      company_id: companyId,
                      instagram_id: igData.id,
                      username: igData.username,
                      profile_picture_url: igData.profile_picture_url,
                      followers_count: igData.followers_count || 0,
                      source: 'business_manager',
                      business_id: business.id,
                      is_active: true,
                      updated_at: new Date().toISOString(),
                    }, {
                      onConflict: 'company_id,instagram_id'
                    })
                    .select()
                    .single();

                  if (!igError && igAccount) {
                    instagramAccounts.push(igAccount);
                    processedInstagramIds.add(igData.id);
                  } else if (igError) {
                    console.error('Error saving Instagram account from BM:', igError);
                  }
                }

                ownedIgUrl = ownedIgData.paging?.next || null;
              } else {
                const errorData = await ownedIgResponse.json();
                console.log(`Could not fetch owned_instagram_accounts for BM ${business.id}:`, errorData.error?.message);
                break;
              }
            }
          } catch (ownedError) {
            console.error(`Error fetching owned Instagram accounts for BM ${business.id}:`, ownedError);
          }

          // Fetch instagram_accounts (accounts the BM has access to, but may not own)
          try {
            let sharedIgUrl: string | null = `https://graph.facebook.com/v20.0/${business.id}/instagram_accounts?fields=id,username,profile_picture_url,followers_count&limit=100&access_token=${accessToken}`;
            
            while (sharedIgUrl) {
              const sharedIgResponse = await fetch(sharedIgUrl);
              
              if (sharedIgResponse.ok) {
                const sharedIgData = await sharedIgResponse.json();
                const sharedAccounts = sharedIgData.data || [];
                console.log(`Found ${sharedAccounts.length} shared Instagram account(s) in BM ${business.name}`);

                for (const igData of sharedAccounts) {
                  // Skip if already processed
                  if (processedInstagramIds.has(igData.id)) {
                    console.log(`Instagram @${igData.username} already processed, skipping...`);
                    continue;
                  }

                  console.log(`Found Instagram account via Business Manager (shared): @${igData.username}`);

                  const { data: igAccount, error: igError } = await supabase
                    .from('instagram_accounts')
                    .upsert({
                      facebook_page_id: null,
                      company_id: companyId,
                      instagram_id: igData.id,
                      username: igData.username,
                      profile_picture_url: igData.profile_picture_url,
                      followers_count: igData.followers_count || 0,
                      source: 'business_manager',
                      business_id: business.id,
                      is_active: true,
                      updated_at: new Date().toISOString(),
                    }, {
                      onConflict: 'company_id,instagram_id'
                    })
                    .select()
                    .single();

                  if (!igError && igAccount) {
                    instagramAccounts.push(igAccount);
                    processedInstagramIds.add(igData.id);
                  } else if (igError) {
                    console.error('Error saving shared Instagram account from BM:', igError);
                  }
                }

                sharedIgUrl = sharedIgData.paging?.next || null;
              } else {
                const errorData = await sharedIgResponse.json();
                console.log(`Could not fetch instagram_accounts for BM ${business.id}:`, errorData.error?.message);
                break;
              }
            }
          } catch (sharedError) {
            console.error(`Error fetching shared Instagram accounts for BM ${business.id}:`, sharedError);
          }
        }
      } else {
        const errorData = await businessesResponse.json();
        console.log('Could not fetch Business Managers:', errorData.error?.message);
      }
    } catch (businessError) {
      console.error('Error fetching Business Managers:', businessError);
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