import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { Client, ClientStatus, calculateClientStatus } from "@/hooks/useClients";

export interface ClientCampaign {
  id: string;
  name: string;
  platforms: string;
  status: 'active' | 'paused' | 'finished';
  is_active: boolean;
  ctr: number;
  cpc: number;
  cpa: number; // Custo por Aquisição/Conversão
  conversions: number;
  spend: number; // Custo Total da Campanha
  impressions?: number;
  reach?: number;
  frequency?: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  clicks?: number;
  objective?: string; // Objetivo da campanha (LEAD_GENERATION, REACH, etc.)
  facebook_id?: string; // ID da campanha no Facebook/Meta
  created_at: string;
}

export interface ClientDetailsData extends Client {
  campaigns: ClientCampaign[];
  statusExplanation?: string;
  facebook_ad_accounts?: {
    id: string;
    account_name: string;
    balance: number;
    currency: string;
    account_status: number;
    disable_reason?: string;
    has_funding_issues: boolean;
    last_balance_check?: string;
    is_prepaid: boolean;
    funding_source_details?: any;
  };
  facebook_page?: {
    id: string;
    page_id: string;
    page_name: string;
    page_category: string | null;
  };
  instagram_account?: {
    id: string;
    instagram_id: string;
    username: string;
    profile_picture_url: string | null;
    followers_count: number;
  };
}

export function useClientDetails(clientId: string) {
  const [client, setClient] = useState<ClientDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchClientDetails = async () => {
    if (!user || !activeCompany || !clientId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Fetch client data with ad account information
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select(`
          *,
          facebook_ad_accounts!ad_account_id (
            id,
            account_name,
            balance,
            currency,
            account_status,
            disable_reason,
            has_funding_issues,
            last_balance_check,
            is_prepaid,
            funding_source_details
          ),
          facebook_page:facebook_pages!facebook_page_id (
            id,
            page_id,
            page_name,
            page_category
          ),
          instagram_account:instagram_accounts!instagram_account_id (
            id,
            instagram_id,
            username,
            profile_picture_url,
            followers_count
          )
        `)
        .eq("id", clientId)
        .eq("company_id", activeCompany.company_id)
        .maybeSingle();

      if (clientError) throw clientError;
      
      if (!clientData) {
        setError("Cliente não encontrado");
        return;
      }

      // Fetch campaigns for this client
      const { data: campaignsData, error: campaignsError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", clientId)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (campaignsError) throw campaignsError;

      console.log('Campaigns fetched for client:', clientId, campaignsData);

      // Combine client and campaigns data and calculate status
      const { status, explanation } = await calculateClientStatus(clientId, activeCompany.company_id);
      const clientWithCampaigns: ClientDetailsData = {
        ...clientData,
        campaigns: campaignsData || [],
        status, // This is already ClientStatus from calculateClientStatus
        statusExplanation: explanation
      };

      console.log('Client with campaigns:', clientWithCampaigns);

      setClient(clientWithCampaigns);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar detalhes do cliente");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientDetails();
  }, [clientId, user?.id, activeCompany?.company_id]);

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchClientDetails();
    };
    
    window.addEventListener('refreshClientDetails', handleRefresh);
    return () => window.removeEventListener('refreshClientDetails', handleRefresh);
  }, [clientId, user?.id, activeCompany?.company_id]);

  return {
    client,
    loading,
    error,
    refetch: fetchClientDetails
  };
}