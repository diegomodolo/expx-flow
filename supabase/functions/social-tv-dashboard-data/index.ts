import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChampionCreative {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string;
  clientName: string;
  clientAvatar: string | null;
  gestorName: string;
  gestorAvatar: string | null;
  ctr: number;
  roas: number;
  spend: number;
  conversions: number;
  platform: 'Meta' | 'Google';
}

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

interface FeaturedCreative {
  id: string;
  type: 'image' | 'video' | 'carousel';
  url: string;
  thumbnailUrl?: string;
  clientName: string;
  status: string;
  ctr: number;
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

    // Get champion creative (highest CTR in last 24h)
    const { data: championAd } = await supabase
      .from('ads')
      .select(`
        id,
        name,
        image_url,
        video_url,
        ctr,
        spend,
        conversions,
        client_id,
        clients!inner(name, avatar, user_id)
      `)
      .eq('company_id', company.id)
      .eq('is_active', true)
      .gt('ctr', 0)
      .order('ctr', { ascending: false })
      .limit(1)
      .single();

    let championCreative: ChampionCreative | null = null;
    if (championAd) {
      const client = championAd.clients as any;
      
      // Get gestor info
      const { data: gestor } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', client.user_id)
        .single();

      championCreative = {
        id: championAd.id,
        type: championAd.video_url ? 'video' : 'image',
        url: championAd.video_url || championAd.image_url || '',
        title: championAd.name,
        clientName: client.name,
        clientAvatar: client.avatar,
        gestorName: gestor?.full_name || 'Gestor',
        gestorAvatar: gestor?.avatar_url || null,
        ctr: championAd.ctr || 0,
        roas: 0,
        spend: championAd.spend || 0,
        conversions: championAd.conversions || 0,
        platform: 'Meta'
      };
    }

    // Get gestor ranking (by conversions) - using gestor_id from clients table
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

    // Aggregate by gestor_id (or fallback to user_id)
    const gestorStats = new Map<string, { conversions: number; clientsCount: number; totalSpend: number; gestorUserId?: string }>();
    
    if (clientsWithGestores) {
      for (const client of clientsWithGestores) {
        // Use gestor_id if set, otherwise fallback to user_id
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

    // Get gestor names and sort by conversions
    // First, get employee info for those who are gestores
    const gestorIds = Array.from(gestorStats.keys());
    const gestorUserIds = Array.from(gestorStats.values()).map(s => s.gestorUserId).filter(Boolean) as string[];
    
    // Get employee data
    const { data: employeeData } = await supabase
      .from('employees')
      .select('id, name, avatar, user_id')
      .in('id', gestorIds);
    
    // Get profile data as fallback for gestores that don't have employee records
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
      // First try to find employee data
      const employee = employeeData?.find(e => e.id === gestorId);
      // Then fallback to profile data
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

    // Get squad ranking (by conversions) - using team_id from clients table
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

    // Aggregate by team_id (squad)
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

    // Build squad ranking
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

    // Get recent wins (recent conversions from campaigns)
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

    // Get featured creatives (top performing ads)
    const { data: featuredAds } = await supabase
      .from('ads')
      .select(`
        id,
        name,
        image_url,
        video_url,
        ctr,
        clients!inner(name)
      `)
      .eq('company_id', company.id)
      .eq('is_active', true)
      .or('image_url.neq.null,video_url.neq.null')
      .order('ctr', { ascending: false })
      .limit(10);

    const featuredCreatives: FeaturedCreative[] = (featuredAds || []).map((ad, index) => ({
      id: ad.id,
      type: ad.video_url ? 'video' : 'image',
      url: ad.video_url || ad.image_url || '',
      clientName: (ad.clients as any).name,
      status: index === 0 ? 'Melhor CTR' : index < 3 ? 'Em alta' : 'Ativo',
      ctr: ad.ctr || 0
    }));

    // Get global metrics
    const { data: adsCount } = await supabase
      .from('ads')
      .select('id', { count: 'exact' })
      .eq('company_id', company.id);

    const { data: activeAdsCount } = await supabase
      .from('ads')
      .select('id', { count: 'exact' })
      .eq('company_id', company.id)
      .eq('is_active', true);

    const { data: avgCtrData } = await supabase
      .from('ads')
      .select('ctr')
      .eq('company_id', company.id)
      .eq('is_active', true)
      .gt('ctr', 0);

    const avgCtr = avgCtrData && avgCtrData.length > 0
      ? avgCtrData.reduce((sum, ad) => sum + (ad.ctr || 0), 0) / avgCtrData.length
      : 0;

    const response = {
      company: {
        id: company.id,
        name: company.name
      },
      lastSync: new Date().toISOString(),
      championCreative,
      gestorRanking,
      squadRanking,
      recentWins,
      featuredCreatives,
      metrics: {
        totalCreatives: adsCount?.length || 0,
        creativesActive: activeAdsCount?.length || 0,
        avgEngagement: avgCtr,
        totalConversions: gestorRanking.reduce((sum, g) => sum + g.conversions, 0)
      }
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
