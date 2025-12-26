import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  action: 'list' | 'create' | 'delete' | 'get-details' | 'sync' | 'create_lookalike' | 'create_website_audience' | 'create_engagement_audience';
  clientId: string;
  audienceId?: string;
  name?: string;
  description?: string;
  subtype?: string;
  // Lookalike specific fields
  originAudienceId?: string;
  country?: string;
  ratio?: number;
  lookalikeType?: 'similarity' | 'reach';
  // Website Audience fields
  pixelId?: string;
  retentionDays?: number;
  ruleType?: 'all_visitors' | 'url_contains' | 'url_equals' | 'event';
  urlValue?: string;
  eventName?: string;
  // Engagement Audience fields
  engagementType?: 'page' | 'instagram' | 'video';
  sourceId?: string;
  engagementEvent?: string;
  videoPercentile?: number;
  videoIds?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body: RequestBody = await req.json();
    const { 
      action, clientId, audienceId, name, description, subtype, 
      originAudienceId, country, ratio, lookalikeType,
      pixelId, retentionDays, ruleType, urlValue, eventName,
      engagementType, sourceId, engagementEvent, videoPercentile, videoIds
    } = body;

    console.log(`[manage-meta-audiences] Action: ${action}, ClientId: ${clientId}`);

    // Buscar cliente e integração Facebook
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company_id, ad_account_id, facebook_ad_accounts!clients_ad_account_id_fkey(account_id)')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    const adAccountId = client.facebook_ad_accounts?.account_id;
    if (!adAccountId) {
      throw new Error('Client does not have an ad account configured');
    }
    const actAdAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    // Buscar integração Facebook
    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, expires_at')
      .eq('company_id', client.company_id)
      .eq('is_active', true)
      .single();

    if (integrationError || !integration) {
      console.error('[manage-meta-audiences] Integration error:', integrationError);
      throw new Error('Facebook integration not found');
    }

    // Verificar se token expirou
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      throw new Error('Facebook access token has expired');
    }

    const accessToken = integration.access_token;
    const graphApiUrl = 'https://graph.facebook.com/v22.0';

    switch (action) {
      case 'list':
      case 'sync': {
        // Listar públicos do Meta com paginação
        let allAudiences: any[] = [];
        let nextUrl: string | null = `${graphApiUrl}/${actAdAccountId}/customaudiences?fields=id,name,description,subtype,approximate_count_lower_bound,approximate_count_upper_bound,operation_status&limit=100&access_token=${accessToken}`;
        
        // Paginar através de todos os resultados
        while (nextUrl) {
          const response = await fetch(nextUrl);
          const data = await response.json();

          if (data.error) {
            console.error('[manage-meta-audiences] Meta API error:', data.error);
            throw new Error(data.error.message);
          }

          const audiences = data.data || [];
          allAudiences = [...allAudiences, ...audiences];
          console.log(`[manage-meta-audiences] Fetched ${audiences.length} audiences, total: ${allAudiences.length}`);

          // Verificar se há próxima página
          nextUrl = data.paging?.next || null;
        }

        console.log(`[manage-meta-audiences] Total audiences found: ${allAudiences.length}`);

        // Se for sync, salvar no banco
        if (action === 'sync') {
          for (const audience of allAudiences) {
            const { error: upsertError } = await supabase
              .from('meta_audiences')
              .upsert({
                client_id: clientId,
                company_id: client.company_id,
                ad_account_id: adAccountId,
                meta_audience_id: audience.id,
                name: audience.name,
                description: audience.description,
                subtype: audience.subtype,
                approximate_count: audience.approximate_count_lower_bound || 0,
                operation_status: audience.operation_status,
                synced_at: new Date().toISOString(),
              }, {
                onConflict: 'client_id,meta_audience_id',
              });

            if (upsertError) {
              console.error('[manage-meta-audiences] Upsert error:', upsertError);
            }
          }
        }

        return new Response(JSON.stringify({
          success: true,
          audiences: allAudiences.map((a: any) => ({
            id: a.id,
            name: a.name,
            description: a.description,
            subtype: a.subtype,
            approximate_count: a.approximate_count_lower_bound || 0,
            operation_status: a.operation_status,
          })),
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create': {
        if (!name) {
          throw new Error('Name is required');
        }

        const url = `${graphApiUrl}/${actAdAccountId}/customaudiences`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || '',
            subtype: subtype || 'CUSTOM',
            customer_file_source: 'USER_PROVIDED_ONLY',
            access_token: accessToken,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error('[manage-meta-audiences] Create error:', data.error);
          throw new Error(data.error.message);
        }

        console.log(`[manage-meta-audiences] Created audience: ${data.id}`);

        // Salvar no banco local
        const { error: insertError } = await supabase
          .from('meta_audiences')
          .insert({
            client_id: clientId,
            company_id: client.company_id,
            ad_account_id: adAccountId,
            meta_audience_id: data.id,
            name,
            description: description || '',
            subtype: subtype || 'CUSTOM',
            synced_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[manage-meta-audiences] Insert error:', insertError);
        }

        return new Response(JSON.stringify({
          success: true,
          audience: { id: data.id, name, description },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'delete': {
        if (!audienceId) {
          throw new Error('Audience ID is required');
        }

        const url = `${graphApiUrl}/${audienceId}?access_token=${accessToken}`;
        
        const response = await fetch(url, { method: 'DELETE' });
        const data = await response.json();

        let deletedFromMeta = true;
        let message = 'Público excluído com sucesso';

        if (data.error) {
          console.error('[manage-meta-audiences] Delete error:', data.error);
          
          // Se o público não existe mais no Meta (código 100, subcode 33), 
          // ainda assim remover do banco local
          if (data.error.code === 100 && data.error.error_subcode === 33) {
            console.log(`[manage-meta-audiences] Audience ${audienceId} not found on Meta, cleaning local record`);
            deletedFromMeta = false;
            message = 'Público removido da lista (já não existia no Meta)';
          } 
          // Erro 2656: público tem lookalikes associados -> não é possível excluir
          else if (data.error.code === 2656) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Não é possível excluir este público porque existem públicos semelhantes (lookalikes) associados a ele. Exclua os lookalikes primeiro.',
              code: 2656,
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          else {
            throw new Error(data.error.message);
          }
        }

        if (deletedFromMeta) {
          console.log(`[manage-meta-audiences] Deleted audience from Meta: ${audienceId}`);
        }

        // Remover do banco local
        await supabase
          .from('meta_audiences')
          .delete()
          .eq('meta_audience_id', audienceId)
          .eq('client_id', clientId);

        console.log(`[manage-meta-audiences] Deleted audience from local DB: ${audienceId}`);

        return new Response(JSON.stringify({
          success: true,
          deleted: audienceId,
          message,
          deletedFromMeta,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'get-details': {
        if (!audienceId) {
          throw new Error('Audience ID is required');
        }

        const url = `${graphApiUrl}/${audienceId}?fields=id,name,description,subtype,approximate_count_lower_bound,approximate_count_upper_bound,operation_status,delivery_status,data_source&access_token=${accessToken}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
          console.error('[manage-meta-audiences] Get details error:', data.error);
          throw new Error(data.error.message);
        }

        return new Response(JSON.stringify({
          success: true,
          audience: {
            id: data.id,
            name: data.name,
            description: data.description,
            subtype: data.subtype,
            approximate_count: data.approximate_count_lower_bound || 0,
            operation_status: data.operation_status,
            delivery_status: data.delivery_status,
            data_source: data.data_source,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_lookalike': {
        if (!originAudienceId) {
          throw new Error('Origin audience ID is required');
        }
        if (!name) {
          throw new Error('Name is required');
        }

        const targetCountry = country || 'BR';
        const targetRatio = Math.min(Math.max(ratio || 1, 1), 20) / 100;

        console.log(`[manage-meta-audiences] Creating lookalike from ${originAudienceId}, country: ${targetCountry}, ratio: ${targetRatio}`);

        const url = `${graphApiUrl}/${actAdAccountId}/customaudiences`;
        
        const lookalikeSpec: any = {
          starting_ratio: 0,
          ratio: targetRatio,
          country: targetCountry,
        };

        if (lookalikeType === 'similarity') {
          lookalikeSpec.type = 'similarity';
        } else if (lookalikeType === 'reach') {
          lookalikeSpec.type = 'reach';
        }

        console.log(`[manage-meta-audiences] Lookalike spec:`, JSON.stringify(lookalikeSpec));

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            name,
            subtype: 'LOOKALIKE',
            origin_audience_id: originAudienceId,
            lookalike_spec: JSON.stringify(lookalikeSpec),
            access_token: accessToken,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error('[manage-meta-audiences] Create lookalike error:', data.error);
          throw new Error(data.error.message);
        }

        console.log(`[manage-meta-audiences] Created lookalike audience: ${data.id}`);

        const { error: insertError } = await supabase
          .from('meta_audiences')
          .insert({
            client_id: clientId,
            company_id: client.company_id,
            ad_account_id: adAccountId,
            meta_audience_id: data.id,
            name,
            description: `Lookalike baseado em público de origem (${targetRatio * 100}% - ${targetCountry})`,
            subtype: 'LOOKALIKE',
            synced_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[manage-meta-audiences] Insert lookalike error:', insertError);
        }

        return new Response(JSON.stringify({
          success: true,
          audience: { 
            id: data.id, 
            name, 
            subtype: 'LOOKALIKE',
            origin_audience_id: originAudienceId,
            country: targetCountry,
            ratio: targetRatio * 100,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_website_audience': {
        if (!name) {
          throw new Error('Name is required');
        }
        if (!pixelId) {
          throw new Error('Pixel ID is required');
        }

        const retention = Math.min(Math.max(retentionDays || 30, 1), 180);
        const retentionSeconds = retention * 24 * 60 * 60;

        console.log(`[manage-meta-audiences] Creating website audience with pixel ${pixelId}, retention: ${retention} days`);

        // Build rule based on ruleType
        let filter: any = { operator: 'and', filters: [] };
        
        if (ruleType === 'url_contains' && urlValue) {
          filter = {
            operator: 'and',
            filters: [
              { field: 'url', operator: 'i_contains', value: urlValue }
            ]
          };
        } else if (ruleType === 'url_equals' && urlValue) {
          filter = {
            operator: 'and',
            filters: [
              { field: 'url', operator: 'eq', value: urlValue }
            ]
          };
        } else if (ruleType === 'event' && eventName) {
          filter = {
            operator: 'and',
            filters: [
              { field: 'event', operator: 'eq', value: eventName }
            ]
          };
        }
        // For 'all_visitors', we use an empty filter

        const rule = {
          inclusions: {
            operator: 'or',
            rules: [
              {
                event_sources: [
                  { type: 'pixel', id: pixelId }
                ],
                retention_seconds: retentionSeconds,
                filter: filter
              }
            ]
          }
        };

        console.log(`[manage-meta-audiences] Website audience rule:`, JSON.stringify(rule));

        const url = `${graphApiUrl}/${actAdAccountId}/customaudiences`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `Público de website - ${ruleType === 'all_visitors' ? 'Todos visitantes' : ruleType === 'event' ? `Evento: ${eventName}` : `URL: ${urlValue}`} (${retention} dias)`,
            subtype: 'WEBSITE',
            rule: JSON.stringify(rule),
            prefill: true,
            access_token: accessToken,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error('[manage-meta-audiences] Create website audience error:', data.error);
          throw new Error(data.error.message);
        }

        console.log(`[manage-meta-audiences] Created website audience: ${data.id}`);

        const { error: insertError } = await supabase
          .from('meta_audiences')
          .insert({
            client_id: clientId,
            company_id: client.company_id,
            ad_account_id: adAccountId,
            meta_audience_id: data.id,
            name,
            description: description || `Website - ${retention} dias`,
            subtype: 'WEBSITE',
            synced_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[manage-meta-audiences] Insert website audience error:', insertError);
        }

        return new Response(JSON.stringify({
          success: true,
          audience: { 
            id: data.id, 
            name, 
            subtype: 'WEBSITE',
            pixel_id: pixelId,
            retention_days: retention,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'create_engagement_audience': {
        if (!name) {
          throw new Error('Name is required');
        }
        if (!engagementType) {
          throw new Error('Engagement type is required');
        }
        if (!sourceId) {
          throw new Error('Source ID is required');
        }

        const retention = Math.min(Math.max(retentionDays || 30, 1), 365);
        const retentionSeconds = retention * 24 * 60 * 60;

        console.log(`[manage-meta-audiences] Creating engagement audience type: ${engagementType}, source: ${sourceId}`);

        let rule: any;
        let subtypeValue: string;
        let descriptionText: string;

        if (engagementType === 'page') {
          subtypeValue = 'ENGAGEMENT';
          
          // Map engagement events to Meta API object_ids
          const eventToObjectId: { [key: string]: string } = {
            'page_engaged': 'page_engaged',
            'page_liked': 'page_liked', 
            'page_visited': 'page_visited',
            'page_messaged': 'page_messaged',
            'page_cta_clicked': 'page_cta_clicked',
            'page_saved_post': 'page_saved_post',
          };

          const objectId = eventToObjectId[engagementEvent || 'page_engaged'] || 'page_engaged';
          descriptionText = `Engajamento Página Facebook - ${engagementEvent || 'page_engaged'}`;

          rule = {
            inclusions: {
              operator: 'or',
              rules: [
                {
                  event_sources: [
                    { type: 'page', id: sourceId }
                  ],
                  retention_seconds: retentionSeconds,
                  filter: {
                    operator: 'and',
                    filters: [
                      { field: 'event', operator: 'eq', value: objectId }
                    ]
                  }
                }
              ]
            }
          };
        } else if (engagementType === 'instagram') {
          subtypeValue = 'ENGAGEMENT';
          
          const igEventMap: { [key: string]: string } = {
            'ig_business_profile_all': 'ig_business_profile_all',
            'ig_business_profile_engaged': 'ig_user_engaged_shopping_in_live',
            'ig_business_profile_any': 'ig_business_profile_all',
          };

          const igEvent = igEventMap[engagementEvent || 'ig_business_profile_all'] || 'ig_business_profile_all';
          descriptionText = `Engajamento Instagram - ${engagementEvent || 'ig_business_profile_all'}`;

          rule = {
            inclusions: {
              operator: 'or',
              rules: [
                {
                  event_sources: [
                    { type: 'ig_business', id: sourceId }
                  ],
                  retention_seconds: retentionSeconds,
                  filter: {
                    operator: 'and',
                    filters: [
                      { field: 'event', operator: 'eq', value: igEvent }
                    ]
                  }
                }
              ]
            }
          };
        } else if (engagementType === 'video') {
          subtypeValue = 'ENGAGEMENT';
          
          // Video percentile mapping
          const percentile = videoPercentile || 50;
          descriptionText = `Visualização de Vídeo - ${percentile}%`;

          rule = {
            inclusions: {
              operator: 'or',
              rules: [
                {
                  event_sources: [
                    { type: 'page', id: sourceId }
                  ],
                  retention_seconds: retentionSeconds,
                  filter: {
                    operator: 'and',
                    filters: [
                      { field: 'event', operator: 'eq', value: 'video_watched' },
                      { field: 'video_watched.video_watched_percentile', operator: 'gte', value: percentile }
                    ]
                  }
                }
              ]
            }
          };
        } else {
          throw new Error(`Unknown engagement type: ${engagementType}`);
        }

        console.log(`[manage-meta-audiences] Engagement audience rule:`, JSON.stringify(rule));

        const url = `${graphApiUrl}/${actAdAccountId}/customaudiences`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: description || `${descriptionText} (${retention} dias)`,
            subtype: subtypeValue,
            rule: JSON.stringify(rule),
            prefill: true,
            access_token: accessToken,
          }),
        });

        const data = await response.json();

        if (data.error) {
          console.error('[manage-meta-audiences] Create engagement audience error:', data.error);
          throw new Error(data.error.message);
        }

        console.log(`[manage-meta-audiences] Created engagement audience: ${data.id}`);

        const { error: insertError } = await supabase
          .from('meta_audiences')
          .insert({
            client_id: clientId,
            company_id: client.company_id,
            ad_account_id: adAccountId,
            meta_audience_id: data.id,
            name,
            description: description || descriptionText,
            subtype: subtypeValue,
            synced_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[manage-meta-audiences] Insert engagement audience error:', insertError);
        }

        return new Response(JSON.stringify({
          success: true,
          audience: { 
            id: data.id, 
            name, 
            subtype: subtypeValue,
            engagement_type: engagementType,
            source_id: sourceId,
            retention_days: retention,
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[manage-meta-audiences] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
