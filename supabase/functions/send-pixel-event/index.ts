import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  externalId?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
}

interface CustomData {
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: string;
  orderId?: string;
  predictedLtv?: number;
  numItems?: number;
  searchString?: string;
  status?: string;
}

interface RequestBody {
  clientId: string;
  companyId: string;
  pixelId?: string; // If not provided, use primary pixel
  eventName: string;
  eventTime?: number;
  eventId?: string;
  actionSource: "website" | "app" | "phone_call" | "chat" | "email" | "physical_store" | "system_generated" | "other";
  userData: UserData;
  customData?: CustomData;
  eventSourceUrl?: string;
}

// SHA256 hash function for user data
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Hash user data fields as required by Meta
async function hashUserData(userData: UserData): Promise<Record<string, string | undefined>> {
  const hashed: Record<string, string | undefined> = {};

  if (userData.email) {
    hashed.em = await sha256(userData.email);
  }
  if (userData.phone) {
    // Remove non-digits and hash
    const cleanPhone = userData.phone.replace(/\D/g, "");
    hashed.ph = await sha256(cleanPhone);
  }
  if (userData.firstName) {
    hashed.fn = await sha256(userData.firstName);
  }
  if (userData.lastName) {
    hashed.ln = await sha256(userData.lastName);
  }
  if (userData.city) {
    hashed.ct = await sha256(userData.city);
  }
  if (userData.state) {
    hashed.st = await sha256(userData.state);
  }
  if (userData.zipCode) {
    hashed.zp = await sha256(userData.zipCode);
  }
  if (userData.country) {
    hashed.country = await sha256(userData.country);
  }
  if (userData.externalId) {
    hashed.external_id = await sha256(userData.externalId);
  }
  // These fields are not hashed
  if (userData.clientIpAddress) {
    hashed.client_ip_address = userData.clientIpAddress;
  }
  if (userData.clientUserAgent) {
    hashed.client_user_agent = userData.clientUserAgent;
  }
  if (userData.fbc) {
    hashed.fbc = userData.fbc;
  }
  if (userData.fbp) {
    hashed.fbp = userData.fbp;
  }

  return hashed;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json() as RequestBody;
    const {
      clientId,
      companyId,
      pixelId,
      eventName,
      eventTime = Math.floor(Date.now() / 1000),
      eventId = crypto.randomUUID(),
      actionSource = "system_generated",
      userData,
      customData,
      eventSourceUrl,
    } = body;

    console.log(`[send-pixel-event] Event: ${eventName}, Client: ${clientId}`);

    // Get Facebook integration
    const { data: integration, error: integrationError } = await supabase
      .from("facebook_integrations")
      .select("access_token")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .maybeSingle();

    if (integrationError || !integration) {
      return new Response(
        JSON.stringify({ error: "Facebook integration not found" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get pixel - either specific or primary
    let pixelQuery = supabase
      .from("meta_pixels")
      .select("*")
      .eq("client_id", clientId);

    if (pixelId) {
      pixelQuery = pixelQuery.eq("pixel_id", pixelId);
    } else {
      pixelQuery = pixelQuery.eq("is_primary", true);
    }

    const { data: pixel, error: pixelError } = await pixelQuery.maybeSingle();

    if (pixelError || !pixel) {
      return new Response(
        JSON.stringify({ error: "Pixel not found. Please sync pixels first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash user data
    const hashedUserData = await hashUserData(userData);

    // Build event payload
    const eventPayload: Record<string, any> = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: actionSource,
      user_data: hashedUserData,
    };

    if (eventSourceUrl) {
      eventPayload.event_source_url = eventSourceUrl;
    }

    if (customData) {
      const customDataPayload: Record<string, any> = {};
      if (customData.value !== undefined) customDataPayload.value = customData.value;
      if (customData.currency) customDataPayload.currency = customData.currency;
      if (customData.contentName) customDataPayload.content_name = customData.contentName;
      if (customData.contentCategory) customDataPayload.content_category = customData.contentCategory;
      if (customData.contentIds) customDataPayload.content_ids = customData.contentIds;
      if (customData.contentType) customDataPayload.content_type = customData.contentType;
      if (customData.orderId) customDataPayload.order_id = customData.orderId;
      if (customData.predictedLtv !== undefined) customDataPayload.predicted_ltv = customData.predictedLtv;
      if (customData.numItems !== undefined) customDataPayload.num_items = customData.numItems;
      if (customData.searchString) customDataPayload.search_string = customData.searchString;
      if (customData.status) customDataPayload.status = customData.status;
      
      if (Object.keys(customDataPayload).length > 0) {
        eventPayload.custom_data = customDataPayload;
      }
    }

    // Create log entry first with pending status
    const { data: logEntry, error: logError } = await supabase
      .from("pixel_events_log")
      .insert({
        pixel_id: pixel.id,
        client_id: clientId,
        company_id: companyId,
        event_name: eventName,
        event_time: new Date(eventTime * 1000).toISOString(),
        event_id: eventId,
        action_source: actionSource,
        user_data: hashedUserData,
        custom_data: customData,
        status: "pending",
      })
      .select()
      .single();

    if (logError) {
      console.error("Error creating log entry:", logError);
    }

    // Send event to Meta Conversions API
    const apiUrl = `https://graph.facebook.com/v21.0/${pixel.pixel_id}/events`;
    
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [eventPayload],
        access_token: integration.access_token,
      }),
    });

    const responseData = await response.json();

    console.log("Meta API response:", responseData);

    // Update log entry with result
    if (logEntry) {
      const status = responseData.error ? "error" : "sent";
      await supabase
        .from("pixel_events_log")
        .update({
          status,
          meta_response: responseData,
          error_message: responseData.error?.message,
        })
        .eq("id", logEntry.id);
    }

    if (responseData.error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.error.message,
          details: responseData.error 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventsReceived: responseData.events_received,
        fbTraceId: responseData.fbtrace_id,
        eventId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-pixel-event:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
