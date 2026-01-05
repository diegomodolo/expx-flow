import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GestorRanking {
  id: string;
  name: string;
  avatar: string | null;
  position: number;
  conversions: number;
  clientsCount: number;
  totalSpend: number;
}

interface SquadRanking {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  position: number;
  conversions: number;
  clientsCount: number;
  totalSpend: number;
}

interface RecentWin {
  id: string;
  type: 'sale' | 'lead';
  value: number;
  clientName: string;
  gestorName: string;
  gestorAvatar: string | null;
  timestamp: string;
}

interface PerformanceMetrics {
  totalLeads: number;
  totalSpend: number;
  avgCtr: number;
  activeClients: number;
  totalAds: number;
}

interface FeaturedClient {
  id: string;
  name: string;
  avatar: string | null;
  gestorName: string | null;
  gestorAvatar: string | null;
  teamName: string | null;
  teamColor: string | null;
  status: string;
  totalSpend: number;
  avgCtr: number;
  totalAds: number;
  totalConversions: number;
  totalCampaigns: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // Accept token via query param (?token=) OR JSON body ({ token })
    let token = url.searchParams.get('token');

    if (!token && req.method !== 'GET') {
      try {
        const contentType = req.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const body = await req.json().catch(() => null);
          token = body?.token ?? null;
        }
      } catch (e) {
        // ignore body parse errors
      }
    }

    if (!token) {
      console.error('No token provided');
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Social TV Dashboard data requested for token:', token);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find company by social TV token
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('social_tv_dashboard_token', token)
      .single();

    if (companyError || !company) {
      console.error('Company not found:', companyError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found company:', company.name);

    // ========== PERFORMANCE METRICS ==========
    // Use RPC function for aggregates (avoids PostgREST aggregate restriction)
    const { data: perfAgg, error: perfAggError } = await supabase
      .rpc('social_tv_performance_aggregates', { p_company_id: company.id });

    if (perfAggError) {
      console.error('Error fetching performance aggregates:', perfAggError);
    }

    const perfRow = (perfAgg && perfAgg[0]) as any;

    const totalSpend = Number(perfRow?.total_spend ?? 0);
    const totalLeads = Number(perfRow?.total_conversions ?? 0);
    const avgCtr = Number(perfRow?.avg_ctr ?? 0);

    // Count active ads (exact, >1000)
    const { count: totalAdsCount, error: totalAdsError } = await supabase
      .from('ads')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_active', true);

    if (totalAdsError) {
      console.error('Error counting active ads:', totalAdsError);
    }

    const totalAds = totalAdsCount ?? 0;

    // Count active clients (exact, >1000)
    const { count: activeClientsCount, error: activeClientsError } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_canceled', false);

    if (activeClientsError) {
      console.error('Error counting active clients:', activeClientsError);
    }

    const performanceMetrics: PerformanceMetrics = {
      totalLeads,
      totalSpend,
      avgCtr,
      activeClients: activeClientsCount || 0,
      totalAds,
    };

    console.log('Performance metrics:', performanceMetrics);

    // ========== FEATURED CLIENT ==========
    // Top client by total spend using RPC (avoids PostgREST aggregate restriction)
    let featuredClient: FeaturedClient | null = null;

    const { data: topClientAgg, error: topClientAggError } = await supabase
      .rpc('social_tv_featured_client_aggregates', { p_company_id: company.id });

    if (topClientAggError) {
      console.error('Error fetching featured client aggregates:', topClientAggError);
    }

    const topAggRow = (topClientAgg && topClientAgg[0]) as any;
    const topClientId: string | undefined = topAggRow?.client_id ?? undefined;

    if (topClientId) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          avatar,
          calculated_status,
          gestor_id,
          team_id,
          ad_account_id,
          google_account_id,
          gestor:employees!gestor_id(id, name, avatar, user_id),
          team:teams!team_id(id, name, color)
        `)
        .eq('id', topClientId)
        .eq('company_id', company.id)
        .eq('is_canceled', false)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching featured client details:', clientError);
      }

      if (client) {
        // Count active ads for featured client
        const { count: featuredAdsCount, error: featuredAdsError } = await supabase
          .from('ads')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('client_id', client.id)
          .eq('is_active', true);

        if (featuredAdsError) {
          console.error('Error counting featured client ads:', featuredAdsError);
        }

        // Count active campaigns for featured client
        const { count: featuredCampaignsCount, error: featuredCampaignsError } = await supabase
          .from('campaigns')
          .select('id', { count: 'exact', head: true })
          .eq('company_id', company.id)
          .eq('client_id', client.id)
          .eq('is_active', true);

        if (featuredCampaignsError) {
          console.error('Error counting featured client campaigns:', featuredCampaignsError);
        }

        // Get conversions and CTR for featured client - ALL CAMPAIGNS (same logic as clients page)
        // Meta campaigns (from campaigns table)
        const { data: metaCampaignsData } = await supabase
          .from('campaigns')
          .select('conversions, ctr, spend')
          .eq('company_id', company.id)
          .eq('client_id', client.id);

        const metaConversions = (metaCampaignsData || []).reduce((sum, c) => sum + (c.conversions || 0), 0);
        const metaSpend = (metaCampaignsData || []).reduce((sum, c) => sum + (c.spend || 0), 0);
        const metaCtrSum = (metaCampaignsData || []).reduce((sum, c) => sum + (c.ctr || 0), 0);
        const metaCtrCount = (metaCampaignsData || []).filter(c => c.ctr && c.ctr > 0).length;

        // Google campaigns (from google_campaigns table)
        const { data: googleCampaignsData } = await supabase
          .from('google_campaigns')
          .select('conversions, ctr, spend')
          .eq('company_id', company.id)
          .eq('client_id', client.id);

        const googleConversions = (googleCampaignsData || []).reduce((sum, c) => sum + (c.conversions || 0), 0);
        const googleSpend = (googleCampaignsData || []).reduce((sum, c) => sum + (c.spend || 0), 0);
        const googleCtrSum = (googleCampaignsData || []).reduce((sum, c) => sum + (c.ctr || 0), 0);
        const googleCtrCount = (googleCampaignsData || []).filter(c => c.ctr && c.ctr > 0).length;

        // Consolidated metrics = Meta + Google (same as clients page)
        const featuredConversions = metaConversions + googleConversions;
        const featuredSpend = metaSpend + googleSpend;
        const totalCtrCount = metaCtrCount + googleCtrCount;
        const featuredAvgCtr = totalCtrCount > 0 ? (metaCtrSum + googleCtrSum) / totalCtrCount : 0;
        
        console.log(`Featured client ${client.name}: Meta conversions=${metaConversions}, Google conversions=${googleConversions}, Total=${featuredConversions}, AvgCTR=${featuredAvgCtr}`);

        const gestor = client.gestor as any;
        const team = client.team as any;

        // Fetch gestor profile to get updated name
        let gestorName = gestor?.name || null;
        let gestorAvatar = gestor?.avatar || null;
        
        if (gestor?.user_id) {
          const { data: gestorProfile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', gestor.user_id)
            .maybeSingle();
          
          if (gestorProfile?.full_name) {
            gestorName = gestorProfile.full_name;
          }
          if (gestorProfile?.avatar_url) {
            gestorAvatar = gestorProfile.avatar_url;
          }
        }

        featuredClient = {
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          gestorName,
          gestorAvatar,
          teamName: team?.name || null,
          teamColor: team?.color || null,
          status: client.calculated_status || 'ativo',
          totalSpend: featuredSpend,
          avgCtr: featuredAvgCtr,
          totalAds: featuredAdsCount ?? 0,
          totalConversions: featuredConversions,
          totalCampaigns: featuredCampaignsCount ?? 0,
        };
      }
    }

    console.log('Featured client:', featuredClient?.name || 'none');

    // ========== GESTOR RANKING ==========
    const { data: clientsWithGestores } = await supabase
      .from('clients')
      .select(`
        gestor_id,
        user_id,
        gestor:employees!gestor_id(id, name, avatar, user_id),
        campaigns(conversions, spend)
      `)
      .eq('company_id', company.id)
      .eq('is_canceled', false);

    // Aggregate by gestor_id
    const gestorStats = new Map<string, { conversions: number; clientsCount: number; totalSpend: number; gestorUserId?: string }>();
    
    if (clientsWithGestores) {
      for (const client of clientsWithGestores) {
        const gestor = client.gestor as any;
        const gestorId = gestor?.id || client.user_id;
        const gestorUserId = gestor?.user_id || client.user_id;
        
        if (!gestorId) continue;
        
        if (!gestorStats.has(gestorId)) {
          gestorStats.set(gestorId, { conversions: 0, clientsCount: 0, totalSpend: 0, gestorUserId });
        }
        const stats = gestorStats.get(gestorId)!;
        stats.clientsCount++;
        
        const campaigns = client.campaigns as any[] || [];
        for (const campaign of campaigns) {
          stats.conversions += campaign.conversions || 0;
          stats.totalSpend += campaign.spend || 0;
        }
      }
    }

    // Get gestor info
    const gestorIds = Array.from(gestorStats.keys());
    const gestorUserIds = Array.from(gestorStats.values()).map(s => s.gestorUserId).filter(Boolean) as string[];
    
    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, name, avatar, user_id')
      .in('id', gestorIds);
    
    const { data: gestorProfiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', gestorUserIds);

    const gestorRanking: GestorRanking[] = [];
    let position = 1;
    
    const sortedGestores = Array.from(gestorStats.entries())
      .sort((a, b) => b[1].conversions - a[1].conversions)
      .slice(0, 5);

    for (const [gestorId, stats] of sortedGestores) {
      const employee = employeeData?.find(e => e.id === gestorId);
      const profile = gestorProfiles?.find(p => p.user_id === stats.gestorUserId || p.user_id === gestorId);
      
      gestorRanking.push({
        id: gestorId,
        name: profile?.full_name || employee?.name || 'Gestor',
        avatar: profile?.avatar_url || employee?.avatar || null,
        position: position++,
        conversions: stats.conversions,
        clientsCount: stats.clientsCount,
        totalSpend: stats.totalSpend
      });
    }

    // ========== SQUAD RANKING ==========
    const { data: clientsWithSquads } = await supabase
      .from('clients')
      .select(`
        team_id,
        team:teams!team_id(id, name, icon, color),
        campaigns(conversions, spend)
      `)
      .eq('company_id', company.id)
      .eq('is_canceled', false)
      .not('team_id', 'is', null);

    const squadStats = new Map<string, { conversions: number; clientsCount: number; totalSpend: number; teamData?: any }>();
    
    if (clientsWithSquads) {
      for (const client of clientsWithSquads) {
        const team = client.team as any;
        const teamId = team?.id || client.team_id;
        
        if (!teamId) continue;
        
        if (!squadStats.has(teamId)) {
          squadStats.set(teamId, { conversions: 0, clientsCount: 0, totalSpend: 0, teamData: team });
        }
        const stats = squadStats.get(teamId)!;
        stats.clientsCount++;
        
        const campaigns = client.campaigns as any[] || [];
        for (const campaign of campaigns) {
          stats.conversions += campaign.conversions || 0;
          stats.totalSpend += campaign.spend || 0;
        }
      }
    }

    const squadRanking: SquadRanking[] = [];
    let squadPosition = 1;
    
    const sortedSquads = Array.from(squadStats.entries())
      .sort((a, b) => b[1].conversions - a[1].conversions)
      .slice(0, 5);

    for (const [squadId, stats] of sortedSquads) {
      squadRanking.push({
        id: squadId,
        name: stats.teamData?.name || 'Squad',
        icon: stats.teamData?.icon || null,
        color: stats.teamData?.color || null,
        position: squadPosition++,
        conversions: stats.conversions,
        clientsCount: stats.clientsCount,
        totalSpend: stats.totalSpend
      });
    }

    // ========== RECENT WINS ==========
    const { data: recentCampaigns } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        conversions,
        spend,
        updated_at,
        clients!inner(name, user_id)
      `)
      .eq('company_id', company.id)
      .gt('conversions', 0)
      .order('updated_at', { ascending: false })
      .limit(10);

    const recentWins: RecentWin[] = [];
    if (recentCampaigns) {
      for (const campaign of recentCampaigns) {
        const client = campaign.clients as any;
        const { data: gestor } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', client.user_id)
          .single();

        recentWins.push({
          id: campaign.id,
          type: 'lead',
          value: campaign.conversions || 0,
          clientName: client.name,
          gestorName: gestor?.full_name || 'Gestor',
          gestorAvatar: gestor?.avatar_url || null,
          timestamp: campaign.updated_at
        });
      }
    }

    // ========== LEGACY METRICS (for backwards compatibility) ==========
    const metrics = {
      totalCreatives: totalAds,
      creativesActive: totalAds,
      avgEngagement: avgCtr,
      totalConversions: totalLeads
    };

    const response = {
      company: {
        id: company.id,
        name: company.name
      },
      lastSync: new Date().toISOString(),
      performanceMetrics,
      featuredClient,
      gestorRanking,
      squadRanking,
      recentWins,
      metrics
    };

    console.log('Social TV Dashboard data fetched successfully');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching social TV dashboard data:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
