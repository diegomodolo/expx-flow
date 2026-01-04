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
    // Get aggregated metrics from ads
    const { data: adsMetrics } = await supabase
      .from('ads')
      .select('id, spend, ctr, conversions')
      .eq('company_id', company.id)
      .eq('is_active', true);

    const totalSpend = (adsMetrics || []).reduce((sum, ad) => sum + (ad.spend || 0), 0);
    const totalLeads = (adsMetrics || []).reduce((sum, ad) => sum + (ad.conversions || 0), 0);
    const totalAds = (adsMetrics || []).length;
    const avgCtr = totalAds > 0 
      ? (adsMetrics || []).reduce((sum, ad) => sum + (ad.ctr || 0), 0) / totalAds
      : 0;

    // Count active clients
    const { data: activeClientsData, count: activeClientsCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact' })
      .eq('company_id', company.id)
      .eq('is_canceled', false);

    const performanceMetrics: PerformanceMetrics = {
      totalLeads,
      totalSpend,
      avgCtr,
      activeClients: activeClientsCount || 0,
      totalAds
    };

    console.log('Performance metrics:', performanceMetrics);

    // ========== FEATURED CLIENT ==========
    // Get client with highest total spend from active ads
    const { data: clientsWithAds } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        avatar,
        calculated_status,
        gestor_id,
        team_id,
        gestor:employees!gestor_id(id, name, avatar),
        team:teams!team_id(id, name, color)
      `)
      .eq('company_id', company.id)
      .eq('is_canceled', false);

    // Get ads grouped by client
    const { data: adsByClient } = await supabase
      .from('ads')
      .select('client_id, spend, ctr')
      .eq('company_id', company.id)
      .eq('is_active', true);

    // Aggregate spend per client
    const clientSpendMap = new Map<string, { totalSpend: number; totalCtr: number; adsCount: number }>();
    for (const ad of (adsByClient || [])) {
      if (!ad.client_id) continue;
      if (!clientSpendMap.has(ad.client_id)) {
        clientSpendMap.set(ad.client_id, { totalSpend: 0, totalCtr: 0, adsCount: 0 });
      }
      const stats = clientSpendMap.get(ad.client_id)!;
      stats.totalSpend += ad.spend || 0;
      stats.totalCtr += ad.ctr || 0;
      stats.adsCount++;
    }

    // Find the client with highest spend
    let featuredClient: FeaturedClient | null = null;
    let maxSpend = 0;

    for (const client of (clientsWithAds || [])) {
      const stats = clientSpendMap.get(client.id);
      if (stats && stats.totalSpend > maxSpend) {
        maxSpend = stats.totalSpend;
        const gestor = client.gestor as any;
        const team = client.team as any;
        
        featuredClient = {
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          gestorName: gestor?.name || null,
          gestorAvatar: gestor?.avatar || null,
          teamName: team?.name || null,
          teamColor: team?.color || null,
          status: client.calculated_status || 'ativo',
          totalSpend: stats.totalSpend,
          avgCtr: stats.adsCount > 0 ? stats.totalCtr / stats.adsCount : 0,
          totalAds: stats.adsCount
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
        name: employee?.name || profile?.full_name || 'Gestor',
        avatar: employee?.avatar || profile?.avatar_url || null,
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
