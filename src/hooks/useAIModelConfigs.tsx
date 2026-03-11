import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface AIModelConfig {
  id: string;
  company_id: string;
  function_name: string;
  primary_model: string;
  fallback_model: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useAIModelConfigs() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["ai-model-configs", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ai_model_configs")
        .select("*")
        .eq("company_id", companyId)
        .order("function_name");
      if (error) throw error;
      return data as AIModelConfig[];
    },
    enabled: !!companyId,
  });

  const upsertConfig = useMutation({
    mutationFn: async ({
      functionName,
      primaryModel,
      fallbackModel,
    }: {
      functionName: string;
      primaryModel: string;
      fallbackModel?: string | null;
    }) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("ai_model_configs")
        .upsert(
          {
            company_id: companyId,
            function_name: functionName,
            primary_model: primaryModel,
            fallback_model: fallbackModel || null,
            is_active: true,
          },
          { onConflict: "company_id,function_name" },
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-configs"] });
      toast.success("Modelo configurado com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao configurar modelo", { description: error.message });
    },
  });

  const deleteConfig = useMutation({
    mutationFn: async (functionName: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { error } = await supabase
        .from("ai_model_configs")
        .delete()
        .eq("company_id", companyId)
        .eq("function_name", functionName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-model-configs"] });
      toast.success("Configuração removida — usará modelo padrão");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover configuração", {
        description: error.message,
      });
    },
  });

  const getConfigForFunction = (
    functionName: string,
  ): AIModelConfig | undefined => {
    return configs.find((c) => c.function_name === functionName);
  };

  return {
    configs,
    isLoading,
    upsertConfig,
    deleteConfig,
    getConfigForFunction,
  };
}
