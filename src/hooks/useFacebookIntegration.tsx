import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

interface FacebookAdAccount {
  id: string;
  account_name: string;
  currency: string;
  is_active: boolean;
}

interface FacebookIntegration {
  id: string;
  company_id: string;
  access_token: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useFacebookIntegration = () => {
  const [loading, setLoading] = useState(false);
  const [integration, setIntegration] = useState<FacebookIntegration | null>(null);
  const [adAccounts, setAdAccounts] = useState<FacebookAdAccount[]>([]);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const getAuthUrl = () => {
    if (!activeCompany) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa primeiro",
        variant: "destructive"
      });
      return null;
    }

    const facebookAppId = '1118192076871259'; // Your Facebook App ID
    
    // Determine redirect URI based on current domain
    const origin = window.location.origin;
    let redirectUri = '';
    
    if (origin.includes('lovable.app') || origin.includes('lovableproject.com')) {
      if (origin.includes('preview--')) {
        redirectUri = `${origin}/auth/callback`;
      } else {
        redirectUri = 'https://multi-campaign-insight.lovable.app/auth/callback';
      }
    } else {
      redirectUri = 'https://controledetrafego.com.br/auth/callback';
    }

    const params = new URLSearchParams({
      client_id: facebookAppId,
      redirect_uri: redirectUri,
      scope: 'email,public_profile,ads_read,business_management',
      response_type: 'code',
      state: activeCompany.company_id, // Pass company ID as state
    });

    return `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`;
  };

  const connectFacebook = () => {
    const authUrl = getAuthUrl();
    if (authUrl) {
      window.location.href = authUrl;
    }
  };

  const handleCallback = async (code: string, companyId: string) => {
    setLoading(true);
    try {
      console.log("Handling Facebook callback with code:", code);
      
      const { data, error } = await supabase.functions.invoke('facebook-oauth?action=exchange', {
        body: { 
          code, 
          companyId
        }
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Erro na função de OAuth");
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao processar OAuth");
      }

      console.log("Facebook OAuth success:", data);
      
      setIntegration(data.integration);
      setAdAccounts(data.adAccounts || []);

      toast({
        title: "Facebook conectado com sucesso!",
        description: `${(data.adAccounts || []).length} conta(s) de anúncios importadas.`,
      });

      return true;
    } catch (error: any) {
      console.error("Error handling Facebook callback:", error);
      toast({
        title: "Erro ao conectar Facebook",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadIntegration = async (companyId: string) => {
    setLoading(true);
    try {
      const { data: integrations, error } = await supabase
        .from("facebook_integrations")
        .select(`
          *,
          facebook_ad_accounts(*)
        `)
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (integrations) {
        setIntegration(integrations);
        setAdAccounts(integrations.facebook_ad_accounts || []);
      } else {
        setIntegration(null);
        setAdAccounts([]);
      }
    } catch (error: any) {
      console.error("Error loading integration:", error);
      toast({
        title: "Erro ao carregar integração",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectFacebook = async () => {
    if (!integration) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("facebook_integrations")
        .update({ is_active: false })
        .eq("id", integration.id);

      if (error) throw error;

      setIntegration(null);
      setAdAccounts([]);

      toast({
        title: "Facebook desconectado",
        description: "A integração foi removida com sucesso.",
      });
    } catch (error: any) {
      console.error("Error disconnecting Facebook:", error);
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    integration,
    adAccounts,
    connectFacebook,
    handleCallback,
    loadIntegration,
    disconnectFacebook,
  };
};