import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export function useAIFavoriteModels() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ["ai-favorite-models", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("ai_favorite_models")
        .select("model_id")
        .eq("company_id", companyId);
      if (error) throw error;
      return data.map((f) => f.model_id);
    },
    enabled: !!companyId,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (modelId: string) => {
      if (!companyId) throw new Error("Empresa não selecionada");
      const isFavorite = favorites.includes(modelId);
      if (isFavorite) {
        const { error } = await supabase
          .from("ai_favorite_models")
          .delete()
          .eq("company_id", companyId)
          .eq("model_id", modelId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_favorite_models")
          .insert({ company_id: companyId, model_id: modelId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-favorite-models"] });
    },
  });

  return { favorites, isLoading, toggleFavorite };
}
