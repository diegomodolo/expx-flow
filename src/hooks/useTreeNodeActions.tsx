import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UseTreeNodeActionsProps {
  onSuccess?: () => void;
}

interface DuplicateEntityParams {
  type: "campaign" | "adset" | "ad";
  id: string;
  clientId: string;
  facebookId: string;
  newName: string;
  platform: "meta" | "google";
}

export function useTreeNodeActions({ onSuccess }: UseTreeNodeActionsProps = {}) {
  const [isDuplicating, setIsDuplicating] = useState(false);

  const duplicateEntity = async (params: DuplicateEntityParams) => {
    const { type, id, clientId, facebookId, newName, platform } = params;

    if (platform === "google") {
      toast.error("Duplicação de entidades do Google Ads não é suportada.");
      return;
    }

    setIsDuplicating(true);

    try {
      const { data, error } = await supabase.functions.invoke("duplicate-tree-entity", {
        body: {
          entityType: type,
          entityId: id,
          clientId,
          facebookId,
          newName,
        },
      });

      if (error) {
        console.error("Error duplicating entity:", error);
        toast.error(`Erro ao duplicar: ${error.message}`);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || "Erro desconhecido ao duplicar");
        return;
      }

      const entityLabels = {
        campaign: "Campanha",
        adset: "Conjunto de anúncios",
        ad: "Criativo",
      };

      toast.success(`${entityLabels[type]} duplicado com sucesso!`);
      onSuccess?.();
    } catch (err) {
      console.error("Error duplicating entity:", err);
      toast.error("Erro ao duplicar entidade");
    } finally {
      setIsDuplicating(false);
    }
  };

  return {
    duplicateEntity,
    isDuplicating,
  };
}
