import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncOptions {
  clientId: string;
  companyId: string;
  period?: string;
  syncCampaigns?: boolean;
  syncAdGroups?: boolean;
  syncAds?: boolean;
  includeInactive?: boolean;
  silent?: boolean;
}

function microsToCurrency(micros: number): number {
  return micros / 1_000_000;
}

function mapGoogleStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'ENABLED': 'active',
    'PAUSED': 'paused',
    'REMOVED': 'removed',
  };
  return statusMap[status] || status.toLowerCase();
}

function getPeriodDays(period: string): number {
  const periodMap: Record<string, number> = {
    'last_7_days': 7,
    'last_14_days': 14,
    'last_30_days': 30,
    'last_90_days': 90,
  };
  return periodMap[period] || 30;
}

async function refreshTokenIfNeeded(supabase: any, integration: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);

  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('Refreshing access token...');

    const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: integration.refresh_token,
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await tokenResponse.json();
    const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await supabase
      .from('google_ads_integrations')
      .update({
        access_token: tokens.access_token,
        expires_at: newExpiresAt,
      })
      .eq('id', integration.id);

    return tokens.access_token;
  }

  return integration.access_token;
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const options: SyncOptions = await req.json();
    const {
      clientId,
      companyId,
      period = 'last_30_days',
      syncCampaigns = true,
      syncAdGroups = false,
      syncAds = false,
      includeInactive = false,
      silent = false,
    } = options;

    console.log('Starting Google Ads sync for client:', clientId);

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    if (!client.google_account_id) {
      throw new Error('Client does not have a Google Ads account configured');
    }

    // Get Google Ads account
    const { data: googleAccount, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('*, google_ads_integrations(*)')
      .eq('id', client.google_account_id)
      .single();

    if (accountError || !googleAccount) {
      throw new Error('Google Ads account not found');
    }

    const integration = googleAccount.google_ads_integrations;
    if (!integration || !integration.is_active) {
      throw new Error('Google Ads integration is not active');
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, integration);
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    const customerId = googleAccount.google_customer_id;

    // Build date range
    const days = getPeriodDays(period);
    const dateCondition = `segments.date DURING LAST_${days}_DAYS`;

    let totalCampaigns = 0;
    let totalAdGroups = 0;
    let totalAds = 0;

    if (syncCampaigns) {
      console.log('Syncing campaigns...');

      const campaignQuery = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE ${dateCondition}
        ${includeInactive ? '' : 'AND campaign.status = "ENABLED"'}
      `;

      const campaignsResponse = await fetch(
        `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: campaignQuery }),
        }
      );

      if (!campaignsResponse.ok) {
        const errorText = await campaignsResponse.text();
        console.error('Failed to fetch campaigns:', errorText);
        throw new Error(`Failed to fetch campaigns: ${errorText}`);
      }

      const campaignsData = await campaignsResponse.json();
      
      if (campaignsData.results) {
        for (const result of campaignsData.results) {
          const campaign = result.campaign;
          const metrics = result.metrics;

          const spend = microsToCurrency(parseInt(metrics.costMicros || '0'));
          const cpc = microsToCurrency(parseInt(metrics.averageCpc || '0'));
          const cpa = metrics.conversions > 0 ? spend / metrics.conversions : 0;

          await supabase
            .from('google_campaigns')
            .upsert({
              google_id: campaign.id,
              google_account_id: googleAccount.id,
              client_id: clientId,
              company_id: companyId,
              user_id: user.id,
              name: campaign.name,
              status: mapGoogleStatus(campaign.status),
              campaign_type: campaign.advertisingChannelType,
              spend,
              impressions: parseInt(metrics.impressions || '0'),
              clicks: parseInt(metrics.clicks || '0'),
              conversions: parseInt(metrics.conversions || '0'),
              ctr: parseFloat(metrics.ctr || '0'),
              cpc,
              cpa,
              period,
              is_active: campaign.status === 'ENABLED',
            }, {
              onConflict: 'google_id,company_id,period',
            });

          totalCampaigns++;
        }
      }

      console.log(`Synced ${totalCampaigns} campaigns`);
    }

    if (syncAdGroups) {
      console.log('Syncing ad groups...');

      const adGroupQuery = `
        SELECT 
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.campaign,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc
        FROM ad_group
        WHERE ${dateCondition}
        ${includeInactive ? '' : 'AND ad_group.status = "ENABLED"'}
      `;

      const adGroupsResponse = await fetch(
        `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: adGroupQuery }),
        }
      );

      if (adGroupsResponse.ok) {
        const adGroupsData = await adGroupsResponse.json();
        
        if (adGroupsData.results) {
          for (const result of adGroupsData.results) {
            const adGroup = result.adGroup;
            const metrics = result.metrics;

            // Get campaign_id from our database
            const { data: campaignData } = await supabase
              .from('google_campaigns')
              .select('id')
              .eq('google_id', adGroup.campaign.split('/').pop())
              .eq('company_id', companyId)
              .eq('period', period)
              .single();

            if (campaignData) {
              const spend = microsToCurrency(parseInt(metrics.costMicros || '0'));
              const cpc = microsToCurrency(parseInt(metrics.averageCpc || '0'));
              const cpa = metrics.conversions > 0 ? spend / metrics.conversions : 0;

              await supabase
                .from('google_ad_groups')
                .upsert({
                  google_id: adGroup.id,
                  campaign_id: campaignData.id,
                  google_account_id: googleAccount.id,
                  client_id: clientId,
                  company_id: companyId,
                  user_id: user.id,
                  name: adGroup.name,
                  status: mapGoogleStatus(adGroup.status),
                  spend,
                  impressions: parseInt(metrics.impressions || '0'),
                  clicks: parseInt(metrics.clicks || '0'),
                  conversions: parseInt(metrics.conversions || '0'),
                  ctr: parseFloat(metrics.ctr || '0'),
                  cpc,
                  cpa,
                  is_active: adGroup.status === 'ENABLED',
                }, {
                  onConflict: 'google_id,company_id',
                });

              totalAdGroups++;
            }
          }
        }
      }

      console.log(`Synced ${totalAdGroups} ad groups`);
    }

    if (syncAds) {
      console.log('Syncing ads...');

      const adsQuery = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
          ad_group_ad.ad.responsive_search_ad.headlines,
          ad_group_ad.ad.responsive_search_ad.descriptions,
          ad_group_ad.ad.final_urls,
          ad_group_ad.status,
          ad_group_ad.ad_group,
          campaign.id,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc
        FROM ad_group_ad
        WHERE ${dateCondition}
        ${includeInactive ? '' : 'AND ad_group_ad.status = "ENABLED"'}
      `;

      const adsResponse = await fetch(
        `https://googleads.googleapis.com/v15/customers/${customerId}/googleAds:search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': developerToken!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query: adsQuery }),
        }
      );

      if (adsResponse.ok) {
        const adsData = await adsResponse.json();
        
        if (adsData.results) {
          for (const result of adsData.results) {
            const ad = result.adGroupAd.ad;
            const adGroupAd = result.adGroupAd;
            const metrics = result.metrics;
            const campaign = result.campaign;

            // Get ad_group_id and campaign_id from our database
            const { data: adGroupData } = await supabase
              .from('google_ad_groups')
              .select('id')
              .eq('google_id', adGroupAd.adGroup.split('/').pop())
              .eq('company_id', companyId)
              .single();

            const { data: campaignData } = await supabase
              .from('google_campaigns')
              .select('id')
              .eq('google_id', campaign.id)
              .eq('company_id', companyId)
              .eq('period', period)
              .single();

            if (adGroupData && campaignData) {
              const spend = microsToCurrency(parseInt(metrics.costMicros || '0'));
              const cpc = microsToCurrency(parseInt(metrics.averageCpc || '0'));
              const cpa = metrics.conversions > 0 ? spend / metrics.conversions : 0;

              await supabase
                .from('google_ads')
                .upsert({
                  google_id: ad.id,
                  ad_group_id: adGroupData.id,
                  campaign_id: campaignData.id,
                  google_account_id: googleAccount.id,
                  client_id: clientId,
                  company_id: companyId,
                  user_id: user.id,
                  name: ad.name || `Ad ${ad.id}`,
                  status: mapGoogleStatus(adGroupAd.status),
                  ad_type: ad.type,
                  headlines: ad.responsiveSearchAd?.headlines || null,
                  descriptions: ad.responsiveSearchAd?.descriptions || null,
                  final_url: ad.finalUrls?.[0] || null,
                  spend,
                  impressions: parseInt(metrics.impressions || '0'),
                  clicks: parseInt(metrics.clicks || '0'),
                  conversions: parseInt(metrics.conversions || '0'),
                  ctr: parseFloat(metrics.ctr || '0'),
                  cpc,
                  cpa,
                  is_active: adGroupAd.status === 'ENABLED',
                }, {
                  onConflict: 'google_id,company_id',
                });

              totalAds++;
            }
          }
        }
      }

      console.log(`Synced ${totalAds} ads`);
    }

    // Update client's last sync
    await supabase
      .from('clients')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_period: period,
      })
      .eq('id', clientId);

    console.log('Sync completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        synced: {
          campaigns: totalCampaigns,
          adGroups: totalAdGroups,
          ads: totalAds,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in sync-google-ads-campaigns:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
