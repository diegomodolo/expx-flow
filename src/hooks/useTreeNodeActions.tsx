import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UseTreeNodeActionsProps {
  onSuccess?: () => void;
  addSyncingItem?: (id: string) => void;
  removeSyncingItem?: (id: string) => void;
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

export function useTreeNodeActions({ onSuccess, addSyncingItem, removeSyncingItem }: UseTreeNodeActionsProps = {}) {
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const invalidateTreeQueries = useCallback(async (clientId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta", clientId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-adsets", clientId] }),
      queryClient.invalidateQueries({ queryKey: ["all-campaigns-tree-meta-ads", clientId] }),
    ]);
  }, [queryClient]);

  // Core sync function that returns success status
  const syncEntityCore = useCallback(async (params: SyncEntityParams): Promise<boolean> => {
    const { type, id, clientId, facebookId } = params;

    if (!facebookId) {
      console.error("No facebook_id for sync");
      return false;
    }

    try {
      // For campaigns, sync directly with the campaign ID
      // For ad sets and ads, we need to sync the parent campaign
      let campaignFacebookId = facebookId;
      
      if (type === "adset") {
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
          syncAdSets: true, // Always sync ad sets to be able to sync ads within them
          syncAds: true,
        },
      });

      if (error || !data?.success) {
        console.error("Sync error:", error || data?.error);
        return false;
      }

      // Poll for job completion
      const jobId = data.job_id;
      if (jobId) {
        let attempts = 0;
        const maxAttempts = 15;
        
        const pollJob = async (): Promise<boolean> => {
          const { data: job } = await supabase
            .from("sync_jobs")
            .select("status")
            .eq("id", jobId)
            .single();
          
          if (job?.status === "completed") {
            return true;
          } else if (job?.status === "failed" || job?.status === "error") {
            return false;
          }
          
          attempts++;
          if (attempts >= maxAttempts) {
            return false;
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          return pollJob();
        };

        return await pollJob();
      }
      
      return true; // No job_id means immediate success
    } catch (err) {
      console.error("Sync exception:", err);
      return false;
    }
  }, []);

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

      toast.success(`${entityLabels[type]} duplicado! Sincronizando automaticamente...`);
      
      // Invalidate queries to refresh the list immediately
      await invalidateTreeQueries(clientId);
      
      onSuccess?.();

      // Get the new entity info for auto-sync
      const newEntityFacebookId = data.data?.copiedId;
      const newEntityId = data.data?.insertedCampaign?.id || 
                          data.data?.insertedAdSet?.id || 
                          data.data?.insertedAd?.id;

      if (newEntityFacebookId && newEntityId) {
        // Mark as syncing in global state
        addSyncingItem?.(newEntityId);
        
        // Force a re-render to show syncing state
        await invalidateTreeQueries(clientId);

        // Wait 10 seconds for Meta to process the deep_copy
        console.log(`Auto-sync: waiting 10s for Meta to process ${type} ${newEntityFacebookId}`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Try syncing with retries
        const maxAttempts = 3;
        let attempt = 0;
        let success = false;
        
        while (attempt < maxAttempts && !success) {
          attempt++;
          console.log(`Auto-sync: attempt ${attempt}/${maxAttempts} for ${type} ${newEntityId}`);
          
          try {
            success = await syncEntityCore({
              type,
              id: newEntityId,
              clientId,
              facebookId: newEntityFacebookId,
            });
            
            if (!success && attempt < maxAttempts) {
              console.log(`Auto-sync: attempt ${attempt} failed, waiting 5s before retry...`);
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          } catch (error) {
            console.error(`Auto-sync: attempt ${attempt} exception:`, error);
            if (attempt < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 5000));
            }
          }
        }
        
        // Remove from syncing state
        removeSyncingItem?.(newEntityId);
        
        // Refresh UI
        await invalidateTreeQueries(clientId);
        
        if (success) {
          toast.success(`${entityLabels[type]} sincronizado com sucesso!`);
        } else {
          toast.warning(`Sincronização automática falhou. Clique em "Sincronizar" manualmente.`);
        }
        
        onSuccess?.();
      }
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
    addSyncingItem?.(id);

    try {
      const entityLabels = {
        campaign: "Campanha",
        adset: "Conjunto de anúncios",
        ad: "Criativo",
      };

      toast.info(`Sincronizando ${entityLabels[type].toLowerCase()}...`);

      const success = await syncEntityCore(params);
      
      if (success) {
        toast.success(`${entityLabels[type]} sincronizado com sucesso!`);
        await invalidateTreeQueries(clientId);
        onSuccess?.();
      } else {
        toast.error("Sincronização falhou. Tente novamente.");
      }
    } catch (err) {
      console.error("Error syncing entity:", err);
      toast.error("Erro ao sincronizar entidade");
    } finally {
      removeSyncingItem?.(id);
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
