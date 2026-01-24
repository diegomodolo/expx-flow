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

    const { clientId, carouselMediaId } = await req.json();

    console.log(`Fetching carousel children for client ${clientId}, media ID: ${carouselMediaId}`);

    if (!clientId || !carouselMediaId) {
      return new Response(
        JSON.stringify({ success: false, error: "clientId and carouselMediaId are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get client's company to find the Facebook token
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("company_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client) {
      console.error("Client error:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Client not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get the Facebook integration token
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", client.company_id)
      .eq("is_active", true)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error("Integration error:", integrationError);
      return new Response(
        JSON.stringify({ success: false, error: "Facebook integration not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    const accessToken = integration.access_token;

    // Fetch children (slides) from Instagram Graph API
    const fields = "id,media_type,media_url,thumbnail_url";
    const apiUrl = `https://graph.facebook.com/v21.0/${carouselMediaId}/children?fields=${fields}&access_token=${accessToken}`;
    
    console.log(`Fetching carousel children from Instagram API...`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.error) {
      console.error("Instagram API error:", data.error);
      return new Response(
        JSON.stringify({ success: false, error: data.error.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const children = (data.data || []).map((child: any) => ({
      id: child.id,
      media_type: child.media_type,
      media_url: child.media_url,
      thumbnail_url: child.thumbnail_url,
    }));
    
    console.log(`Received ${children.length} children from carousel`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        children,
        count: children.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in fetch-instagram-carousel-children:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
