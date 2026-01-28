import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WhatsAppLabel {
  id: string;
  name: string;
  color: number;
  predefinedId?: string;
}

// WhatsApp label colors (based on their color codes 0-19)
export const WHATSAPP_LABEL_COLORS: Record<number, { bg: string; text: string; name: string }> = {
  0: { bg: "#00a884", text: "#ffffff", name: "Verde" },
  1: { bg: "#53bdeb", text: "#ffffff", name: "Azul claro" },
  2: { bg: "#ffd279", text: "#000000", name: "Amarelo" },
  3: { bg: "#ff7eb6", text: "#ffffff", name: "Rosa" },
  4: { bg: "#a695e7", text: "#ffffff", name: "Roxo" },
  5: { bg: "#6fd4d2", text: "#000000", name: "Turquesa" },
  6: { bg: "#ff9a3c", text: "#ffffff", name: "Laranja" },
  7: { bg: "#5eb6ff", text: "#ffffff", name: "Azul" },
  8: { bg: "#e64a19", text: "#ffffff", name: "Vermelho" },
  9: { bg: "#4dd0e1", text: "#000000", name: "Ciano" },
  10: { bg: "#8bc34a", text: "#ffffff", name: "Verde limão" },
  11: { bg: "#9e9e9e", text: "#ffffff", name: "Cinza" },
  12: { bg: "#ff5252", text: "#ffffff", name: "Coral" },
  13: { bg: "#7c4dff", text: "#ffffff", name: "Violeta" },
  14: { bg: "#ffab40", text: "#000000", name: "Âmbar" },
  15: { bg: "#69f0ae", text: "#000000", name: "Menta" },
  16: { bg: "#40c4ff", text: "#000000", name: "Azul céu" },
  17: { bg: "#ea80fc", text: "#000000", name: "Lilás" },
  18: { bg: "#b388ff", text: "#000000", name: "Lavanda" },
  19: { bg: "#ccff90", text: "#000000", name: "Lima" },
};

export function getLabelColor(colorCode: number) {
  return WHATSAPP_LABEL_COLORS[colorCode] || WHATSAPP_LABEL_COLORS[0];
}

export function useWhatsAppLabels(companyId: string | undefined, instanceId: string | null) {
  const queryClient = useQueryClient();

  const { data: labels, isLoading, error, refetch } = useQuery({
    queryKey: ["whatsapp-labels", companyId, instanceId],
    queryFn: async () => {
      if (!companyId || !instanceId) return [];

      const { data, error } = await supabase.functions.invoke("fetch-whatsapp-labels", {
        body: { company_id: companyId, instance_id: instanceId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar etiquetas");

      // Normalize the labels data
      const labelsArray = Array.isArray(data.labels) ? data.labels : [];
      return labelsArray.map((label: any) => ({
        id: label.id || label.labelid || String(label),
        name: label.name || "Sem nome",
        color: typeof label.color === "number" ? label.color : 0,
        predefinedId: label.predefinedId,
      })) as WhatsAppLabel[];
    },
    enabled: !!companyId && !!instanceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const addLabelToChat = useCallback(async (phone: string, labelId: string) => {
    if (!companyId || !instanceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("manage-whatsapp-chat-labels", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone,
          add_label_id: labelId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success("Etiqueta adicionada");
      return true;
    } catch (err: any) {
      console.error("[useWhatsAppLabels] Add label error:", err);
      toast.error(err.message || "Erro ao adicionar etiqueta");
      return false;
    }
  }, [companyId, instanceId]);

  const removeLabelFromChat = useCallback(async (phone: string, labelId: string) => {
    if (!companyId || !instanceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("manage-whatsapp-chat-labels", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone,
          remove_label_id: labelId,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success("Etiqueta removida");
      return true;
    } catch (err: any) {
      console.error("[useWhatsAppLabels] Remove label error:", err);
      toast.error(err.message || "Erro ao remover etiqueta");
      return false;
    }
  }, [companyId, instanceId]);

  const setLabelsForChat = useCallback(async (phone: string, labelIds: string[]) => {
    if (!companyId || !instanceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("manage-whatsapp-chat-labels", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone,
          label_ids: labelIds,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success("Etiquetas atualizadas");
      return true;
    } catch (err: any) {
      console.error("[useWhatsAppLabels] Set labels error:", err);
      toast.error(err.message || "Erro ao atualizar etiquetas");
      return false;
    }
  }, [companyId, instanceId]);

  const editLabel = useCallback(async (labelId: string, name?: string, color?: number) => {
    if (!companyId || !instanceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("edit-whatsapp-label", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          label_id: labelId,
          name,
          color,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success("Etiqueta atualizada");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-labels", companyId, instanceId] });
      return true;
    } catch (err: any) {
      console.error("[useWhatsAppLabels] Edit label error:", err);
      toast.error(err.message || "Erro ao editar etiqueta");
      return false;
    }
  }, [companyId, instanceId, queryClient]);

  const deleteLabel = useCallback(async (labelId: string) => {
    if (!companyId || !instanceId) return false;

    try {
      const { data, error } = await supabase.functions.invoke("edit-whatsapp-label", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          label_id: labelId,
          delete: true,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error);

      toast.success("Etiqueta deletada");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-labels", companyId, instanceId] });
      return true;
    } catch (err: any) {
      console.error("[useWhatsAppLabels] Delete label error:", err);
      toast.error(err.message || "Erro ao deletar etiqueta");
      return false;
    }
  }, [companyId, instanceId, queryClient]);

  return {
    labels: labels || [],
    isLoading,
    error,
    refetch,
    addLabelToChat,
    removeLabelFromChat,
    setLabelsForChat,
    editLabel,
    deleteLabel,
  };
}
