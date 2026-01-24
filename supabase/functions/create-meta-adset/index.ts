import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Interest {
  id: string;
  name: string;
}

interface AdSetRequest {
  clientId: string;
  campaignId: string;        // ID local da campanha
  metaCampaignId: string;    // ID no Meta (facebook_id)
  adSet: {
    name: string;
    pixel_id?: string;
    conversion_event?: string;
    daily_budget?: number;
    targeting: {
      custom_audiences?: string[];
      excluded_audiences?: string[];
      interests?: Interest[];
      age_min?: number;
      age_max?: number;
      genders?: number[];
    };
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await anonClient.auth.getUser(token);
      userId = user?.id || null;
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {}
        }
      }
    );

    const { clientId, campaignId, metaCampaignId, adSet } = await req.json() as AdSetRequest;

    console.log(`Creating ad set for client ${clientId} in campaign ${metaCampaignId}:`, adSet);

    // Get client with ad account
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select(`
        *,
        facebook_ad_accounts!clients_ad_account_id_fkey (
          account_id
        )
      `)
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      throw new Error(`Client not found: ${clientError?.message}`);
    }

    if (!client.ad_account_id || !client.facebook_ad_accounts) {
      throw new Error("Client does not have an associated Meta Ads account");
    }

    const adAccountId = client.facebook_ad_accounts.account_id;

    // Get campaign to determine objective
    const { data: campaign, error: campaignError } = await supabaseClient
      .from("campaigns")
      .select("objective, status")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error(`Campaign not found: ${campaignError?.message}`);
    }

    // Get Facebook integration for access token
    const { data: integration, error: integrationError } = await supabaseClient
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", client.company_id)
      .single();

    if (integrationError || !integration?.access_token) {
      throw new Error("Facebook integration not found or missing access token");
    }

    const accessToken = integration.access_token;

    // Build targeting object
    const targeting: any = {
      geo_locations: { countries: ["BR"] },
      targeting_automation: {
        advantage_audience: 0,
      },
    };

    if (adSet.targeting.age_min) targeting.age_min = adSet.targeting.age_min;
    if (adSet.targeting.age_max) targeting.age_max = adSet.targeting.age_max;
    if (adSet.targeting.genders?.length) targeting.genders = adSet.targeting.genders;

    if (adSet.targeting.custom_audiences?.length) {
      targeting.custom_audiences = adSet.targeting.custom_audiences.map(id => ({ id }));
    }
    if (adSet.targeting.excluded_audiences?.length) {
      targeting.excluded_custom_audiences = adSet.targeting.excluded_audiences.map(id => ({ id }));
    }
    if (adSet.targeting.interests?.length) {
      targeting.interests = adSet.targeting.interests.map(interest => ({
        id: interest.id,
        name: interest.name,
      }));
    }

    // Determine optimization goal
    const hasPixelConversion = !!(adSet.pixel_id && adSet.conversion_event);
    const optimizationGoal = getOptimizationGoalForAdSet(campaign.objective || 'OUTCOME_TRAFFIC', hasPixelConversion);

    // Create Ad Set in Meta
    const adSetParams = new URLSearchParams({
      campaign_id: metaCampaignId,
      name: adSet.name,
      status: campaign.status === 'active' ? 'ACTIVE' : 'PAUSED',
      targeting: JSON.stringify(targeting),
      billing_event: "IMPRESSIONS",
      optimization_goal: optimizationGoal,
      bid_strategy: "LOWEST_COST_WITHOUT_CAP",
      access_token: accessToken,
    });

    // Add daily budget at ad set level (in cents)
    if (adSet.daily_budget) {
      adSetParams.append("daily_budget", String(Math.round(adSet.daily_budget * 100)));
    }

    // Add promoted object if needed
    if (hasPixelConversion && optimizationGoal === 'OFFSITE_CONVERSIONS') {
      adSetParams.append("promoted_object", JSON.stringify({
        pixel_id: adSet.pixel_id,
        custom_event_type: adSet.conversion_event,
      }));
      console.log(`Adding promoted_object with pixel ${adSet.pixel_id} and event ${adSet.conversion_event}`);
    }

    console.log("Creating ad set in Meta...");
    const adSetResponse = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adsets`,
      { method: "POST", body: adSetParams }
    );

    const adSetResult = await adSetResponse.json();
    console.log("Ad set creation result:", adSetResult);

    if (adSetResult.error) {
      throw new Error(`Failed to create ad set: ${adSetResult.error.message}`);
    }

    const metaAdSetId = adSetResult.id;
    const effectiveUserId = userId || client.user_id;

    // Save ad set to local database
    const { data: savedAdSet, error: saveError } = await supabaseClient
      .from("ad_sets")
      .insert({
        campaign_id: campaignId,
        client_id: clientId,
        company_id: client.company_id,
        user_id: effectiveUserId,
        name: adSet.name,
        facebook_id: metaAdSetId,
        status: campaign.status === 'active' ? 'active' : 'paused',
        is_active: campaign.status === 'active',
        targeting: JSON.stringify(targeting),
        daily_budget: adSet.daily_budget,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving ad set:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        adSet: {
          metaId: metaAdSetId,
          localId: savedAdSet?.id,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-meta-adset:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getOptimizationGoal(objective: string): string {
  const mapping: Record<string, string> = {
    'OUTCOME_TRAFFIC': 'LINK_CLICKS',
    'OUTCOME_ENGAGEMENT': 'POST_ENGAGEMENT',
    'OUTCOME_LEADS': 'LEAD_GENERATION',
    'OUTCOME_SALES': 'OFFSITE_CONVERSIONS',
    'OUTCOME_AWARENESS': 'REACH',
    'OUTCOME_APP_PROMOTION': 'APP_INSTALLS',
  };
  return mapping[objective] || 'LINK_CLICKS';
}

function getOptimizationGoalForAdSet(objective: string, hasPixelConversion: boolean): string {
  if (objective === 'OUTCOME_LEADS') {
    return hasPixelConversion ? 'OFFSITE_CONVERSIONS' : 'LEAD_GENERATION';
  }
  return getOptimizationGoal(objective);
}
