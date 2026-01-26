import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DuplicateRequest {
  entityType: "campaign" | "adset" | "ad";
  entityId: string;
  clientId: string;
  facebookId: string;
  newName: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Validate JWT using getClaims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", claimsData.claims.sub);

    const body: DuplicateRequest = await req.json();
    const { entityType, entityId, clientId, facebookId, newName } = body;

    console.log(`Duplicating ${entityType} with facebookId: ${facebookId}, newName: ${newName}`);

    // Fetch client's company_id and ad_account_id
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("company_id, ad_account_id")
      .eq("id", clientId)
      .single();

    if (clientError || !client?.company_id) {
      console.error("Client error:", clientError);
      return new Response(
        JSON.stringify({ success: false, error: "Cliente não encontrado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch Meta access token from facebook_integrations
    const { data: integration, error: integrationError } = await supabaseClient
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", client.company_id)
      .single();

    if (integrationError || !integration?.access_token) {
      console.error("Integration error:", integrationError);
      return new Response(
        JSON.stringify({ success: false, error: "Token do Meta não encontrado. Configure a integração com o Facebook." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch ad account ID from facebook_ad_accounts
    let adAccountId = null;
    if (client.ad_account_id) {
      const { data: adAccount, error: adAccountError } = await supabaseClient
        .from("facebook_ad_accounts")
        .select("account_id")
        .eq("id", client.ad_account_id)
        .single();

      if (!adAccountError && adAccount?.account_id) {
        // Remove "act_" prefix if present
        adAccountId = adAccount.account_id.replace("act_", "");
      }
    }

    const accessToken = integration.access_token;

    let result;

    switch (entityType) {
      case "campaign":
        result = await duplicateCampaign(facebookId, newName, accessToken);
        break;
      case "adset":
        result = await duplicateAdSet(facebookId, newName, accessToken);
        break;
      case "ad":
        result = await duplicateAd(facebookId, newName, adAccountId, accessToken);
        break;
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Tipo de entidade inválido" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!result.success) {
      return new Response(
        JSON.stringify({ success: false, error: result.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully duplicated ${entityType}:`, result);

    return new Response(
      JSON.stringify({ success: true, data: result.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in duplicate-tree-entity:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function duplicateCampaign(facebookId: string, newName: string, accessToken: string) {
  try {
    // Use the Meta API copies endpoint for campaigns
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${facebookId}/copies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deep_copy: true,
          rename_options: JSON.stringify({ rename_suffix: "" }),
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta API error duplicating campaign:", data.error);
      return { success: false, error: data.error.message };
    }

    // Update the name of the copied campaign
    if (data.copied_campaign_id) {
      await fetch(
        `https://graph.facebook.com/v20.0/${data.copied_campaign_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            access_token: accessToken,
          }),
        }
      );
    }

    return { success: true, data: { copiedId: data.copied_campaign_id } };
  } catch (error) {
    console.error("Error duplicating campaign:", error);
    return { success: false, error: error.message };
  }
}

async function duplicateAdSet(facebookId: string, newName: string, accessToken: string) {
  try {
    // Use the Meta API copies endpoint for ad sets
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${facebookId}/copies`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deep_copy: true,
          rename_options: JSON.stringify({ rename_suffix: "" }),
          access_token: accessToken,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Meta API error duplicating ad set:", data.error);
      return { success: false, error: data.error.message };
    }

    // Update the name of the copied ad set
    if (data.copied_adset_id) {
      await fetch(
        `https://graph.facebook.com/v20.0/${data.copied_adset_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newName,
            access_token: accessToken,
          }),
        }
      );
    }

    return { success: true, data: { copiedId: data.copied_adset_id } };
  } catch (error) {
    console.error("Error duplicating ad set:", error);
    return { success: false, error: error.message };
  }
}

async function duplicateAd(facebookId: string, newName: string, adAccountId: string, accessToken: string) {
  try {
    // First, fetch the original ad's data
    const getResponse = await fetch(
      `https://graph.facebook.com/v20.0/${facebookId}?fields=name,adset_id,creative,status&access_token=${accessToken}`
    );

    const originalAd = await getResponse.json();

    if (originalAd.error) {
      console.error("Meta API error fetching ad:", originalAd.error);
      return { success: false, error: originalAd.error.message };
    }

    console.log("Original ad data:", originalAd);

    // Create a new ad with the same creative
    const createResponse = await fetch(
      `https://graph.facebook.com/v20.0/act_${adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          adset_id: originalAd.adset_id,
          creative: { creative_id: originalAd.creative?.id },
          status: "PAUSED", // Create as paused for safety
          access_token: accessToken,
        }),
      }
    );

    const newAd = await createResponse.json();

    if (newAd.error) {
      console.error("Meta API error creating ad:", newAd.error);
      return { success: false, error: newAd.error.message };
    }

    return { success: true, data: { copiedId: newAd.id } };
  } catch (error) {
    console.error("Error duplicating ad:", error);
    return { success: false, error: error.message };
  }
}
