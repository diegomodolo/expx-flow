import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GestorClient {
  id: string;
  name: string;
  avatar: string | null;
  conversions: number;
  spend: number;
}

interface GestorRanking {
  id: string;
  name: string;
  avatar: string | null;
  position: number;
  conversions: number;
  clientsCount: number;
  totalSpend: number;
  clients: GestorClient[];
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
  avgCpa: number;
  totalClicks: number;
  // Campos para destaque rotativo
  highlightMetric?: string;
  highlightLabel?: string;
  highlightValue?: string;
  highlightIcon?: string;
}

// Função auxiliar para buscar cliente por métrica
async function getTopClientByMetric(
  supabase: any,
  companyId: string,
  metric: 'conversions' | 'ctr' | 'cpa' | 'spend' | 'clicks',
  order: 'asc' | 'desc'
): Promise<any | null> {
  // Buscar clientes ativos com campanhas
  const { data: clients } = await supabase
    .from('clients')
    .select(`
      id,
      name,
      avatar,
      calculated_status,
      gestor_id,
      team_id,
      gestor:employees!gestor_id(id, name, avatar, user_id),
      team:teams!team_id(id, name, color)
    `)
    .eq('company_id', companyId)
    .eq('is_canceled', false);

  if (!clients || clients.length === 0) return null;

  // Calcular métricas para cada cliente
  const clientsWithMetrics = [];
  
  for (const client of clients) {
    // Meta campaigns
    const { data: metaCampaigns } = await supabase
      .from('campaigns')
      .select('conversions, ctr, spend, cpa, clicks')
      .eq('company_id', companyId)
      .eq('client_id', client.id);

    // Google campaigns
    const { data: googleCampaigns } = await supabase
      .from('google_campaigns')
      .select('conversions, ctr, spend, cost_per_conversion, clicks')
      .eq('company_id', companyId)
      .eq('client_id', client.id);

    const metaConversions = (metaCampaigns || []).reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);
    const googleConversions = (googleCampaigns || []).reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);
    const totalConversions = metaConversions + googleConversions;

    const metaSpend = (metaCampaigns || []).reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
    const googleSpend = (googleCampaigns || []).reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
    const totalSpend = metaSpend + googleSpend;

    const metaClicks = (metaCampaigns || []).reduce((sum: number, c: any) => sum + (c.clicks || 0), 0);
    const googleClicks = (googleCampaigns || []).reduce((sum: number, c: any) => sum + (c.clicks || 0), 0);
    const totalClicks = metaClicks + googleClicks;

    const metaCtrSum = (metaCampaigns || []).reduce((sum: number, c: any) => sum + (c.ctr || 0), 0);
    const googleCtrSum = (googleCampaigns || []).reduce((sum: number, c: any) => sum + (c.ctr || 0), 0);
    const ctrCount = (metaCampaigns || []).filter((c: any) => c.ctr > 0).length + 
                     (googleCampaigns || []).filter((c: any) => c.ctr > 0).length;
    const avgCtr = ctrCount > 0 ? (metaCtrSum + googleCtrSum) / ctrCount : 0;

    const avgCpa = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Count ads and campaigns
    const { count: adsCount } = await supabase
      .from('ads')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('client_id', client.id)
      .eq('is_active', true);

    const { count: campaignsCount } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('client_id', client.id)
      .eq('is_active', true);

    clientsWithMetrics.push({
      ...client,
      totalConversions,
      totalSpend,
      totalClicks,
      avgCtr,
      avgCpa,
      totalAds: adsCount || 0,
      totalCampaigns: campaignsCount || 0
    });
  }

  // Filtrar clientes sem dados relevantes para a métrica
  let filteredClients = clientsWithMetrics;
  if (metric === 'cpa') {
    filteredClients = clientsWithMetrics.filter(c => c.totalConversions > 0 && c.avgCpa > 0);
  } else if (metric === 'ctr') {
    // Só considera clientes com CTR > 0 E pelo menos 1 conversão (vitória real)
    filteredClients = clientsWithMetrics.filter(c => c.avgCtr > 0 && c.totalConversions > 0);
  } else if (metric === 'conversions') {
    filteredClients = clientsWithMetrics.filter(c => c.totalConversions > 0);
  } else if (metric === 'spend') {
    filteredClients = clientsWithMetrics.filter(c => c.totalSpend > 0);
  } else if (metric === 'clicks') {
    filteredClients = clientsWithMetrics.filter(c => c.totalClicks > 0);
  }

  if (filteredClients.length === 0) return null;

  // Ordenar
  const metricMap: Record<string, string> = {
    conversions: 'totalConversions',
    ctr: 'avgCtr',
    cpa: 'avgCpa',
    spend: 'totalSpend',
    clicks: 'totalClicks'
  };
  const sortKey = metricMap[metric];
  
  filteredClients.sort((a, b) => {
    const aVal = a[sortKey] || 0;
    const bVal = b[sortKey] || 0;
    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return filteredClients[0];
}

// Função para formatar valores
function formatHighlightValue(metric: string, value: number): string {
  if (metric === 'cpa' || metric === 'spend') {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(2)}`;
  }
  if (metric === 'ctr') {
    return `${value.toFixed(2)}%`;
  }
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
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

    // ========== FEATURED CLIENTS (Rotação por Métrica) ==========
    console.log('Fetching featured clients by different metrics...');
    
    const featuredClients: FeaturedClient[] = [];
    
    // Helper para converter cliente para FeaturedClient
    const toFeaturedClient = async (client: any, highlightMetric: string, highlightLabel: string, highlightIcon: string): Promise<FeaturedClient | null> => {
      if (!client) return null;
      
      const gestor = client.gestor as any;
      const team = client.team as any;

      // Fetch gestor profile
      let gestorName = gestor?.name || null;
      let gestorAvatar = gestor?.avatar || null;
      
      if (gestor?.user_id) {
        const { data: gestorProfile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', gestor.user_id)
          .maybeSingle();
        
        if (gestorProfile?.full_name) gestorName = gestorProfile.full_name;
        if (gestorProfile?.avatar_url) gestorAvatar = gestorProfile.avatar_url;
      }

      const metricValueMap: Record<string, number> = {
        conversions: client.totalConversions || 0,
        ctr: client.avgCtr || 0,
        cpa: client.avgCpa || 0,
        spend: client.totalSpend || 0,
        clicks: client.totalClicks || 0
      };

      return {
        id: client.id,
        name: client.name,
        avatar: client.avatar,
        gestorName,
        gestorAvatar,
        teamName: team?.name || null,
        teamColor: team?.color || null,
        status: client.calculated_status || 'ativo',
        totalSpend: client.totalSpend || 0,
        avgCtr: client.avgCtr || 0,
        totalAds: client.totalAds || 0,
        totalConversions: client.totalConversions || 0,
        totalCampaigns: client.totalCampaigns || 0,
        avgCpa: client.avgCpa || 0,
        totalClicks: client.totalClicks || 0,
        highlightMetric,
        highlightLabel,
        highlightValue: formatHighlightValue(highlightMetric, metricValueMap[highlightMetric]),
        highlightIcon
      };
    };

    // 1. Cliente com mais conversões
    const topConversionsClient = await getTopClientByMetric(supabase, company.id, 'conversions', 'desc');
    if (topConversionsClient) {
      const featured = await toFeaturedClient(topConversionsClient, 'conversions', 'Mais Conversões', 'trophy');
      if (featured) featuredClients.push(featured);
    }

    // 2. Cliente com melhor CTR
    const topCtrClient = await getTopClientByMetric(supabase, company.id, 'ctr', 'desc');
    if (topCtrClient && topCtrClient.id !== topConversionsClient?.id) {
      const featured = await toFeaturedClient(topCtrClient, 'ctr', 'Melhor CTR', 'trending-up');
      if (featured) featuredClients.push(featured);
    }

    // 3. Cliente com menor CPA (eficiência)
    const topCpaClient = await getTopClientByMetric(supabase, company.id, 'cpa', 'asc');
    if (topCpaClient && !featuredClients.find(c => c.id === topCpaClient.id)) {
      const featured = await toFeaturedClient(topCpaClient, 'cpa', 'Menor CPA', 'target');
      if (featured) featuredClients.push(featured);
    }

    // 4. Cliente com maior investimento
    const topSpendClient = await getTopClientByMetric(supabase, company.id, 'spend', 'desc');
    if (topSpendClient && !featuredClients.find(c => c.id === topSpendClient.id)) {
      const featured = await toFeaturedClient(topSpendClient, 'spend', 'Maior Investimento', 'dollar-sign');
      if (featured) featuredClients.push(featured);
    }

    // 5. Cliente com mais cliques
    const topClicksClient = await getTopClientByMetric(supabase, company.id, 'clicks', 'desc');
    if (topClicksClient && !featuredClients.find(c => c.id === topClicksClient.id)) {
      const featured = await toFeaturedClient(topClicksClient, 'clicks', 'Mais Cliques', 'mouse-pointer');
      if (featured) featuredClients.push(featured);
    }

    console.log(`Found ${featuredClients.length} featured clients for rotation`);

    // Para compatibilidade, manter featuredClient como o primeiro da lista
    const featuredClient = featuredClients.length > 0 ? featuredClients[0] : null;

    // ========== GESTOR RANKING ==========
    const { data: clientsWithGestores } = await supabase
      .from('clients')
      .select(`
        id,
        name,
        avatar,
        gestor_id,
        user_id,
        gestor:employees!gestor_id(id, name, avatar, user_id),
        campaigns(conversions, spend)
      `)
      .eq('company_id', company.id)
      .eq('is_canceled', false);

    // Aggregate by gestor_id - now includes client details
    const gestorStats = new Map<string, { 
      conversions: number; 
      clientsCount: number; 
      totalSpend: number; 
      gestorUserId?: string;
      clients: GestorClient[];
    }>();
    
    if (clientsWithGestores) {
      for (const client of clientsWithGestores) {
        const gestor = client.gestor as any;
        const gestorId = gestor?.id || client.user_id;
        const gestorUserId = gestor?.user_id || client.user_id;
        
        if (!gestorId) continue;
        
        if (!gestorStats.has(gestorId)) {
          gestorStats.set(gestorId, { conversions: 0, clientsCount: 0, totalSpend: 0, gestorUserId, clients: [] });
        }
        const stats = gestorStats.get(gestorId)!;
        stats.clientsCount++;
        
        const campaigns = client.campaigns as any[] || [];
        let clientConversions = 0;
        let clientSpend = 0;
        for (const campaign of campaigns) {
          clientConversions += campaign.conversions || 0;
          clientSpend += campaign.spend || 0;
          stats.conversions += campaign.conversions || 0;
          stats.totalSpend += campaign.spend || 0;
        }
        
        // Add client to gestor's client list
        stats.clients.push({
          id: client.id,
          name: client.name,
          avatar: client.avatar,
          conversions: clientConversions,
          spend: clientSpend
        });
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
      
      // Sort clients by conversions descending
      const sortedClients = stats.clients.sort((a, b) => b.conversions - a.conversions);
      
      gestorRanking.push({
        id: gestorId,
        name: profile?.full_name || employee?.name || 'Gestor',
        avatar: profile?.avatar_url || employee?.avatar || null,
        position: position++,
        conversions: stats.conversions,
        clientsCount: stats.clientsCount,
        totalSpend: stats.totalSpend,
        clients: sortedClients
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
        clients!inner(name, gestor_id)
      `)
      .eq('company_id', company.id)
      .gt('conversions', 0)
      .order('updated_at', { ascending: false })
      .limit(10);

    const recentWins: RecentWin[] = [];
    if (recentCampaigns) {
      for (const campaign of recentCampaigns) {
        const client = campaign.clients as any;
        
        // Get gestor info from employees table using gestor_id
        let gestorName = 'Gestor';
        let gestorAvatar = null;
        
        if (client.gestor_id) {
          const { data: employee } = await supabase
            .from('employees')
            .select('name, avatar, user_id')
            .eq('id', client.gestor_id)
            .single();
          
          if (employee) {
            gestorName = employee.name;
            gestorAvatar = employee.avatar;
            
            // Try to get profile avatar if employee has user_id
            if (employee.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('user_id', employee.user_id)
                .single();
              
              if (profile) {
                gestorName = profile.full_name || gestorName;
                gestorAvatar = profile.avatar_url || gestorAvatar;
              }
            }
          }
        }

        recentWins.push({
          id: campaign.id,
          type: 'lead',
          value: campaign.conversions || 0,
          clientName: client.name,
          gestorName,
          gestorAvatar,
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
      featuredClients, // NOVO: Array para rotação
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
