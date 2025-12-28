import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

/**
 * IMPORTANT:
 * CompanyContext.activeCompany is a CompanyMember.
 * - activeCompany.id is the company_members row id
 * - activeCompany.company_id is the companies.id
 */
export function useCompanyTvDashboardToken() {
  const { activeCompany } = useCompany();

  const companyId = activeCompany?.company_id ?? null;
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (companyId) {
      void fetchToken(companyId);
    } else {
      setToken(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  const fetchToken = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("companies")
        .select("tv_dashboard_token")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setToken(data?.tv_dashboard_token ?? null);
    } catch (error) {
      console.error("Error fetching TV dashboard token:", error);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async (): Promise<string | null> => {
    if (!companyId) return null;

    setGenerating(true);
    try {
      const { data: tokenData, error: tokenError } = await supabase.rpc(
        "generate_tv_dashboard_token"
      );
      if (tokenError) throw tokenError;

      const newToken = tokenData as string;

      const { error: setError } = await supabase.rpc("set_tv_dashboard_token", {
        p_company_id: companyId,
        p_token: newToken,
      });
      if (setError) throw setError;

      setToken(newToken);
      toast.success("Token do Dashboard TV gerado com sucesso!");
      return newToken;
    } catch (error) {
      console.error("Error generating TV dashboard token:", error);
      toast.error("Erro ao gerar token do Dashboard TV");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const regenerateToken = async (): Promise<string | null> => generateToken();

  const getPublicUrl = () => {
    if (!token) return null;
    return `${window.location.origin}/tv/${token}`;
  };

  return {
    token,
    loading,
    generating,
    generateToken,
    regenerateToken,
    getPublicUrl,
    refetch: () => (companyId ? fetchToken(companyId) : Promise.resolve()),
  };
}
