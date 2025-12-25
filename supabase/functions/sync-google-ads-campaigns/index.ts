import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Updated to latest supported Google Ads API version
const GOOGLE_ADS_API_VERSION = 'v22';

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

function microsToCurrency(micros: number | string): number {
  const value = typeof micros === 'string' ? parseInt(micros) : micros;
  return value / 1_000_000;
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
    '7': 7,
    '14': 14,
    '30': 30,
    '90': 90,
  };
  return periodMap[period] || 30;
}

// Normalize period to consistent format (always use days number)
function normalizePeriod(period: string): string {
  const days = getPeriodDays(period);
  return days.toString();
}

function getDateRange(days: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

async function refreshTokenIfNeeded(supabase: any, integration: any): Promise<string> {
  const now = new Date();
  const expiresAt = new Date(integration.expires_at);

  // Refresh if token expires in less than 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    console.log('🔄 Refreshing access token...');

    const clientId = Deno.env.get('GOOGLE_ADS_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_ADS_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Missing GOOGLE_ADS_CLIENT_ID or GOOGLE_ADS_CLIENT_SECRET');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: integration.refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token refresh failed:', errorText);
      throw new Error(`Failed to refresh token: ${errorText}`);
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

    console.log('✅ Token refreshed successfully');
    return tokens.access_token;
  }

  return integration.access_token;
}

class GoogleAdsApiError extends Error {
  status: number;
  raw: string;
  parsed?: any;

  constructor(status: number, raw: string, parsed?: any) {
    super(`Google Ads API error (${status}): ${raw}`);
    this.status = status;
    this.raw = raw;
    this.parsed = parsed;
  }
}

function isUserPermissionDenied(err: unknown): boolean {
  if (!(err instanceof GoogleAdsApiError)) return false;
  if (err.status !== 403) return false;

  const details = err.parsed?.error?.details;
  if (!Array.isArray(details)) return false;

  for (const d of details) {
    const errors = d?.errors;
    if (!Array.isArray(errors)) continue;
    for (const e of errors) {
      if (e?.errorCode?.authorizationError === 'USER_PERMISSION_DENIED') return true;
    }
  }

  return false;
}

async function makeGoogleAdsRequest(
  customerId: string,
  accessToken: string,
  developerToken: string,
  query: string,
  loginCustomerId?: string
): Promise<any> {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${customerId}/googleAds:search`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  if (loginCustomerId && loginCustomerId !== customerId) {
    headers['login-customer-id'] = loginCustomerId;
  }

  console.log(`📡 Making request to Google Ads API ${GOOGLE_ADS_API_VERSION}`);
  console.log(`   Customer ID: ${customerId}`);
  if (loginCustomerId) {
    console.log(`   Login Customer ID: ${loginCustomerId}`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Google Ads API error (${response.status}):`, errorText);

    let parsed: any | undefined;
    try {
      parsed = JSON.parse(errorText);
      if (parsed?.error?.details) {
        console.error('   Error details:', JSON.stringify(parsed.error.details, null, 2));
      }
    } catch {
      // ignore
    }

    throw new GoogleAdsApiError(response.status, errorText, parsed);
  }

  return response.json();
}

