import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface CSClientListItem {
  id: string;
  clientId: string;
  name: string;
  company: string;
  avatar: string | null;
  
  // CS Data
  healthScore: number;
  healthScoreFinancial: number;
  healthScoreOperational: number;
  healthScoreRelational: number;
  churnRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  npsScore: number | null;
  npsCategory: 'promoter' | 'passive' | 'detractor' | null;
  onboardingStatus: 'pending' | 'in_progress' | 'completed';
  lastTouchpointAt: string | null;
  daysSinceLastContact: number | null;
  activeCampaigns: number;
  csManagerId: string | null;
  csManagerName: string | null;
  
  // Para edição
  hasHealthConfig: boolean;
  
  // Datas
  createdAt: string;
  updatedAt: string;
}

function getNPSCategory(score: number | null): 'promoter' | 'passive' | 'detractor' | null {
  if (score === null) return null;
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

function calculateDaysSince(date: string | null): number | null {
  if (!date) return null;
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
}

export function useCSClientsList() {
  const { activeCompany } = useCompany();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cs-clients-list', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      // Buscar todos os clientes ativos da empresa
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name, company, avatar, created_at')
        .eq('company_id', activeCompany.company_id)
        .eq('is_canceled', false)
        .order('name');

      if (clientsError) throw clientsError;

      const clientIds = (clients || []).map((c: any) => c.id);
      
      if (clientIds.length === 0) return [];

      // Buscar health configs
      const { data: healthConfigs } = await supabase
        .from('client_health_config')
        .select('*')
        .in('client_id', clientIds);

      // Buscar último touchpoint de cada cliente
      const { data: touchpoints } = await supabase
        .from('client_touchpoints')
        .select('client_id, created_at')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      // Buscar contagem de campanhas ativas
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('client_id, status')
        .in('client_id', clientIds)
        .eq('status', 'active');

      // Buscar CS managers (employees)
      const csManagerIds = (healthConfigs || [])
        .map(h => h.cs_manager_id)
        .filter(Boolean);
      
      let csManagers: Record<string, string> = {};
      if (csManagerIds.length > 0) {
        const { data: employees } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', csManagerIds);
        
        (employees || []).forEach(e => {
          csManagers[e.id] = e.name;
        });
      }

      // Mapear health configs por client_id
      const healthConfigMap: Record<string, any> = {};
      (healthConfigs || []).forEach(h => {
        healthConfigMap[h.client_id] = h;
      });

      // Mapear último touchpoint por client_id
      const lastTouchpointMap: Record<string, string> = {};
      (touchpoints || []).forEach(t => {
        if (!lastTouchpointMap[t.client_id]) {
          lastTouchpointMap[t.client_id] = t.created_at;
        }
      });

      // Contar campanhas ativas por cliente
      const campaignCountMap: Record<string, number> = {};
      (campaigns || []).forEach(c => {
        campaignCountMap[c.client_id] = (campaignCountMap[c.client_id] || 0) + 1;
      });

      // Montar lista final
      const csClients: CSClientListItem[] = (clients || []).map((client: any) => {
        const healthConfig = healthConfigMap[client.id];
        const lastTouchpoint = lastTouchpointMap[client.id] || healthConfig?.last_cs_contact_at;
        const activeCampaigns = campaignCountMap[client.id] || 0;

        return {
          id: healthConfig?.id || client.id,
          clientId: client.id,
          name: client.name,
          company: client.company || '',
          avatar: client.avatar,
          
          // CS Data
          healthScore: healthConfig?.health_score_total || 0,
          healthScoreFinancial: healthConfig?.health_score_financial || 0,
          healthScoreOperational: healthConfig?.health_score_operational || 0,
          healthScoreRelational: healthConfig?.health_score_relational || 0,
          churnRiskLevel: healthConfig?.churn_risk_level || 'medium',
          npsScore: healthConfig?.nps_score || null,
          npsCategory: getNPSCategory(healthConfig?.nps_score),
          onboardingStatus: healthConfig?.onboarding_status || 'pending',
          lastTouchpointAt: lastTouchpoint || null,
          daysSinceLastContact: calculateDaysSince(lastTouchpoint),
          activeCampaigns,
          csManagerId: healthConfig?.cs_manager_id || null,
          csManagerName: healthConfig?.cs_manager_id ? csManagers[healthConfig.cs_manager_id] : null,
          
          hasHealthConfig: !!healthConfig,
          
          createdAt: client.created_at,
          updatedAt: healthConfig?.updated_at || client.created_at,
        };
      });

      return csClients;
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    clients: data || [],
    isLoading,
    error,
    refetch,
  };
}
