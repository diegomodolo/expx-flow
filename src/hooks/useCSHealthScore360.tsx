import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface HealthScore360Data {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  
  // Metas
  targetRoas: number;
  targetCpl: number;
  
  // NPS
  npsScore: number | null;
  npsCollectedAt: string | null;
  
  // Contato CS
  lastCsContactAt: string | null;
  csManagerId: string | null;
  
  // Status
  onboardingStatus: 'pending' | 'in_progress' | 'completed';
  churnRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // Health Scores (0-100)
  healthScoreFinancial: number;
  healthScoreOperational: number;
  healthScoreRelational: number;
  healthScoreTotal: number;
  
  // Calculados (dados de campanhas)
  currentRoas: number | null;
  currentCpl: number | null;
  activeCampaigns: number;
  totalSpend: number;
  totalConversions: number;
  
  // Fatores de risco
  riskFactors: string[];
  
  createdAt: string;
  updatedAt: string;
}

interface RawHealthConfig {
  id: string;
  client_id: string;
  company_id: string;
  target_roas: number;
  target_cpl: number;
  nps_score: number | null;
  nps_collected_at: string | null;
  last_cs_contact_at: string | null;
  cs_manager_id: string | null;
  onboarding_status: string;
  churn_risk_level: string;
  health_score_financial: number;
  health_score_operational: number;
  health_score_relational: number;
  health_score_total: number;
  created_at: string;
  updated_at: string;
  clients: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

function calculateRiskFactors(data: HealthScore360Data): string[] {
  const factors: string[] = [];
  
  // Pilar Financeiro
  if (data.currentRoas !== null && data.currentRoas < data.targetRoas * 0.5) {
    factors.push('ROAS muito abaixo da meta (<50%)');
  } else if (data.currentRoas !== null && data.currentRoas < data.targetRoas * 0.8) {
    factors.push('ROAS abaixo da meta (50-80%)');
  }
  
  if (data.currentCpl !== null && data.currentCpl > data.targetCpl * 1.5) {
    factors.push('CPL muito acima da meta (>150%)');
  } else if (data.currentCpl !== null && data.currentCpl > data.targetCpl) {
    factors.push('CPL acima da meta');
  }
  
  // Pilar Relacional
  if (data.npsScore !== null && data.npsScore <= 6) {
    factors.push('NPS detrator (0-6)');
  }
  
  if (data.lastCsContactAt) {
    const daysSinceContact = Math.floor((Date.now() - new Date(data.lastCsContactAt).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceContact > 14) {
      factors.push(`Sem contato CS há ${daysSinceContact} dias`);
    }
  } else {
    factors.push('Nunca teve contato com CS');
  }
  
  // Pilar Operacional
  if (data.activeCampaigns === 0) {
    factors.push('Nenhuma campanha ativa');
  }
  
  if (data.onboardingStatus !== 'completed') {
    factors.push('Onboarding não concluído');
  }
  
  return factors;
}

export function useCSHealthScore360(clientId?: string) {
  const { activeCompany } = useCompany();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cs-health-score-360', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('client_health_config')
        .select(`
          *,
          clients!client_health_config_client_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('company_id', activeCompany.company_id);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: healthConfigs, error: healthError } = await query;

      if (healthError) throw healthError;

      // Buscar dados de campanhas para cada cliente
      const clientIds = (healthConfigs || []).map((h: RawHealthConfig) => h.client_id);
      
      let campaignStats: Record<string, { roas: number | null; cpl: number | null; activeCampaigns: number; totalSpend: number; totalConversions: number }> = {};
      
      if (clientIds.length > 0) {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('client_id, spend, conversions, status')
          .in('client_id', clientIds)
          .eq('company_id', activeCompany.company_id);

        // Agregar métricas por cliente
        (campaigns || []).forEach((c: any) => {
          if (!campaignStats[c.client_id]) {
            campaignStats[c.client_id] = { roas: null, cpl: null, activeCampaigns: 0, totalSpend: 0, totalConversions: 0 };
          }
          campaignStats[c.client_id].totalSpend += c.spend || 0;
          campaignStats[c.client_id].totalConversions += c.conversions || 0;
          if (c.status === 'active') {
            campaignStats[c.client_id].activeCampaigns += 1;
          }
        });

        // Calcular ROAS e CPL
        Object.keys(campaignStats).forEach(clientId => {
          const stats = campaignStats[clientId];
          if (stats.totalSpend > 0 && stats.totalConversions > 0) {
            stats.cpl = stats.totalSpend / stats.totalConversions;
            // ROAS precisa do valor de vendas - usando conversões * ticket médio estimado
            stats.roas = (stats.totalConversions * 100) / stats.totalSpend; // Placeholder
          }
        });
      }

      // Transformar dados
      const healthData: HealthScore360Data[] = (healthConfigs || []).map((config: RawHealthConfig) => {
        const stats = campaignStats[config.client_id] || { roas: null, cpl: null, activeCampaigns: 0, totalSpend: 0, totalConversions: 0 };
        
        const data: HealthScore360Data = {
          id: config.id,
          clientId: config.client_id,
          clientName: config.clients?.name || 'Cliente',
          clientAvatar: config.clients?.avatar || null,
          targetRoas: config.target_roas,
          targetCpl: config.target_cpl,
          npsScore: config.nps_score,
          npsCollectedAt: config.nps_collected_at,
          lastCsContactAt: config.last_cs_contact_at,
          csManagerId: config.cs_manager_id,
          onboardingStatus: config.onboarding_status as 'pending' | 'in_progress' | 'completed',
          churnRiskLevel: config.churn_risk_level as 'low' | 'medium' | 'high' | 'critical',
          healthScoreFinancial: config.health_score_financial,
          healthScoreOperational: config.health_score_operational,
          healthScoreRelational: config.health_score_relational,
          healthScoreTotal: config.health_score_total,
          currentRoas: stats.roas,
          currentCpl: stats.cpl,
          activeCampaigns: stats.activeCampaigns,
          totalSpend: stats.totalSpend,
          totalConversions: stats.totalConversions,
          riskFactors: [],
          createdAt: config.created_at,
          updatedAt: config.updated_at,
        };
        
        data.riskFactors = calculateRiskFactors(data);
        
        return data;
      });

      // Ordenar por risco (critical primeiro)
      return healthData.sort((a, b) => {
        const riskOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (riskOrder[a.churnRiskLevel] !== riskOrder[b.churnRiskLevel]) {
          return riskOrder[a.churnRiskLevel] - riskOrder[b.churnRiskLevel];
        }
        return a.healthScoreTotal - b.healthScoreTotal;
      });
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Estatísticas agregadas
  const stats = useMemo(() => {
    if (!data) return { critical: 0, high: 0, medium: 0, low: 0, averageScore: 0, averageNps: 0 };
    
    const critical = data.filter(c => c.churnRiskLevel === 'critical').length;
    const high = data.filter(c => c.churnRiskLevel === 'high').length;
    const medium = data.filter(c => c.churnRiskLevel === 'medium').length;
    const low = data.filter(c => c.churnRiskLevel === 'low').length;
    
    const averageScore = data.length > 0
      ? Math.round(data.reduce((sum, c) => sum + c.healthScoreTotal, 0) / data.length)
      : 0;
    
    const npsClients = data.filter(c => c.npsScore !== null);
    const averageNps = npsClients.length > 0
      ? Math.round(npsClients.reduce((sum, c) => sum + (c.npsScore || 0), 0) / npsClients.length * 10) / 10
      : 0;

    return { critical, high, medium, low, averageScore, averageNps };
  }, [data]);

  return {
    healthData: data || [],
    isLoading,
    error,
    refetch,
    stats,
  };
}
