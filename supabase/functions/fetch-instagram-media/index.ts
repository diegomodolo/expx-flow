import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clientId, instagramId, mediaType, limit = 30, after } = await req.json();

    console.log(`Fetching Instagram media for client ${clientId}, IG: ${instagramId}, type: ${mediaType}, after: ${after || 'none'}`);

    if (!clientId || !instagramId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId and instagramId are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get client's instagram account to find the linked Facebook page
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("company_id, instagram_account_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Client error:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Client not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Try to get the page access token from the instagram account's linked facebook page
    let accessToken: string | null = null;
    let resolvedInstagramId = instagramId; // May be overridden for BM accounts

    if (client.instagram_account_id) {
      const { data: igAccount } = await supabase
        .from("instagram_accounts")
        .select("facebook_page_id, source, instagram_id")
        .eq("id", client.instagram_account_id)
        .single();

      if (igAccount?.facebook_page_id) {
        const { data: fbPage } = await supabase
          .from("facebook_pages")
          .select("page_access_token, instagram_business_account_id")
          .eq("id", igAccount.facebook_page_id)
          .single();

        if (fbPage?.page_access_token) {
          accessToken = fbPage.page_access_token;
          console.log("Using page access token from linked Facebook page");

          // For Business Manager accounts, the instagram_id in the account table
          // may differ from the instagram_business_account_id on the page.
          // The page token only has permission to access the page's IG business account ID.
          if (igAccount.source === 'business_manager' && fbPage.instagram_business_account_id) {
            if (fbPage.instagram_business_account_id !== instagramId) {
              console.log(`BM account: overriding instagramId from ${instagramId} to ${fbPage.instagram_business_account_id}`);
              resolvedInstagramId = fbPage.instagram_business_account_id;
            }
          }
        }
      }
    }

    // Fallback to user-level token from facebook_integrations
    if (!accessToken) {
      const { data: integration } = await supabase
        .from("facebook_integrations")
        .select("access_token")
        .eq("company_id", client.company_id)
        .eq("is_active", true)
        .single();

      accessToken = integration?.access_token || null;
      if (accessToken) {
        console.log("Using user-level access token as fallback");
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum token de acesso encontrado. Reconecte o Facebook nas configurações." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Build fields for the API request
    const fields = "id,media_type,media_url,thumbnail_url,caption,timestamp,permalink";
    
    // Fetch media from Instagram Graph API with pagination support
    let apiUrl = `https://graph.facebook.com/v21.0/${resolvedInstagramId}/media?fields=${fields}&limit=${limit}&access_token=${accessToken}`;
    
    // Add cursor for pagination if provided
    if (after) {
      apiUrl += `&after=${after}`;
    }
    
    console.log(`Fetching from Instagram API...`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      console.error("Instagram API error:", data.error);
      return new Response(
        JSON.stringify({ success: false, error: data.error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    let mediaItems = data.data || [];
    const paging = data.paging || {};
    const nextCursor = paging.cursors?.after || null;
    const hasMore = !!paging.next;
    
    console.log(`Received ${mediaItems.length} media items from Instagram, hasMore: ${hasMore}`);

    // Filter by media type if specified
    if (mediaType === 'VIDEO') {
      mediaItems = mediaItems.filter((item: any) => item.media_type === 'VIDEO');
    } else if (mediaType === 'IMAGE') {
      // Include both IMAGE and CAROUSEL_ALBUM (first image of carousel)
      mediaItems = mediaItems.filter((item: any) => 
        item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM'
      );
    }

    console.log(`After filtering: ${mediaItems.length} items of type ${mediaType}`);

    // For carousel albums, we need to fetch the first image
    const processedMedia = await Promise.all(
      mediaItems.map(async (item: any) => {
        // For carousel albums, get the children to find the first image
        if (item.media_type === 'CAROUSEL_ALBUM' && mediaType === 'IMAGE') {
          try {
            const childrenUrl = `https://graph.facebook.com/v21.0/${item.id}/children?fields=id,media_type,media_url&access_token=${accessToken}`;
            const childrenResponse = await fetch(childrenUrl);
            const childrenData = await childrenResponse.json();
            
            if (childrenData.data && childrenData.data.length > 0) {
              // Get the first image from the carousel
              const firstImage = childrenData.data.find((c: any) => c.media_type === 'IMAGE');
              if (firstImage) {
                return {
                  ...item,
                  media_url: firstImage.media_url,
                };
              }
            }
          } catch (err) {
            console.error(`Error fetching carousel children for ${item.id}:`, err);
          }
        }
        return item;
      })
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        media: processedMedia,
        count: processedMedia.length,
        nextCursor,
        hasMore,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in fetch-instagram-media:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
