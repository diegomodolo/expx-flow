import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

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

interface SyncEntityParams {
  type: "campaign" | "adset" | "ad";
  id: string;
  clientId: string;
  facebookId?: string;
}

export function useTreeNodeActions({ onSuccess }: UseTreeNodeActionsProps = {}) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

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
      
      // Invalidate queries to refresh the list immediately
      await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-adsets", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-ads", clientId] });
      
      onSuccess?.();
    } catch (err) {
      console.error("Error duplicating entity:", err);
      toast.error("Erro ao duplicar entidade");
    } finally {
      setIsDuplicating(false);
    }
  };

  const syncEntity = async (params: SyncEntityParams) => {
    const { type, id, clientId, facebookId } = params;

    if (!facebookId) {
      toast.error("ID do Meta não encontrado para sincronização.");
      return;
    }

    setIsSyncing(true);

    try {
      const entityLabels = {
        campaign: "Campanha",
        adset: "Conjunto de anúncios",
        ad: "Criativo",
      };

      toast.info(`Sincronizando ${entityLabels[type].toLowerCase()}...`);

      // For campaigns, sync directly with the campaign ID
      // For ad sets and ads, we need to sync the parent campaign
      let campaignFacebookId = facebookId;
      
      if (type === "adset") {
        // Get the parent campaign's facebook_id
        const { data: adset } = await supabase
          .from("ad_sets")
          .select("campaign_id")
          .eq("id", id)
          .single();
        
        if (adset?.campaign_id) {
          const { data: campaign } = await supabase
            .from("campaigns")
            .select("facebook_id")
            .eq("id", adset.campaign_id)
            .single();
          
          if (campaign?.facebook_id) {
            campaignFacebookId = campaign.facebook_id;
          }
        }
      } else if (type === "ad") {
        // Get the parent ad set, then the campaign
        const { data: ad } = await supabase
          .from("ads")
          .select("ad_set_id")
          .eq("id", id)
          .single();
        
        if (ad?.ad_set_id) {
          const { data: adset } = await supabase
            .from("ad_sets")
            .select("campaign_id")
            .eq("id", ad.ad_set_id)
            .single();
          
          if (adset?.campaign_id) {
            const { data: campaign } = await supabase
              .from("campaigns")
              .select("facebook_id")
              .eq("id", adset.campaign_id)
              .single();
            
            if (campaign?.facebook_id) {
              campaignFacebookId = campaign.facebook_id;
            }
          }
        }
      }

      const { data, error } = await supabase.functions.invoke("sync-facebook-campaigns", {
        body: {
          clientId,
          campaignFacebookId,
          syncCampaigns: true,
          syncAdSets: type === "campaign" || type === "adset",
          syncAds: true,
        },
      });

      if (error) {
        console.error("Error syncing entity:", error);
        toast.error(`Erro ao sincronizar: ${error.message}`);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || "Erro desconhecido ao sincronizar");
        return;
      }

      toast.success(`${entityLabels[type]} sincronizado com sucesso!`);
      
      // Invalidate queries to refresh the list
      await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-adsets", clientId] });
      await queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-ads", clientId] });
      
      onSuccess?.();
    } catch (err) {
      console.error("Error syncing entity:", err);
      toast.error("Erro ao sincronizar entidade");
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    duplicateEntity,
    isDuplicating,
    syncEntity,
    isSyncing,
  };
}
