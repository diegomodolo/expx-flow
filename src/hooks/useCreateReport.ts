import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateReportInput {
  type: "bug" | "feature";
  title: string;
  description: string;
  extra_fields: Record<string, string>;
  user_name: string;
  company_id: string;
  user_id: string;
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReportInput) => {
      const { data, error } = await supabase.functions.invoke(
        "create-github-issue",
        { body: input }
      );

      if (error) throw new Error(error.message || "Erro ao criar reporte");
      if (!data?.success) throw new Error(data?.error || "Erro ao criar reporte");

      return data.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-reports", variables.company_id] });
      toast.success("Reporte enviado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível criar o reporte. Tente novamente.");
    },
  });
}
