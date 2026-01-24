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

interface CreativeRequest {
  clientId: string;
  adSetId: string;           // ID local do ad set
  metaAdSetId: string;       // ID no Meta (facebook_id)
  creative: {
    type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
    media_urls: string[];
    body: string;
    title: string;
    description?: string;
    link_url: string;
    call_to_action: string;
    url_parameters?: UrlParameters;
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

    const { clientId, adSetId, metaAdSetId, creative } = await req.json() as CreativeRequest;

    console.log(`Creating ad for client ${clientId} in ad set ${metaAdSetId}:`, creative);

    // Get client with ad account and Facebook Page
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select(`
        *,
        facebook_ad_accounts!clients_ad_account_id_fkey (
          account_id
        ),
        facebook_pages!clients_facebook_page_id_fkey (
          id,
          page_id,
          page_name
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

    // Resolve Meta Page ID
    let metaPageId: string | null = client.facebook_pages?.page_id ?? null;

    if (!metaPageId && client.company_id) {
      const { data: pages } = await supabaseClient
        .from("facebook_pages")
        .select("id,page_id,page_name")
        .eq("company_id", client.company_id)
        .eq("is_active", true);

      if (pages && pages.length > 0) {
        const clientName = client.name?.toLowerCase().trim() || "";
        const matchingPage = pages.find(p => p.page_name?.toLowerCase().trim() === clientName);

        if (matchingPage) {
          metaPageId = matchingPage.page_id;
        } else if (pages.length === 1) {
          metaPageId = pages[0].page_id;
        }
      }
    }

    if (!metaPageId) {
      throw new Error("Cliente precisa ter uma Página do Facebook vinculada para criar anúncios.");
    }

    // Get ad set to find campaign
    const { data: adSet, error: adSetError } = await supabaseClient
      .from("ad_sets")
      .select("campaign_id, status")
      .eq("id", adSetId)
      .single();

    if (adSetError || !adSet) {
      throw new Error(`Ad set not found: ${adSetError?.message}`);
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

    // Build final URL with UTM parameters
    const finalUrl = buildFinalUrl(creative.link_url, creative.url_parameters);

    // Create Ad Creative
    console.log("Creating ad creative...");
    const creativeData = await createAdCreative(
      adAccountId,
      accessToken,
      creative,
      metaPageId,
      finalUrl
    );

    if (creativeData.error) {
      throw new Error(`Failed to create creative: ${creativeData.error.message}`);
    }

    const metaCreativeId = creativeData.id;
    console.log("Ad creative created:", metaCreativeId);

    // Create Ad
    const adParams = new URLSearchParams({
      adset_id: metaAdSetId,
      name: creative.title || `Ad - ${new Date().toISOString().split('T')[0]}`,
      status: adSet.status === 'active' ? 'ACTIVE' : 'PAUSED',
      creative: JSON.stringify({ creative_id: metaCreativeId }),
      access_token: accessToken,
    });

    console.log("Creating ad in Meta...");
    const adResponse = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/ads`,
      { method: "POST", body: adParams }
    );

    const adResult = await adResponse.json();
    console.log("Ad creation result:", adResult);

    if (adResult.error) {
      throw new Error(`Failed to create ad: ${adResult.error.message}`);
    }

    const metaAdId = adResult.id;
    const effectiveUserId = userId || client.user_id;

    // Save ad to local database
    const { data: savedAd, error: saveError } = await supabaseClient
      .from("ads")
      .insert({
        ad_set_id: adSetId,
        campaign_id: adSet.campaign_id,
        client_id: clientId,
        company_id: client.company_id,
        user_id: effectiveUserId,
        name: creative.title || `Ad - ${new Date().toISOString().split('T')[0]}`,
        facebook_id: metaAdId,
        status: adSet.status === 'active' ? 'active' : 'paused',
        is_active: adSet.status === 'active',
        creative_type: creative.type,
        creative_body: creative.body,
        creative_title: creative.title,
        creative_description: creative.description,
        link_url: finalUrl,
        call_to_action: creative.call_to_action,
        image_url: creative.type !== 'VIDEO' ? creative.media_urls[0] : null,
        video_url: creative.type === 'VIDEO' ? creative.media_urls[0] : null,
      })
      .select()
      .single();

    if (saveError) {
      console.error("Error saving ad:", saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        ad: {
          metaId: metaAdId,
          localId: savedAd?.id,
          creativeId: metaCreativeId,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in create-meta-ad:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildFinalUrl(baseUrl: string, params?: UrlParameters): string {
  if (!params) return baseUrl;
  
  const parts: string[] = [];
  if (params.utm_source) parts.push(`utm_source=${encodeURIComponent(params.utm_source)}`);
  if (params.utm_medium) parts.push(`utm_medium=${encodeURIComponent(params.utm_medium)}`);
  if (params.utm_campaign) parts.push(`utm_campaign=${encodeURIComponent(params.utm_campaign)}`);
  if (params.utm_content) parts.push(`utm_content=${encodeURIComponent(params.utm_content)}`);
  if (params.utm_term) parts.push(`utm_term=${encodeURIComponent(params.utm_term)}`);
  if (params.customParams) parts.push(params.customParams);

  if (parts.length === 0) return baseUrl;
  
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${parts.join('&')}`;
}

async function createAdCreative(
  adAccountId: string,
  accessToken: string,
  creative: CreativeRequest['creative'],
  pageId: string,
  finalUrl: string
): Promise<any> {
  const ctaType = creative.call_to_action || 'LEARN_MORE';

  if (creative.type === 'CAROUSEL') {
    // Carousel creative
    const childAttachments = creative.media_urls.map((url, index) => ({
      link: finalUrl,
      picture: url,
      name: creative.title || `Slide ${index + 1}`,
      description: creative.description || '',
      call_to_action: { type: ctaType, value: { link: finalUrl } },
    }));

    const creativeParams = new URLSearchParams({
      name: `Creative - ${creative.title || Date.now()}`,
      object_story_spec: JSON.stringify({
        page_id: pageId,
        link_data: {
          link: finalUrl,
          message: creative.body,
          child_attachments: childAttachments,
          call_to_action: { type: ctaType, value: { link: finalUrl } },
        },
      }),
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adcreatives`,
      { method: "POST", body: creativeParams }
    );
    return response.json();
  } else if (creative.type === 'VIDEO') {
    // Video creative
    const creativeParams = new URLSearchParams({
      name: `Creative - ${creative.title || Date.now()}`,
      object_story_spec: JSON.stringify({
        page_id: pageId,
        video_data: {
          video_id: creative.media_urls[0], // Assuming video ID
          message: creative.body,
          title: creative.title || '',
          link_description: creative.description || '',
          call_to_action: { type: ctaType, value: { link: finalUrl } },
        },
      }),
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adcreatives`,
      { method: "POST", body: creativeParams }
    );
    return response.json();
  } else {
    // Image creative
    const creativeParams = new URLSearchParams({
      name: `Creative - ${creative.title || Date.now()}`,
      object_story_spec: JSON.stringify({
        page_id: pageId,
        link_data: {
          link: finalUrl,
          message: creative.body,
          picture: creative.media_urls[0],
          name: creative.title || '',
          description: creative.description || '',
          call_to_action: { type: ctaType, value: { link: finalUrl } },
        },
      }),
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/adcreatives`,
      { method: "POST", body: creativeParams }
    );
    return response.json();
  }
}
