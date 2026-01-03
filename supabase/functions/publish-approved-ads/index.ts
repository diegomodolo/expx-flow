import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PublishDestination {
  campaignId: string;
  campaignName: string;
  adSetIds: string[];
}

interface PublishRequest {
  client_id: string;
  company_id: string;
  ad_id: string;
  destinations: PublishDestination[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { client_id, company_id, ad_id, destinations, ad_ids } = body as PublishRequest & { ad_ids?: string[] };

    console.log('[publish-approved-ads] Starting publish:', { 
      client_id, 
      ad_id, 
      destinations_count: destinations?.length,
      legacy_ad_ids: ad_ids?.length 
    });

    // Fetch client with Facebook Ad Account + Facebook Page (needed for ad creative)
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, facebook_ad_accounts(*), facebook_pages(*)')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[publish-approved-ads] Client not found:', clientError);
      throw new Error('Client not found');
    }

    // Get company's Facebook integration token (source of truth)
    const { data: integrations, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, expires_at, is_active, updated_at')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (integrationError) {
      console.error('[publish-approved-ads] Error fetching Facebook integration:', integrationError);
      throw new Error('Erro ao buscar integração do Facebook');
    }

    const facebookIntegration = integrations?.[0];

    if (!facebookIntegration?.access_token) {
      console.warn('[publish-approved-ads] No Facebook integration token found for company', company_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Credenciais do Facebook não encontradas. Configure a integração primeiro.',
          published: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (facebookIntegration.expires_at && new Date(facebookIntegration.expires_at) <= new Date()) {
      console.warn('[publish-approved-ads] Facebook token expired at', facebookIntegration.expires_at);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Token do Facebook expirado. Reconecte a integração para publicar.',
          published: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // NEW FLOW: Single ad with multiple destinations
    if (ad_id && destinations && destinations.length > 0) {
      return await publishAdToMultipleDestinations(
        supabase,
        facebookIntegration.access_token,
        client,
        ad_id,
        destinations
      );
    }

    // LEGACY FLOW: Bulk publish approved ads (for autopilot/batch)
    let query = supabase
      .from('ad_generation_queue')
      .select('*')
      .eq('client_id', client_id)
      .eq('status', 'approved');

    if (ad_ids && ad_ids.length > 0) {
      query = query.in('id', ad_ids);
    }

    const { data: approvedAds, error: adsError } = await query;

    if (adsError) throw adsError;

    if (!approvedAds || approvedAds.length === 0) {
      console.log('[publish-approved-ads] No approved ads found');
      return new Response(
        JSON.stringify({ success: true, published: 0, message: 'Nenhum anúncio aprovado para publicar' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[publish-approved-ads] Found', approvedAds.length, 'ads to publish');

    // Get default schedule config for campaign/adset
    const { data: schedule } = await supabase
      .from('ad_generation_schedules')
      .select('target_campaign_id, target_adset_id')
      .eq('client_id', client_id)
      .single();

    const publishedAds: any[] = [];
    const failedAds: any[] = [];

    for (const ad of approvedAds) {
      try {
        const result = await publishAdToMeta(
          supabase,
          facebookIntegration.access_token,
          client,
          ad,
          schedule?.target_campaign_id,
          schedule?.target_adset_id
        );

        if (result.success) {
          await supabase
            .from('ad_generation_queue')
            .update({
              status: 'published',
              published_at: new Date().toISOString(),
              meta_ad_id: result.meta_ad_id,
            })
            .eq('id', ad.id);

          publishedAds.push({
            id: ad.id,
            meta_ad_id: result.meta_ad_id,
          });
        } else {
          failedAds.push({
            id: ad.id,
            error: result.error,
          });
        }
      } catch (error: any) {
        console.error('[publish-approved-ads] Error publishing ad:', ad.id, error);
        failedAds.push({
          id: ad.id,
          error: error.message,
        });
      }
    }

    console.log('[publish-approved-ads] Results:', {
      published: publishedAds.length,
      failed: failedAds.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        published: publishedAds.length,
        failed: failedAds.length,
        publishedAds,
        failedAds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[publish-approved-ads] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// New function: Publish single ad to multiple destinations
async function publishAdToMultipleDestinations(
  supabase: any,
  accessToken: string,
  client: any,
  adId: string,
  destinations: PublishDestination[]
): Promise<Response> {
  // Fetch the ad
  const { data: ad, error: adError } = await supabase
    .from('ad_generation_queue')
    .select('*')
    .eq('id', adId)
    .single();

  if (adError || !ad) {
    return new Response(
      JSON.stringify({ success: false, error: 'Anúncio não encontrado' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
    );
  }

  // Use the Facebook account_id from the joined table (e.g., "act_486452446836316")
  // Remove "act_" prefix if present since we add it in the API call
  const rawAccountId = client.facebook_ad_accounts?.account_id;
  const adAccountId = rawAccountId?.replace('act_', '') || null;
  
  if (!adAccountId) {
    console.error('[publish-approved-ads] No FB account_id found for client:', client.id);
    return new Response(
      JSON.stringify({ success: false, error: 'Ad Account do Facebook não configurado para este cliente. Vincule uma conta de anúncios.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  console.log('[publish-approved-ads] Using FB Ad Account:', adAccountId);

  const content = ad.generated_content;
  const results: any[] = [];
  const errors: any[] = [];

  console.log('[publish-approved-ads] Publishing to', destinations.length, 'campaigns');

  // First, create the ad creative (only once, can be reused)
  const creativeResult = await createAdCreative(accessToken, client, adAccountId, content);
  
  if (!creativeResult.success) {
    return new Response(
      JSON.stringify({ success: false, error: creativeResult.error }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }

  const creativeId = creativeResult.creative_id;
  console.log('[publish-approved-ads] Created creative:', creativeId);

  // Now create ads in each destination
  for (const destination of destinations) {
    for (const adSetId of destination.adSetIds) {
      try {
        // Get the Facebook ID for this ad set
        const { data: adSetData } = await supabase
          .from('ad_sets')
          .select('facebook_id, name')
          .eq('id', adSetId)
          .single();

        if (!adSetData?.facebook_id) {
          errors.push({
            campaignId: destination.campaignId,
            adSetId,
            error: 'Conjunto de anúncios não tem ID do Facebook',
          });
          continue;
        }

        // Create the ad in this ad set
        const adResult = await createAd(
          accessToken,
          adAccountId,
          creativeId,
          adSetData.facebook_id,
          content.headline || 'AI Generated Ad'
        );

        if (adResult.success) {
          results.push({
            campaignId: destination.campaignId,
            campaignName: destination.campaignName,
            adSetId,
            adSetName: adSetData.name,
            meta_ad_id: adResult.ad_id,
          });
        } else {
          errors.push({
            campaignId: destination.campaignId,
            adSetId,
            error: adResult.error,
          });
        }
      } catch (error: any) {
        console.error('[publish-approved-ads] Error creating ad:', error);
        errors.push({
          campaignId: destination.campaignId,
          adSetId,
          error: error.message,
        });
      }
    }
  }

  // Update the ad status if at least one publish succeeded
  if (results.length > 0) {
    await supabase
      .from('ad_generation_queue')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        meta_ad_id: results[0].meta_ad_id, // Store first ad ID
      })
      .eq('id', adId);
  }

  console.log('[publish-approved-ads] Multi-destination results:', {
    published: results.length,
    failed: errors.length,
  });

  return new Response(
    JSON.stringify({
      success: results.length > 0,
      published: results.length,
      failed: errors.length,
      results,
      errors,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Create ad creative (reusable across ad sets)
async function createAdCreative(
  accessToken: string,
  client: any,
  adAccountId: string,
  content: any
): Promise<{ success: boolean; creative_id?: string; error?: string }> {
  try {
    const linkUrl = client.website_url || 'https://example.com';
    const pageId = client.facebook_pages?.page_id;

    if (!pageId) {
      console.error('[publish-approved-ads] Missing Facebook Page (page_id) for client:', client.id, {
        facebook_page_id_fk: client.facebook_page_id,
      });
      return {
        success: false,
        error: 'Página do Facebook não configurada para este cliente. Selecione uma Página do Facebook para representar sua empresa.',
      };
    }

    const creativePayload: any = {
      name: `AI Generated - ${content.headline?.substring(0, 50) || 'Ad'} - ${Date.now()}`,
      object_story_spec: {
        page_id: pageId,
        link_data: {
          link: linkUrl,
          message: content.body || content.primary_text || '',
          name: content.headline || '',
          description: content.description || '',
          call_to_action: {
            type: mapCallToAction(content.cta || content.call_to_action),
            value: { link: linkUrl },
          },
        },
      },
      access_token: accessToken,
    };

    // If we have an image URL, add it
    if (content.image_url) {
      creativePayload.object_story_spec.link_data.picture = content.image_url;
    }

    const safeLogPayload = { ...creativePayload, access_token: '[REDACTED]' };
    console.log('[publish-approved-ads] Creating creative with payload:', JSON.stringify(safeLogPayload, null, 2));

    const response = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/adcreatives`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creativePayload),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('[publish-approved-ads] Creative error:', data.error);
      return { success: false, error: data.error.message };
    }

    return { success: true, creative_id: data.id };
  } catch (error: any) {
    console.error('[publish-approved-ads] Creative creation error:', error);
    return { success: false, error: error.message };
  }
}

// Create the actual ad in an ad set with ACTIVE status
async function createAd(
  accessToken: string,
  adAccountId: string,
  creativeId: string,
  adSetFacebookId: string,
  adName: string
): Promise<{ success: boolean; ad_id?: string; error?: string }> {
  try {
    const adPayload = {
      name: `${adName} - ${Date.now()}`,
      adset_id: adSetFacebookId,
      creative: { creative_id: creativeId },
      status: 'ACTIVE', // Publish as ACTIVE
      access_token: accessToken,
    };

    console.log('[publish-approved-ads] Creating ad in adset:', adSetFacebookId);

    const response = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/ads`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adPayload),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('[publish-approved-ads] Ad creation error:', data.error);
      return { success: false, error: data.error.message };
    }

    console.log('[publish-approved-ads] Ad created:', data.id);
    return { success: true, ad_id: data.id };
  } catch (error: any) {
    console.error('[publish-approved-ads] Ad creation error:', error);
    return { success: false, error: error.message };
  }
}

// Legacy function for batch publishing
async function publishAdToMeta(
  supabase: any,
  accessToken: string,
  client: any,
  ad: any,
  targetCampaignId?: string,
  targetAdSetId?: string
): Promise<{ success: boolean; meta_ad_id?: string; error?: string }> {
  // Use the Facebook account_id from the joined table
  const rawAccountId = client.facebook_ad_accounts?.account_id;
  const adAccountId = rawAccountId?.replace('act_', '') || null;
  
  if (!adAccountId) {
    return { success: false, error: 'Ad Account do Facebook não configurado para este cliente' };
  }

  // Get facebook_id for the target ad set
  let adSetFacebookId: string | null = null;
  if (targetAdSetId) {
    const { data: adSetData } = await supabase
      .from('ad_sets')
      .select('facebook_id')
      .eq('id', targetAdSetId)
      .single();
    adSetFacebookId = adSetData?.facebook_id;
  }

  if (!adSetFacebookId) {
    return { success: false, error: 'Conjunto de anúncios não configurado ou sem ID do Facebook' };
  }

  const content = ad.generated_content;
  
  console.log('[publish-approved-ads] Publishing ad to Meta:', {
    ad_account: adAccountId,
    headline: content.headline,
    adset: adSetFacebookId,
  });

  // Create creative
  const creativeResult = await createAdCreative(accessToken, client, adAccountId, content);
  
  if (!creativeResult.success) {
    return { success: false, error: creativeResult.error };
  }

  // Create ad
  const adResult = await createAd(
    accessToken,
    adAccountId,
    creativeResult.creative_id!,
    adSetFacebookId,
    content.headline || 'AI Generated Ad'
  );

  return {
    success: adResult.success,
    meta_ad_id: adResult.ad_id,
    error: adResult.error,
  };
}

function mapCallToAction(cta: string | undefined): string {
  const ctaMap: Record<string, string> = {
    'Saiba Mais': 'LEARN_MORE',
    'Comprar': 'SHOP_NOW',
    'Cadastrar': 'SIGN_UP',
    'Baixar': 'DOWNLOAD',
    'Entrar em Contato': 'CONTACT_US',
    'Ver Mais': 'SEE_MORE',
    'Solicitar Orçamento': 'GET_QUOTE',
    'Agendar': 'BOOK_NOW',
  };

  return ctaMap[cta || ''] || cta?.toUpperCase().replace(/ /g, '_') || 'LEARN_MORE';
}
