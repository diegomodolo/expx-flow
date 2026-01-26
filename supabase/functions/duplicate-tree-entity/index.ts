import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DuplicateRequest {
  entityType: "campaign" | "adset" | "ad";
  entityId: string;
  clientId: string;
  facebookId: string;
  newName: string;
}

interface ClientData {
  company_id: string;
  ad_account_id: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;
    console.log("Authenticated user:", userId);

    const body: DuplicateRequest = await req.json();
    const { entityType, entityId, clientId, facebookId, newName } = body;

    console.log(`Duplicating ${entityType} with facebookId: ${facebookId}, newName: ${newName}`);

    // Fetch client's company_id and ad_account_id
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("company_id, ad_account_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client?.company_id) {
      console.error("Client error:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Meta access token from facebook_integrations
    const { data: integration, error: integrationError } = await supabaseClient
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", client.company_id)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error("Integration error:", integrationError);
      return new Response(
        JSON.stringify({ success: false, error: "Token do Meta não encontrado. Configure a integração com o Facebook." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ad account ID from facebook_ad_accounts
    let adAccountId = null;
    if (client.ad_account_id) {
      const { data: adAccount, error: adAccountError } = await supabaseClient
        .from("facebook_ad_accounts")
        .select("account_id")
        .eq("id", client.ad_account_id)
        .single();

      if (!adAccountError && adAccount?.account_id) {
        // Remove "act_" prefix if present
        adAccountId = adAccount.account_id.replace("act_", "");
      }
    }

    const accessToken = integration.access_token;
    const companyId = client.company_id;

    let result;

    switch (entityType) {
      case "campaign":
        result = await duplicateCampaign(
          facebookId, newName, accessToken, supabaseClient, 
          clientId, userId, companyId
        );
        break;
      case "adset":
        result = await duplicateAdSet(
          facebookId, newName, accessToken, supabaseClient, 
          clientId, userId, companyId, entityId
        );
        break;
      case "ad":
        result = await duplicateAd(
          facebookId, newName, adAccountId, accessToken, supabaseClient,
          clientId, userId, companyId, entityId
        );
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Tipo de entidade inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully duplicated ${entityType}:`, result);

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in duplicate-tree-entity:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function duplicateCampaign(
  facebookId: string, 
  newName: string, 
  accessToken: string,
  supabaseClient: SupabaseClient,
  clientId: string,
  userId: string,
  companyId: string
) {
  try {
    // Use the Meta API copies endpoint for campaigns
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${facebookId}/copies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deep_copy: true,
          rename_options: JSON.stringify({ rename_suffix: "" }),
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta API error duplicating campaign:", data.error);
      return { success: false, error: data.error.message };
    }

    const copiedCampaignId = data.copied_campaign_id;
    if (!copiedCampaignId) {
      return { success: false, error: "Meta não retornou o ID da campanha copiada" };
    }

    // Update the name of the copied campaign
    await fetch(
      `https://graph.facebook.com/v20.0/${copiedCampaignId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          access_token: accessToken,
        }),
      }
    );

    // Fetch campaign data from Meta
    const campaignDataResponse = await fetch(
      `https://graph.facebook.com/v20.0/${copiedCampaignId}?fields=id,name,status,daily_budget,lifetime_budget,objective,created_time&access_token=${accessToken}`
    );
    const campaignData = await campaignDataResponse.json();
    console.log("Fetched campaign data:", campaignData);

    // Insert campaign into local database
    const { data: insertedCampaign, error: insertError } = await supabaseClient
      .from("campaigns")
      .insert({
        facebook_id: copiedCampaignId,
        client_id: clientId,
        user_id: userId,
        company_id: companyId,
        name: newName,
        status: "paused",
        platforms: "Facebook Ads",
        period: "monthly",
        daily_budget: campaignData.daily_budget ? parseInt(campaignData.daily_budget) / 100 : null,
        lifetime_budget: campaignData.lifetime_budget ? parseInt(campaignData.lifetime_budget) / 100 : null,
        objective: campaignData.objective || null,
        is_active: true,
        ctr: 0,
        cpc: 0,
        cpa: 0,
        conversions: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        frequency: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting campaign:", insertError);
      // Campaign was created on Meta, but we couldn't insert locally - still return success
    } else {
      console.log("Inserted campaign:", insertedCampaign);
    }

    // Fetch ad sets from the copied campaign
    const adSetsResponse = await fetch(
      `https://graph.facebook.com/v20.0/${copiedCampaignId}/adsets?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,bid_strategy&access_token=${accessToken}`
    );
    const adSetsData = await adSetsResponse.json();
    console.log("Fetched ad sets:", adSetsData);

    if (adSetsData.data && insertedCampaign) {
      for (const adSet of adSetsData.data) {
        // Insert each ad set
        const { data: insertedAdSet, error: adSetError } = await supabaseClient
          .from("ad_sets")
          .insert({
            facebook_id: adSet.id,
            campaign_id: insertedCampaign.id,
            client_id: clientId,
            user_id: userId,
            company_id: companyId,
            name: adSet.name,
            status: adSet.status?.toLowerCase() || "paused",
            daily_budget: adSet.daily_budget ? parseInt(adSet.daily_budget) / 100 : null,
            lifetime_budget: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) / 100 : null,
            targeting: adSet.targeting ? JSON.stringify(adSet.targeting) : null,
            optimization_goal: adSet.optimization_goal || null,
            bid_strategy: adSet.bid_strategy || null,
            is_active: true,
            ctr: 0,
            cpc: 0,
            cpm: 0,
            cpa: 0,
            conversions: 0,
            spend: 0,
            impressions: 0,
            clicks: 0,
            reach: 0,
            frequency: 0,
          })
          .select()
          .single();

        if (adSetError) {
          console.error("Error inserting ad set:", adSetError);
          continue;
        }

        console.log("Inserted ad set:", insertedAdSet);

        // Fetch ads from this ad set
        const adsResponse = await fetch(
          `https://graph.facebook.com/v20.0/${adSet.id}/ads?fields=id,name,status,creative{id,name,body,title,image_url,video_id}&access_token=${accessToken}`
        );
        const adsData = await adsResponse.json();
        console.log("Fetched ads for ad set:", adsData);

        if (adsData.data && insertedAdSet) {
          for (const ad of adsData.data) {
            const { error: adError } = await supabaseClient
              .from("ads")
              .insert({
                facebook_id: ad.id,
                ad_set_id: insertedAdSet.id,
                campaign_id: insertedCampaign.id,
                client_id: clientId,
                user_id: userId,
                company_id: companyId,
                name: ad.name,
                status: ad.status?.toLowerCase() || "paused",
                creative_body: ad.creative?.body || null,
                creative_title: ad.creative?.title || null,
                image_url: ad.creative?.image_url || null,
                is_active: true,
                ctr: 0,
                cpc: 0,
                cpm: 0,
                cpa: 0,
                conversions: 0,
                spend: 0,
                impressions: 0,
                clicks: 0,
                reach: 0,
                frequency: 0,
              });

            if (adError) {
              console.error("Error inserting ad:", adError);
            }
          }
        }
      }
    }

    return { 
      success: true, 
      data: { 
        copiedId: copiedCampaignId,
        insertedCampaign: insertedCampaign 
      } 
    };
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return { success: false, error: error.message };
  }
}

async function duplicateAdSet(
  facebookId: string, 
  newName: string, 
  accessToken: string,
  supabaseClient: SupabaseClient,
  clientId: string,
  userId: string,
  companyId: string,
  originalEntityId: string
) {
  try {
    // First, get the original ad set to find its campaign_id
    const { data: originalAdSet, error: originalError } = await supabaseClient
      .from("ad_sets")
      .select("campaign_id")
      .eq("id", originalEntityId)
      .single();

    if (originalError || !originalAdSet) {
      console.error("Error fetching original ad set:", originalError);
      return { success: false, error: "Ad set original não encontrado no banco local" };
    }

    // Use the Meta API copies endpoint for ad sets
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${facebookId}/copies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deep_copy: true,
          rename_options: JSON.stringify({ rename_suffix: "" }),
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta API error duplicating ad set:", data.error);
      return { success: false, error: data.error.message };
    }

    const copiedAdSetId = data.copied_adset_id;
    if (!copiedAdSetId) {
      return { success: false, error: "Meta não retornou o ID do conjunto copiado" };
    }

    // Update the name of the copied ad set
    await fetch(
      `https://graph.facebook.com/v20.0/${copiedAdSetId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          access_token: accessToken,
        }),
      }
    );

    // Fetch ad set data from Meta
    const adSetDataResponse = await fetch(
      `https://graph.facebook.com/v20.0/${copiedAdSetId}?fields=id,name,status,daily_budget,lifetime_budget,targeting,optimization_goal,bid_strategy&access_token=${accessToken}`
    );
    const adSetData = await adSetDataResponse.json();
    console.log("Fetched ad set data:", adSetData);

    // Insert ad set into local database
    const { data: insertedAdSet, error: insertError } = await supabaseClient
      .from("ad_sets")
      .insert({
        facebook_id: copiedAdSetId,
        campaign_id: originalAdSet.campaign_id,
        client_id: clientId,
        user_id: userId,
        company_id: companyId,
        name: newName,
        status: "paused",
        daily_budget: adSetData.daily_budget ? parseInt(adSetData.daily_budget) / 100 : null,
        lifetime_budget: adSetData.lifetime_budget ? parseInt(adSetData.lifetime_budget) / 100 : null,
        targeting: adSetData.targeting ? JSON.stringify(adSetData.targeting) : null,
        optimization_goal: adSetData.optimization_goal || null,
        bid_strategy: adSetData.bid_strategy || null,
        is_active: true,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpa: 0,
        conversions: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        frequency: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting ad set:", insertError);
    } else {
      console.log("Inserted ad set:", insertedAdSet);
    }

    // Fetch ads from the copied ad set
    const adsResponse = await fetch(
      `https://graph.facebook.com/v20.0/${copiedAdSetId}/ads?fields=id,name,status,creative{id,name,body,title,image_url,video_id}&access_token=${accessToken}`
    );
    const adsData = await adsResponse.json();
    console.log("Fetched ads:", adsData);

    if (adsData.data && insertedAdSet) {
      for (const ad of adsData.data) {
        const { error: adError } = await supabaseClient
          .from("ads")
          .insert({
            facebook_id: ad.id,
            ad_set_id: insertedAdSet.id,
            campaign_id: originalAdSet.campaign_id,
            client_id: clientId,
            user_id: userId,
            company_id: companyId,
            name: ad.name,
            status: ad.status?.toLowerCase() || "paused",
            creative_body: ad.creative?.body || null,
            creative_title: ad.creative?.title || null,
            image_url: ad.creative?.image_url || null,
            is_active: true,
            ctr: 0,
            cpc: 0,
            cpm: 0,
            cpa: 0,
            conversions: 0,
            spend: 0,
            impressions: 0,
            clicks: 0,
            reach: 0,
            frequency: 0,
          });

        if (adError) {
          console.error("Error inserting ad:", adError);
        }
      }
    }

    return { 
      success: true, 
      data: { 
        copiedId: copiedAdSetId,
        insertedAdSet: insertedAdSet 
      } 
    };
  } catch (error) {
    console.error("Error duplicating ad set:", error);
    return { success: false, error: error.message };
  }
}

async function duplicateAd(
  facebookId: string, 
  newName: string, 
  adAccountId: string, 
  accessToken: string,
  supabaseClient: SupabaseClient,
  clientId: string,
  userId: string,
  companyId: string,
  originalEntityId: string
) {
  try {
    // First, get the original ad to find its campaign_id and ad_set_id
    const { data: originalAd, error: originalError } = await supabaseClient
      .from("ads")
      .select("campaign_id, ad_set_id")
      .eq("id", originalEntityId)
      .single();

    if (originalError || !originalAd) {
      console.error("Error fetching original ad:", originalError);
      return { success: false, error: "Anúncio original não encontrado no banco local" };
    }

    // Fetch the original ad's data from Meta
    const getResponse = await fetch(
      `https://graph.facebook.com/v20.0/${facebookId}?fields=name,adset_id,creative{id,name,body,title,image_url,video_id},status&access_token=${accessToken}`
    );

    const originalMetaAd = await getResponse.json();

    if (originalMetaAd.error) {
      console.error("Meta API error fetching ad:", originalMetaAd.error);
      return { success: false, error: originalMetaAd.error.message };
    }

    console.log("Original ad data:", originalMetaAd);

    // Create a new ad with the same creative
    const createResponse = await fetch(
      `https://graph.facebook.com/v20.0/act_${adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          adset_id: originalMetaAd.adset_id,
          creative: { creative_id: originalMetaAd.creative?.id },
          status: "PAUSED",
          access_token: accessToken,
        }),
      }
    );

    const newAd = await createResponse.json();

    if (newAd.error) {
      console.error("Meta API error creating ad:", newAd.error);
      return { success: false, error: newAd.error.message };
    }

    const copiedAdId = newAd.id;
    console.log("Created new ad with ID:", copiedAdId);

    // Insert ad into local database
    const { data: insertedAd, error: insertError } = await supabaseClient
      .from("ads")
      .insert({
        facebook_id: copiedAdId,
        ad_set_id: originalAd.ad_set_id,
        campaign_id: originalAd.campaign_id,
        client_id: clientId,
        user_id: userId,
        company_id: companyId,
        name: newName,
        status: "paused",
        creative_body: originalMetaAd.creative?.body || null,
        creative_title: originalMetaAd.creative?.title || null,
        image_url: originalMetaAd.creative?.image_url || null,
        is_active: true,
        ctr: 0,
        cpc: 0,
        cpm: 0,
        cpa: 0,
        conversions: 0,
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        frequency: 0,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting ad:", insertError);
    } else {
      console.log("Inserted ad:", insertedAd);
    }

    return { 
      success: true, 
      data: { 
        copiedId: copiedAdId,
        insertedAd: insertedAd 
      } 
    };
  } catch (error) {
    console.error("Error duplicating ad:", error);
    return { success: false, error: error.message };
  }
}
