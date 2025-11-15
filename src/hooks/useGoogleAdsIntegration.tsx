import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface GoogleAdAccount {
  id: string;
  google_customer_id: string;
  account_name: string;
  currency?: string;
  is_active: boolean;
}

export interface GoogleAdsIntegration {
  id: string;
  company_id: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

export function useGoogleAdsIntegration() {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<GoogleAdsIntegration | null>(null);
  const [adAccounts, setAdAccounts] = useState<GoogleAdAccount[]>([]);

  const getAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
    const redirectUri = `${window.location.origin}/google-ads/callback`;
    const scope = 'https://www.googleapis.com/auth/adwords';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`;
  };

  const connectGoogle = () => {
    const authUrl = getAuthUrl();
    window.location.href = authUrl;
  };

  const handleCallback = async (code: string, companyId: string) => {
    try {
      console.log("Processing Google Ads OAuth callback...");
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: {
          action: 'exchange',
          code,
          companyId,
          redirectUri: `${window.location.origin}/google-ads/callback`,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      console.log("Google Ads connected successfully");
      toast.success("Google Ads conectado com sucesso!");
      
      return data;
    } catch (error: any) {
      console.error("Error in handleCallback:", error);
      toast.error(`Erro ao conectar Google Ads: ${error.message}`);
      throw error;
    }
  };

  const loadIntegration = async (companyId: string) => {
    try {
      setLoading(true);

      const { data: integrationData, error: integrationError } = await supabase
        .from('google_ads_integrations')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (integrationError) throw integrationError;

      setIntegration(integrationData);

      if (integrationData) {
        const { data: accountsData, error: accountsError } = await supabase
          .from('google_ads_accounts')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('account_name');

        if (accountsError) throw accountsError;
        setAdAccounts(accountsData || []);
      } else {
        setAdAccounts([]);
      }
    } catch (error: any) {
      console.error("Error loading integration:", error);
      toast.error(`Erro ao carregar integração: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!activeCompany || !integration) return;

    try {
      const { error } = await supabase
        .from('google_ads_integrations')
        .update({ is_active: false })
        .eq('id', integration.id);

      if (error) throw error;

      setIntegration(null);
      setAdAccounts([]);
      toast.success("Google Ads desconectado com sucesso!");
    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast.error(`Erro ao desconectar: ${error.message}`);
    }
  };

  const refreshAdAccounts = async () => {
    if (!activeCompany) return;
    await loadIntegration(activeCompany.id);
  };

  useEffect(() => {
    if (activeCompany) {
      loadIntegration(activeCompany.id);
    }
  }, [activeCompany]);

  return {
    loading,
    integration,
    adAccounts,
    connectGoogle,
    handleCallback,
    loadIntegration,
    disconnectGoogle,
    refreshAdAccounts,
    getAuthUrl,
  };
}
