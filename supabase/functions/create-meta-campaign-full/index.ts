import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UrlParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  customParams?: string;
}

interface Creative {
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media_urls: string[];
  body: string;
  title: string;
  description?: string;
  link_url: string;
  call_to_action: string;
  pixel_id?: string;
  url_parameters?: UrlParameters;
}

interface AdSet {
  name: string;
  pixel_id?: string;
  conversion_event?: string;
  targeting: {
    custom_audiences?: string[];
    excluded_audiences?: string[];
    age_min?: number;
    age_max?: number;
    genders?: number[];
  };
  creatives: Creative[];
}

interface Campaign {
  name: string;
  objective: string;
  daily_budget?: number;
  lifetime_budget?: number;
  status: 'ACTIVE' | 'PAUSED';
}

interface RequestBody {
  clientId: string;
  campaign: Campaign;
  adSets: AdSet[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { clientId, campaign, adSets } = await req.json() as RequestBody;

    console.log(`Creating full campaign for client ${clientId}:`, { campaign, adSetCount: adSets.length });

    // Get client with ad account and Facebook integration
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select(`
        *,
        facebook_ad_accounts!clients_ad_account_id_fkey (
          facebook_account_id
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

    const adAccountId = client.facebook_ad_accounts.facebook_account_id;

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

    // 1. Create Campaign in Meta
    console.log("Creating campaign in Meta...");
    const campaignParams = new URLSearchParams({
      name: campaign.name,
      objective: campaign.objective,
      status: campaign.status,
      special_ad_categories: "[]",
      access_token: accessToken,
    });

    if (campaign.daily_budget) {
      campaignParams.append("daily_budget", String(Math.round(campaign.daily_budget * 100)));
    }
    if (campaign.lifetime_budget) {
      campaignParams.append("lifetime_budget", String(Math.round(campaign.lifetime_budget * 100)));
    }

    const campaignResponse = await fetch(
      `https://graph.facebook.com/v21.0/act_${adAccountId}/campaigns`,
      { method: "POST", body: campaignParams }
    );

    const campaignResult = await campaignResponse.json();
    console.log("Campaign creation result:", campaignResult);

    if (campaignResult.error) {
      throw new Error(`Failed to create campaign: ${campaignResult.error.message}`);
    }

    const metaCampaignId = campaignResult.id;

    // Save campaign to local database
    const { data: savedCampaign, error: saveCampaignError } = await supabaseClient
      .from("campaigns")
      .insert({
        client_id: clientId,
        company_id: client.company_id,
        user_id: client.user_id,
        name: campaign.name,
        objective: campaign.objective,
        facebook_id: metaCampaignId,
        status: campaign.status === 'ACTIVE' ? 'active' : 'paused',
        is_active: campaign.status === 'ACTIVE',
        platforms: "Meta",
        period: "ongoing",
        daily_budget: campaign.daily_budget,
        lifetime_budget: campaign.lifetime_budget,
        spend: 0,
        conversions: 0,
        cpc: 0,
        ctr: 0,
      })
      .select()
      .single();

    if (saveCampaignError) {
      console.error("Error saving campaign:", saveCampaignError);
    }

    // 2. Create Ad Sets and Ads
    const createdAdSets = [];
    const createdAds = [];

    for (const adSet of adSets) {
      console.log(`Creating ad set: ${adSet.name}`);

      // Build targeting object
      const targeting: any = {
        geo_locations: { countries: ["BR"] }, // Default to Brazil
      };

      if (adSet.targeting.age_min) targeting.age_min = adSet.targeting.age_min;
      if (adSet.targeting.age_max) targeting.age_max = adSet.targeting.age_max;
      if (adSet.targeting.genders?.length) targeting.genders = adSet.targeting.genders;

      // Add custom audiences
      if (adSet.targeting.custom_audiences?.length) {
        targeting.custom_audiences = adSet.targeting.custom_audiences.map(id => ({ id }));
      }
      if (adSet.targeting.excluded_audiences?.length) {
        targeting.excluded_custom_audiences = adSet.targeting.excluded_audiences.map(id => ({ id }));
      }

      // Create Ad Set
      const adSetParams = new URLSearchParams({
        campaign_id: metaCampaignId,
        name: adSet.name,
        status: campaign.status,
        targeting: JSON.stringify(targeting),
        billing_event: "IMPRESSIONS",
        optimization_goal: getOptimizationGoal(campaign.objective),
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        access_token: accessToken,
      });

      // Add promoted_object for conversion campaigns with pixel
      if (adSet.pixel_id && adSet.conversion_event) {
        adSetParams.append("promoted_object", JSON.stringify({
          pixel_id: adSet.pixel_id,
          custom_event_type: adSet.conversion_event,
        }));
        console.log(`Adding promoted_object with pixel ${adSet.pixel_id} and event ${adSet.conversion_event}`);
      }

      const adSetResponse = await fetch(
        `https://graph.facebook.com/v21.0/act_${adAccountId}/adsets`,
        { method: "POST", body: adSetParams }
      );

      const adSetResult = await adSetResponse.json();
      console.log("Ad set creation result:", adSetResult);

      if (adSetResult.error) {
        console.error(`Failed to create ad set ${adSet.name}:`, adSetResult.error);
        continue;
      }

      const metaAdSetId = adSetResult.id;

      // Save ad set to local database
      const { data: savedAdSet } = await supabaseClient
        .from("ad_sets")
        .insert({
          campaign_id: savedCampaign?.id,
          client_id: clientId,
          company_id: client.company_id,
          user_id: client.user_id,
          name: adSet.name,
          facebook_id: metaAdSetId,
          status: campaign.status === 'ACTIVE' ? 'active' : 'paused',
          is_active: campaign.status === 'ACTIVE',
          targeting: JSON.stringify(targeting),
        })
        .select()
        .single();

      createdAdSets.push({ ...adSet, metaId: metaAdSetId, localId: savedAdSet?.id });

      // 3. Create Ads for this Ad Set
      for (let i = 0; i < adSet.creatives.length; i++) {
        const creative = adSet.creatives[i];
        console.log(`Creating ad ${i + 1} for ad set ${adSet.name}`);

        try {
          // First, create the ad creative
          const creativeData = await createAdCreative(
            adAccountId,
            accessToken,
            creative,
            client.facebook_page_id
          );

          if (!creativeData?.id) {
            console.error("Failed to create ad creative");
            continue;
          }

          // Then create the ad
          const adParams = new URLSearchParams({
            adset_id: metaAdSetId,
            name: creative.title || `${adSet.name} - Ad ${i + 1}`,
            status: campaign.status,
            creative: JSON.stringify({ creative_id: creativeData.id }),
            access_token: accessToken,
          });

          const adResponse = await fetch(
            `https://graph.facebook.com/v21.0/act_${adAccountId}/ads`,
            { method: "POST", body: adParams }
          );

          const adResult = await adResponse.json();
          console.log("Ad creation result:", adResult);

          if (adResult.error) {
            console.error(`Failed to create ad:`, adResult.error);
            continue;
          }

          // Save ad to local database
          const { data: savedAd } = await supabaseClient
            .from("ads")
            .insert({
              ad_set_id: savedAdSet?.id,
              campaign_id: savedCampaign?.id,
              client_id: clientId,
              company_id: client.company_id,
              user_id: client.user_id,
              name: creative.title || `${adSet.name} - Ad ${i + 1}`,
              facebook_id: adResult.id,
              status: campaign.status === 'ACTIVE' ? 'active' : 'paused',
              is_active: campaign.status === 'ACTIVE',
              creative_type: creative.type,
              creative_body: creative.body,
              creative_title: creative.title,
              creative_description: creative.description,
              link_url: creative.link_url,
              call_to_action: creative.call_to_action,
              image_url: creative.type !== 'VIDEO' ? creative.media_urls[0] : null,
              video_url: creative.type === 'VIDEO' ? creative.media_urls[0] : null,
            })
            .select()
            .single();

          createdAds.push({ ...creative, metaId: adResult.id, localId: savedAd?.id });
        } catch (adError: any) {
          console.error(`Error creating ad:`, adError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaign: {
          metaId: metaCampaignId,
          localId: savedCampaign?.id,
        },
        adSets: createdAdSets,
        ads: createdAds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-meta-campaign-full:", error);
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

function buildUrlTags(params?: UrlParameters): string | undefined {
  if (!params) return undefined;
  
  const parts: string[] = [];
  if (params.utm_source) parts.push(`utm_source=${encodeURIComponent(params.utm_source)}`);
  if (params.utm_medium) parts.push(`utm_medium=${encodeURIComponent(params.utm_medium)}`);
  if (params.utm_campaign) parts.push(`utm_campaign=${encodeURIComponent(params.utm_campaign)}`);
  if (params.utm_content) parts.push(`utm_content=${encodeURIComponent(params.utm_content)}`);
  if (params.utm_term) parts.push(`utm_term=${encodeURIComponent(params.utm_term)}`);
  if (params.customParams) parts.push(params.customParams);
  
  return parts.length > 0 ? parts.join('&') : undefined;
}

async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: Creative,
  pageId?: string
): Promise<any> {
  const objectStorySpec: any = {
    page_id: pageId,
  };

  const urlTags = buildUrlTags(creative.url_parameters);

  if (creative.type === 'VIDEO') {
    objectStorySpec.video_data = {
      video_url: creative.media_urls[0],
      message: creative.body,
      title: creative.title,
      link_description: creative.description,
      call_to_action: {
        type: creative.call_to_action,
        value: { link: creative.link_url },
      },
    };
  } else if (creative.type === 'CAROUSEL') {
    objectStorySpec.link_data = {
      link: creative.link_url,
      message: creative.body,
      child_attachments: creative.media_urls.map((url, index) => ({
        picture: url,
        link: creative.link_url,
        name: index === 0 ? creative.title : undefined,
        description: index === 0 ? creative.description : undefined,
        call_to_action: {
          type: creative.call_to_action,
          value: { link: creative.link_url },
        },
      })),
    };
    if (urlTags) objectStorySpec.link_data.url_tags = urlTags;
  } else {
    objectStorySpec.link_data = {
      picture: creative.media_urls[0],
      link: creative.link_url,
      message: creative.body,
      name: creative.title,
      description: creative.description,
      call_to_action: {
        type: creative.call_to_action,
        value: { link: creative.link_url },
      },
    };
    if (urlTags) objectStorySpec.link_data.url_tags = urlTags;
  }

  const creativeParams = new URLSearchParams({
    name: creative.title || 'Ad Creative',
    object_story_spec: JSON.stringify(objectStorySpec),
    access_token: accessToken,
  });

  const response = await fetch(
    `https://graph.facebook.com/v21.0/act_${adAccountId}/adcreatives`,
    { method: "POST", body: creativeParams }
  );

  return response.json();
}
