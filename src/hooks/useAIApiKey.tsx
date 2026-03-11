import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export function useAIApiKey() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: maskedKey, isLoading } = useQuery({
    queryKey: ["ai-api-key", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("ai_api_keys")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return "••••••••••";
    },
    enabled: !!companyId,
  });

  const saveKey = useMutation({
    mutationFn: async (apiKey: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const { error } = await supabase
        .from("ai_api_keys")
        .upsert(
          { company_id: companyId, openrouter_api_key: apiKey },
          { onConflict: "company_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-api-key"] });
      queryClient.invalidateQueries({ queryKey: ["openrouter-models"] });
      toast.success("API key salva com sucesso");
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar API key", { description: error.message });
    },
  });

  return { maskedKey, isLoading, saveKey, hasKey: !!maskedKey };
}
