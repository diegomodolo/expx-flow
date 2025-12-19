import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  clientId: string;
  companyId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const body: RequestBody = await req.json();
    const { clientId, companyId } = body;

    if (!clientId || !companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId e companyId são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Fetch client data with ad account and instagram info
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select(`
        id,
        ad_account_id,
        instagram_account_id,
        facebook_ad_accounts!ad_account_id (
          id,
          account_id,
          account_name
        ),
        instagram_accounts!instagram_account_id (
          id,
          instagram_id,
          username
        )
      `)
      .eq("id", clientId)
      .single();

    if (clientError) {
      console.error("Error fetching client:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Facebook integration for access token
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error("No Facebook integration found:", integrationError);
      return new Response(
        JSON.stringify({ 
          success: true, 
          adCreatives: [], 
          instagramPosts: [],
          message: "Integração com Facebook não configurada"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = integration.access_token;
    const adCreatives: { id: string; imageUrl: string; name: string; type: 'ad' }[] = [];
    const instagramPosts: { id: string; imageUrl: string; caption: string; type: 'instagram' }[] = [];

    // Fetch Ad Creatives if client has ad account
    if (client.facebook_ad_accounts?.account_id) {
      const accountId = client.facebook_ad_accounts.account_id.startsWith('act_') 
        ? client.facebook_ad_accounts.account_id 
        : `act_${client.facebook_ad_accounts.account_id}`;

      console.log(`Fetching ads for account: ${accountId}`);

      try {
        // Fetch ads with their creatives - get image_url from adcreatives
        const adsResponse = await fetch(
          `https://graph.facebook.com/v20.0/${accountId}/ads?fields=id,name,creative{id,image_url,thumbnail_url,object_story_spec}&limit=50&access_token=${accessToken}`
        );
        
        const adsData = await adsResponse.json();
        
        if (adsData.error) {
          console.error("Error fetching ads:", adsData.error);
        } else if (adsData.data) {
          console.log(`Found ${adsData.data.length} ads`);
          
          for (const ad of adsData.data) {
            const creative = ad.creative;
            if (!creative) continue;
            
            // Try to get image from creative
            let imageUrl = creative.image_url || creative.thumbnail_url;
            
            // If no direct image, try to get from object_story_spec
            if (!imageUrl && creative.object_story_spec) {
              const spec = creative.object_story_spec;
              if (spec.link_data?.image_hash || spec.link_data?.picture) {
                imageUrl = spec.link_data.picture;
              } else if (spec.photo_data?.url) {
                imageUrl = spec.photo_data.url;
              } else if (spec.video_data?.image_url) {
                imageUrl = spec.video_data.image_url;
              }
            }

            // If still no image, fetch the creative directly
            if (!imageUrl && creative.id) {
              try {
                const creativeResponse = await fetch(
                  `https://graph.facebook.com/v20.0/${creative.id}?fields=image_url,thumbnail_url&access_token=${accessToken}`
                );
                const creativeData = await creativeResponse.json();
                imageUrl = creativeData.image_url || creativeData.thumbnail_url;
              } catch (e) {
                console.error(`Error fetching creative ${creative.id}:`, e);
              }
            }

            if (imageUrl) {
              // Avoid duplicates
              if (!adCreatives.some(c => c.imageUrl === imageUrl)) {
                adCreatives.push({
                  id: ad.id,
                  imageUrl: imageUrl,
                  name: ad.name || 'Anúncio',
                  type: 'ad'
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in ads fetch:", e);
      }
    }

    // Fetch Instagram Posts if client has Instagram account
    if (client.instagram_accounts?.instagram_id) {
      const instagramId = client.instagram_accounts.instagram_id;
      console.log(`Fetching Instagram posts for account: ${instagramId}`);

      try {
        // Fetch recent media from Instagram Business Account
        const mediaResponse = await fetch(
          `https://graph.facebook.com/v20.0/${instagramId}/media?fields=id,media_type,media_url,thumbnail_url,caption,permalink&limit=20&access_token=${accessToken}`
        );
        
        const mediaData = await mediaResponse.json();
        
        if (mediaData.error) {
          console.error("Error fetching Instagram media:", mediaData.error);
        } else if (mediaData.data) {
          console.log(`Found ${mediaData.data.length} Instagram posts`);
          
          for (const post of mediaData.data) {
            // Only include IMAGE and CAROUSEL_ALBUM (skip VIDEO and REELS)
            if (post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM') {
              const imageUrl = post.media_url || post.thumbnail_url;
              if (imageUrl) {
                instagramPosts.push({
                  id: post.id,
                  imageUrl: imageUrl,
                  caption: post.caption ? post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : '') : 'Post do Instagram',
                  type: 'instagram'
                });
              }
            }
          }
        }
      } catch (e) {
        console.error("Error in Instagram fetch:", e);
      }
    }

    console.log(`Returning ${adCreatives.length} ad creatives and ${instagramPosts.length} Instagram posts`);

    return new Response(
      JSON.stringify({
        success: true,
        adCreatives: adCreatives.slice(0, 20), // Limit to 20 most recent
        instagramPosts: instagramPosts.slice(0, 20), // Limit to 20 most recent
        hasAdAccount: !!client.facebook_ad_accounts?.account_id,
        hasInstagram: !!client.instagram_accounts?.instagram_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in fetch-creative-references:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Erro ao buscar referências",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
