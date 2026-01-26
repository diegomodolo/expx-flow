import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UpdateAdSetRequest {
  clientId: string;
  adSetId: string;
  facebookId: string;
  updates: {
    name?: string;
    status?: string;
    daily_budget?: number;
    targeting?: {
      age_min?: number;
      age_max?: number;
      genders?: number[];
      custom_audiences?: { id: string }[];
      excluded_custom_audiences?: { id: string }[];
      flexible_spec?: { interests: { id: string; name: string }[] }[];
      geo_locations?: { countries: string[] };
    };
    pixel_id?: string;
    conversion_event?: string;
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

    const { clientId, adSetId, facebookId, updates } = await req.json() as UpdateAdSetRequest;

    console.log(`Updating ad set ${facebookId} for client ${clientId}:`, updates);

    // Get client with company_id
    const { data: client, error: clientError } = await supabaseClient
      .from("clients")
      .select("company_id")
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

    // Build update params for Meta API
    const updateParams = new URLSearchParams();
    updateParams.append("access_token", accessToken);

    if (updates.name) {
      updateParams.append("name", updates.name);
    }

    if (updates.status) {
      updateParams.append("status", updates.status);
    }

    if (updates.daily_budget !== undefined) {
      updateParams.append("daily_budget", String(updates.daily_budget));
    }

    // Build targeting if provided
    if (updates.targeting) {
      const targeting: any = {
        geo_locations: updates.targeting.geo_locations || { countries: ["BR"] },
        targeting_automation: {
          advantage_audience: 0,
        },
      };

      if (updates.targeting.age_min) {
        targeting.age_min = updates.targeting.age_min;
      }
      if (updates.targeting.age_max) {
        targeting.age_max = updates.targeting.age_max;
      }
      if (updates.targeting.genders?.length) {
        targeting.genders = updates.targeting.genders;
      }
      if (updates.targeting.custom_audiences?.length) {
        targeting.custom_audiences = updates.targeting.custom_audiences;
      }
      if (updates.targeting.excluded_custom_audiences?.length) {
        targeting.excluded_custom_audiences = updates.targeting.excluded_custom_audiences;
      }
      if (updates.targeting.flexible_spec?.length) {
        targeting.flexible_spec = updates.targeting.flexible_spec;
      }

      updateParams.append("targeting", JSON.stringify(targeting));
      console.log("Updating targeting:", JSON.stringify(targeting));
    }

    // Update Ad Set in Meta with retry logic for transient errors
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Sending update to Meta API (attempt ${attempt}/${maxRetries})...`);
      
      const updateResponse = await fetch(
        `https://graph.facebook.com/v21.0/${facebookId}`,
        { method: "POST", body: updateParams }
      );

      const updateResult = await updateResponse.json();
      console.log(`Meta API response (attempt ${attempt}):`, updateResult);

      if (!updateResult.error) {
        // Success - continue with local database update
        lastError = null;
        break;
      }

      // Check if error is transient (code 2) - retry
      if (updateResult.error.is_transient || updateResult.error.code === 2) {
        lastError = updateResult.error;
        console.log(`Transient error, retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000)); // Exponential backoff
        continue;
      }

      // Non-transient error - throw immediately
      throw new Error(`Failed to update ad set: ${updateResult.error.message}`);
    }

    if (lastError) {
      throw new Error(`Failed to update ad set after ${maxRetries} attempts: ${lastError.message}`);
    }

    // Update local database
    const localUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) {
      localUpdates.name = updates.name;
    }
    if (updates.status) {
      localUpdates.status = updates.status === 'ACTIVE' ? 'active' : 'paused';
      localUpdates.is_active = updates.status === 'ACTIVE';
    }
    if (updates.daily_budget !== undefined) {
      // Convert from cents to reais for local storage
      localUpdates.daily_budget = updates.daily_budget / 100;
    }
    if (updates.targeting) {
      localUpdates.targeting = JSON.stringify(updates.targeting);
    }

    const { error: dbError } = await supabaseClient
      .from("ad_sets")
      .update(localUpdates)
      .eq("id", adSetId);

    if (dbError) {
      console.error("Error updating local database:", dbError);
      // Don't throw - Meta update succeeded
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Ad set updated successfully",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in update-meta-adset:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
