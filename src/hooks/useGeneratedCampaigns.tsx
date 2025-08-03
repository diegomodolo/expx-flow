import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

export interface GeneratedCampaign {
  id: string;
  user_id: string;
  company_id: string;
  client_id: string;
  title: string;
  funnel_stage: string;
  campaign_type: string;
  configuration: any;
  creatives: any;
  status: string;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company: string;
    email?: string;
    sector?: string;
    avatar?: string;
  };
}

export interface CampaignData {
  client: any;
  funnelStage: string;
  campaignType: string;
  configuration: any;
  creatives: any;
}

export const useGeneratedCampaigns = () => {
  const [campaigns, setCampaigns] = useState<GeneratedCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchCampaigns = async () => {
    if (!user || !activeCompany) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Primeiro buscar as campanhas geradas
      const { data: campaigns, error: campaignsError } = await supabase
        .from('generated_campaigns')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (campaignsError) {
        console.error('Error fetching campaigns:', campaignsError);
        setError('Erro ao carregar campanhas');
        return;
      }

      // Buscar dados dos clientes separadamente
      if (campaigns && campaigns.length > 0) {
        const clientIds = [...new Set(campaigns.map(c => c.client_id))];
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, name, company, email')
          .in('id', clientIds);

        if (clientsError) {
          console.error('Error fetching clients:', clientsError);
        }

        // Combinar os dados
        const campaignsWithClients = campaigns.map(campaign => ({
          ...campaign,
          clients: clients?.find(client => client.id === campaign.client_id) || null
        }));

        setCampaigns(campaignsWithClients);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: CampaignData) => {
    if (!user || !activeCompany) {
      throw new Error('Usuário ou empresa não encontrados');
    }

    try {
      const title = `${campaignData.client.name} - ${campaignData.campaignType} - ${campaignData.funnelStage}`;
      
      const { data, error } = await supabase
        .from('generated_campaigns')
        .insert({
          user_id: user.id,
          company_id: activeCompany.company_id,
          client_id: campaignData.client.id,
          title,
          funnel_stage: campaignData.funnelStage,
          campaign_type: campaignData.campaignType,
          configuration: campaignData.configuration || {},
          creatives: campaignData.creatives || {},
          status: 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Campanha salva com sucesso!",
        description: "A estratégia foi salva e pode ser acessada a qualquer momento.",
      });

      await fetchCampaigns();
      return data;
    } catch (err) {
      console.error('Error creating campaign:', err);
      const message = err instanceof Error ? err.message : 'Erro ao salvar campanha';
      toast({
        title: "Erro ao salvar campanha",
        description: message,
        variant: "destructive",
      });
      throw err;
    }
  };

  const getCampaign = async (id: string): Promise<GeneratedCampaign | null> => {
    if (!user || !activeCompany) return null;

    try {
      // Buscar a campanha
      const { data: campaign, error: campaignError } = await supabase
        .from('generated_campaigns')
        .select('*')
        .eq('id', id)
        .eq('company_id', activeCompany.company_id)
        .single();

      if (campaignError) throw campaignError;

      // Buscar dados do cliente separadamente
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('name, company, email, sector, avatar')
        .eq('id', campaign.client_id)
        .single();

      if (clientError) {
        console.error('Error fetching client:', clientError);
      }

      return {
        ...campaign,
        clients: client || null
      };
    } catch (err) {
      console.error('Error fetching campaign:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user, activeCompany]);

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    getCampaign,
  };
};