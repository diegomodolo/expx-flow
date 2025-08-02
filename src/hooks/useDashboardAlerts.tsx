import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';

export interface Alert {
  id: string;
  type: 'danger' | 'opportunity';
  title: string;
  description: string;
  metric: string;
  value: string;
  recommendation: string;
  client: string;
  campaign: string;
  campaign_id?: string;
  client_id?: string;
}

export interface ClientPerformance {
  id: string;
  name: string;
  company: string;
  investment: number;
  leads: number;
  cpa: number;
  roi: number;
  status: string;
}

export interface CampaignRanking {
  id: string;
  name: string;
  client_name: string;
  client_id: string;
  cpa: number;
  spend: number;
  conversions: number;
  status: string;
  ctr: number;
}

export const useDashboardAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  // Função para gerar recomendação usando IA
  const generateRecommendation = async (campaignData: any, issueType: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-recommendation', {
        body: {
          campaign: campaignData,
          issue_type: issueType
        }
      });

      if (error) {
        console.error('Error generating recommendation:', error);
        return getDefaultRecommendation(issueType);
      }

      return data?.recommendation || getDefaultRecommendation(issueType);
    } catch (error) {
      console.error('Error generating recommendation:', error);
      return getDefaultRecommendation(issueType);
    }
  };

  // Recomendações padrão
  const getDefaultRecommendation = (issueType: string): string => {
    const defaultRecommendations = {
      'high_cpa': 'Revisar segmentação de público e otimizar palavras-chave',
      'low_ctr': 'Testar novos criativos e headlines mais atrativas',
      'scale_opportunity': 'Aumentar orçamento diário gradualmente',
      'client_analysis': 'Analisar todas as campanhas do cliente'
    };
    return defaultRecommendations[issueType] || 'Analisar métricas e otimizar';
  };

  // Função para gerar alertas
  const generateAlerts = async (clients: ClientPerformance[], campaigns: CampaignRanking[], activeTasks: any[] = [], filterClientId?: string | null): Promise<Alert[]> => {
    const alertsArray: Alert[] = [];

    // Extrair IDs de campanhas que já possuem tarefas ativas
    const campaignsWithActiveTasks = new Set(
      activeTasks
        .filter(task => task.related_campaign_id)
        .map(task => task.related_campaign_id)
    );

    // Filtrar apenas campanhas ativas E que não tenham tarefas ativas
    let availableCampaigns = campaigns.filter(campaign => 
      campaign.status === 'active' && !campaignsWithActiveTasks.has(campaign.id)
    );

    // Aplicar filtro de cliente se especificado
    if (filterClientId) {
      const selectedClient = clients.find(client => client.id === filterClientId);
      if (selectedClient) {
        availableCampaigns = availableCampaigns.filter(campaign => 
          campaign.client_name === selectedClient.name
        );
      }
    }

    // Processar alertas de problemas com recomendações do ChatGPT
    for (const campaign of availableCampaigns) {
      if (campaign.cpa > 50) {
        const recommendation = await generateRecommendation(campaign, 'high_cpa');
        alertsArray.push({
          id: `high-cpa-campaign-${campaign.id}`,
          type: 'danger',
          title: 'CPA Alto',
          description: `Campanha "${campaign.name}" com CPA de R$ ${campaign.cpa.toFixed(2)}`,
          metric: 'CPA',
          value: `R$ ${campaign.cpa.toFixed(2)}`,
          recommendation,
          client: campaign.client_name,
          campaign: campaign.name,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
        });
      }
      
      if (campaign.ctr < 1.0) {
        const recommendation = await generateRecommendation(campaign, 'low_ctr');
        alertsArray.push({
          id: `low-ctr-campaign-${campaign.id}`,
          type: 'danger',
          title: 'CTR Baixo',
          description: `Campanha "${campaign.name}" com CTR de ${campaign.ctr.toFixed(2)}%`,
          metric: 'CTR',
          value: `${campaign.ctr.toFixed(2)}%`,
          recommendation,
          client: campaign.client_name,
          campaign: campaign.name,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
        });
      }
    }

    // Processar alertas de oportunidades de escala (para campanhas com bom desempenho)
    const scalableOpportunities = availableCampaigns.filter(campaign => 
      campaign.cpa <= 30 && campaign.ctr >= 2.0 && campaign.spend < 500
    );

    for (const campaign of scalableOpportunities) {
      const recommendation = await generateRecommendation(campaign, 'scale_opportunity');
      alertsArray.push({
        id: `scale-opportunity-${campaign.id}`,
        type: 'opportunity',
        title: 'Oportunidade de Escala',
        description: `Campanha "${campaign.name}" tem potencial para aumentar orçamento`,
        metric: 'Performance',
        value: `CPA: R$ ${campaign.cpa.toFixed(2)} | CTR: ${campaign.ctr.toFixed(2)}%`,
        recommendation,
        client: campaign.client_name,
        campaign: campaign.name,
        campaign_id: campaign.id,
        client_id: campaign.client_id,
      });
    }

    return alertsArray;
  };

  const fetchAlerts = async (filterClientId?: string | null) => {
    if (!activeCompany?.company_id || !user?.id) {
      setError('Empresa ou usuário não encontrado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar campanhas
      const { data: currentPeriodCampaigns } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!inner(name, company, status)
        `)
        .eq('company_id', activeCompany.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      // Buscar clientes
      const { data: clientsData } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', activeCompany.company_id);

      // Buscar tarefas ativas
      const { data: activeTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .neq('status', 'done');

      // Processar dados
      const processedClients = clientsData?.map(client => ({
        id: client.id,
        name: client.name,
        company: client.company || '',
        investment: 0,
        leads: 0,
        cpa: 0,
        roi: 0,
        status: client.status
      })) || [];

      const processedCampaigns = currentPeriodCampaigns?.map(campaign => ({
        id: campaign.id,
        name: campaign.name,
        client_name: campaign.clients.name,
        client_id: campaign.client_id,
        cpa: campaign.cpa || 0,
        spend: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        status: campaign.status,
        ctr: campaign.ctr || 0
      })) || [];

      // Gerar alertas
      const generatedAlerts = await generateAlerts(
        processedClients,
        processedCampaigns,
        activeTasks || [],
        filterClientId
      );

      setAlerts(generatedAlerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Erro ao buscar alertas');
    } finally {
      setLoading(false);
    }
  };

  return {
    alerts,
    loading,
    error,
    generateAlerts: fetchAlerts,
  };
};