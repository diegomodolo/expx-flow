import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCompany } from '@/contexts/CompanyContext';

interface DashboardMetrics {
  totalInvestment: number;
  totalLeads: number;
  averageCPA: number;
  roi: number;
  activeClients: number;
  pausedClients: number;
  previousPeriodInvestment: number;
  previousPeriodLeads: number;
  previousPeriodCPA: number;
  previousPeriodROI: number;
}

interface ClientPerformance {
  id: string;
  name: string;
  company: string;
  totalInvestment: number;
  totalLeads: number;
  averageCPA: number;
  status: string;
}

interface CampaignRanking {
  id: string;
  name: string;
  client_name: string;
  cpa: number;
  conversions: number;
  spend: number;
  ctr: number;
  status: string;
}

interface FunnelMetrics {
  reach: number;
  leads: number;
  conversions: number;
  recompras: number; // Assumindo que conversões são recompras
  cpl: number;
  cpa: number;
}


interface TrendData {
  date: string;
  cpl: number;
  leads: number;
  investment: number;
}

export const useDashboardData = () => {
  console.log('useDashboardData hook called');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [clientsPerformance, setClientsPerformance] = useState<ClientPerformance[]>([]);
  const [campaignRankings, setCampaignRankings] = useState<CampaignRanking[]>([]);
  const [funnelMetrics, setFunnelMetrics] = useState<FunnelMetrics | null>(null);
  
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchDashboardData = async (filterClientId?: string | null) => {
    if (!user || !activeCompany) return;

    try {
      setLoading(true);
      
      // Buscar dados dos últimos 30 dias
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // 1. Métricas principais (últimos 30 dias vs período anterior)
      const { data: currentPeriodCampaigns } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!inner(name, company, status)
        `)
        .eq('company_id', activeCompany.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: previousPeriodCampaigns } = await supabase
        .from('campaigns')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .gte('created_at', sixtyDaysAgo.toISOString())
        .lt('created_at', thirtyDaysAgo.toISOString());

      // 2. Performance por cliente
      const { data: clientsData } = await supabase
        .from('clients')
        .select(`
          *,
          campaigns(spend, conversions, cpa)
        `)
        .eq('company_id', activeCompany.company_id);

      // 3. Ranking de campanhas
      const { data: allCampaigns } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!inner(name, company)
        `)
        .eq('company_id', activeCompany.company_id)
        .order('cpa', { ascending: true });

      // 4. Dados de tendência (últimos 30 dias)
      const { data: trendsData } = await supabase
        .from('campaigns')
        .select('created_at, spend, conversions, cpa')
        .eq('company_id', activeCompany.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      // Processar métricas principais
      const currentMetrics = calculateMetrics(currentPeriodCampaigns || []);
      const previousMetrics = calculateMetrics(previousPeriodCampaigns || []);
      
      const processedMetrics: DashboardMetrics = {
        ...currentMetrics,
        previousPeriodInvestment: previousMetrics.totalInvestment,
        previousPeriodLeads: previousMetrics.totalLeads,
        previousPeriodCPA: previousMetrics.averageCPA,
        previousPeriodROI: previousMetrics.roi,
      };

      // Processar performance por cliente
      const processedClients = processClientsPerformance(clientsData || []);

      // Processar ranking de campanhas
      const processedCampaigns = processCampaignRankings(allCampaigns || []);

      // Calcular métricas do funil
      const processedFunnel = calculateFunnelMetrics(currentPeriodCampaigns || []);

      // Remover geração automática de alertas - será feita apenas pelo hook useDashboardAlerts

      // Processar tendências
      const processedTrends = processTrendsData(trendsData || []);

      setMetrics(processedMetrics);
      setClientsPerformance(processedClients);
      setCampaignRankings(processedCampaigns);
      setFunnelMetrics(processedFunnel);
      setTrends(processedTrends);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular métricas de um conjunto de campanhas
  const calculateMetrics = (campaigns: any[]) => {
    const totalInvestment = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
    const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;
    
    // Calcular ROI usando ticket médio quando disponível, caso contrário usar valor padrão
    const totalRevenue = campaigns.reduce((sum, c) => {
      const averageTicket = c.average_ticket || 100; // Valor padrão de R$ 100 se não informado
      return sum + ((c.conversions || 0) * averageTicket);
    }, 0);
    
    const roi = totalInvestment > 0 ? ((totalRevenue - totalInvestment) / totalInvestment * 100) : 0;
    
    // Contar clientes ativos vs pausados
    const clientStatuses = campaigns.reduce((acc, c) => {
      if (c.clients) {
        acc[c.clients.status] = (acc[c.clients.status] || 0) + 1;
      }
      return acc;
    }, {});

    return {
      totalInvestment,
      totalLeads,
      averageCPA,
      roi,
      activeClients: clientStatuses.green || 0,
      pausedClients: (clientStatuses.yellow || 0) + (clientStatuses.red || 0),
    };
  };

  // Função para processar performance dos clientes
  const processClientsPerformance = (clients: any[]): ClientPerformance[] => {
    return clients.map(client => {
      const totalInvestment = client.campaigns?.reduce((sum: number, c: any) => sum + (c.spend || 0), 0) || 0;
      const totalLeads = client.campaigns?.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0) || 0;
      const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        totalInvestment,
        totalLeads,
        averageCPA,
        status: client.status,
      };
    }).sort((a, b) => b.totalInvestment - a.totalInvestment);
  };

  // Função para processar ranking de campanhas
  const processCampaignRankings = (campaigns: any[]): CampaignRanking[] => {
    return campaigns
      .filter(c => c.conversions > 0) // Só campanhas com conversões
      .map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        client_name: campaign.clients?.name || 'Cliente não encontrado',
        cpa: campaign.cpa || 0,
        conversions: campaign.conversions || 0,
        spend: campaign.spend || 0,
        ctr: campaign.ctr || 0,
        status: campaign.status || 'unknown',
      }));
  };

  // Função para calcular métricas do funil
  const calculateFunnelMetrics = (campaigns: any[]): FunnelMetrics => {
    const totalReach = campaigns.reduce((sum, c) => sum + (c.reach || 0), 0);
    const totalLeads = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
    const totalConversions = totalLeads; // Assumindo que conversões são o mesmo que leads
    const totalRecompras = Math.floor(totalConversions * 0.3); // Assumindo 30% de recompra
    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
    
    return {
      reach: totalReach,
      leads: totalLeads,
      conversions: totalConversions,
      recompras: totalRecompras,
      cpl: totalLeads > 0 ? totalSpend / totalLeads : 0,
      cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
    };
  };

  // Função para gerar recomendação com ChatGPT
  const generateRecommendation = async (campaignData: any, issueType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-recommendation', {
        body: {
          campaignData: {
            name: campaignData.name,
            client_name: campaignData.client_name,
            cpa: campaignData.cpa,
            ctr: campaignData.ctr,
            conversions: campaignData.conversions,
            spend: campaignData.spend || 0,
            impressions: campaignData.impressions || 0,
            clicks: campaignData.clicks || 0,
            issue_type: issueType,
          }
        }
      });

      if (error) {
        console.error('Error generating recommendation:', error);
        return getDefaultRecommendation(issueType);
      }

      return data.recommendation || getDefaultRecommendation(issueType);
    } catch (error) {
      console.error('Error calling recommendation function:', error);
      return getDefaultRecommendation(issueType);
    }
  };

  // Função para recomendações padrão (fallback)
  const getDefaultRecommendation = (issueType: string) => {
    const defaultRecommendations = {
      'high_cpa': 'Revisar segmentação e otimizar criativos',
      'low_ctr': 'Atualizar criativos e copy dos anúncios',
      'scale_opportunity': 'Aumentar orçamento diário gradualmente',
      'client_analysis': 'Analisar todas as campanhas do cliente'
    };
    return defaultRecommendations[issueType] || 'Analisar métricas e otimizar';
  };


  // Função para processar dados de tendência
  const processTrendsData = (data: any[]): TrendData[] => {
    const groupedByDate = data.reduce((acc, item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { spend: 0, conversions: 0, count: 0 };
      }
      acc[date].spend += item.spend || 0;
      acc[date].conversions += item.conversions || 0;
      acc[date].count += 1;
      return acc;
    }, {});

    return Object.entries(groupedByDate).map(([date, values]: [string, any]) => ({
      date,
      cpl: values.conversions > 0 ? values.spend / values.conversions : 0,
      leads: values.conversions,
      investment: values.spend,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, activeCompany?.company_id]);

  return {
    metrics,
    clientsPerformance,
    campaignRankings,
    funnelMetrics,
    trends,
    loading,
    error,
    refetch: (filterClientId?: string | null) => fetchDashboardData(filterClientId),
  };
};