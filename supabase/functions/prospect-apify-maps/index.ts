import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProspectRequest {
  state: string;
  city: string;
  businessType: string;
  quantity?: number;
  requirePhone?: boolean;
  requireEmail?: boolean;
  requireWebsite?: boolean;
  requireAddress?: boolean;
}

interface ApifyPlace {
  title?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  email?: string;
  categoryName?: string;
  url?: string;
  placeId?: string;
  // Additional fields from Apify
  contactInfo?: {
    email?: string;
    phone?: string;
  };
  socialLinks?: {
    facebook?: string;
    instagram?: string;
  };
}

interface ExtractedLead {
  nome_fantasia: string | null;
  razao_social: string | null;
  website: string | null;
  phone: string | null;
  phone_2: string | null;
  email: string | null;
  endereco: string | null;
  cnpj: string | null;
  source_url: string;
}

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 8) return null;
  return phone.trim();
}

function hasValue(val: string | null | undefined): boolean {
  return val !== null && val !== undefined && val.trim() !== '';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN');
    if (!APIFY_TOKEN) {
      throw new Error('APIFY_API_TOKEN not configured');
    }

    const body: ProspectRequest = await req.json();
    const { 
      state, 
      city, 
      businessType, 
      quantity = 20,
      requirePhone = false,
      requireEmail = false,
      requireWebsite = false,
      requireAddress = false
    } = body;

    if (!state || !city || !businessType) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: state, city, businessType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Apify Maps] Starting search: ${businessType} in ${city}, ${state} (qty: ${quantity})`);

    // Start the Apify actor
    const actorInput = {
      searchStringsArray: [businessType],
      locationQuery: `${city}, ${state}, Brasil`,
      maxCrawledPlacesPerSearch: Math.min(quantity * 2, 100), // Extra margin for filtering
      language: "pt-BR",
      maxImages: 0,
      maxReviews: 0,
      scrapeDirectories: false,
      skipClosedPlaces: true,
    };

    console.log('[Apify Maps] Actor input:', JSON.stringify(actorInput));

    // Start the actor run
    const startResponse = await fetch(
      `https://api.apify.com/v2/acts/compass~crawler-google-places/runs?token=${APIFY_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actorInput),
      }
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      console.error('[Apify Maps] Failed to start actor:', errorText);
      throw new Error(`Failed to start Apify actor: ${startResponse.status}`);
    }

    const runData = await startResponse.json();
    const runId = runData.data?.id;
    console.log('[Apify Maps] Actor run started:', runId);

    if (!runId) {
      throw new Error('No run ID received from Apify');
    }

    // Poll for completion (max 3 minutes)
    const maxWaitTime = 180000; // 3 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();
    let status = 'RUNNING';

    while (status === 'RUNNING' || status === 'READY') {
      if (Date.now() - startTime > maxWaitTime) {
        console.warn('[Apify Maps] Timeout waiting for actor completion');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`
      );
      const statusData = await statusResponse.json();
      status = statusData.data?.status;
      console.log(`[Apify Maps] Run status: ${status}`);
    }

    if (status !== 'SUCCEEDED') {
      console.warn(`[Apify Maps] Actor finished with status: ${status}`);
    }

    // Get the dataset ID and fetch results
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) {
      throw new Error('No dataset ID received from Apify');
    }

    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${quantity * 2}`
    );
    const places: ApifyPlace[] = await resultsResponse.json();

    console.log(`[Apify Maps] Received ${places.length} places from Apify`);

    // Transform to our lead format
    const leads: ExtractedLead[] = [];

    for (const place of places) {
      const phone = normalizePhone(place.phone || place.contactInfo?.phone);
      const email = place.email || place.contactInfo?.email || null;
      const website = place.website || null;
      const endereco = place.address || [place.street, place.city, place.state].filter(Boolean).join(', ') || null;

      // Apply filters
      if (requirePhone && !hasValue(phone)) continue;
      if (requireEmail && !hasValue(email)) continue;
      if (requireWebsite && !hasValue(website)) continue;
      if (requireAddress && !hasValue(endereco)) continue;

      leads.push({
        nome_fantasia: place.title || null,
        razao_social: place.title || null,
        website,
        phone,
        phone_2: null,
        email,
        endereco,
        cnpj: null, // Google Maps doesn't have CNPJ
        source_url: place.url || `https://www.google.com/maps/place/?q=place_id:${place.placeId}`,
      });

      if (leads.length >= quantity) break;
    }

    console.log(`[Apify Maps] Returning ${leads.length} leads after filtering`);

    return new Response(
      JSON.stringify({
        success: true,
        leads,
        query: `${businessType} em ${city}, ${state}`,
        source: 'google_maps_apify',
        requested: quantity,
        totalFound: places.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Apify Maps] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
