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
  const [isReady, setIsReady] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
        return getDefaultRecommendation(issueType);
      }

      return data?.recommendation || getDefaultRecommendation(issueType);
    } catch (error) {
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

  // Função para gerar alertas básicos (sem IA)
  const generateBasicAlerts = (campaigns: CampaignRanking[], activeTasks: any[] = []): Alert[] => {
    const problemAlerts: Alert[] = [];
    const opportunityAlerts: Alert[] = [];
    const maxProblems = 5;
    const maxOpportunities = 5;

    // Extrair IDs de campanhas que já possuem tarefas ativas
    const campaignsWithActiveTasks = new Set(
      activeTasks
        .filter(task => task.related_campaign_id)
        .map(task => task.related_campaign_id)
    );

    // Filtrar apenas campanhas ativas E que não tenham tarefas ativas
    const availableCampaigns = campaigns.filter(campaign => 
      campaign.status === 'active' && !campaignsWithActiveTasks.has(campaign.id)
    );

    // PROCESSAR PROBLEMAS
    for (const campaign of availableCampaigns) {
      if (problemAlerts.length >= maxProblems) break;

      if (campaign.cpa > 50) {
        problemAlerts.push({
          id: `high-cpa-campaign-${campaign.id}`,
          type: 'danger',
          title: 'CPA Alto',
          description: `Campanha "${campaign.name}" com CPA de R$ ${campaign.cpa.toFixed(2)}`,
          metric: 'CPA',
          value: `R$ ${campaign.cpa.toFixed(2)}`,
          recommendation: 'Carregando recomendação...',
          client: campaign.client_name,
          campaign: campaign.name,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
        });
      }
      
      if (campaign.ctr < 1.0 && problemAlerts.length < maxProblems) {
        problemAlerts.push({
          id: `low-ctr-campaign-${campaign.id}`,
          type: 'danger',
          title: 'CTR Baixo',
          description: `Campanha "${campaign.name}" com CTR de ${campaign.ctr.toFixed(2)}%`,
          metric: 'CTR',
          value: `${campaign.ctr.toFixed(2)}%`,
          recommendation: 'Carregando recomendação...',
          client: campaign.client_name,
          campaign: campaign.name,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
        });
      }
    }

    // PROCESSAR OPORTUNIDADES
    for (const campaign of availableCampaigns) {
      if (opportunityAlerts.length >= maxOpportunities) break;
      
      const hasGoodCPA = campaign.cpa <= 60;
      const hasGoodCTR = campaign.ctr >= 1.0;
      const hasRoomToScale = campaign.spend < 1000;
      const hasConversions = campaign.conversions > 0;
      
      if (hasGoodCPA && hasGoodCTR && hasRoomToScale && hasConversions) {
        opportunityAlerts.push({
          id: `scale-opportunity-${campaign.id}`,
          type: 'opportunity',
          title: 'Oportunidade de Escala',
          description: `Campanha "${campaign.name}" tem potencial para aumentar orçamento`,
          metric: 'Performance',
          value: `CPA: R$ ${campaign.cpa.toFixed(2)} | CTR: ${campaign.ctr.toFixed(2)}%`,
          recommendation: 'Carregando recomendação...',
          client: campaign.client_name,
          campaign: campaign.name,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
        });
      }
    }

    return [...problemAlerts, ...opportunityAlerts];
  };

  // Função para carregar recomendações assincronamente
  const loadRecommendationsAsync = async (basicAlerts: Alert[]) => {
    const updatedAlerts = [...basicAlerts];
    
    for (let i = 0; i < updatedAlerts.length; i++) {
      const alert = updatedAlerts[i];
      if (alert.recommendation === 'Carregando recomendação...') {
        try {
          let issueType = 'client_analysis';
          if (alert.title === 'CPA Alto') issueType = 'high_cpa';
          else if (alert.title === 'CTR Baixo') issueType = 'low_ctr';
          else if (alert.title.includes('Oportunidade')) issueType = 'scale_opportunity';

          const campaignData = {
            name: alert.campaign,
            cpa: parseFloat(alert.value.replace('R$ ', '').split(' ')[0]),
            ctr: alert.metric === 'CTR' ? parseFloat(alert.value.replace('%', '')) : 0,
          };

          const recommendation = await generateRecommendation(campaignData, issueType);
          updatedAlerts[i] = { ...alert, recommendation };
          
          // Atualizar estado a cada recomendação carregada
          setAlerts([...updatedAlerts]);
        } catch (error) {
          updatedAlerts[i] = { ...alert, recommendation: getDefaultRecommendation('client_analysis') };
        }
      }
    }
    
    return updatedAlerts;
  };

  const fetchAlerts = async (filterClientId?: string | null) => {
    if (!activeCompany?.company_id || !user?.id) {
      setLoading(false);
      setIsReady(true);
      return;
    }

    // Evitar múltiplas execuções simultâneas
    if (isGenerating) {
      return;
    }
    setIsGenerating(true);
    setLoading(true);
    setError(null);
    setIsReady(false);

    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setIsReady(true);
      setIsGenerating(false);
    }, 30000); // 30 segundos

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar campanhas
      const { data: currentPeriodCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!inner(name, company, status)
        `)
        .eq('company_id', activeCompany.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      // Buscar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', activeCompany.company_id);

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        throw clientsError;
      }

      // Buscar tarefas ativas
      const { data: activeTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .neq('status', 'done');

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        throw tasksError;
      }

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
        ctr: campaign.ctr || 0,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0
      })) || [];

      // Gerar alertas básicos imediatamente
      const basicAlerts = generateBasicAlerts(processedCampaigns, activeTasks || []);

      // Exibir alertas básicos imediatamente
      setAlerts(basicAlerts);
      setLoading(false);
      setIsReady(true);
      setIsGenerating(false);
      clearTimeout(timeoutId);

      // Carregar recomendações assincronamente em segundo plano
      loadRecommendationsAsync(basicAlerts).catch(error => {
        console.error('Error loading recommendations:', error);
      });
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Erro ao buscar alertas');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setIsReady(true);
    }
  };

  return {
    alerts,
    loading,
    error,
    isReady,
    generateAlerts: fetchAlerts,
  };
};