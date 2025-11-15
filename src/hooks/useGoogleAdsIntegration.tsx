import { useState, useEffect, useRef } from "react";
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
  
  // Ref para prevenir múltiplas chamadas com o mesmo código
  const processingCodeRef = useRef<string | null>(null);

  const getAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
    // Use URL fixo para garantir consistência
    const redirectUri = 'https://preview--controledetrafego.lovable.app/google-ads/callback';
    const scope = 'https://www.googleapis.com/auth/adwords';
    
    console.log('Auth URL redirect_uri:', redirectUri);
    
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
    console.log('handleCallback called with:', { 
      codeLength: code?.length, 
      codeSample: code?.substring(0, 20) + '...', 
      companyId 
    });
    
    // Prevenir reprocessamento do mesmo código
    if (processingCodeRef.current === code) {
      console.log('Code already being processed, skipping duplicate request...');
      throw new Error('Code already being processed');
    }

    try {
      processingCodeRef.current = code;
      console.log("Processing Google Ads OAuth callback...");
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session check:', { hasSession: !!session, userId: session?.user?.id });
      
      if (!session) {
        throw new Error("No active session");
      }

      // Use o mesmo redirect_uri fixo
      const redirectUri = 'https://preview--controledetrafego.lovable.app/google-ads/callback';
      console.log('Calling edge function with:', { 
        redirectUri, 
        companyId,
        hasCode: !!code 
      });

      const { data, error } = await supabase.functions.invoke('google-ads-oauth', {
        body: {
          action: 'exchange',
          code,
          companyId,
          redirectUri,
        },
      });

      console.log('Edge function response:', { 
        hasData: !!data, 
        hasError: !!error,
        dataKeys: data ? Object.keys(data) : [],
        errorMessage: error?.message 
      });

      if (error) {
        console.error('Edge function returned error:', error);
        throw error;
      }

      if (data.error) {
        console.error('Data contains error:', data.error);
        throw new Error(data.error);
      }

      console.log("Google Ads connected successfully");
      toast.success("Google Ads conectado com sucesso!");
      
      // Limpar o código processado após sucesso
      processingCodeRef.current = null;
      
      return data;
    } catch (error: any) {
      console.error("Error in handleCallback:", error);
      toast.error(`Erro ao conectar Google Ads: ${error.message}`);
      // Limpar o código processado após erro
      processingCodeRef.current = null;
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
