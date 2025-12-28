import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

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
    // Insights data (requires instagram_manage_insights permission)
    reach?: number;
    impressions?: number;
    profile_views?: number;
    website_clicks?: number;
    // Posts (for feed)
    recent_posts?: InstagramFeedPost[];
    // Top engagement posts
    top_posts?: TopEngagementPost[];
    // Timeline data (30 days)
    timeline?: InstagramTimeline;
    // Comparison data (7d vs 7d)
    comparison?: InstagramComparison;
  } | null;
  facebook: {
    page_name: string;
    page_category: string;
    followers_count?: number;
    page_reach?: number;
    page_impressions?: number;
    page_engaged_users?: number;
    recent_posts?: FacebookPost[];
  } | null;
}

const VALID_LEAD_ACTIONS = [
  'lead', 'leadgen.other', 'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead', 'onsite_conversion.messaging_conversation_started_7d'
];

function extractConversions(actions: any[], campaignName?: string): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  const leadActions = actions.filter(action => 
    VALID_LEAD_ACTIONS.includes(action.action_type)
  );
  
  if (leadActions.length > 0) {
    console.log(`\n=== Campaign: ${campaignName} ===`);
    console.log(`Total action types found: ${leadActions.length}`);
    leadActions.forEach(action => {
      console.log(`  - ${action.action_type}: ${action.value}`);
    });
    
    if (leadActions.length > 1) {
      const total = leadActions.reduce((sum, action) => sum + (parseFloat(action.value) || 0), 0);
      console.log(`  ⚠️ MULTIPLE ACTION TYPES - Total if summed: ${total}`);
    }
  }
  
  const leadAction = actions.find(action => action.action_type === 'lead');
  const result = leadAction ? parseFloat(leadAction.value) || 0 : 0;
  
  if (leadActions.length > 0) {
    console.log(`  ✅ Using only 'lead' action: ${result}`);
  }
  
  return result;
}

