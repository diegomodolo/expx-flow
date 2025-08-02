import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { Client } from "./useClients";

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
  created_at: string;
}

export interface ClientDetailsData extends Client {
  campaigns: ClientCampaign[];
  facebook_ad_accounts?: {
    id: string;
    account_name: string;
    balance: number;
    account_status: number;
    disable_reason?: string;
    has_funding_issues: boolean;
    last_balance_check?: string;
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
            account_status,
            disable_reason,
            has_funding_issues,
            last_balance_check
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

      // Combine client and campaigns data
      const clientWithCampaigns: ClientDetailsData = {
        ...clientData,
        campaigns: campaignsData || []
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

  return {
    client,
    loading,
    error,
    refetch: fetchClientDetails
  };
}