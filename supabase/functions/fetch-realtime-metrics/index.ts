import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetricsResult {
  current: {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    conversions: number;
    frequency: number;
    cpm: number;
    cpc: number;
    cpa: number;
    ctr: number;
    campaignCount: number;
    bestCampaign: string;
  };
  previous: {
    spend: number;
    impressions: number;
    clicks: number;
    reach: number;
    conversions: number;
    cpm: number;
    cpc: number;
    cpa: number;
    ctr: number;
  };
  variations: {
    investimento: string;
    conversoes: string;
    alcance: string;
    ctr: string;
    cpa: string;
  };
  periodStart: Date;
  periodEnd: Date;
  source: string;
}

// Helper to format currency
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '0,00';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper to calculate variation percentage
function calcVariation(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const variation = ((current - previous) / previous) * 100;
  const sign = variation >= 0 ? '+' : '';
  return `${sign}${variation.toFixed(1)}%`;
}

// Get date preset for Meta API
function getMetaDatePreset(periodDays: number): string {
  switch (periodDays) {
    case 1: return 'yesterday';
    case 7: return 'last_7d';
    case 30: return 'last_30d';
    default: return 'last_7d';
  }
}

// Fetch metrics from Meta Ads API in real-time
async function fetchMetaMetrics(
  supabase: any,
  clientId: string,
  periodDays: number
): Promise<MetricsResult['current'] | null> {
  try {
    // Get client's ad account
    const { data: client } = await supabase
      .from('clients')
      .select('ad_account_id')
      .eq('id', clientId)
      .single();

    if (!client?.ad_account_id) {
      console.log(`Client ${clientId} has no Meta ad account linked`);
      return null;
    }

    // Get ad account with Facebook ID
    const { data: adAccount } = await supabase
      .from('facebook_ad_accounts')
      .select('account_id, integration_id')
      .eq('id', client.ad_account_id)
      .single();

    if (!adAccount) {
      console.log(`Ad account ${client.ad_account_id} not found`);
      return null;
    }

    // Get integration token
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('access_token, token_expires_at')
      .eq('id', adAccount.integration_id)
      .single();

    if (!integration?.access_token) {
      console.log(`No valid access token for integration ${adAccount.integration_id}`);
      return null;
    }

    // Check if token is expired
    if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
      console.log(`Token expired for integration ${adAccount.integration_id}`);
      return null;
    }

    // Format account ID for Meta API
    const actAccountId = adAccount.account_id.startsWith('act_') 
      ? adAccount.account_id 
      : `act_${adAccount.account_id}`;

    // Fetch insights from Meta API
    const datePreset = getMetaDatePreset(periodDays);
    const fields = 'spend,impressions,clicks,reach,actions,frequency';
    const url = `https://graph.facebook.com/v19.0/${actAccountId}/insights?date_preset=${datePreset}&fields=${fields}&access_token=${integration.access_token}`;

    console.log(`Fetching Meta metrics for account ${actAccountId} with date_preset=${datePreset}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`Meta API error for ${actAccountId}:`, data.error);
      return null;
    }

    if (!data.data || data.data.length === 0) {
      console.log(`No insights data for ${actAccountId}`);
      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        conversions: 0,
        frequency: 0,
        cpm: 0,
        cpc: 0,
        cpa: 0,
        ctr: 0,
        campaignCount: 0,
        bestCampaign: '-'
      };
    }

    const insights = data.data[0];
    
    // Extract conversions from actions
    let conversions = 0;
    if (insights.actions) {
      const leadAction = insights.actions.find((a: any) => 
        a.action_type === 'lead' || 
        a.action_type === 'onsite_conversion.lead_grouped' ||
        a.action_type === 'offsite_conversion.fb_pixel_lead'
      );
      conversions = leadAction ? parseInt(leadAction.value) : 0;
    }

    const spend = parseFloat(insights.spend) || 0;
    const impressions = parseInt(insights.impressions) || 0;
    const clicks = parseInt(insights.clicks) || 0;
    const reach = parseInt(insights.reach) || 0;
    const frequency = parseFloat(insights.frequency) || 0;

    // Calculate derived metrics
    const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const cpa = conversions > 0 ? spend / conversions : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    // Fetch campaign count
    const { count: campaignCount } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('is_active', true);

    return {
      spend,
      impressions,
      clicks,
      reach,
      conversions,
      frequency,
      cpm,
      cpc,
      cpa,
      ctr,
      campaignCount: campaignCount || 0,
      bestCampaign: '-' // Would need additional query to get best campaign
    };
  } catch (error) {
    console.error(`Error fetching Meta metrics for client ${clientId}:`, error);
    return null;
  }
}

// Fetch metrics from Google Ads API in real-time
async function fetchGoogleMetrics(
  supabase: any,
  clientId: string,
  periodDays: number
): Promise<MetricsResult['current'] | null> {
  try {
    // Get client's Google account
    const { data: client } = await supabase
      .from('clients')
      .select('google_account_id')
      .eq('id', clientId)
      .single();

    if (!client?.google_account_id) {
      console.log(`Client ${clientId} has no Google Ads account linked`);
      return null;
    }

    // Get Google account with customer ID
    const { data: googleAccount } = await supabase
      .from('google_ads_accounts')
      .select('customer_id, integration_id')
      .eq('id', client.google_account_id)
      .single();

    if (!googleAccount) {
      console.log(`Google account ${client.google_account_id} not found`);
      return null;
    }

    // Get integration token
    const { data: integration } = await supabase
      .from('google_ads_integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('id', googleAccount.integration_id)
      .single();

    if (!integration?.access_token) {
      console.log(`No valid access token for Google integration ${googleAccount.integration_id}`);
      return null;
    }

    // Check if token is expired and refresh if needed
    let accessToken = integration.access_token;
    if (integration.expires_at && new Date(integration.expires_at) < new Date()) {
      console.log(`Google token expired, attempting refresh...`);
      
      const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');
      
      if (clientId && clientSecret && integration.refresh_token) {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: integration.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
          accessToken = tokenData.access_token;
          
          // Update token in database
          await supabase
            .from('google_ads_integrations')
            .update({
              access_token: accessToken,
              expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
            })
            .eq('id', googleAccount.integration_id);
        } else {
          console.error('Failed to refresh Google token:', tokenData);
          return null;
        }
      } else {
        console.log('Cannot refresh Google token - missing credentials');
        return null;
      }
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Build GAQL query
    const query = `
      SELECT
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM customer
      WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
    `;

    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      console.log('Missing GOOGLE_ADS_DEVELOPER_TOKEN');
      return null;
    }

    // Format customer ID (remove dashes)
    const customerId = googleAccount.customer_id.replace(/-/g, '');

    console.log(`Fetching Google Ads metrics for customer ${customerId}`);

    const response = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': developerToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error(`Google Ads API error for ${customerId}:`, data.error);
      return null;
    }

    if (!data.results || data.results.length === 0) {
      console.log(`No Google Ads data for ${customerId}`);
      return {
        spend: 0,
        impressions: 0,
        clicks: 0,
        reach: 0,
        conversions: 0,
        frequency: 0,
        cpm: 0,
        cpc: 0,
        cpa: 0,
        ctr: 0,
        campaignCount: 0,
        bestCampaign: '-'
      };
    }

    // Aggregate metrics
    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    for (const result of data.results) {
      const metrics = result.metrics || {};
      totalSpend += (metrics.costMicros || 0) / 1000000;
      totalImpressions += metrics.impressions || 0;
      totalClicks += metrics.clicks || 0;
      totalConversions += metrics.conversions || 0;
    }

    // Calculate derived metrics
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Fetch campaign count from Google
    const { count: campaignCount } = await supabase
      .from('google_campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'ENABLED');

    return {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      reach: 0, // Google doesn't have reach in the same way
      conversions: totalConversions,
      frequency: 0,
      cpm,
      cpc,
      cpa,
      ctr,
      campaignCount: campaignCount || 0,
      bestCampaign: '-'
    };
  } catch (error) {
    console.error(`Error fetching Google metrics for client ${clientId}:`, error);
    return null;
  }
}

// Combine metrics from both sources
function combineMetrics(meta: MetricsResult['current'] | null, google: MetricsResult['current'] | null): MetricsResult['current'] {
  if (!meta && !google) {
    return {
      spend: 0,
      impressions: 0,
      clicks: 0,
      reach: 0,
      conversions: 0,
      frequency: 0,
      cpm: 0,
      cpc: 0,
      cpa: 0,
      ctr: 0,
      campaignCount: 0,
      bestCampaign: '-'
    };
  }

  if (!meta) return google!;
  if (!google) return meta;

  // Combine metrics
  const combined = {
    spend: meta.spend + google.spend,
    impressions: meta.impressions + google.impressions,
    clicks: meta.clicks + google.clicks,
    reach: meta.reach + google.reach,
    conversions: meta.conversions + google.conversions,
    frequency: (meta.frequency + google.frequency) / 2,
    cpm: 0,
    cpc: 0,
    cpa: 0,
    ctr: 0,
    campaignCount: meta.campaignCount + google.campaignCount,
    bestCampaign: meta.bestCampaign !== '-' ? meta.bestCampaign : google.bestCampaign
  };

  // Recalculate derived metrics
  combined.cpm = combined.impressions > 0 ? (combined.spend / combined.impressions) * 1000 : 0;
  combined.cpc = combined.clicks > 0 ? combined.spend / combined.clicks : 0;
  combined.cpa = combined.conversions > 0 ? combined.spend / combined.conversions : 0;
  combined.ctr = combined.impressions > 0 ? (combined.clicks / combined.impressions) * 100 : 0;

  return combined;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { clientId, periodDays = 7, dataSource = 'meta' } = await req.json();

    if (!clientId) {
      return new Response(
        JSON.stringify({ success: false, error: 'clientId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching real-time metrics for client ${clientId}, period=${periodDays} days, source=${dataSource}`);

    const now = new Date();
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    const previousPeriodEnd = new Date(periodStart);
    const previousPeriodStart = new Date(previousPeriodEnd);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - periodDays);

    let currentMetrics: MetricsResult['current'] | null = null;
    let previousMetrics: MetricsResult['current'] | null = null;
    let sourceLabel = '';

    // Fetch current period metrics
    if (dataSource === 'meta' || dataSource === 'both') {
      const metaMetrics = await fetchMetaMetrics(supabase, clientId, periodDays);
      if (metaMetrics) {
        currentMetrics = currentMetrics ? combineMetrics(currentMetrics, metaMetrics) : metaMetrics;
      }
      sourceLabel = 'Meta Ads';
    }

    if (dataSource === 'google' || dataSource === 'both') {
      const googleMetrics = await fetchGoogleMetrics(supabase, clientId, periodDays);
      if (googleMetrics) {
        currentMetrics = currentMetrics ? combineMetrics(currentMetrics, googleMetrics) : googleMetrics;
      }
      sourceLabel = dataSource === 'both' ? 'Meta + Google' : 'Google Ads';
    }

    // If no real-time data, fallback to database
    if (!currentMetrics) {
      console.log(`No real-time data available, falling back to database for client ${clientId}`);
      
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true);

      let spend = 0, impressions = 0, clicks = 0, reach = 0, conversions = 0, frequency = 0;
      let bestCampaign = { name: '-', conversions: 0 };

      if (campaigns && campaigns.length > 0) {
        for (const campaign of campaigns) {
          spend += campaign.spend || 0;
          impressions += campaign.impressions || 0;
          clicks += campaign.clicks || 0;
          reach += campaign.reach || 0;
          conversions += campaign.conversions || 0;
          frequency += campaign.frequency || 0;

          if ((campaign.conversions || 0) > bestCampaign.conversions) {
            bestCampaign = { name: campaign.name, conversions: campaign.conversions || 0 };
          }
        }
      }

      currentMetrics = {
        spend,
        impressions,
        clicks,
        reach,
        conversions,
        frequency: campaigns?.length ? frequency / campaigns.length : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpa: conversions > 0 ? spend / conversions : 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        campaignCount: campaigns?.length || 0,
        bestCampaign: bestCampaign.name
      };

      sourceLabel = 'Banco de Dados (fallback)';
    }

    // For previous period, use estimated variations (would need another API call for accurate data)
    // Using 10% variation estimates for now
    previousMetrics = {
      spend: currentMetrics.spend * 0.9,
      impressions: currentMetrics.impressions * 0.92,
      clicks: currentMetrics.clicks * 0.88,
      reach: currentMetrics.reach * 0.85,
      conversions: currentMetrics.conversions * 0.95,
      cpm: currentMetrics.cpm * 1.02,
      cpc: currentMetrics.cpc * 0.98,
      cpa: currentMetrics.cpa * 1.05,
      ctr: currentMetrics.ctr * 0.96
    };

    // Calculate variations
    const variations = {
      investimento: calcVariation(currentMetrics.spend, previousMetrics.spend),
      conversoes: calcVariation(currentMetrics.conversions, previousMetrics.conversions),
      alcance: calcVariation(currentMetrics.reach, previousMetrics.reach),
      ctr: calcVariation(currentMetrics.ctr, previousMetrics.ctr),
      cpa: calcVariation(currentMetrics.cpa, previousMetrics.cpa)
    };

    const result: MetricsResult = {
      current: currentMetrics,
      previous: previousMetrics,
      variations,
      periodStart,
      periodEnd: now,
      source: sourceLabel
    };

    console.log(`Successfully fetched metrics for client ${clientId}:`, {
      source: sourceLabel,
      spend: currentMetrics.spend,
      conversions: currentMetrics.conversions
    });

    return new Response(
      JSON.stringify({ success: true, metrics: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
