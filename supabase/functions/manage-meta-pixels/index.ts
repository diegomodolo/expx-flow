import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "list" | "sync" | "get-stats" | "get-details" | "set-primary";
  clientId: string;
  companyId: string;
  pixelId?: string;
  localPixelId?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, clientId, companyId, pixelId, localPixelId } = await req.json() as RequestBody;

    console.log(`[manage-meta-pixels] Action: ${action}, Client: ${clientId}`);

    // Get Facebook integration for the company
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle();

    if (integrationError || !integration) {
      console.error("Integration not found:", integrationError);
      return new Response(
        JSON.stringify({ error: "Facebook integration not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get client's ad account
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("ad_account_id, facebook_ad_accounts!ad_account_id(account_id)")
      .eq("id", clientId)
      .maybeSingle();

    if (clientError || !client?.facebook_ad_accounts) {
      console.error("Client ad account not found:", clientError);
      return new Response(
        JSON.stringify({ error: "Client ad account not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adAccountId = (client.facebook_ad_accounts as any).account_id;
    const accessToken = integration.access_token;

    switch (action) {
      case "list":
      case "sync": {
        // Fetch pixels from Meta API
        const pixelsUrl = `https://graph.facebook.com/v21.0/act_${adAccountId}/adspixels?fields=id,name,creation_time,is_unavailable,data_use_setting,last_fired_time&access_token=${accessToken}`;
        
        console.log(`Fetching pixels from Meta for ad account: ${adAccountId}`);
        
        const pixelsResponse = await fetch(pixelsUrl);
        const pixelsData = await pixelsResponse.json();

        if (pixelsData.error) {
          console.error("Meta API error:", pixelsData.error);
          return new Response(
            JSON.stringify({ error: pixelsData.error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const metaPixels = pixelsData.data || [];
        console.log(`Found ${metaPixels.length} pixels from Meta`);

        if (action === "sync") {
          // Sync pixels to database
          for (const pixel of metaPixels) {
            const { error: upsertError } = await supabase
              .from("meta_pixels")
              .upsert({
                client_id: clientId,
                company_id: companyId,
                pixel_id: pixel.id,
                pixel_name: pixel.name,
                creation_time: pixel.creation_time,
                is_unavailable: pixel.is_unavailable || false,
                data_use_setting: pixel.data_use_setting,
                last_fired_time: pixel.last_fired_time,
                updated_at: new Date().toISOString(),
              }, { onConflict: "client_id,pixel_id" });

            if (upsertError) {
              console.error("Error upserting pixel:", upsertError);
            }
          }

          // If there's only one pixel, set it as primary
          if (metaPixels.length === 1) {
            await supabase
              .from("meta_pixels")
              .update({ is_primary: true })
              .eq("client_id", clientId)
              .eq("pixel_id", metaPixels[0].id);
          }
        }

        // Return pixels from database
        const { data: localPixels } = await supabase
          .from("meta_pixels")
          .select("*")
          .eq("client_id", clientId)
          .order("is_primary", { ascending: false })
          .order("pixel_name");

        return new Response(
          JSON.stringify({ 
            success: true, 
            pixels: localPixels || [],
            metaPixels: metaPixels
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-stats": {
        if (!pixelId) {
          return new Response(
            JSON.stringify({ error: "Pixel ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get pixel stats from Meta
        const statsUrl = `https://graph.facebook.com/v21.0/${pixelId}/stats?access_token=${accessToken}`;
        const statsResponse = await fetch(statsUrl);
        const statsData = await statsResponse.json();

        if (statsData.error) {
          console.error("Stats API error:", statsData.error);
          // Return empty stats instead of error
          return new Response(
            JSON.stringify({ 
              success: true, 
              stats: { data: [] }
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Update stats in database
        if (localPixelId) {
          await supabase
            .from("meta_pixels")
            .update({ 
              stats: statsData,
              updated_at: new Date().toISOString()
            })
            .eq("id", localPixelId);
        }

        return new Response(
          JSON.stringify({ success: true, stats: statsData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-details": {
        if (!pixelId) {
          return new Response(
            JSON.stringify({ error: "Pixel ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get detailed pixel info
        const detailsUrl = `https://graph.facebook.com/v21.0/${pixelId}?fields=id,name,creation_time,is_unavailable,data_use_setting,last_fired_time,owner_business,owner_ad_account&access_token=${accessToken}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.error) {
          console.error("Details API error:", detailsData.error);
          return new Response(
            JSON.stringify({ error: detailsData.error.message }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, details: detailsData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set-primary": {
        if (!localPixelId) {
          return new Response(
            JSON.stringify({ error: "Local Pixel ID required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Remove primary from all other pixels for this client
        await supabase
          .from("meta_pixels")
          .update({ is_primary: false })
          .eq("client_id", clientId);

        // Set this pixel as primary
        await supabase
          .from("meta_pixels")
          .update({ is_primary: true })
          .eq("id", localPixelId);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in manage-meta-pixels:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
