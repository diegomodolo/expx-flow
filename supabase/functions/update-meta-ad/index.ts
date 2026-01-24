import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreativeData {
  type: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  media_urls: string[];
  body: string;
  title: string;
  description?: string;
  link_url: string;
  call_to_action: string;
}

interface UpdateRequest {
  clientId: string;
  adId: string;
  facebookId: string;
  updates: {
    name?: string;
    status?: 'ACTIVE' | 'PAUSED';
    creative?: CreativeData;
  };
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

    const { clientId, adId, facebookId, updates } = await req.json() as UpdateRequest;

    console.log(`Updating ad ${facebookId} for client ${clientId}:`, updates);

    // Get client with ad account and page
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
    const adAccountId = client.facebook_ad_accounts?.account_id;

    // Track what was updated
    const updatedFields: Record<string, any> = {};

    // Update name and/or status directly on Meta
    if (updates.name || updates.status) {
      const updateParams = new URLSearchParams({
        access_token: accessToken,
      });

      if (updates.name) {
        updateParams.append("name", updates.name);
        updatedFields.name = updates.name;
      }
      if (updates.status) {
        updateParams.append("status", updates.status);
        updatedFields.status = updates.status.toLowerCase();
        updatedFields.is_active = updates.status === 'ACTIVE';
      }

      console.log("Updating ad metadata on Meta...");
      const metaResponse = await fetch(
        `https://graph.facebook.com/v21.0/${facebookId}`,
        { method: "POST", body: updateParams }
      );

      const metaResult = await metaResponse.json();
      console.log("Meta update result:", metaResult);

      if (metaResult.error) {
        throw new Error(`Failed to update ad on Meta: ${metaResult.error.message}`);
      }
    }

    // If creative changed, create new ad creative and update the ad
    if (updates.creative && adAccountId) {
      console.log("Creating new ad creative...");

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
          const matchingPage = pages.find((p: any) => p.page_name?.toLowerCase().trim() === clientName);

          if (matchingPage) {
            metaPageId = matchingPage.page_id;
          } else if (pages.length === 1) {
            metaPageId = pages[0].page_id;
          }
        }
      }

      if (!metaPageId) {
        throw new Error("Cliente precisa ter uma Página do Facebook vinculada para atualizar o criativo.");
      }

      const creative = updates.creative;
      const ctaType = creative.call_to_action || 'LEARN_MORE';
      const finalUrl = creative.link_url;

      let creativeData: any;

      if (creative.type === 'CAROUSEL') {
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
            page_id: metaPageId,
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
        creativeData = await response.json();
      } else if (creative.type === 'VIDEO') {
        // Extract video ID from URL or use raw ID
        // The media_urls[0] might be a URL like https://www.facebook.com/123456789
        // or a direct video ID like "123456789"
        let videoId = creative.media_urls[0];
        
        // If it's a Facebook URL, extract the numeric ID from the path
        if (videoId.includes('facebook.com/') || videoId.includes('fb.com/')) {
          const match = videoId.match(/(?:facebook\.com|fb\.com)\/(\d+)/);
          if (match && match[1]) {
            videoId = match[1];
          }
        }
        // If it's a full video URL (mp4), we cannot use it as video_id
        // In that case, we need to throw an error or skip video creative update
        if (videoId.startsWith('http') && !videoId.includes('facebook.com') && !videoId.includes('fb.com')) {
          throw new Error("Para atualizar criativos de vídeo, é necessário fazer upload de um novo vídeo ou manter o vídeo atual.");
        }

        console.log("Extracted video_id:", videoId);

        const creativeParams = new URLSearchParams({
          name: `Creative - ${creative.title || Date.now()}`,
          object_story_spec: JSON.stringify({
            page_id: metaPageId,
            video_data: {
              video_id: videoId,
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
        creativeData = await response.json();
      } else {
        // Image creative
        const creativeParams = new URLSearchParams({
          name: `Creative - ${creative.title || Date.now()}`,
          object_story_spec: JSON.stringify({
            page_id: metaPageId,
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
        creativeData = await response.json();
      }

      console.log("New creative result:", creativeData);

      if (creativeData.error) {
        throw new Error(`Failed to create new creative: ${creativeData.error.message}`);
      }

      const newCreativeId = creativeData.id;

      // Update the ad to use the new creative
      const updateAdParams = new URLSearchParams({
        creative: JSON.stringify({ creative_id: newCreativeId }),
        access_token: accessToken,
      });

      console.log("Updating ad to use new creative...");
      const updateAdResponse = await fetch(
        `https://graph.facebook.com/v21.0/${facebookId}`,
        { method: "POST", body: updateAdParams }
      );

      const updateAdResult = await updateAdResponse.json();
      console.log("Ad creative update result:", updateAdResult);

      if (updateAdResult.error) {
        throw new Error(`Failed to update ad with new creative: ${updateAdResult.error.message}`);
      }

      // Add creative fields to updatedFields for local DB update
      updatedFields.creative_type = creative.type;
      updatedFields.creative_body = creative.body;
      updatedFields.creative_title = creative.title;
      updatedFields.creative_description = creative.description;
      updatedFields.link_url = finalUrl;
      updatedFields.call_to_action = creative.call_to_action;
      updatedFields.image_url = creative.type !== 'VIDEO' ? creative.media_urls[0] : null;
      updatedFields.video_url = creative.type === 'VIDEO' ? creative.media_urls[0] : null;
    }

    // Update local database
    if (Object.keys(updatedFields).length > 0) {
      updatedFields.updated_at = new Date().toISOString();

      const { error: updateError } = await supabaseClient
        .from("ads")
        .update(updatedFields)
        .eq("id", adId);

      if (updateError) {
        console.error("Error updating local ad:", updateError);
        // Don't throw here since Meta was already updated
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        updatedFields: Object.keys(updatedFields),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-meta-ad:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
