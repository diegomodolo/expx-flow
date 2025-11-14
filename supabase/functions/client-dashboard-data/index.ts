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

    // Limit period to max 365 days
    const safePeriod = Math.min(Math.max(period, 1), 365);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get client by dashboard token
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, company, avatar_url')
      .eq('dashboard_token', token)
      .single();

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - safePeriod);

    // Fetch campaigns data
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('client_id', client.id)
      .gte('updated_at', startDate.toISOString())
      .order('spend', { ascending: false });

    if (campaignsError) {
      throw campaignsError;
    }

    // Fetch ad sets data
    const { data: adSets, error: adSetsError } = await supabase
      .from('ad_sets')
      .select('*')
      .eq('client_id', client.id)
      .gte('updated_at', startDate.toISOString());

    if (adSetsError) {
      throw adSetsError;
    }

    // Fetch ads data
    const { data: ads, error: adsError } = await supabase
      .from('ads')
      .select('*')
      .eq('client_id', client.id)
      .gte('updated_at', startDate.toISOString());

    if (adsError) {
      throw adsError;
    }

    // Calculate aggregate metrics
    const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
    const totalConversions = campaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
    const totalImpressions = campaigns?.reduce((sum, c) => sum + (c.impressions || 0), 0) || 0;
    const totalClicks = campaigns?.reduce((sum, c) => sum + (c.clicks || 0), 0) || 0;
    const totalReach = campaigns?.reduce((sum, c) => sum + (c.reach || 0), 0) || 0;

    // Calculate CPL (Cost Per Lead)
    const cpl = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Calculate Leads per 1k impressions
    const leadsPerK = totalImpressions > 0 ? (totalConversions / totalImpressions) * 1000 : 0;

    // Calculate CPM (Cost Per Mille)
    const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;

    // Calculate CPC (Cost Per Click)
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    // Calculate CTR (Click Through Rate)
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Calculate Frequency
    const frequency = totalReach > 0 ? totalImpressions / totalReach : 0;

    // Estimate messages (assuming 60% of conversions result in messages)
    const messages = Math.round(totalConversions * 0.6);

    // Estimate page views (assuming CTR * 0.8 reach page)
    const pageViews = Math.round(totalClicks * 0.8);

    // Calculate connect rate (messages / page views)
    const connectRate = pageViews > 0 ? (messages / pageViews) * 100 : 0;

    // Calculate lead rate (leads / page views)
    const leadRate = pageViews > 0 ? (totalConversions / pageViews) * 100 : 0;

    const metrics: DashboardMetrics = {
      spend: totalSpend,
      leads: totalConversions,
      messages: messages,
      cpl: cpl,
      leads_per_1k: leadsPerK,
      impressions: totalImpressions,
      clicks: totalClicks,
      page_views: pageViews,
      cpm: cpm,
      cpc: cpc,
      ctr: ctr,
      connect_rate: connectRate,
      lead_rate: leadRate,
      frequency: frequency,
    };

    // Generate timeline data (daily aggregates)
    const timelineData = [];
    const daysArray = [];
    for (let i = 0; i < safePeriod; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      daysArray.push(date.toISOString().split('T')[0]);
    }

    // Aggregate by date
    for (const day of daysArray) {
      const dayStart = new Date(day);
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayLeads = campaigns?.reduce((sum, c) => {
        const updated = new Date(c.updated_at);
        if (updated >= dayStart && updated < dayEnd) {
          return sum + (c.conversions || 0);
        }
        return sum;
      }, 0) || 0;

      timelineData.push({
        date: day,
        leads: dayLeads,
        messages: Math.round(dayLeads * 0.6),
      });
    }

    // Top campaigns by conversions
    const topCampaigns = (campaigns || [])
      .filter((c) => c.conversions > 0)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        conversions: c.conversions,
        spend: c.spend,
        percentage: totalConversions > 0 ? ((c.conversions / totalConversions) * 100) : 0,
      }));

    // Campaigns table data
    const campaignsTable = (campaigns || []).map((c) => {
      const campaignAdSets = adSets?.filter((as) => as.campaign_id === c.id) || [];
      const campaignAds = ads?.filter((ad) => ad.campaign_id === c.id) || [];

      return {
        name: c.name,
        ad_sets_count: campaignAdSets.length,
        ads_count: campaignAds.length,
        spend: c.spend,
        leads: c.conversions,
        cpl: c.conversions > 0 ? c.spend / c.conversions : 0,
        messages: Math.round(c.conversions * 0.6),
        cpm: c.impressions > 0 ? (c.spend / c.impressions) * 1000 : 0,
        status: c.status,
      };
    });

    const response = {
      client: {
        name: client.name,
        company: client.company,
        avatar_url: client.avatar_url,
      },
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days: safePeriod,
      },
      metrics,
      timeline: timelineData,
      top_campaigns: topCampaigns,
      campaigns_table: campaignsTable,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
