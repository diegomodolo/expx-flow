import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  clientId?: string;
  instagramAccountId?: string;
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
    const { clientId, instagramAccountId, companyId } = body;

    if (!companyId) {
      return new Response(
        JSON.stringify({ success: false, error: "companyId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let adAccountId: string | null = null;
    let instagramId: string | null = null;

    // If clientId is provided, fetch client data
    if (clientId) {
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
      } else {
        adAccountId = client.facebook_ad_accounts?.account_id || null;
        instagramId = client.instagram_accounts?.instagram_id || null;
      }
    }

    // If instagramAccountId is provided directly (for standalone automations), use it
    if (instagramAccountId && !instagramId) {
      const { data: igAccount, error: igError } = await supabase
        .from("instagram_accounts")
        .select("instagram_id")
        .eq("id", instagramAccountId)
        .single();

      if (!igError && igAccount) {
        instagramId = igAccount.instagram_id;
        console.log("Using direct instagramAccountId:", instagramId);
      }
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

    // Fetch Ad Creatives if we have an ad account
    if (adAccountId) {
      const accountId = adAccountId.startsWith('act_') 
        ? adAccountId 
        : `act_${adAccountId}`;

      console.log(`Fetching ads for account: ${accountId}`);

      try {
        // Fetch adcreatives directly to filter by type - only IMAGE creatives
        const creativesResponse = await fetch(
          `https://graph.facebook.com/v20.0/${accountId}/adcreatives?fields=id,name,image_url,object_story_spec,object_type&limit=100&access_token=${accessToken}`
        );
        
        const creativesData = await creativesResponse.json();
        
        if (creativesData.error) {
          console.error("Error fetching creatives:", creativesData.error);
        } else if (creativesData.data) {
          console.log(`Found ${creativesData.data.length} creatives`);
          
          for (const creative of creativesData.data) {
            // Check if it's an image-based creative
            const spec = creative.object_story_spec;
            
            // Skip if it's a video creative
            if (spec?.video_data) {
              console.log(`Skipping video creative: ${creative.id}`);
              continue;
            }
            
            // Only include if it has photo_data or link_data with image (not video)
            let imageUrl: string | null = null;
            let isImageCreative = false;
            
            if (spec?.photo_data?.url) {
              // Pure image post
              imageUrl = spec.photo_data.url;
              isImageCreative = true;
            } else if (spec?.link_data?.picture && !spec?.link_data?.video_id) {
              // Link ad with image (not video)
              imageUrl = spec.link_data.picture;
              isImageCreative = true;
            } else if (creative.image_url && !spec?.video_data) {
              // Direct image_url without video
              imageUrl = creative.image_url;
              isImageCreative = true;
            }
            
            if (isImageCreative && imageUrl) {
              // Avoid duplicates
              if (!adCreatives.some(c => c.imageUrl === imageUrl)) {
                adCreatives.push({
                  id: creative.id,
                  imageUrl: imageUrl,
                  name: creative.name || 'Criativo',
                  type: 'ad'
                });
              }
            }
          }
          
          console.log(`Filtered to ${adCreatives.length} image-only creatives`);
        }
      } catch (e) {
        console.error("Error in creatives fetch:", e);
      }
    }

    // Fetch Instagram Posts if we have an Instagram account
    if (instagramId) {
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
          console.log(`Found ${mediaData.data.length} Instagram posts from API`);
          
          for (const post of mediaData.data) {
            console.log(`Processing post ${post.id}: media_type=${post.media_type}, has_media_url=${!!post.media_url}, has_thumbnail=${!!post.thumbnail_url}`);
            
            // Only include IMAGE and CAROUSEL_ALBUM (skip VIDEO and REELS)
            // Note: Some posts may have undefined media_type
            const mediaType = post.media_type?.toUpperCase();
            const isImagePost = mediaType === 'IMAGE' || mediaType === 'CAROUSEL_ALBUM';
            
            if (isImagePost) {
              const imageUrl = post.media_url || post.thumbnail_url;
              if (imageUrl) {
                instagramPosts.push({
                  id: post.id,
                  imageUrl: imageUrl,
                  caption: post.caption ? post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : '') : 'Post do Instagram',
                  type: 'instagram'
                });
                console.log(`Added Instagram post ${post.id} to results`);
              } else {
                console.log(`Skipped post ${post.id}: no image URL available`);
              }
            } else {
              console.log(`Skipped post ${post.id}: media_type is ${post.media_type} (not IMAGE or CAROUSEL_ALBUM)`);
            }
          }
          
          console.log(`Filtered to ${instagramPosts.length} Instagram image posts`);
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
        hasAdAccount: !!adAccountId,
        hasInstagram: !!instagramId
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