async function listAccessibleCustomerIds(accessToken: string, developerToken: string): Promise<string[]> {
  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers:listAccessibleCustomers`;

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.warn(`⚠️ Failed to listAccessibleCustomers (${resp.status}):`, text);
    return [];
  }

  const json = await resp.json();
  const resourceNames: string[] = json?.resourceNames || [];
  return resourceNames
    .map((r) => (typeof r === 'string' ? r.split('/').pop() : null))
    .filter((x): x is string => Boolean(x));
}

async function makeGoogleAdsRequestWithFallback(args: {
  customerId: string;
  accessToken: string;
  developerToken: string;
  query: string;
  loginCustomerIds: Array<string | undefined>;
}): Promise<{ data: any; usedLoginCustomerId?: string }> {
  const uniq: Array<string | undefined> = [];
  const seen = new Set<string>();
  let lastErr: unknown;

  for (const id of args.loginCustomerIds) {
    if (!id) {
      uniq.push(undefined);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    uniq.push(id);
  }

  // Always try without login-customer-id first (covers direct-access accounts)
  if (!uniq.includes(undefined)) uniq.unshift(undefined);

  for (const loginCustomerId of uniq) {
    try {
      const data = await makeGoogleAdsRequest(
        args.customerId,
        args.accessToken,
        args.developerToken,
        args.query,
        loginCustomerId
      );
      return { data, usedLoginCustomerId: loginCustomerId };
    } catch (err) {
      lastErr = err;
      if (isUserPermissionDenied(err)) {
        console.warn(
          `⚠️ USER_PERMISSION_DENIED for customer ${args.customerId} with login-customer-id=${loginCustomerId ?? 'none'}. Trying next...`
        );
        continue;
      }
      throw err;
    }
  }

  // If all candidates failed with USER_PERMISSION_DENIED, try using every accessible customer
  // as login-customer-id (covers multi-level manager hierarchies).
  if (isUserPermissionDenied(lastErr)) {
    const accessible = await listAccessibleCustomerIds(args.accessToken, args.developerToken);
    const extras = accessible
      .map((id) => id.replace(/-/g, ''))
      .filter((id) => id && id !== args.customerId && !seen.has(id))
      .slice(0, 25);

    if (extras.length) {
      console.log(`🔍 Retrying with accessible customer IDs as login-customer-id (max 25): ${extras.join(', ')}`);
      for (const loginCustomerId of extras) {
        try {
          const data = await makeGoogleAdsRequest(
            args.customerId,
            args.accessToken,
            args.developerToken,
            args.query,
            loginCustomerId
          );
          return { data, usedLoginCustomerId: loginCustomerId };
        } catch (err) {
          lastErr = err;
          if (isUserPermissionDenied(err)) continue;
          throw err;
        }
      }
    }
  }

  throw lastErr;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting Google Ads sync...');
    
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
      console.error('❌ Auth error:', userError);
      throw new Error('Unauthorized');
    }

    console.log(`👤 User authenticated: ${user.id}`);

    const options: SyncOptions = await req.json();
    const {
      clientId,
      companyId,
      period: rawPeriod = 'last_30_days',
      syncCampaigns = true,
      syncAdGroups = false,
      syncAds = false,
      includeInactive = false,
      silent = false,
    } = options;

    // Normalize period to prevent duplicates (e.g., 'last_30_days' and '30' should be the same)
    const period = normalizePeriod(rawPeriod);

    console.log(`📋 Sync options:`, {
      clientId,
      companyId,
      period,
      rawPeriod,
      syncCampaigns,
      syncAdGroups,
      syncAds,
      includeInactive,
    });

    // Get client info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      console.error('❌ Client error:', clientError);
      throw new Error('Client not found');
    }

    console.log(`📦 Client: ${client.name}`);

    // IMPORTANT: use the client's company_id (source of truth) to satisfy FK constraints
    const effectiveCompanyId = (client.company_id || companyId) as string | undefined;
    if (!effectiveCompanyId) {
      throw new Error('Client is missing company_id and no companyId was provided');
    }

    if (effectiveCompanyId !== companyId) {
      console.log(`🏢 Using client.company_id as company_id (requested=${companyId}, resolved=${effectiveCompanyId})`);
    }

    const { data: companyRow, error: companyLookupError } = await supabase
      .from('companies')
      .select('id')
      .eq('id', effectiveCompanyId)
      .maybeSingle();

    if (companyLookupError || !companyRow) {
      throw new Error(`Company not found for company_id=${effectiveCompanyId}`);
    }

    if (!client.google_account_id) {
      throw new Error('Client does not have a Google Ads account configured');
    }

    // Get Google Ads account with integration
    const { data: googleAccount, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('*, google_ads_integrations(*)')
      .eq('id', client.google_account_id)
      .single();

    if (accountError || !googleAccount) {
      console.error('❌ Google account error:', accountError);
      throw new Error('Google Ads account not found');
    }

    console.log(`🔗 Google Account: ${googleAccount.account_name} (${googleAccount.google_customer_id})`);

    const integration = googleAccount.google_ads_integrations;
    if (!integration || !integration.is_active) {
      throw new Error('Google Ads integration is not active');
    }

    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, integration);
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    
    if (!developerToken) {
      throw new Error('Missing GOOGLE_ADS_DEVELOPER_TOKEN secret');
    }

    const customerId = googleAccount.google_customer_id.replace(/-/g, '');

    // Determine login-customer-id candidates.
    // Some client accounts require the correct manager CID in the header.
    const loginCustomerIdCandidates: string[] = [];

    if (googleAccount.parent_customer_id) {
      loginCustomerIdCandidates.push(googleAccount.parent_customer_id.replace(/-/g, ''));
      console.log(`🏢 Found parent_customer_id candidate: ${loginCustomerIdCandidates[0]}`);
    }

    const { data: mccAccounts, error: mccAccountsError } = await supabase
      .from('google_ads_accounts')
      .select('google_customer_id')
      .eq('integration_id', googleAccount.integration_id)
      .eq('is_manager', true);

    if (mccAccountsError) {
      console.warn('⚠️ Could not load MCC accounts for integration:', mccAccountsError);
    } else {
      for (const acc of mccAccounts || []) {
        const cid = (acc.google_customer_id || '').replace(/-/g, '');
        if (cid && cid !== customerId) loginCustomerIdCandidates.push(cid);
      }
    }

    // We'll learn the correct login-customer-id by trying candidates.
    let resolvedLoginCustomerId: string | undefined;

    console.log(`🏢 login-customer-id candidates: ${[...new Set(loginCustomerIdCandidates)].join(', ') || '(none)'}`);

    // Build date range
    const days = getPeriodDays(period);
    const { startDate, endDate } = getDateRange(days);
    const dateCondition = `segments.date BETWEEN '${startDate}' AND '${endDate}'`;

    console.log(`📅 Date range: ${startDate} to ${endDate} (${days} days)`);

    let totalCampaigns = 0;
    let totalAdGroups = 0;
    let totalAds = 0;

    if (syncCampaigns) {
      console.log('📊 Syncing campaigns...');

      const statusFilter = includeInactive ? '' : "AND campaign.status = 'ENABLED'";
      
      const campaignQuery = `
        SELECT 
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE ${dateCondition}
        ${statusFilter}
      `;

      console.log('   Query:', campaignQuery.replace(/\s+/g, ' ').trim());

      try {
        const { data: campaignsData, usedLoginCustomerId } = await makeGoogleAdsRequestWithFallback({
          customerId,
          accessToken,
          developerToken,
          query: campaignQuery,
          loginCustomerIds: [resolvedLoginCustomerId, ...loginCustomerIdCandidates],
        });

        if (usedLoginCustomerId) {
          resolvedLoginCustomerId = usedLoginCustomerId;

          if (!googleAccount.parent_customer_id) {
            const { error: parentUpdateError } = await supabase
              .from('google_ads_accounts')
              .update({ parent_customer_id: usedLoginCustomerId })
              .eq('id', googleAccount.id);

            if (parentUpdateError) {
              console.warn('⚠️ Failed to persist parent_customer_id:', parentUpdateError);
            } else {
              console.log(`✅ Saved parent_customer_id=${usedLoginCustomerId} for account ${googleAccount.google_customer_id}`);
            }
          }
        }
        
        console.log(`   Found ${campaignsData.results?.length || 0} campaigns`);

        if (campaignsData.results && campaignsData.results.length > 0) {
          for (const result of campaignsData.results) {
            const campaign = result.campaign;
            const metrics = result.metrics || {};
            const campaignBudget = result.campaignBudget || {};

            const spend = microsToCurrency(metrics.costMicros || 0);
            const cpc = microsToCurrency(metrics.averageCpc || 0);
            const conversions = parseFloat(metrics.conversions || '0');
            const cpa = conversions > 0 ? spend / conversions : 0;
            
            // Convert budget from micros to currency (daily budget)
            const dailyBudget = campaignBudget.amountMicros 
              ? microsToCurrency(campaignBudget.amountMicros) 
              : null;

            console.log(`   Campaign ${campaign.name}: budget=${dailyBudget}, amountMicros=${campaignBudget.amountMicros}`);

            const { error: upsertError } = await supabase
              .from('google_campaigns')
              .upsert({
                google_id: campaign.id.toString(),
                google_account_id: googleAccount.id,
                client_id: clientId,
                company_id: effectiveCompanyId,
                user_id: user.id,
                name: campaign.name,
                status: mapGoogleStatus(campaign.status),
                campaign_type: campaign.advertisingChannelType,
                spend,
                impressions: parseInt(metrics.impressions || '0'),
                clicks: parseInt(metrics.clicks || '0'),
                conversions: Math.round(conversions),
                ctr: parseFloat(metrics.ctr || '0') * 100, // Convert to percentage
                cpc,
                cpa,
                daily_budget: dailyBudget,
                period,
                is_active: campaign.status === 'ENABLED',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'google_id,company_id,period',
              });

            if (upsertError) {
              console.error(`   ⚠️ Error upserting campaign ${campaign.name}:`, upsertError);
            } else {
              totalCampaigns++;
            }
          }
        }

        console.log(`   ✅ Synced ${totalCampaigns} campaigns`);
      } catch (error: any) {
        console.error('   ❌ Error syncing campaigns:', error.message);
        throw error;
      }
    }

    if (syncAdGroups) {
      console.log('📊 Syncing ad groups...');

      const statusFilter = includeInactive ? '' : "AND ad_group.status = 'ENABLED'";
      
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
        ${statusFilter}
      `;

      try {
        const { data: adGroupsData } = await makeGoogleAdsRequestWithFallback({
          customerId,
          accessToken,
          developerToken,
          query: adGroupQuery,
          loginCustomerIds: [resolvedLoginCustomerId, ...loginCustomerIdCandidates],
        });

        console.log(`   Found ${adGroupsData.results?.length || 0} ad groups`);

        if (adGroupsData.results && adGroupsData.results.length > 0) {
          for (const result of adGroupsData.results) {
            const adGroup = result.adGroup;
            const metrics = result.metrics || {};

            // Extract campaign ID from resource name (customers/123/campaigns/456)
            const campaignResourceName = adGroup.campaign;
            const campaignGoogleId = campaignResourceName.split('/').pop();

            // Get campaign_id from our database
            const { data: campaignData } = await supabase
              .from('google_campaigns')
              .select('id')
              .eq('google_id', campaignGoogleId)
              .eq('company_id', effectiveCompanyId)
              .eq('period', period)
              .single();

            if (campaignData) {
              const spend = microsToCurrency(metrics.costMicros || 0);
              const cpc = microsToCurrency(metrics.averageCpc || 0);
              const conversions = parseFloat(metrics.conversions || '0');
              const cpa = conversions > 0 ? spend / conversions : 0;

              const { error: upsertError } = await supabase
                .from('google_ad_groups')
                .upsert({
                  google_id: adGroup.id.toString(),
                  campaign_id: campaignData.id,
                  google_account_id: googleAccount.id,
                  client_id: clientId,
                  company_id: effectiveCompanyId,
                  user_id: user.id,
                  name: adGroup.name,
                  status: mapGoogleStatus(adGroup.status),
                  spend,
                  impressions: parseInt(metrics.impressions || '0'),
                  clicks: parseInt(metrics.clicks || '0'),
                  conversions: Math.round(conversions),
                  ctr: parseFloat(metrics.ctr || '0') * 100,
                  cpc,
                  cpa,
                  is_active: adGroup.status === 'ENABLED',
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'google_id,company_id',
                });

              if (upsertError) {
                console.error(`   ⚠️ Error upserting ad group ${adGroup.name}:`, upsertError);
              } else {
                totalAdGroups++;
              }
            }
          }
        }

        console.log(`   ✅ Synced ${totalAdGroups} ad groups`);
      } catch (error: any) {
        console.error('   ❌ Error syncing ad groups:', error.message);
        // Don't throw, continue with other sync operations
      }
    }

    if (syncAds) {
      console.log('📊 Syncing ads...');

      const statusFilter = includeInactive ? '' : "AND ad_group_ad.status = 'ENABLED'";
      
      const adsQuery = `
        SELECT 
          ad_group_ad.ad.id,
          ad_group_ad.ad.name,
          ad_group_ad.ad.type,
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
        ${statusFilter}
      `;

      try {
        const { data: adsData } = await makeGoogleAdsRequestWithFallback({
          customerId,
          accessToken,
          developerToken,
          query: adsQuery,
          loginCustomerIds: [resolvedLoginCustomerId, ...loginCustomerIdCandidates],
        });

        console.log(`   Found ${adsData.results?.length || 0} ads`);

        if (adsData.results && adsData.results.length > 0) {
          for (const result of adsData.results) {
            const ad = result.adGroupAd?.ad;
            const adGroupAd = result.adGroupAd;
            const metrics = result.metrics || {};
            const campaign = result.campaign;

            if (!ad || !adGroupAd) continue;

            // Extract ad_group ID from resource name
            const adGroupResourceName = adGroupAd.adGroup;
            const adGroupGoogleId = adGroupResourceName.split('/').pop();

            // Get ad_group_id and campaign_id from our database
            const { data: adGroupData } = await supabase
              .from('google_ad_groups')
              .select('id')
              .eq('google_id', adGroupGoogleId)
              .eq('company_id', effectiveCompanyId)
              .single();

            const { data: campaignData } = await supabase
              .from('google_campaigns')
              .select('id')
              .eq('google_id', campaign.id.toString())
              .eq('company_id', effectiveCompanyId)
              .eq('period', period)
              .single();

            if (adGroupData && campaignData) {
              const spend = microsToCurrency(metrics.costMicros || 0);
              const cpc = microsToCurrency(metrics.averageCpc || 0);
              const conversions = parseFloat(metrics.conversions || '0');
              const cpa = conversions > 0 ? spend / conversions : 0;

              const { error: upsertError } = await supabase
                .from('google_ads')
                .upsert({
                  google_id: ad.id.toString(),
                  ad_group_id: adGroupData.id,
                  campaign_id: campaignData.id,
                  google_account_id: googleAccount.id,
                  client_id: clientId,
                  company_id: effectiveCompanyId,
                  user_id: user.id,
                  name: ad.name || `Ad ${ad.id}`,
                  status: mapGoogleStatus(adGroupAd.status),
                  ad_type: ad.type,
                  final_url: ad.finalUrls?.[0] || null,
                  spend,
                  impressions: parseInt(metrics.impressions || '0'),
                  clicks: parseInt(metrics.clicks || '0'),
                  conversions: Math.round(conversions),
                  ctr: parseFloat(metrics.ctr || '0') * 100,
                  cpc,
                  cpa,
                  is_active: adGroupAd.status === 'ENABLED',
                  updated_at: new Date().toISOString(),
                }, {
                  onConflict: 'google_id,company_id',
                });

              if (upsertError) {
                console.error(`   ⚠️ Error upserting ad:`, upsertError);
              } else {
                totalAds++;
              }
            }
          }
        }

        console.log(`   ✅ Synced ${totalAds} ads`);
      } catch (error: any) {
        console.error('   ❌ Error syncing ads:', error.message);
        // Don't throw, continue
      }
    }

    // Update client's last sync
    await supabase
      .from('clients')
      .update({
        last_sync_at: new Date().toISOString(),
        last_sync_period: period,
      })
      .eq('id', clientId);

    console.log('🎉 Sync completed successfully!');
    console.log(`   Campaigns: ${totalCampaigns}, Ad Groups: ${totalAdGroups}, Ads: ${totalAds}`);

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
  } catch (error: any) {
    console.error('💥 Error in sync-google-ads-campaigns:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
