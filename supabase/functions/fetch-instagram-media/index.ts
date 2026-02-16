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

    // Determine the correct token and instagram ID based on account source
    let accessToken: string | null = null;
    let resolvedInstagramId = instagramId;
    let tokenSource = 'unknown';

    if (client.instagram_account_id) {
      const { data: igAccount } = await supabase
        .from("instagram_accounts")
        .select("facebook_page_id, source, instagram_id")
        .eq("id", client.instagram_account_id)
        .single();

      if (igAccount?.source === 'business_manager') {
        console.log(`BM account detected. Checking for linked page...`);
        
        // Option 1: BM account has a linked page - use page token
        if (igAccount.facebook_page_id) {
          const { data: fbPage } = await supabase
            .from("facebook_pages")
            .select("page_access_token, instagram_business_account_id")
            .eq("id", igAccount.facebook_page_id)
            .single();

          if (fbPage?.page_access_token) {
            accessToken = fbPage.page_access_token;
            tokenSource = 'bm_linked_page';
            console.log("Using page_access_token from BM-linked page");
          }
        }

        // Option 2: Try dynamic lookup - find a page whose instagram_business_account_id matches
        if (!accessToken) {
          const { data: matchingPage } = await supabase
            .from("facebook_pages")
            .select("id, page_access_token, page_name")
            .eq("company_id", client.company_id)
            .eq("instagram_business_account_id", instagramId)
            .eq("is_active", true)
            .single();

          if (matchingPage?.page_access_token) {
            accessToken = matchingPage.page_access_token;
            tokenSource = 'bm_dynamic_page_match';
            console.log(`Found matching page dynamically: ${matchingPage.page_name}`);

            // Auto-link for future use
            await supabase
              .from("instagram_accounts")
              .update({ facebook_page_id: matchingPage.id })
              .eq("id", client.instagram_account_id);
          }
        }

        // Option 3: No page found - return descriptive error
        if (!accessToken) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: "Conta Instagram via Business Manager sem página vinculada. Sincronize as páginas (Configurações > Facebook Ads > Atualizar Páginas) ou vincule esta conta a uma Página no Business Manager.",
              diagnostics: {
                source: 'business_manager',
                hasLinkedPage: false,
                suggestion: 'sync_pages'
              }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      } else if (igAccount?.facebook_page_id) {
        // Page-linked accounts: use the page access token
        const { data: fbPage } = await supabase
          .from("facebook_pages")
          .select("page_access_token, instagram_business_account_id")
          .eq("id", igAccount.facebook_page_id)
          .single();

        if (fbPage?.page_access_token) {
          accessToken = fbPage.page_access_token;
          tokenSource = 'page';
          console.log("Using page access token from linked Facebook page");
        }
      }
    }

    // Fallback to user-level token if no token found yet
    if (!accessToken) {
      const { data: integration } = await supabase
        .from("facebook_integrations")
        .select("access_token")
        .eq("company_id", client.company_id)
        .eq("is_active", true)
        .single();

      accessToken = integration?.access_token || null;
      if (accessToken) {
        tokenSource = 'fallback_user_token';
        console.log("Using user-level access token as fallback");
      }
    }

    if (!accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Nenhum token de acesso encontrado. Reconecte o Facebook nas configurações." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log(`Token source: ${tokenSource}`);

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
        JSON.stringify({ 
          success: false, 
          error: data.error.message,
          diagnostics: {
            tokenSource,
            errorCode: data.error.code,
            errorType: data.error.type,
          }
        }),
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
      mediaItems = mediaItems.filter((item: any) => 
        item.media_type === 'IMAGE' || item.media_type === 'CAROUSEL_ALBUM'
      );
    }

    console.log(`After filtering: ${mediaItems.length} items of type ${mediaType}`);

    // For carousel albums, we need to fetch the first image
    const processedMedia = await Promise.all(
      mediaItems.map(async (item: any) => {
        if (item.media_type === 'CAROUSEL_ALBUM' && mediaType === 'IMAGE') {
          try {
            const childrenUrl = `https://graph.facebook.com/v21.0/${item.id}/children?fields=id,media_type,media_url&access_token=${accessToken}`;
            const childrenResponse = await fetch(childrenUrl);
            const childrenData = await childrenResponse.json();
            
            if (childrenData.data && childrenData.data.length > 0) {
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
        tokenSource,
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
