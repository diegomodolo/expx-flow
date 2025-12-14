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

interface SocialMetrics {
  instagram: {
    username: string;
    profile_picture_url: string;
    followers_count: number;
    posts_count: number;
    recent_posts: Array<{
      id: string;
      media_type: string;
      media_url: string;
      thumbnail_url: string;
      caption: string;
      like_count: number;
      comments_count: number;
      permalink: string;
      timestamp: string;
    }>;
    total_likes: number;
    total_comments: number;
    avg_engagement: number;
    top_post: {
      id: string;
      thumbnail_url: string;
      media_url: string;
      like_count: number;
      comments_count: number;
      permalink: string;
    } | null;
  } | null;
  facebook: {
    page_name: string;
    page_category: string;
    page_picture_url: string;
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
    
    console.log('Fetching Instagram media for:', igAccount.username);
    
    try {
      // Buscar últimos 25 posts com métricas
      const mediaUrl = `https://graph.facebook.com/v20.0/${igAccount.instagram_id}/media?` +
        `fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count,permalink` +
        `&limit=25&access_token=${pageAccessToken}`;
      
      const mediaResponse = await fetch(mediaUrl);
      
      if (mediaResponse.ok) {
        const mediaData = await mediaResponse.json();
        const posts = mediaData.data || [];
        
        console.log(`Fetched ${posts.length} Instagram posts`);
        
        // Calcular métricas agregadas
        const totalLikes = posts.reduce((sum: number, p: any) => sum + (p.like_count || 0), 0);
        const totalComments = posts.reduce((sum: number, p: any) => sum + (p.comments_count || 0), 0);
        const avgEngagement = posts.length > 0 ? (totalLikes + totalComments) / posts.length : 0;
        
        // Encontrar post com melhor engajamento
        const topPost = posts.length > 0 
          ? posts.reduce((best: any, current: any) => {
              const bestEngagement = (best.like_count || 0) + (best.comments_count || 0);
              const currentEngagement = (current.like_count || 0) + (current.comments_count || 0);
              return currentEngagement > bestEngagement ? current : best;
            })
          : null;
        
        instagramData = {
          username: igAccount.username,
          profile_picture_url: igAccount.profile_picture_url || '',
          followers_count: igAccount.followers_count || 0,
          posts_count: posts.length,
          recent_posts: posts.slice(0, 6).map((p: any) => ({
            id: p.id,
            media_type: p.media_type,
            media_url: p.media_url || '',
            thumbnail_url: p.thumbnail_url || p.media_url || '',
            caption: p.caption || '',
            like_count: p.like_count || 0,
            comments_count: p.comments_count || 0,
            permalink: p.permalink,
            timestamp: p.timestamp,
          })),
          total_likes: totalLikes,
          total_comments: totalComments,
          avg_engagement: avgEngagement,
          top_post: topPost ? {
            id: topPost.id,
            thumbnail_url: topPost.thumbnail_url || topPost.media_url || '',
            media_url: topPost.media_url || '',
            like_count: topPost.like_count || 0,
            comments_count: topPost.comments_count || 0,
            permalink: topPost.permalink,
          } : null,
        };
      } else {
        const errorData = await mediaResponse.json();
        console.error('Error fetching Instagram media:', errorData);
        
        // Retornar dados básicos mesmo sem posts
        instagramData = {
          username: igAccount.username,
          profile_picture_url: igAccount.profile_picture_url || '',
          followers_count: igAccount.followers_count || 0,
          posts_count: 0,
          recent_posts: [],
          total_likes: 0,
          total_comments: 0,
          avg_engagement: 0,
          top_post: null,
        };
      }
    } catch (error) {
      console.error('Error fetching Instagram data:', error);
      
      // Retornar dados básicos do banco
      instagramData = {
        username: igAccount.username,
        profile_picture_url: igAccount.profile_picture_url || '',
        followers_count: igAccount.followers_count || 0,
        posts_count: 0,
        recent_posts: [],
        total_likes: 0,
        total_comments: 0,
        avg_engagement: 0,
        top_post: null,
      };
    }
  }

  // Dados do Facebook Page
  if (clientFull?.facebook_pages) {
    const fbPage = clientFull.facebook_pages;
    facebookData = {
      page_name: fbPage.page_name,
      page_category: fbPage.page_category || '',
      page_picture_url: '',
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
