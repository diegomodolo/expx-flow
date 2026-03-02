import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface AdSetMismatch {
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  adSetName: string;
  adSetFacebookId: string;
  campaignName: string;
  campaignFacebookId: string;
  mismatchType: "instagram" | "facebook_page" | "both";
  expectedInstagram: string | null;
  actualInstagram: string | null;
  expectedPage: string | null;
  actualPage: string | null;
}

export function useAdSetAccountMismatches() {
  const { activeCompany } = useCompany();
  const [mismatches, setMismatches] = useState<AdSetMismatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const checkMismatches = async () => {
    if (!activeCompany?.company_id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "check-adset-account-mismatches",
        { body: { companyId: activeCompany.company_id } }
      );

      if (fnError) throw fnError;

      setMismatches(data.mismatches || []);
      setLastCheckedAt(new Date().toISOString());
    } catch (err) {
      console.error("Error checking mismatches:", err);
      setError(err instanceof Error ? err.message : "Erro ao verificar");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    mismatches,
    isLoading,
    error,
    lastCheckedAt,
    checkMismatches,
  };
}
