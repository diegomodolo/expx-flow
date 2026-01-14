import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { getValidGoogleAdsToken, isTokenExpiredOrExpiring, refreshGoogleAdsToken } from '../_shared/googleAdsTokenRefresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardMetrics {
  spend: number;
  leads: number;
  messages: number;
  total_conversions: number;
  cpl: number;
  leads_per_1k: number;
  impressions: number;
  clicks: number;
  page_views: number;
  cpm: number;
  cpc: number;
  ctr: number;
  connect_rate: number;
  lead_rate: number;
  frequency: number;
}

interface TopEngagementPost {
  id: string;
  thumbnail_url: string;
  caption: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  engagement: number;
}

interface InstagramFeedPost {
  id: string;
  thumbnail_url: string;
  caption: string;
  like_count: number;
  comments_count: number;
  permalink: string;
  media_type?: string;
}

interface FacebookPost {
  id: string;
  message: string;
  created_time: string;
  full_picture?: string;
  permalink_url: string;
  likes_count: number;
  comments_count: number;
  shares_count: number;
}

interface TimelineDataPoint2 {
  date: string;
  value: number;
}

interface InstagramTimeline {
  reach: TimelineDataPoint2[];
  accounts_engaged: TimelineDataPoint2[];
  profile_views: TimelineDataPoint2[];
  website_clicks: TimelineDataPoint2[];
  follower_count: TimelineDataPoint2[];
}

interface InstagramComparison {
  reach_change_pct: number;
  accounts_engaged_change_pct: number;
  profile_views_change_pct: number;
  website_clicks_change_pct: number;
  followers_gained: number;
}

interface SocialMetrics {
  instagram: {
    username: string;
    profile_picture_url: string;
    followers_count: number;
    posts_count: number;
    total_likes: number;
    total_comments: number;
    avg_engagement: number;
    reach?: number;
    impressions?: number;
    profile_views?: number;
    website_clicks?: number;
    recent_posts?: InstagramFeedPost[];
    top_posts?: TopEngagementPost[];
    timeline?: InstagramTimeline;
    comparison?: InstagramComparison;
  } | null;
  facebook: {
    page_name: string;
    page_category: string;
    followers_count?: number;
    page_fans?: number;
    page_reach?: number;
    page_impressions?: number;
    page_engaged_users?: number;
    page_post_engagements?: number;
    page_consumptions?: number;
    page_views?: number;
    new_followers?: number;
    recent_posts?: FacebookPost[];
  } | null;
}

/**
 * Função unificada para contar conversões, alinhada com sync-facebook-campaigns.
 * Combina actions + conversions e aplica lógica de prioridade para campanhas de Lead,
 * ou soma para campanhas não-Lead.
 */
function countConversionsFromActions(
  actions: any[] | undefined, 
  campaignObjective?: string, 
  campaignName?: string
): number {
  if (!actions || !Array.isArray(actions)) {
    return 0;
  }

  const norm = (s: any) => (s ?? '').toString().trim().toLowerCase();
  const getVal = (a: any) => {
    const toNum = (v: any) => (typeof v === 'string' ? parseFloat(v) : Number(v));
    const click = toNum(a?.['7d_click']);
    const view = toNum(a?.['1d_view']);
    const val = toNum(a?.value);
    const sumCv = (Number.isFinite(click) ? click : 0) + (Number.isFinite(view) ? view : 0);
    const candidates = [sumCv, val, click, view].map(n => (Number.isFinite(n) ? n : 0));
    const best = Math.max(...candidates, 0);
    return Math.round(best > 0 ? best : 0);
  };

  // Determine if this is a Lead objective campaign
  const isLeadObjective = (campaignObjective || '').toUpperCase() === 'OUTCOME_LEADS';

  if (isLeadObjective) {
    // Lead campaigns: choose a single best source to avoid duplication
    const leadPriorityTypes = [
      'lead',
      'offsite_conversion.fb_pixel_lead',
      'messaging_conversation_started',
      'conversation_started',
      'offsite_conversion.fb_pixel_custom',
      'onsite_conversion.lead',
      'omni_lead',
      'on_facebook_lead',
      'on_facebook_conversation_started',
      'onsite_conversion.lead_grouped',
      'website_lead',
      'onsite_conversion.messaging_conversation_started_7d'
    ];

    const normalized = actions.map(a => ({ 
      type: norm(a?.action_type), 
      val: getVal(a) 
    }));

    // Find the highest priority lead action with value > 0
    for (const priorityType of leadPriorityTypes) {
      const found = normalized.find(n => n.type === priorityType && n.val > 0);
      if (found) {
        console.log(`Campaign ${campaignName}: Using priority "${priorityType}" = ${found.val}`);
        return found.val;
      }
    }

    // Fallback: any action type containing "lead" or "conversation"
    const leadCandidates = normalized.filter(n => 
      (n.type.includes('lead') || n.type.includes('conversation')) && n.val > 0
    );
    
    if (leadCandidates.length > 0) {
      const maxVal = Math.max(...leadCandidates.map(n => n.val));
      console.log(`Campaign ${campaignName}: Fallback max = ${maxVal}`);
      return maxVal;
    }

    return 0;
  } else {
    // Non-lead campaigns: sum allowed conversion-like actions
    const subscriptionConversions = [
      'subscribe',
      'subscription', 
      'complete_registration',
      'lead',
      'offsite_conversion.fb_pixel_subscribe',
      'offsite_conversion.fb_pixel_complete_registration',
      'offsite_conversion.fb_pixel_lead',
      'offsite_conversion.fb_pixel_custom',
      'onsite_conversion.subscribe',
      'onsite_conversion.subscription',
      'onsite_conversion.lead_grouped',
      'website_lead',
      'messaging_conversation_started',
      'messaging_conversation_started_7d',
      'on_facebook_conversation_started',
      'conversation_started'
    ];
    
    const excludedTypes = [
      'link_click',
      'landing_page_view', 
      'page_engagement',
      'post_engagement',
      'video_view',
      'post_reaction',
      'like',
      'comment',
      'share',
      'post',
      'omni_landing_page_view'
    ];
    
    let total = 0;
    
    for (const a of actions) {
      const type = norm(a?.action_type);
      const val = getVal(a);
      
      if (!type || !Number.isFinite(val)) {
        continue;
      }
      
      if (excludedTypes.some(excluded => type.includes(excluded))) {
        continue;
      }
      
      const isSubscriptionConversion = subscriptionConversions.some(sub => type.includes(sub)) ||
                                       type.includes('subscribe') ||
                                       type.includes('subscription') ||
                                       (type.includes('lead') && !type.includes('link')) ||
                                       type.includes('complete_registration') ||
                                       type.includes('messaging_conversation') ||
                                       type.includes('conversation_started');
      
      if (isSubscriptionConversion) {
        total += val;
      }
    }
    
    if (total > 0) {
      console.log(`Campaign ${campaignName}: Non-lead total = ${total}`);
    }
    return total;
  }
}