async function fetchSocialMetrics(supabase: any, clientId: string): Promise<SocialMetrics> {
  console.log('Fetching social metrics for client:', clientId);
  
  // Buscar cliente com Instagram e Facebook Page vinculados
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
      // Buscar últimos 25 posts com dados completos
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

        // Feed: manter ordem do Instagram (mais recentes primeiro)
        // Retornamos mais que 6 para permitir "Carregar mais" no frontend
        recentPosts = mappedPosts.slice(0, 30);

        totalLikes = mappedPosts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
        totalComments = mappedPosts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
        avgEngagement = postsCount > 0 ? (totalLikes + totalComments) / postsCount : 0;

        // Ordenar por engajamento e pegar top 6
        topPosts = mappedPosts
          .map((p: InstagramFeedPost) => ({
            ...p,
            engagement: (p.like_count || 0) + (p.comments_count || 0),
          }))
          .sort((a: TopEngagementPost, b: TopEngagementPost) => b.engagement - a.engagement)
          .slice(0, 6);

        console.log(`Fetched ${postsCount} Instagram posts, returning ${recentPosts.length} recent and top ${topPosts.length}`);
      }

      // Buscar insights do Instagram (requer instagram_manage_insights)
      let reach = 0;
      let impressions = 0;
      let profileViews = 0;
      let websiteClicks = 0;
      
      // Timeline data for charts
      let timeline: InstagramTimeline = {
        reach: [],
        accounts_engaged: [],
        profile_views: [],
        website_clicks: [],
        follower_count: [],
      };
      
      // Comparison data
      let comparison: InstagramComparison = {
        reach_change_pct: 0,
        accounts_engaged_change_pct: 0,
        profile_views_change_pct: 0,
        website_clicks_change_pct: 0,
        followers_gained: 0,
      };

      try {
        // Calculate date range (last 30 days)
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const since = Math.floor(thirtyDaysAgo.getTime() / 1000);
        const until = Math.floor(now.getTime() / 1000);
        
        // Chamada 1: Métricas com period=day (reach, follower_count)
        const dailyMetricsUrl = `https://graph.facebook.com/v20.0/${igAccount.instagram_id}/insights?` +
          `metric=reach,follower_count` +
          `&period=day` +
          `&since=${since}&until=${until}` +
          `&access_token=${pageAccessToken}`;
        
        console.log('Fetching Instagram daily metrics (reach, follower_count)...');
        const dailyResponse = await fetch(dailyMetricsUrl);
        
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          console.log('Instagram daily metrics received');
          
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
        } else {
          const errorData = await dailyResponse.json();
          console.log('Instagram daily metrics error:', errorData.error?.message);
        }
        
        // Chamada 2: Métricas com metric_type=total_value (accounts_engaged, profile_views, website_clicks)
        // Essas métricas retornam valor total, não série temporal
        const totalMetricsUrl = `https://graph.facebook.com/v20.0/${igAccount.instagram_id}/insights?` +
          `metric=accounts_engaged,profile_views,website_clicks` +
          `&period=day` +
          `&metric_type=total_value` +
          `&since=${since}&until=${until}` +
          `&access_token=${pageAccessToken}`;
        
        console.log('Fetching Instagram total metrics (accounts_engaged, profile_views, website_clicks)...');
        const totalResponse = await fetch(totalMetricsUrl);
        
        if (totalResponse.ok) {
          const totalData = await totalResponse.json();
          console.log('Instagram total metrics received');
          
          if (totalData.data) {
            totalData.data.forEach((metric: any) => {
              const metricName = metric.name;
              const totalValue = metric.total_value?.value || 0;
              
              switch (metricName) {
                case 'accounts_engaged':
                  impressions = totalValue;
                  // Create a single point for display (total for period)
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
        } else {
          const errorData = await totalResponse.json();
          console.log('Instagram total metrics error:', errorData.error?.message);
        }
        
        // Calculate comparison (last 7 days vs previous 7 days) - only for reach and follower_count
        const calcComparison = (data: TimelineDataPoint2[]) => {
          if (data.length < 14) return 0;
          const last7 = data.slice(-7).reduce((sum, v) => sum + v.value, 0);
          const prev7 = data.slice(-14, -7).reduce((sum, v) => sum + v.value, 0);
          if (prev7 === 0) return last7 > 0 ? 100 : 0;
          return ((last7 - prev7) / prev7) * 100;
        };
        
        comparison.reach_change_pct = calcComparison(timeline.reach);
        // These will be 0 since we don't have daily breakdown for them
        comparison.accounts_engaged_change_pct = 0;
        comparison.profile_views_change_pct = 0;
        comparison.website_clicks_change_pct = 0;
        
        // Calculate followers gained in last 7 days
        if (timeline.follower_count.length >= 7) {
          const lastFollowers = timeline.follower_count[timeline.follower_count.length - 1]?.value || 0;
          const weekAgoFollowers = timeline.follower_count[timeline.follower_count.length - 7]?.value || 0;
          comparison.followers_gained = lastFollowers - weekAgoFollowers;
        }
        
        console.log('Timeline processed:', {
          reach_points: timeline.reach.length,
          follower_points: timeline.follower_count.length,
          accounts_engaged_total: impressions,
          profile_views_total: profileViews,
        });
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
      
      // Retornar dados básicos do banco
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
    let recentPosts: FacebookPost[] = [];

    if (pageAccessToken) {
      try {
        // Buscar followers count e fans (likes)
        const pageInfoUrl = `https://graph.facebook.com/v20.0/${fbPage.page_id}?` +
          `fields=followers_count,fan_count&access_token=${pageAccessToken}`;
        
        console.log('Fetching Facebook Page info...');
        const pageInfoResponse = await fetch(pageInfoUrl);
        if (pageInfoResponse.ok) {
          const pageInfo = await pageInfoResponse.json();
          followersCount = pageInfo.followers_count || 0;
          pageFans = pageInfo.fan_count || 0;
          console.log('Facebook Page info received:', { followersCount, pageFans });
        } else {
          const errorData = await pageInfoResponse.json();
          console.log('Facebook Page info error:', errorData.error?.message);
        }

        // Buscar insights da página com métricas válidas
        // Métricas válidas: page_impressions_unique (reach), page_post_engagements
        const pageInsightsUrl = `https://graph.facebook.com/v20.0/${fbPage.page_id}/insights?` +
          `metric=page_impressions_unique,page_post_engagements` +
          `&period=day&date_preset=last_28d` +
          `&access_token=${pageAccessToken}`;
        
        console.log('Fetching Facebook Page insights with valid metrics...');
        const pageInsightsResponse = await fetch(pageInsightsUrl);
        
        if (pageInsightsResponse.ok) {
          const insightsData = await pageInsightsResponse.json();
          console.log('Facebook Page insights data received');
          
          if (insightsData.data) {
            insightsData.data.forEach((metric: any) => {
              // Somar valores dos últimos 28 dias
              const values = metric.values || [];
              const total = values.reduce((sum: number, v: any) => sum + (v.value || 0), 0);
              
              switch (metric.name) {
                case 'page_impressions_unique':
                  pageReach = total;
                  break;
                case 'page_post_engagements':
                  pageEngagedUsers = total;
                  break;
              }
            });
            console.log('Facebook insights processed:', { pageReach, pageEngagedUsers });
          }
        } else {
          const errorData = await pageInsightsResponse.json();
          console.log('Facebook Page insights not available:', errorData.error?.message);
        }

        // Buscar posts recentes da página do Facebook
        const postsUrl = `https://graph.facebook.com/v20.0/${fbPage.page_id}/published_posts?` +
          `fields=id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares` +
          `&limit=12&access_token=${pageAccessToken}`;
        
        console.log('Fetching Facebook Page posts...');
        const postsResponse = await fetch(postsUrl);
        
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          console.log('Facebook posts received:', postsData.data?.length || 0);
          
          if (postsData.data) {
            recentPosts = postsData.data.map((post: any) => ({
              id: post.id,
              message: post.message || '',
              created_time: post.created_time,
              full_picture: post.full_picture || '',
              permalink_url: post.permalink_url || `https://www.facebook.com/${post.id}`,
              likes_count: post.likes?.summary?.total_count || 0,
              comments_count: post.comments?.summary?.total_count || 0,
              shares_count: post.shares?.count || 0,
            }));
          }
        } else {
          const errorData = await postsResponse.json();
          console.log('Facebook Page posts not available:', errorData.error?.message);
        }
      } catch (fbError) {
        console.log('Error fetching Facebook Page data:', fbError);
      }
    }

    facebookData = {
      page_name: fbPage.page_name,
      page_category: fbPage.page_category || '',
      followers_count: followersCount || pageFans,
      page_reach: pageReach,
      page_impressions: pageReach, // Use reach as impressions for backwards compatibility
      page_engaged_users: pageEngagedUsers,
      recent_posts: recentPosts,
    };
  }

  return { instagram: instagramData, facebook: facebookData };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, start_date, end_date } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: 'start_date and end_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching client by dashboard token:', token);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company, ad_account_id, avatar')
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

    if (!client.ad_account_id) {
      // Se não tem ad account, ainda retornar dados sociais
      const socialMetrics = await socialMetricsPromise;
      
      return new Response(
        JSON.stringify({ 
          error: 'No Facebook ad account linked to this client',
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

    console.log('Fetching Facebook ad account:', client.ad_account_id);

    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('account_id, integration_id')
      .eq('id', client.ad_account_id)
      .single();

    if (adAccountError || !adAccount) {
      console.error('Ad account not found:', adAccountError);
      return new Response(
        JSON.stringify({ error: 'Facebook ad account not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Facebook integration:', adAccount.integration_id);

    const { data: integration, error: integrationError } = await supabase
      .from('facebook_integrations')
      .select('access_token, is_active')
      .eq('id', adAccount.integration_id)
      .single();

    if (integrationError || !integration) {
      console.error('Integration not found:', integrationError);
      return new Response(
        JSON.stringify({ error: 'Facebook integration not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!integration.is_active) {
      return new Response(
        JSON.stringify({ error: 'Facebook integration is not active. Please reconnect.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Integration found, active:', integration.is_active);

    const since = start_date;
    const until = end_date;

    console.log(`Fetching campaigns from Facebook for period ${since} to ${until}`);

    const cleanAccountId = adAccount.account_id.replace(/^act_/, '');

    const campaignsUrl = `https://graph.facebook.com/v20.0/act_${cleanAccountId}/campaigns?` +
      `fields=id,name,status,objective,` +
      `insights.time_range({since:'${since}',until:'${until}'})` +
      `.action_report_time(conversion)` +
      `.action_attribution_windows(["7d_click"])` +
      `{date_start,date_stop,impressions,clicks,spend,actions,reach,frequency}` +
      `&limit=500&access_token=${integration.access_token}`;

    console.log('Fetching campaigns from Meta (aggregated data)');

    const campaignsResponse = await fetch(campaignsUrl);
    
    const timelineUrl = `https://graph.facebook.com/v20.0/act_${cleanAccountId}/insights?` +
      `time_range={'since':'${since}','until':'${until}'}` +
      `&time_increment=1` +
      `&fields=date_start,actions,spend` +
      `&action_attribution_windows=["7d_click"]` +
      `&action_report_time=conversion` +
      `&level=account` +
      `&access_token=${integration.access_token}`;

    console.log('Fetching timeline data from Meta (daily breakdown)');

    const timelineResponse = await fetch(timelineUrl);
    
    if (!campaignsResponse.ok) {
      const errorData = await campaignsResponse.json();
      console.error('Facebook API error:', errorData);
      
      if (campaignsResponse.status === 190 || campaignsResponse.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Facebook token expired. Please reconnect your account.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Facebook API error: ${errorData.error?.message || 'Unknown error'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!timelineResponse.ok) {
      const timelineError = await timelineResponse.json();
      console.error('Facebook Timeline API error:', timelineError);
    }

    const fbData = await campaignsResponse.json();
    const timelineData = timelineResponse.ok ? await timelineResponse.json() : { data: [] };
    
    // Aguardar métricas sociais
    const socialMetrics = await socialMetricsPromise;
    
    console.log(`Fetched ${fbData.data?.length || 0} campaigns from Facebook`);
    console.log(`Fetched ${timelineData.data?.length || 0} daily timeline insights`);

    const campaigns = fbData.data || [];
    
    const timelineMap = new Map<string, { leads: number; messages: number }>();
    
    if (timelineData.data && Array.isArray(timelineData.data)) {
      timelineData.data.forEach((insight: any) => {
        const date = insight.date_start;
        if (date) {
          const conversions = extractConversions(insight.actions, `Timeline ${date}`);
          const messages = insight.actions?.find(
            (a: any) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d'
          )?.value || 0;
          
          timelineMap.set(date, {
            leads: conversions,
            messages: parseFloat(messages),
          });
        }
      });
    }
    
    console.log('Timeline daily data points:', timelineMap.size);
    
    let totalSpend = 0;
    let totalConversions = 0;
    let totalMessages = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;

    const processedCampaigns = campaigns.map((campaign: any) => {
      const insights = campaign.insights?.data || [];
      
      if (insights.length === 0) {
        return {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          spend: 0,
          conversions: 0,
          impressions: 0,
          clicks: 0,
          reach: 0,
          frequency: 0,
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
        const conversions = extractConversions(insight.actions, campaign.name);
        
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
      });

      totalSpend += totalCampaignSpend;
      totalImpressions += totalCampaignImpressions;
      totalClicks += totalCampaignClicks;
      totalReach += totalCampaignReach;

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        spend: totalCampaignSpend,
        conversions: totalCampaignConversions,
        messages: totalCampaignMessages,
        impressions: totalCampaignImpressions,
        clicks: totalCampaignClicks,
        reach: totalCampaignReach,
        frequency: totalCampaignReach > 0 ? totalCampaignImpressions / totalCampaignReach : 0,
      };
    });

    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    timeline.forEach((point: any) => {
      totalConversions += parseFloat(point.leads || 0);
      totalMessages += parseFloat(point.messages || 0);
    });

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

    const topCampaigns = processedCampaigns
      .filter((c: any) => c.conversions > 0)
      .sort((a: any, b: any) => b.conversions - a.conversions)
      .slice(0, 5)
      .map((c: any) => ({
        name: c.name,
        conversions: c.conversions,
        spend: c.spend,
        percentage: totalConversions > 0 ? (c.conversions / totalConversions) * 100 : 0,
      }));

    const campaignsTable = processedCampaigns.map((c: any) => ({
      name: c.name,
      ad_sets_count: 0,
      ads_count: 0,
      spend: c.spend,
      leads: c.conversions,
      cpl: c.conversions > 0 ? c.spend / c.conversions : 0,
      messages: c.messages,
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      status: c.status,
    }));

    const daysDiff = Math.ceil((new Date(until).getTime() - new Date(since).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const response = {
      client: {
        name: client.name,
        company: client.company,
        avatar_url: client.avatar,
      },
      period: {
        start_date: since,
        end_date: until,
        days: daysDiff,
      },
      metrics,
      timeline,
      top_campaigns: topCampaigns,
      campaigns_table: campaignsTable,
      social_metrics: socialMetrics,
    };

    return new Response(JSON.stringify(response), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300'
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
