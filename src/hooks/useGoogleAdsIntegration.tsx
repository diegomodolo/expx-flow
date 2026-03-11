import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface GoogleAdAccount {
  id: string;
  google_customer_id: string;
  account_name: string;
  currency?: string;
  time_zone?: string;
  is_active: boolean;
  is_manager?: boolean;
  status?: string;
  parent_customer_id?: string | null;
  client_id?: string | null;
}

export interface GoogleAdsIntegration {
  id: string;
  company_id: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  user_email?: string | null;
}

export function useGoogleAdsIntegration() {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<GoogleAdsIntegration | null>(
    null,
  );
  const [adAccounts, setAdAccounts] = useState<GoogleAdAccount[]>([]);

  // Ref para prevenir múltiplas chamadas com o mesmo código
  const processingCodeRef = useRef<string | null>(null);

  const getAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
    // Use URL dinâmica baseada no domínio atual
    const redirectUri = `${window.location.origin}/google-ads/callback`;
    const scope = "https://www.googleapis.com/auth/adwords";

    return (
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&access_type=offline` +
      `&prompt=consent`
    );
  };

  const connectGoogle = () => {
    const authUrl = getAuthUrl();
    window.location.href = authUrl;
  };

  const handleCallback = async (code: string, companyId: string) => {
    // Prevenir reprocessamento do mesmo código
    if (processingCodeRef.current === code) {
      throw new Error("Code already being processed");
    }

    try {
      processingCodeRef.current = code;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("No active session");
      }

      // Use redirect_uri dinâmico baseado no domínio atual
      const redirectUri = `${window.location.origin}/google-ads/callback`;

      const { data, error } = await supabase.functions.invoke(
        "google-ads-oauth",
        {
          body: {
            action: "exchange",
            code,
            companyId,
            redirectUri,
          },
        },
      );

      if (error) {
        console.error("Edge function returned error:", error);
        throw error;
      }

      if (data.error) {
        console.error("Data contains error:", data.error);
        throw new Error(data.error);
      }

      toast.success("Google Ads conectado com sucesso!");

      // Limpar o código processado após sucesso
      processingCodeRef.current = null;

      return data;
    } catch (error: unknown) {
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
        .from("google_ads_integrations")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .maybeSingle();

      if (integrationError) throw integrationError;

      setIntegration(integrationData);

      if (integrationData) {
        const { data: accountsData, error: accountsError } = await supabase
          .from("google_ads_accounts")
          .select("*")
          .eq("company_id", companyId)
          .eq("is_active", true)
          .order("account_name");

        if (accountsError) throw accountsError;
        setAdAccounts(accountsData || []);
      } else {
        setAdAccounts([]);
      }
    } catch (error: unknown) {
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
        .from("google_ads_integrations")
        .update({ is_active: false })
        .eq("id", integration.id);

      if (error) throw error;

      setIntegration(null);
      setAdAccounts([]);
      toast.success("Google Ads desconectado com sucesso!");
    } catch (error: unknown) {
      console.error("Error disconnecting:", error);
      toast.error(`Erro ao desconectar: ${error.message}`);
    }
  };

  const refreshAdAccounts = async () => {
    if (!activeCompany?.company_id || !integration?.id) {
      toast.error("Nenhuma integração ativa encontrada");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "google-ads-oauth",
        {
          body: {
            action: "refresh_accounts",
            integrationId: integration.id,
            companyId: activeCompany.company_id,
          },
        },
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(
        `${data.accounts?.length || 0} conta(s) recarregada(s) com sucesso!`,
      );

      // Reload integration data
      await loadIntegration(activeCompany.company_id);
    } catch (error: unknown) {
      console.error("Error refreshing accounts:", error);
      toast.error(`Erro ao recarregar contas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshToken = async () => {
    if (!activeCompany?.company_id) {
      toast.error("Nenhuma empresa ativa encontrada");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "google-ads-oauth",
        {
          body: {
            action: "refresh_token",
            companyId: activeCompany.company_id,
          },
        },
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success(data.message || "Token renovado com sucesso!");

      // Reload integration data
      await loadIntegration(activeCompany.company_id);
    } catch (error: unknown) {
      console.error("Error refreshing token:", error);
      toast.error(`Erro ao renovar token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addCustomerId = async (customerId: string, clientId?: string) => {
    if (!integration || !activeCompany) {
      toast.error("Nenhuma integração ativa encontrada");
      return;
    }

    try {
      // Validar formato do Customer ID (deve ser numérico, com ou sem hífens)
      const cleanId = customerId.replace(/[-\s]/g, "");
      if (!/^\d{10}$/.test(cleanId)) {
        toast.error(
          "Customer ID inválido. Deve ter 10 dígitos (formato: 123-456-7890)",
        );
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "google-ads-fetch-account",
        {
          body: {
            customerId: cleanId,
            companyId: activeCompany.company_id,
            clientId: clientId || null,
          },
        },
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Conta adicionada com sucesso!");
      await loadIntegration(activeCompany.company_id);
    } catch (error: unknown) {
      console.error("Error adding customer ID:", error);
      toast.error(`Erro ao adicionar conta: ${error.message}`);
    }
  };

  useEffect(() => {
    if (activeCompany) {
      loadIntegration(activeCompany.company_id);
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
    refreshToken,
    addCustomerId,
    getAuthUrl,
  };
}
