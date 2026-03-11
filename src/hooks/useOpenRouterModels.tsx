import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    modality: string;
    tokenizer: string;
  } | null;
}

export function useOpenRouterModels() {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const {
    data: models = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["openrouter-models", companyId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "get-openrouter-models",
        { body: { companyId } },
      );
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data.models as OpenRouterModel[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutos — lista de modelos muda pouco
    enabled: !!companyId,
  });

  return { models, isLoading, error };
}