async function fetchSocialMetrics(supabase: any, clientId: string): Promise<SocialMetrics> {
  console.log('Fetching social metrics for client:', clientId);
  
  const { data: clientFull, error: clientError } = await supabase
    .from('clients')
    .select(`
      instagram_account_id,
      facebook_page_id,
      instagram_accounts!clients_instagram_account_id_fkey(
        id,
        instagram_id,
        username,
        profile_picture_url,
        followers_count
      ),
      facebook_pages!clients_facebook_page_id_fkey(
        id,
        page_id,
        page_name,
        page_category,
        page_access_token
      )
    `)
    .eq('id', clientId)
    .single();

  if (clientError) {
    console.error('Error fetching client social accounts:', clientError);
    return { instagram: null, facebook: null };
  }

  console.log('Client social data:', {
    hasInstagram: !!clientFull?.instagram_accounts,
    hasFacebook: !!clientFull?.facebook_pages
  });

  let instagramData: SocialMetrics['instagram'] = null;
  let facebookData: SocialMetrics['facebook'] = null;

  // Buscar dados do Instagram
  if (clientFull?.instagram_accounts && clientFull?.facebook_pages?.page_access_token) {
    const igAccount = clientFull.instagram_accounts;
    const pageAccessToken = clientFull.facebook_pages.page_access_token;
    
    console.log('Fetching Instagram data for:', igAccount.username);
    
    try {
      const mediaUrl = `https://graph.facebook.com/v20.0/${igAccount.instagram_id}/media?` +
        `fields=id,caption,media_type,media_url,thumbnail_url,like_count,comments_count,permalink` +
        `&limit=25&access_token=${pageAccessToken}`;

      const mediaResponse = await fetch(mediaUrl);
      let totalLikes = 0;
      let totalComments = 0;
      let postsCount = 0;
      let avgEngagement = 0;
      let topPosts: TopEngagementPost[] = [];
      let recentPosts: InstagramFeedPost[] = [];

      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        const posts = mediaData.data || [];
        postsCount = posts.length;

        const mappedPosts: InstagramFeedPost[] = posts.map((p: any) => ({
          id: p.id,
          thumbnail_url: p.thumbnail_url || p.media_url || '',
          caption: p.caption || '',
          like_count: p.like_count || 0,
          comments_count: p.comments_count || 0,
          permalink: p.permalink || '',
          media_type: p.media_type,
        }));

        recentPosts = mappedPosts.slice(0, 30);

        totalLikes = mappedPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
        totalComments = mappedPosts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
        avgEngagement = postsCount > 0 ? (totalLikes + totalComments) / postsCount : 0;

        topPosts = mappedPosts
          .map((p: InstagramFeedPost) => ({
            ...p,
            engagement: (p.like_count || 0) + (p.comments_count || 0),
          }))
          .sort((a: TopEngagementPost, b: TopEngagementPost) => b.engagement - a.engagement)
          .slice(0, 6);

        console.log(`Fetched ${postsCount} Instagram posts`);
      }

      let reach = 0;
      let impressions = 0;
      let profileViews = 0;
      let websiteClicks = 0;
      
      let timeline: InstagramTimeline = {
        reach: [],
        accounts_engaged: [],
        profile_views: [],
        website_clicks: [],
        follower_count: [],
      };
      
      let comparison: InstagramComparison = {
        reach_change_pct: 0,
        accounts_engaged_change_pct: 0,
        profile_views_change_pct: 0,
        website_clicks_change_pct: 0,
        followers_gained: 0,
      };

      try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const since = Math.floor(thirtyDaysAgo.getTime() / 1000);
        const until = Math.floor(now.getTime() / 1000);
        
        const dailyMetricsUrl = `https://graph.facebook.com/v20.0/${igAccount.instagram_id}/insights?` +
          `metric=reach,follower_count` +
          `&period=day` +
          `&since=${since}&until=${until}` +
          `&access_token=${pageAccessToken}`;
        
        const dailyResponse = await fetch(dailyMetricsUrl);
        
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          
          if (dailyData.data) {
            dailyData.data.forEach((metric: any) => {
              const values = metric.values || [];
              const metricName = metric.name;
              
              const timelineArray = values.map((v: any) => ({
                date: v.end_time?.split('T')[0] || '',
                value: v.value || 0,
              })).filter((v: any) => v.date);
              
              switch (metricName) {
                case 'reach':
                  timeline.reach = timelineArray;
                  reach = timelineArray.reduce((sum: number, v: any) => sum + v.value, 0);
                  break;
                case 'follower_count':
                  timeline.follower_count = timelineArray;
                  break;
              }
            });
          }
        }
        
        const totalMetricsUrl = `https://graph.facebook.com/v20.0/${igAccount.instagram_id}/insights?` +
          `metric=accounts_engaged,profile_views,website_clicks` +
          `&period=day` +
          `&metric_type=total_value` +
          `&since=${since}&until=${until}` +
          `&access_token=${pageAccessToken}`;
        
        const totalResponse = await fetch(totalMetricsUrl);
        
        if (totalResponse.ok) {
          const totalData = await totalResponse.json();
          
          if (totalData.data) {
            totalData.data.forEach((metric: any) => {
              const metricName = metric.name;
              const totalValue = metric.total_value?.value || 0;
              
              switch (metricName) {
                case 'accounts_engaged':
                  impressions = totalValue;
                  timeline.accounts_engaged = [{ date: new Date().toISOString().split('T')[0], value: totalValue }];
                  break;
                case 'profile_views':
                  profileViews = totalValue;
                  timeline.profile_views = [{ date: new Date().toISOString().split('T')[0], value: totalValue }];
                  break;
                case 'website_clicks':
                  websiteClicks = totalValue;
                  timeline.website_clicks = [{ date: new Date().toISOString().split('T')[0], value: totalValue }];
                  break;
              }
            });
          }
        }
        
        const calcComparison = (data: TimelineDataPoint2[]) => {
          if (data.length < 14) return 0;
          const last7 = data.slice(-7).reduce((sum, v) => sum + v.value, 0);
          const prev7 = data.slice(-14, -7).reduce((sum, v) => sum + v.value, 0);
          if (prev7 === 0) return last7 > 0 ? 100 : 0;
          return ((last7 - prev7) / prev7) * 100;
        };
        
        comparison.reach_change_pct = calcComparison(timeline.reach);
        
        if (timeline.follower_count.length >= 7) {
          const lastFollowers = timeline.follower_count[timeline.follower_count.length - 1]?.value || 0;
          const weekAgoFollowers = timeline.follower_count[timeline.follower_count.length - 7]?.value || 0;
          comparison.followers_gained = lastFollowers - weekAgoFollowers;
        }
      } catch (insightsError) {
        console.log('Error fetching Instagram insights:', insightsError);
      }

      instagramData = {
        username: igAccount.username,
        profile_picture_url: igAccount.profile_picture_url || '',
        followers_count: igAccount.followers_count || 0,
        posts_count: postsCount,
        total_likes: totalLikes,
        total_comments: totalComments,
        avg_engagement: avgEngagement,
        reach,
        impressions,
        profile_views: profileViews,
        website_clicks: websiteClicks,
        recent_posts: recentPosts,
        top_posts: topPosts,
        timeline: timeline.reach.length > 0 ? timeline : undefined,
        comparison: timeline.reach.length >= 14 ? comparison : undefined,
      };
    } catch (error) {
      console.error('Error fetching Instagram data:', error);
      
      instagramData = {
        username: igAccount.username,
        profile_picture_url: igAccount.profile_picture_url || '',
        followers_count: igAccount.followers_count || 0,
        posts_count: 0,
        total_likes: 0,
        total_comments: 0,
        avg_engagement: 0,
      };
    }
  }

  // Dados do Facebook Page com insights
  if (clientFull?.facebook_pages) {
    const fbPage = clientFull.facebook_pages;
    const pageAccessToken = fbPage.page_access_token;
    
    let followersCount = 0;
    let pageReach = 0;
    let pageImpressions = 0;
    let pageEngagedUsers = 0;
    let pageFans = 0;
    let pagePostEngagements = 0;
    let pageConsumptions = 0;
    let pageViews = 0;
    let newFollowers = 0;
    let recentPosts: FacebookPost[] = [];

    if (pageAccessToken) {
      try {
        const pageInfoUrl = `https://graph.facebook.com/v20.0/${fbPage.page_id}?` +
          `fields=followers_count,fan_count&access_token=${pageAccessToken}`;
        
        const pageInfoResponse = await fetch(pageInfoUrl);
        if (pageInfoResponse.ok) {
          const pageInfo = await pageInfoResponse.json();
          followersCount = pageInfo.followers_count || 0;
          pageFans = pageInfo.fan_count || 0;
        }

        const pageInsightsUrl = `https://graph.facebook.com/v20.0/${fbPage.page_id}/insights?` +
          `metric=page_impressions_unique,page_post_engagements,page_consumptions,page_views_total` +
          `&period=day&date_preset=last_28d` +
          `&access_token=${pageAccessToken}`;
        
        const pageInsightsResponse = await fetch(pageInsightsUrl);
        if (pageInsightsResponse.ok) {
          const insightsData = await pageInsightsResponse.json();
          
          if (insightsData.data) {
            insightsData.data.forEach((metric: any) => {
              const values = metric.values || [];
              const totalValue = values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
              
              switch (metric.name) {
                case 'page_impressions_unique':
                  pageReach = totalValue;
                  break;
                case 'page_post_engagements':
                  pagePostEngagements = totalValue;
                  break;
                case 'page_consumptions':
                  pageConsumptions = totalValue;
                  break;
                case 'page_views_total':
                  pageViews = totalValue;
                  break;
              }
            });
          }
        }

        const postsUrl = `https://graph.facebook.com/v20.0/${fbPage.page_id}/posts?` +
          `fields=id,message,created_time,full_picture,permalink_url,` +
          `likes.summary(true),comments.summary(true),shares` +
          `&limit=10&access_token=${pageAccessToken}`;
        
        const postsResponse = await fetch(postsUrl);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          const posts = postsData.data || [];
          
          recentPosts = posts.map((p: any) => ({
            id: p.id,
            message: p.message || '',
            created_time: p.created_time,
            full_picture: p.full_picture,
            permalink_url: p.permalink_url,
            likes_count: p.likes?.summary?.total_count || 0,
            comments_count: p.comments?.summary?.total_count || 0,
            shares_count: p.shares?.count || 0,
          }));
        }
      } catch (fbError) {
        console.error('Error fetching Facebook Page data:', fbError);
      }
    }

    facebookData = {
      page_name: fbPage.page_name,
      page_category: fbPage.page_category || '',
      followers_count: followersCount,
      page_fans: pageFans,
      page_reach: pageReach,
      page_impressions: pageImpressions,
      page_engaged_users: pageEngagedUsers,
      page_post_engagements: pagePostEngagements,
      page_consumptions: pageConsumptions,
      page_views: pageViews,
      new_followers: newFollowers,
      recent_posts: recentPosts,
    };
  }

  return { instagram: instagramData, facebook: facebookData };
}

