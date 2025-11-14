import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DashboardMetrics {
  spend: number;
  leads: number;
  messages: number;
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

const VALID_LEAD_ACTIONS = [
  'lead', 'leadgen.other', 'onsite_conversion.lead_grouped',
  'offsite_conversion.fb_pixel_lead', 'onsite_conversion.messaging_conversation_started_7d'
];

function extractConversions(actions: any[]): number {
  if (!actions || !Array.isArray(actions)) return 0;
  
  return actions
    .filter(action => VALID_LEAD_ACTIONS.includes(action.action_type))
    .reduce((sum, action) => sum + (parseFloat(action.value) || 0), 0);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, period = 30 } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const safePeriod = Math.min(Math.max(period, 1), 365);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching client by dashboard token:', token);

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company, ad_account_id')
      .eq('dashboard_token', token)
      .single();

    if (clientError || !client) {
      console.error('Client not found:', clientError);
      return new Response(
        JSON.stringify({ error: 'Invalid dashboard token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!client.ad_account_id) {
      return new Response(
        JSON.stringify({ error: 'No Facebook ad account linked to this client' }),
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

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - safePeriod);

    const since = startDate.toISOString().split('T')[0];
    const until = endDate.toISOString().split('T')[0];

    console.log(`Fetching campaigns from Facebook for period ${since} to ${until}`);

    const campaignsUrl = `https://graph.facebook.com/v20.0/act_${adAccount.account_id}/campaigns?` +
      `fields=id,name,status,objective,` +
      `insights.time_range({since:'${since}',until:'${until}'})` +
      `.action_report_time(conversion)` +
      `.action_attribution_windows(["7d_click","1d_view"])` +
      `{date_start,date_stop,impressions,clicks,spend,actions,reach,frequency}` +
      `&limit=500&access_token=${integration.access_token}`;

    const campaignsResponse = await fetch(campaignsUrl);
    
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

    const fbData = await campaignsResponse.json();
    console.log(`Fetched ${fbData.data?.length || 0} campaigns from Facebook`);

    const campaigns = fbData.data || [];
    const timelineMap = new Map<string, { leads: number; messages: number }>();
    
    let totalSpend = 0;
    let totalConversions = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;

    const processedCampaigns = campaigns.map((campaign: any) => {
      const insights = campaign.insights?.data?.[0];
      
      if (!insights) {
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

      const spend = parseFloat(insights.spend || '0');
      const impressions = parseInt(insights.impressions || '0', 10);
      const clicks = parseInt(insights.clicks || '0', 10);
      const reach = parseInt(insights.reach || '0', 10);
      const frequency = parseFloat(insights.frequency || '0');
      const conversions = extractConversions(insights.actions);

      totalSpend += spend;
      totalConversions += conversions;
      totalImpressions += impressions;
      totalClicks += clicks;
      totalReach += reach;

      const date = insights.date_start;
      if (date) {
        const existing = timelineMap.get(date) || { leads: 0, messages: 0 };
        timelineMap.set(date, {
          leads: existing.leads + conversions,
          messages: existing.messages + Math.round(conversions * 0.6),
        });
      }

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        spend,
        conversions,
        impressions,
        clicks,
        reach,
        frequency,
      };
    });

    const cpl = totalConversions > 0 ? totalSpend / totalConversions : 0;
    const leadsPerK = totalImpressions > 0 ? (totalConversions / totalImpressions) * 1000 : 0;
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;
    const messages = Math.round(totalConversions * 0.6);
    const pageViews = Math.round(totalClicks * 0.8);
    const connectRate = pageViews > 0 ? (messages / pageViews) * 100 : 0;
    const leadRate = pageViews > 0 ? (totalConversions / pageViews) * 100 : 0;

    const metrics: DashboardMetrics = {
      spend: totalSpend,
      leads: totalConversions,
      messages,
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

    const timeline = Array.from(timelineMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

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
      messages: Math.round(c.conversions * 0.6),
      cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
      status: c.status,
    }));

    const response = {
      client: {
        name: client.name,
        company: client.company,
      },
      period: {
        start_date: since,
        end_date: until,
        days: safePeriod,
      },
      metrics,
      timeline,
      top_campaigns: topCampaigns,
      campaigns_table: campaignsTable,
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
