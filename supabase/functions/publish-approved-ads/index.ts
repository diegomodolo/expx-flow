import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { client_id, company_id, ad_ids } = await req.json();

    console.log('[publish-approved-ads] Starting publish:', { client_id, ad_ids_count: ad_ids?.length });

    // Fetch client with Meta credentials
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*, facebook_ad_accounts(*)')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      console.error('[publish-approved-ads] Client not found:', clientError);
      throw new Error('Client not found');
    }

    // Get company's Facebook credentials
    const { data: facebookCredential } = await supabase
      .from('platform_credentials')
      .select('*')
      .eq('company_id', company_id)
      .eq('platform', 'facebook')
      .single();

    if (!facebookCredential?.access_token) {
      console.warn('[publish-approved-ads] No Facebook credentials found');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Credenciais do Facebook não encontradas. Configure a integração primeiro.',
          published: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch approved ads to publish
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

    const publishedAds: any[] = [];
    const failedAds: any[] = [];

    for (const ad of approvedAds) {
      try {
        const result = await publishAdToMeta(
          facebookCredential.access_token,
          client,
          ad
        );

        if (result.success) {
          // Update ad status to published
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

async function publishAdToMeta(
  accessToken: string,
  client: any,
  ad: any
): Promise<{ success: boolean; meta_ad_id?: string; error?: string }> {
  const adAccountId = client.ad_account_id || client.facebook_ad_accounts?.facebook_account_id;
  
  if (!adAccountId) {
    return { success: false, error: 'Ad Account não configurado para este cliente' };
  }

  const content = ad.generated_content;
  
  console.log('[publish-approved-ads] Publishing ad to Meta:', {
    ad_account: adAccountId,
    headline: content.headline,
  });

  try {
    // Step 1: Create Ad Creative
    const creativePayload = {
      name: `AI Generated - ${content.headline?.substring(0, 50) || 'Ad'}`,
      object_story_spec: {
        page_id: client.facebook_page_id,
        link_data: {
          link: client.website_url || 'https://example.com',
          message: content.primary_text,
          name: content.headline,
          description: content.description,
          call_to_action: {
            type: mapCallToAction(content.call_to_action),
          },
        },
      },
      access_token: accessToken,
    };

    // If we have an image URL, add it
    if (content.image_url) {
      creativePayload.object_story_spec.link_data.picture = content.image_url;
    }

    const creativeResponse = await fetch(
      `https://graph.facebook.com/v18.0/act_${adAccountId}/adcreatives`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creativePayload),
      }
    );

    const creativeData = await creativeResponse.json();

    if (creativeData.error) {
      console.error('[publish-approved-ads] Creative error:', creativeData.error);
      return { success: false, error: creativeData.error.message };
    }

    const creativeId = creativeData.id;
    console.log('[publish-approved-ads] Created creative:', creativeId);

    // Step 2: Create the Ad (would need a campaign and ad set)
    // For now, we'll return success with the creative ID
    // In production, this would also create the campaign structure if needed

    return {
      success: true,
      meta_ad_id: creativeId, // Would be the actual ad ID in production
    };
  } catch (error: any) {
    console.error('[publish-approved-ads] Meta API error:', error);
    return { success: false, error: error.message };
  }
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
