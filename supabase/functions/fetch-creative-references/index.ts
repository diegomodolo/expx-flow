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
  limit?: number;
  adCursor?: string;
  instagramCursor?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const body: RequestBody = await req.json();
    const { clientId, instagramAccountId, companyId, limit = 20, adCursor, instagramCursor } = body;

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
    let nextAdCursor: string | null = null;
    let nextInstagramCursor: string | null = null;

    // Fetch Ad Creatives if we have an ad account
    if (adAccountId) {
      const accountId = adAccountId.startsWith('act_') 
        ? adAccountId 
        : `act_${adAccountId}`;

      console.log(`Fetching ads for account: ${accountId}, cursor: ${adCursor || 'initial'}`);

      try {
        // Build URL with cursor if provided
        let creativesUrl = `https://graph.facebook.com/v20.0/${accountId}/adcreatives?fields=id,name,image_url,object_story_spec,object_type,created_time&limit=100&access_token=${accessToken}`;
        
        if (adCursor) {
          creativesUrl = adCursor;
        }

        const creativesResponse = await fetch(creativesUrl);
        const creativesData = await creativesResponse.json();
        
        if (creativesData.error) {
          console.error("Error fetching creatives:", creativesData.error);
        } else if (creativesData.data) {
          console.log(`Found ${creativesData.data.length} creatives`);
          
          // Sort by created_time descending (most recent first)
          const sortedCreatives = creativesData.data.sort((a: any, b: any) => {
            const dateA = new Date(a.created_time || 0).getTime();
            const dateB = new Date(b.created_time || 0).getTime();
            return dateB - dateA;
          });
          
          for (const creative of sortedCreatives) {
            if (adCreatives.length >= limit) break;
            
            // Check if it's an image-based creative
            const spec = creative.object_story_spec;
            
            // Skip if it's a video creative
            if (spec?.video_data) {
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
          
          // Set next cursor for pagination
          if (creativesData.paging?.next && adCreatives.length === limit) {
            nextAdCursor = creativesData.paging.next;
          }
          
          console.log(`Filtered to ${adCreatives.length} image-only creatives`);
        }
      } catch (e) {
        console.error("Error in creatives fetch:", e);
      }
    }

    // Fetch Instagram Posts if we have an Instagram account
    if (instagramId) {
      console.log(`Fetching Instagram posts for account: ${instagramId}, cursor: ${instagramCursor || 'initial'}`);

      try {
        // Build URL with cursor if provided
        let mediaUrl = `https://graph.facebook.com/v20.0/${instagramId}/media?fields=id,media_type,media_url,thumbnail_url,caption,permalink,timestamp,product_type&limit=50&access_token=${accessToken}`;
        
        if (instagramCursor) {
          mediaUrl = instagramCursor;
        }

        const maxPages = 5; // Limit pagination to avoid timeout
        let page = 0;
        let nextUrl: string | null = mediaUrl;

        while (nextUrl && instagramPosts.length < limit && page < maxPages) {
          page += 1;
          console.log(`Instagram pagination: fetching page ${page}`);

          const mediaResponse = await fetch(nextUrl);
          const mediaData = await mediaResponse.json();

          if (mediaData.error) {
            console.error("Error fetching Instagram media:", mediaData.error);
            break;
          }

          const items: any[] = Array.isArray(mediaData.data) ? mediaData.data : [];
          console.log(`Found ${items.length} Instagram posts from API (page ${page})`);

          // Sort by timestamp descending (most recent first)
          const sortedItems = items.sort((a: any, b: any) => {
            const dateA = new Date(a.timestamp || 0).getTime();
            const dateB = new Date(b.timestamp || 0).getTime();
            return dateB - dateA;
          });

          for (const post of sortedItems) {
            if (instagramPosts.length >= limit) break;
            
            // Only include IMAGE and CAROUSEL_ALBUM (skip VIDEO/REELS)
            const mediaType = post.media_type?.toUpperCase();
            const isImagePost = mediaType === "IMAGE" || mediaType === "CAROUSEL_ALBUM";

            if (!isImagePost) continue;

            const imageUrl = post.media_url || post.thumbnail_url;
            if (!imageUrl) continue;

            instagramPosts.push({
              id: post.id,
              imageUrl,
              caption: post.caption
                ? post.caption.substring(0, 100) + (post.caption.length > 100 ? "..." : "")
                : "Post do Instagram",
              type: "instagram",
            });
          }

          // Save next cursor
          if (mediaData?.paging?.next) {
            nextUrl = mediaData.paging.next;
          } else {
            nextUrl = null;
          }
        }

        // Set next cursor for pagination if we have more
        if (nextUrl && instagramPosts.length >= limit) {
          nextInstagramCursor = nextUrl;
        }

        console.log(
          `Filtered to ${instagramPosts.length} Instagram image posts (after pagination)`
        );
      } catch (e) {
        console.error("Error in Instagram fetch:", e);
      }
    }

    console.log(`Returning ${adCreatives.length} ad creatives and ${instagramPosts.length} Instagram posts`);

    return new Response(
      JSON.stringify({
        success: true,
        adCreatives,
        instagramPosts,
        hasAdAccount: !!adAccountId,
        hasInstagram: !!instagramId,
        nextAdCursor,
        nextInstagramCursor,
        hasMoreAds: !!nextAdCursor,
        hasMoreInstagram: !!nextInstagramCursor
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