/**
 * Mapeia presets do frontend para date_preset do Meta
 */
function mapPresetToMeta(preset: string): string | null {
  const presetMap: Record<string, string> = {
    'today': 'today',
    'last_7d': 'last_7d',
    'last_14d': 'last_14d',
    'last_30d': 'last_30d',
    'last_90d': 'last_90d',
  };
  return presetMap[preset] || null;
}

// ========================== Google Ads Integration ==========================

interface GoogleAdsMetrics {
  campaigns: any[];
  totalSpend: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  timeline: Map<string, { leads: number; spend: number }>;
}

async function fetchGoogleAdsData(
  supabase: any,
  clientId: string,
  googleAccountId: string,
  period: { since: string; until: string }
): Promise<GoogleAdsMetrics | null> {
  console.log('=== Fetching Google Ads data ===');
  console.log('Client ID:', clientId, 'Google Account ID:', googleAccountId);

  try {
    // 1. Get Google Ads account details
    const { data: googleAccount, error: accountError } = await supabase
      .from('google_ads_accounts')
      .select('id, google_customer_id, integration_id, account_name')
      .eq('id', googleAccountId)
      .single();

    if (accountError || !googleAccount) {
      console.error('Google Ads account not found:', accountError);
      return null;
    }

    console.log('Google Ads account found:', googleAccount.account_name);

    // 2. Get Google Ads integration with token
    const { data: integration, error: integrationError } = await supabase
      .from('google_ads_integrations')
      .select('id, access_token, refresh_token, expires_at, is_active')
      .eq('id', googleAccount.integration_id)
      .single();

    if (integrationError || !integration) {
      console.error('Google Ads integration not found:', integrationError);
      return null;
    }

    if (!integration.is_active) {
      console.error('Google Ads integration is not active');
      return null;
    }

    // 3. Get valid access token (refresh if needed)
    const { accessToken, wasRefreshed } = await getValidGoogleAdsToken(supabase, integration);
    console.log('Token obtained, was refreshed:', wasRefreshed);

    // 4. Call Google Ads API
    const developerToken = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!developerToken) {
      console.error('GOOGLE_ADS_DEVELOPER_TOKEN not configured');
      return null;
    }

    const customerId = googleAccount.google_customer_id.replace(/-/g, '');
    const loginCustomerId = googleAccount.parent_customer_id?.replace(/-/g, '') || customerId;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': developerToken,
      'Content-Type': 'application/json',
    };

    // Only add login-customer-id if different from customerId
    if (loginCustomerId !== customerId) {
      headers['login-customer-id'] = loginCustomerId;
    }

    // 5. Build GAQL query for campaigns
    const gaqlQuery = `
      SELECT 
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${period.since}' AND '${period.until}'
      ORDER BY metrics.cost_micros DESC
    `;

    console.log('Calling Google Ads API for campaigns...');

    const campaignsResponse = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: gaqlQuery }),
      }
    );

    if (!campaignsResponse.ok) {
      const errorText = await campaignsResponse.text();
      console.error('Google Ads API error:', errorText);
      return null;
    }

    const campaignsData = await campaignsResponse.json();
    console.log('Google Ads campaigns response received');

    // 6. Process campaigns data
    const campaignsMap = new Map<string, any>();
    
    if (Array.isArray(campaignsData) && campaignsData.length > 0) {
      campaignsData.forEach((chunk: any) => {
        const results = chunk.results || [];
        results.forEach((result: any) => {
          const campaignId = result.campaign?.id;
          if (!campaignId) return;

          const existingCampaign = campaignsMap.get(campaignId);
          const costMicros = Number(result.metrics?.costMicros || 0);
          const impressions = Number(result.metrics?.impressions || 0);
          const clicks = Number(result.metrics?.clicks || 0);
          const conversions = Number(result.metrics?.conversions || 0);

          if (existingCampaign) {
            existingCampaign.spend += costMicros / 1_000_000;
            existingCampaign.impressions += impressions;
            existingCampaign.clicks += clicks;
            existingCampaign.conversions += conversions;
          } else {
            const status = result.campaign?.status;
            campaignsMap.set(campaignId, {
              id: campaignId,
              name: result.campaign?.name || 'Unknown',
              status: status === 'ENABLED' ? 'ACTIVE' : status || 'UNKNOWN',
              channelType: result.campaign?.advertisingChannelType,
              spend: costMicros / 1_000_000,
              impressions,
              clicks,
              conversions,
              platform: 'google',
            });
          }
        });
      });
    }

    const campaigns = Array.from(campaignsMap.values());
    console.log(`Processed ${campaigns.length} Google Ads campaigns`);

    // 7. Calculate totals
    let totalSpend = 0;
    let totalConversions = 0;
    let totalImpressions = 0;
    let totalClicks = 0;

    campaigns.forEach((c) => {
      totalSpend += c.spend;
      totalConversions += c.conversions;
      totalImpressions += c.impressions;
      totalClicks += c.clicks;
    });

    console.log(`Google Ads totals: spend=${totalSpend.toFixed(2)}, conversions=${totalConversions}`);

    // 8. Fetch daily timeline data
    const timelineQuery = `
      SELECT 
        segments.date,
        metrics.conversions,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${period.since}' AND '${period.until}'
    `;

    const timelineResponse = await fetch(
      `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: timelineQuery }),
      }
    );

    const timeline = new Map<string, { leads: number; spend: number }>();

    if (timelineResponse.ok) {
      const timelineData = await timelineResponse.json();
      
      if (Array.isArray(timelineData)) {
        timelineData.forEach((chunk: any) => {
          const results = chunk.results || [];
          results.forEach((result: any) => {
            const date = result.segments?.date;
            if (!date) return;

            const costMicros = Number(result.metrics?.costMicros || 0);
            const conversions = Number(result.metrics?.conversions || 0);

            const existing = timeline.get(date) || { leads: 0, spend: 0 };
            existing.leads += conversions;
            existing.spend += costMicros / 1_000_000;
            timeline.set(date, existing);
          });
        });
      }
    }

    console.log(`Google Ads timeline: ${timeline.size} days`);

    return {
      campaigns,
      totalSpend,
      totalConversions,
      totalImpressions,
      totalClicks,
      timeline,
    };
  } catch (error) {
    console.error('Error fetching Google Ads data:', error);
    return null;
  }
}

Deno.serve(async (req) => {
  console.log('=== Client Dashboard Data Edge Function ===');
  console.log('Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { token, start_date, end_date, preset, debug } = body;
    
    console.log('Request params:', { token, start_date, end_date, preset, debug });

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching client by dashboard token:', token);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company, ad_account_id, google_account_id, avatar')
      .eq('dashboard_token', token)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Invalid dashboard token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar métricas sociais em paralelo
    const socialMetricsPromise = fetchSocialMetrics(supabase, client.id);

    // Check if client has any ad platform configured
    const hasFacebook = !!client.ad_account_id;
    const hasGoogle = !!client.google_account_id;

    if (!hasFacebook && !hasGoogle) {
      const socialMetrics = await socialMetricsPromise;
      
      return new Response(
        JSON.stringify({ 
          error: 'No ad account linked to this client (Facebook or Google)',
          client: {
            name: client.name,
            company: client.company,
            avatar_url: client.avatar,
          },
          social_metrics: socialMetrics,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Ad platforms configured:', { hasFacebook, hasGoogle });

    // Determinar o período
    const metaPreset = preset ? mapPresetToMeta(preset) : null;
    let since: string;
    let until: string;
    
    if (metaPreset) {
      const now = new Date();
      until = now.toISOString().split('T')[0];
      
      const daysMap: Record<string, number> = {
        'today': 0,
        'last_7d': 6,
        'last_14d': 13,
        'last_30d': 29,
        'last_90d': 89,
      };
      const daysBack = daysMap[metaPreset] || 29;
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - daysBack);
      since = fromDate.toISOString().split('T')[0];
      
      console.log(`Using Meta date_preset: ${metaPreset} (calculated: ${since} to ${until})`);
    } else {
      since = start_date;
      until = end_date;
      console.log(`Using time_range: ${since} to ${until}`);
    }

    // ===================== Fetch Data from Both Platforms in Parallel =====================
    
    let facebookResult: {
      campaigns: any[];
      processedCampaigns: any[];
      timelineMap: Map<string, { leads: number; messages: number; spend: number }>;
      totalSpend: number;
      totalConversions: number;
      totalMessages: number;
      totalImpressions: number;
      totalClicks: number;
      totalReach: number;
      debugCampaigns: any[];
    } | null = null;

    let googleResult: GoogleAdsMetrics | null = null;

    // Start Google Ads fetch if configured
    const googlePromise = hasGoogle 
      ? fetchGoogleAdsData(supabase, client.id, client.google_account_id, { since, until })
      : Promise.resolve(null);

    // Fetch Facebook data if configured
    if (hasFacebook) {
      console.log('Fetching Facebook ad account:', client.ad_account_id);

      const { data: adAccount, error: adAccountError } = await supabase
        .from('facebook_ad_accounts')
        .select('account_id, integration_id')
        .eq('id', client.ad_account_id)
        .single();

      if (!adAccountError && adAccount) {
        const { data: integration, error: integrationError } = await supabase
          .from('facebook_integrations')
          .select('access_token, is_active')
          .eq('id', adAccount.integration_id)
          .single();

        if (!integrationError && integration && integration.is_active) {
          console.log('Facebook integration found, active:', integration.is_active);

          const cleanAccountId = adAccount.account_id.replace(/^act_/, '');
          
          const dateParam = metaPreset 
            ? `.date_preset(${metaPreset})` 
            : `.time_range({since:'${since}',until:'${until}'})`;

          const campaignsUrl = `https://graph.facebook.com/v20.0/act_${cleanAccountId}/campaigns?` +
            `fields=id,name,status,objective,` +
            `insights${dateParam}` +
            `.action_report_time(conversion)` +
            `.action_attribution_windows(["7d_click","1d_view"])` +
            `{date_start,date_stop,impressions,clicks,spend,actions,conversions,reach,frequency}` +
            `&limit=500&access_token=${integration.access_token}`;

          const timelineUrl = metaPreset
            ? `https://graph.facebook.com/v20.0/act_${cleanAccountId}/insights?` +
              `date_preset=${metaPreset}` +
              `&time_increment=1` +
              `&fields=date_start,actions,conversions,spend` +
              `&action_attribution_windows=["7d_click","1d_view"]` +
              `&action_report_time=conversion` +
              `&level=account` +
              `&access_token=${integration.access_token}`
            : `https://graph.facebook.com/v20.0/act_${cleanAccountId}/insights?` +
              `time_range={'since':'${since}','until':'${until}'}` +
              `&time_increment=1` +
              `&fields=date_start,actions,conversions,spend` +
              `&action_attribution_windows=["7d_click","1d_view"]` +
              `&action_report_time=conversion` +
              `&level=account` +
              `&access_token=${integration.access_token}`;

          console.log('Fetching campaigns from Meta (aggregated data)');

          const [campaignsResponse, timelineResponse] = await Promise.all([
            fetch(campaignsUrl),
            fetch(timelineUrl)
          ]);

          if (campaignsResponse.ok) {
            const fbData = await campaignsResponse.json();
            const timelineData = timelineResponse.ok ? await timelineResponse.json() : { data: [] };
            
            console.log(`Fetched ${fbData.data?.length || 0} campaigns from Facebook`);

            const campaigns = fbData.data || [];
            const timelineMap = new Map<string, { leads: number; messages: number; spend: number }>();
            
            if (timelineData.data && Array.isArray(timelineData.data)) {
              timelineData.data.forEach((insight: any) => {
                const date = insight.date_start;
                if (date) {
                  const combinedMetrics = [
                    ...(Array.isArray(insight.actions) ? insight.actions : []),
                    ...(Array.isArray(insight.conversions) ? insight.conversions : [])
                  ];
                  
                  const conversions = countConversionsFromActions(combinedMetrics, undefined, `Timeline ${date}`);
                  const messages = insight.actions?.find(
                    (a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                  )?.value || 0;
                  const spend = parseFloat(insight.spend || '0');
                  
                  timelineMap.set(date, {
                    leads: conversions,
                    messages: parseFloat(messages),
                    spend,
                  });
                }
              });
            }

            let totalSpend = 0;
            let totalImpressions = 0;
            let totalClicks = 0;
            let totalReach = 0;
            const debugCampaigns: any[] = [];

            const processedCampaigns = campaigns.map((campaign: any) => {
              const insights = campaign.insights?.data || [];
              
              if (insights.length === 0) {
                return {
                  id: campaign.id,
                  name: campaign.name,
                  status: campaign.status,
                  objective: campaign.objective,
                  spend: 0,
                  conversions: 0,
                  impressions: 0,
                  clicks: 0,
                  reach: 0,
                  frequency: 0,
                  platform: 'facebook',
                };
              }

              let totalCampaignSpend = 0;
              let totalCampaignConversions = 0;
              let totalCampaignMessages = 0;
              let totalCampaignImpressions = 0;
              let totalCampaignClicks = 0;
              let totalCampaignReach = 0;
              
              insights.forEach((insight: any) => {
                const spend = parseFloat(insight.spend || '0');
                const impressions = parseInt(insight.impressions || '0', 10);
                const clicks = parseInt(insight.clicks || '0', 10);
                const reach = parseInt(insight.reach || '0', 10);
                
                const combinedMetrics = [
                  ...(Array.isArray(insight.actions) ? insight.actions : []),
                  ...(Array.isArray(insight.conversions) ? insight.conversions : [])
                ];
                
                const conversions = countConversionsFromActions(combinedMetrics, campaign.objective, campaign.name);
                
                const messages = insight.actions?.find(
                  (a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                )?.value || 0;
                const messagesValue = parseFloat(messages);
                
                totalCampaignSpend += spend;
                totalCampaignConversions += conversions;
                totalCampaignMessages += messagesValue;
                totalCampaignImpressions += impressions;
                totalCampaignClicks += clicks;
                totalCampaignReach += reach;

                if (debug && debugCampaigns.length < 5) {
                  debugCampaigns.push({
                    id: campaign.id,
                    name: campaign.name,
                    objective: campaign.objective,
                    platform: 'facebook',
                    spend,
                    conversions,
                  });
                }
              });

              totalSpend += totalCampaignSpend;
              totalImpressions += totalCampaignImpressions;
              totalClicks += totalCampaignClicks;
              totalReach += totalCampaignReach;

              return {
                id: campaign.id,
                name: campaign.name,
                status: campaign.status,
                objective: campaign.objective,
                spend: totalCampaignSpend,
                conversions: totalCampaignConversions,
                messages: totalCampaignMessages,
                impressions: totalCampaignImpressions,
                clicks: totalCampaignClicks,
                reach: totalCampaignReach,
                frequency: totalCampaignReach > 0 ? totalCampaignImpressions / totalCampaignReach : 0,
                platform: 'facebook',
              };
            });

            const totalConversions = processedCampaigns.reduce((sum: number, c: any) => sum + (Number(c.conversions) || 0), 0);
            const totalMessages = processedCampaigns.reduce((sum: number, c: any) => sum + (Number(c.messages) || 0), 0);

            facebookResult = {
              campaigns,
              processedCampaigns,
              timelineMap,
              totalSpend,
              totalConversions,
              totalMessages,
              totalImpressions,
              totalClicks,
              totalReach,
              debugCampaigns,
            };

            console.log(`Facebook totals: spend=${totalSpend.toFixed(2)}, conversions=${totalConversions}`);
          } else {
            console.error('Facebook API error:', await campaignsResponse.text());
          }
        } else {
          console.error('Facebook integration not active or not found');
        }
      } else {
        console.error('Facebook ad account not found:', adAccountError);
      }
    }

    // Await Google Ads data
    googleResult = await googlePromise;
    
    // Aguardar métricas sociais
    const socialMetrics = await socialMetricsPromise;

    // ===================== Combine Data from Both Platforms =====================
    
    console.log('Combining data from platforms:', { 
      hasFacebookData: !!facebookResult, 
      hasGoogleData: !!googleResult 
    });

    // If no data from any platform, keep going and return a "social-only" dashboard
    // (this avoids the public dashboard showing "Token inválido" when the real issue is ad-platform connectivity)
    if (!facebookResult && !googleResult) {
      console.warn('No data returned from any ad platform; returning social-only dashboard response');
    }

    // Combine campaigns from both platforms
    const allProcessedCampaigns: any[] = [];
    
    if (facebookResult) {
      allProcessedCampaigns.push(...facebookResult.processedCampaigns);
    }
    
    if (googleResult) {
      googleResult.campaigns.forEach((c) => {
        allProcessedCampaigns.push({
          id: c.id,
          name: c.name,
          status: c.status,
          spend: c.spend,
          conversions: c.conversions,
          messages: 0, // Google doesn't have messages
          impressions: c.impressions,
          clicks: c.clicks,
          reach: 0,
          frequency: 0,
          platform: 'google',
        });
      });
    }

    // Combine timeline data
    const combinedTimelineMap = new Map<string, { leads: number; messages: number; spend: number }>();
    
    if (facebookResult) {
      facebookResult.timelineMap.forEach((data, date) => {
        combinedTimelineMap.set(date, { ...data });
      });
    }
    
    if (googleResult) {
      googleResult.timeline.forEach((data, date) => {
        const existing = combinedTimelineMap.get(date) || { leads: 0, messages: 0, spend: 0 };
        existing.leads += data.leads;
        existing.spend += data.spend;
        combinedTimelineMap.set(date, existing);
      });
    }

    const timeline = Array.from(combinedTimelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate combined totals
    const totalSpend = (facebookResult?.totalSpend || 0) + (googleResult?.totalSpend || 0);
    const totalConversions = (facebookResult?.totalConversions || 0) + (googleResult?.totalConversions || 0);
    const totalMessages = facebookResult?.totalMessages || 0;
    const totalImpressions = (facebookResult?.totalImpressions || 0) + (googleResult?.totalImpressions || 0);
    const totalClicks = (facebookResult?.totalClicks || 0) + (googleResult?.totalClicks || 0);
    const totalReach = facebookResult?.totalReach || 0;

    console.log(`Combined totals: spend=${totalSpend.toFixed(2)}, conversions=${totalConversions}, messages=${totalMessages}`);

    const totalConversionsAll = totalConversions + totalMessages;
    const cpl = totalConversionsAll > 0 ? totalSpend / totalConversionsAll : 0;
    const leadsPerK = totalSpend > 0 ? (totalConversionsAll / totalSpend) * 1000 : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    const messages = totalMessages;
    const pageViews = Math.round(totalClicks * 0.8);
    const connectRate = pageViews > 0 ? (messages / pageViews) * 100 : 0;
    const leadRate = pageViews > 0 ? (totalConversionsAll / pageViews) * 100 : 0;

    const metrics: DashboardMetrics = {
      spend: totalSpend,
      leads: totalConversions,
      messages,
      total_conversions: totalConversionsAll,
      cpl,
      leads_per_1k: leadsPerK,
      impressions: totalImpressions,
      clicks: totalClicks,
      page_views: pageViews,
      cpm,
      cpc,
      ctr,
      connect_rate: connectRate,
      lead_rate: leadRate,
      frequency,
    };

    const topCampaigns = allProcessedCampaigns
      .filter((c: any) => c.conversions > 0)
      .sort((a: any, b: any) => b.conversions - a.conversions)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        conversions: c.conversions,
        spend: c.spend,
        percentage: totalConversions > 0 ? (c.conversions / totalConversions) * 100 : 0,
        platform: c.platform,
      }));

    const campaignsTable = allProcessedCampaigns.map((c: any) => ({
      name: c.name,
      ad_sets_count: 0,
      ads_count: 0,
      spend: c.spend,
      leads: c.conversions,
      cpl: c.conversions > 0 ? c.spend / c.conversions : 0,
      messages: c.messages || 0,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      status: c.status,
      platform: c.platform,
    }));

    const daysDiff = Math.ceil((new Date(until).getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const response: any = {
      client: {
        name: client.name,
        company: client.company,
        avatar_url: client.avatar,
      },
      period: {
        start_date: since,
        end_date: until,
        days: daysDiff,
        preset: preset || null,
      },
      metrics,
      timeline,
      top_campaigns: topCampaigns,
      campaigns_table: campaignsTable,
      social_metrics: socialMetrics,
      platforms: {
        facebook: !!facebookResult,
        google: !!googleResult,
      },
    };

    // Adicionar debug info se solicitado
    if (debug) {
      response.debug = {
        period_received: { start_date, end_date, preset },
        period_used: { since, until, meta_preset: metaPreset },
        facebook_campaigns: facebookResult?.processedCampaigns?.length || 0,
        google_campaigns: googleResult?.campaigns?.length || 0,
      };
    }

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
