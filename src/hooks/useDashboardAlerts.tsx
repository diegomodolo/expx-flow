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

    console.log('🎯 Processing alerts with separate limits:', {
      totalCampaigns: availableCampaigns.length,
      maxProblems,
      maxOpportunities
    });

    // PROCESSAR PROBLEMAS (LIMITE SEPARADO)
    for (const campaign of availableCampaigns) {
      if (problemAlerts.length >= maxProblems) break;

      if (campaign.cpa > 50) {
        console.log('💰 High CPA problem found:', campaign.name, 'CPA:', campaign.cpa);
        const recommendation = await generateRecommendation(campaign, 'high_cpa');
        problemAlerts.push({
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
      
      if (campaign.ctr < 1.0 && problemAlerts.length < maxProblems) {
        console.log('📉 Low CTR problem found:', campaign.name, 'CTR:', campaign.ctr);
        const recommendation = await generateRecommendation(campaign, 'low_ctr');
        problemAlerts.push({
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

    // PROCESSAR OPORTUNIDADES (LIMITE SEPARADO)
    console.log('🚀 Starting opportunities processing...');
    
    // Oportunidades de escala (critérios mais flexíveis)
    for (const campaign of availableCampaigns) {
      if (opportunityAlerts.length >= maxOpportunities) break;
      
      // Critérios mais realistas para oportunidades
      const hasGoodCPA = campaign.cpa <= 60; // CPA aceitável até R$ 60
      const hasGoodCTR = campaign.ctr >= 1.0; // CTR aceitável a partir de 1%
      const hasRoomToScale = campaign.spend < 1000; // Investimento ainda com margem para escalar
      const hasConversions = campaign.conversions > 0; // Precisa ter pelo menos algumas conversões
      
      const isOpportunity = hasGoodCPA && hasGoodCTR && hasRoomToScale && hasConversions;
      
      console.log(`🔍 Campaign ${campaign.name} - CPA: ${campaign.cpa}, CTR: ${campaign.ctr}, Spend: ${campaign.spend}, Conversions: ${campaign.conversions}, IsOpportunity: ${isOpportunity}`);
      
      if (isOpportunity) {
        console.log('✅ Scaling opportunity found:', campaign.name);
        const recommendation = await generateRecommendation(campaign, 'scale_opportunity');
        opportunityAlerts.push({
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
    }

    // Oportunidades baseadas em performance histórica
    for (const campaign of availableCampaigns) {
      if (opportunityAlerts.length >= maxOpportunities) break;
      
      // Campanhas com performance consistente que podem ser expandidas
      const hasConsistentPerformance = campaign.cpa <= 80 && campaign.ctr >= 0.8;
      const hasSignificantVolume = campaign.spend >= 100; // Já tem algum volume de dados
      const hasGoodConversionRate = campaign.conversions >= 5; // Pelo menos 5 conversões
      
      const isHistoricalOpportunity = hasConsistentPerformance && hasSignificantVolume && hasGoodConversionRate;
      
      if (isHistoricalOpportunity) {
        console.log('📊 Historical opportunity found:', campaign.name);
        const recommendation = await generateRecommendation(campaign, 'scale_opportunity');
        opportunityAlerts.push({
          id: `historical-opportunity-${campaign.id}`,
          type: 'opportunity',
          title: 'Oportunidade de Expansão',
          description: `Campanha "${campaign.name}" mostra performance consistente`,
          metric: 'Performance Histórica',
          value: `${campaign.conversions} conversões | CPA: R$ ${campaign.cpa.toFixed(2)}`,
          recommendation,
          client: campaign.client_name,
          campaign: campaign.name,
          campaign_id: campaign.id,
          client_id: campaign.client_id,
        });
      }
    }

    // Combinar alertas
    const allAlerts = [...problemAlerts, ...opportunityAlerts];

    console.log('✅ Alerts generation complete:', {
      problems: problemAlerts.length,
      opportunities: opportunityAlerts.length,
      total: allAlerts.length,
      breakdown: {
        danger: allAlerts.filter(a => a.type === 'danger').length,
        opportunity: allAlerts.filter(a => a.type === 'opportunity').length
      }
    });

    return allAlerts;
  };

  const fetchAlerts = async (filterClientId?: string | null) => {
    if (!activeCompany?.company_id || !user?.id) {
      console.log('Debug: Skipping alerts fetch - missing company or user', {
        hasCompany: !!activeCompany?.company_id,
        hasUser: !!user?.id
      });
      setLoading(false);
      setIsReady(true);
      return;
    }

    console.log('Debug: Starting alerts fetch for company:', activeCompany.company_id);
    setLoading(true);
    setError(null);
    setIsReady(false);

    // Timeout de segurança para evitar loading infinito
    const timeoutId = setTimeout(() => {
      console.log('Debug: Timeout reached, forcing loading to false');
      setLoading(false);
      setIsReady(true);
    }, 30000); // 30 segundos

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Buscar campanhas
      console.log('Debug: Fetching campaigns...');
      const { data: currentPeriodCampaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select(`
          *,
          clients!inner(name, company, status)
        `)
        .eq('company_id', activeCompany.company_id)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (campaignsError) {
        console.error('Debug: Error fetching campaigns:', campaignsError);
        throw campaignsError;
      }

      console.log('Debug: Found campaigns:', currentPeriodCampaigns?.length || 0);

      // Buscar clientes
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', activeCompany.company_id);

      if (clientsError) {
        console.error('Debug: Error fetching clients:', clientsError);
        throw clientsError;
      }

      console.log('Debug: Found clients:', clientsData?.length || 0);

      // Buscar tarefas ativas
      const { data: activeTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .neq('status', 'done');

      if (tasksError) {
        console.error('Debug: Error fetching tasks:', tasksError);
        throw tasksError;
      }

      console.log('Debug: Found active tasks:', activeTasks?.length || 0);

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

      console.log('Debug: Processed campaigns for alerts:', {
        total: processedCampaigns.length,
        active: processedCampaigns.filter(c => c.status === 'active').length,
        withConversions: processedCampaigns.filter(c => c.conversions > 0).length,
        lowCPA: processedCampaigns.filter(c => c.cpa <= 60).length,
        goodCTR: processedCampaigns.filter(c => c.ctr >= 1.0).length
      });

      // Gerar alertas
      console.log('Debug: Generating alerts...');
      const generatedAlerts = await generateAlerts(
        processedClients,
        processedCampaigns,
        activeTasks || [],
        filterClientId
      );

      console.log('Debug: Generated alerts:', {
        total: generatedAlerts.length,
        opportunities: generatedAlerts.filter(a => a.type === 'opportunity').length,
        dangers: generatedAlerts.filter(a => a.type === 'danger').length
      });

      setAlerts(generatedAlerts);
      console.log('Debug: Successfully set alerts, setting loading to false');
      setIsReady(true);
    } catch (err) {
      console.error('Debug: Error fetching alerts:', err);
      setError('Erro ao buscar alertas');
    } finally {
      clearTimeout(timeoutId);
      console.log('Debug: Finally block - setting loading to false');
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