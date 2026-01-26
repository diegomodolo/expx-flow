import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type EntityType = "campaign" | "adset" | "ad";
type Platform = "meta" | "google";

interface UseInlineEditOptions {
  onSuccess?: () => void;
}

export function useInlineEdit(options: UseInlineEditOptions = {}) {
  const { onSuccess } = options;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<string | null>(null);

  const updateStatus = useCallback(
    async (
      type: EntityType,
      id: string,
      clientId: string,
      facebookId: string | undefined,
      newStatus: "active" | "paused",
      platform: Platform
    ) => {
      setLoading(true);
      setCurrentAction(`status-${id}`);

      try {
        if (platform === "meta" && facebookId) {
          // Try Meta API first
          const { data, error } = await supabase.functions.invoke("manage-facebook-campaign", {
            body: {
              action: "toggle",
              client_id: clientId,
              facebook_id: facebookId,
              entity_type: type === "adset" ? "adset" : type === "ad" ? "ad" : "campaign",
              status: newStatus === "active" ? "ACTIVE" : "PAUSED",
            },
          });

          if (error) throw error;

          // Also update local DB
          const table = type === "campaign" ? "campaigns" : type === "adset" ? "ad_sets" : "ads";
          await supabase
            .from(table)
            .update({
              is_active: newStatus === "active",
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          // For Google or fallback, just update local DB
          const table =
            type === "campaign"
              ? platform === "google"
                ? "google_campaigns"
                : "campaigns"
              : type === "adset"
              ? platform === "google"
                ? "google_ad_groups"
                : "ad_sets"
              : platform === "google"
              ? "google_ads"
              : "ads";

          await supabase
            .from(table)
            .update({
              is_active: newStatus === "active",
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }

        toast({
          title: "Status atualizado",
          description: `${type === "campaign" ? "Campanha" : type === "adset" ? "Conjunto" : "Anúncio"} ${
            newStatus === "active" ? "ativado" : "pausado"
          } com sucesso.`,
        });

        onSuccess?.();
      } catch (error: any) {
        console.error("Error updating status:", error);
        toast({
          title: "Erro ao atualizar status",
          description: error.message || "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setCurrentAction(null);
      }
    },
    [toast, onSuccess]
  );

  const updateBudget = useCallback(
    async (
      type: EntityType,
      id: string,
      clientId: string,
      facebookId: string | undefined,
      newBudget: number,
      budgetType: "daily" | "lifetime",
      platform: Platform
    ) => {
      setLoading(true);
      setCurrentAction(`budget-${id}`);

      try {
        if (platform === "meta" && facebookId && (type === "campaign" || type === "adset")) {
          // Try Meta API
          const { error } = await supabase.functions.invoke("manage-facebook-campaign", {
            body: {
              action: "budget",
              client_id: clientId,
              facebook_id: facebookId,
              entity_type: type === "adset" ? "adset" : "campaign",
              budget_type: budgetType,
              budget_amount: newBudget,
            },
          });

          if (error) throw error;
        }

        // Update local DB
        const table =
          type === "campaign"
            ? platform === "google"
              ? "google_campaigns"
              : "campaigns"
            : platform === "google"
            ? "google_ad_groups"
            : "ad_sets";

        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (budgetType === "daily") {
          updateData.daily_budget = newBudget;
        } else {
          updateData.lifetime_budget = newBudget;
        }

        await supabase.from(table).update(updateData).eq("id", id);

        toast({
          title: "Orçamento atualizado",
          description: `Novo orçamento: R$ ${newBudget.toFixed(2)}/${budgetType === "daily" ? "dia" : "total"}`,
        });

        onSuccess?.();
      } catch (error: any) {
        console.error("Error updating budget:", error);
        toast({
          title: "Erro ao atualizar orçamento",
          description: error.message || "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setCurrentAction(null);
      }
    },
    [toast, onSuccess]
  );

  const updateName = useCallback(
    async (
      type: EntityType,
      id: string,
      clientId: string,
      facebookId: string | undefined,
      newName: string,
      platform: Platform
    ) => {
      setLoading(true);
      setCurrentAction(`name-${id}`);

      try {
        if (platform === "meta" && facebookId) {
          const { error } = await supabase.functions.invoke("manage-facebook-campaign", {
            body: {
              action: "rename",
              client_id: clientId,
              facebook_id: facebookId,
              entity_type: type === "adset" ? "adset" : type === "ad" ? "ad" : "campaign",
              new_name: newName,
            },
          });

          if (error) throw error;
        }

        // Update local DB
        const table =
          type === "campaign"
            ? platform === "google"
              ? "google_campaigns"
              : "campaigns"
            : type === "adset"
            ? platform === "google"
              ? "google_ad_groups"
              : "ad_sets"
            : platform === "google"
            ? "google_ads"
            : "ads";

        await supabase
          .from(table)
          .update({
            name: newName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);

        toast({
          title: "Nome atualizado",
          description: `Novo nome: ${newName}`,
        });

        onSuccess?.();
      } catch (error: any) {
        console.error("Error updating name:", error);
        toast({
          title: "Erro ao atualizar nome",
          description: error.message || "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setCurrentAction(null);
      }
    },
    [toast, onSuccess]
  );

  const bulkUpdateStatus = useCallback(
    async (
      nodes: Array<{
        type: EntityType;
        id: string;
        facebookId?: string;
        platform: Platform;
      }>,
      newStatus: "active" | "paused",
      clientId: string
    ) => {
      setLoading(true);
      setCurrentAction("bulk-status");

      try {
        // Group by platform
        const metaNodes = nodes.filter((n) => n.platform === "meta" && n.facebookId);
        const googleNodes = nodes.filter((n) => n.platform === "google");

        // Process Meta nodes in parallel
        if (metaNodes.length > 0) {
          await Promise.all(
            metaNodes.map(async (node) => {
              try {
                await supabase.functions.invoke("manage-facebook-campaign", {
                  body: {
                    action: "toggle",
                    client_id: clientId,
                    facebook_id: node.facebookId,
                    entity_type: node.type === "adset" ? "adset" : node.type === "ad" ? "ad" : "campaign",
                    status: newStatus === "active" ? "ACTIVE" : "PAUSED",
                  },
                });

                // Update local DB
                const table = node.type === "campaign" ? "campaigns" : node.type === "adset" ? "ad_sets" : "ads";
                await supabase
                  .from(table)
                  .update({
                    is_active: newStatus === "active",
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", node.id);
              } catch (error) {
                console.error(`Error updating ${node.type} ${node.id}:`, error);
              }
            })
          );
        }

        // Process Google nodes (local DB only)
        if (googleNodes.length > 0) {
          await Promise.all(
            googleNodes.map(async (node) => {
              const table =
                node.type === "campaign"
                  ? "google_campaigns"
                  : node.type === "adset"
                  ? "google_ad_groups"
                  : "google_ads";

              await supabase
                .from(table)
                .update({
                  is_active: newStatus === "active",
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", node.id);
            })
          );
        }

        toast({
          title: "Status atualizado em massa",
          description: `${nodes.length} ${nodes.length === 1 ? "item" : "itens"} ${
            newStatus === "active" ? "ativado(s)" : "pausado(s)"
          } com sucesso.`,
        });

        onSuccess?.();
      } catch (error: any) {
        console.error("Error in bulk update:", error);
        toast({
          title: "Erro ao atualizar em massa",
          description: error.message || "Alguns itens podem não ter sido atualizados.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setCurrentAction(null);
      }
    },
    [toast, onSuccess]
  );

  return {
    loading,
    currentAction,
    updateStatus,
    updateBudget,
    updateName,
    bulkUpdateStatus,
  };
}
