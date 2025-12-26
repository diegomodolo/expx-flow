import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CRMContact } from "./useCRMContacts";

export interface CRMDeal {
  id: string;
  workspace_id: string;
  contact_id: string;
  stage_id: string;
  title: string;
  value?: number | null;
  quantity?: number | null;
  status: "open" | "won" | "lost";
  temperature?: "cold" | "warm" | "hot" | null;
  start_date?: string | null;
  expected_close_date?: string | null;
  closed_at?: string | null;
  responsible_id?: string | null;
  notes?: string | null;
  disqualification_reason?: string | null;
  workflow_id?: string | null;
  source_deal_id?: string | null;
  is_archived: boolean;
  archived_at?: string | null;
  custom_fields?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  // Joined data
  contact?: CRMContact;
}

export interface CRMStage {
  id: string;
  board_id: string;
  workspace_id: string;
  name: string;
  color: string;
  order_index: number;
  is_won_stage?: boolean;
  is_lost_stage?: boolean;
  event_mapping?: string | null;
  set_status_on_enter?: string | null;
  set_temperature_on_enter?: string | null;
  workflow_enabled?: boolean;
  workflow_target_stage_id?: string | null;
  workflow_target_board_id?: string | null;
  auto_status_change?: boolean;
  target_status?: string | null;
  auto_temperature_change?: boolean;
  target_temperature?: string | null;
  created_at?: string;
}

export interface CreateDealData {
  workspace_id: string;
  contact_id: string;
  stage_id: string;
  title: string;
  value?: number | null;
  quantity?: number;
  status?: "open" | "won" | "lost";
  temperature?: "cold" | "warm" | "hot" | null;
  expected_close_date?: string | null;
  responsible_id?: string | null;
  notes?: string | null;
}

export interface UpdateDealData extends Partial<CreateDealData> {
  id: string;
}

export interface MoveDealData {
  dealId: string;
  toStageId: string;
  fromStageId?: string;
}

export function useCRMDeals(workspaceId: string | undefined, boardId?: string) {
  const queryClient = useQueryClient();

  // Fetch stages for the board
  const {
    data: stages = [],
    isLoading: isLoadingStages,
  } = useQuery({
    queryKey: ["crm-stages", workspaceId, boardId],
    queryFn: async () => {
      if (!workspaceId) return [];

      let query = supabase
        .from("crm_stages")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("order_index", { ascending: true });

      if (boardId) {
        query = query.eq("board_id", boardId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CRMStage[];
    },
    enabled: !!workspaceId,
  });

  // Fetch all deals for workspace with contact data
  const {
    data: deals = [],
    isLoading: isLoadingDeals,
    error,
    refetch,
  } = useQuery({
    queryKey: ["crm-deals", workspaceId, boardId],
    queryFn: async () => {
      if (!workspaceId) return [];

      // Get stage IDs for this board
      const stageIds = stages.map((s) => s.id);
      if (boardId && stageIds.length === 0) return [];

      let query = supabase
        .from("crm_deals")
        .select(`
          *,
          contact:crm_contacts(*)
        `)
        .eq("workspace_id", workspaceId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (boardId && stageIds.length > 0) {
        query = query.in("stage_id", stageIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CRMDeal[];
    },
    enabled: !!workspaceId && (boardId ? stages.length > 0 : true),
  });

  // Create deal
  const createDealMutation = useMutation({
    mutationFn: async (dealData: CreateDealData) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("crm_deals")
        .insert({
          ...dealData,
          status: dealData.status || "open",
          quantity: dealData.quantity || 1,
          is_archived: false,
          start_date: new Date().toISOString(),
          created_by: userData.user?.id,
        })
        .select(`
          *,
          contact:crm_contacts(*)
        `)
        .single();

      if (error) throw error;

      // Create activity for deal creation
      await supabase.from("crm_deal_activities").insert({
        deal_id: data.id,
        contact_id: dealData.contact_id,
        activity_type: "deal_created",
        notes: `Negócio "${dealData.title}" criado`,
        to_stage_id: dealData.stage_id,
        created_by: userData.user?.id,
      });

      return data as CRMDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals", workspaceId] });
      toast.success("Negócio criado com sucesso");
    },
    onError: (error) => {
      console.error("Error creating deal:", error);
      toast.error("Erro ao criar negócio");
    },
  });

  // Update deal
  const updateDealMutation = useMutation({
    mutationFn: async ({ id, ...updateData }: UpdateDealData) => {
      const { data, error } = await supabase
        .from("crm_deals")
        .update(updateData)
        .eq("id", id)
        .select(`
          *,
          contact:crm_contacts(*)
        `)
        .single();

      if (error) throw error;
      return data as CRMDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals", workspaceId] });
      toast.success("Negócio atualizado com sucesso");
    },
    onError: (error) => {
      console.error("Error updating deal:", error);
      toast.error("Erro ao atualizar negócio");
    },
  });

  // Move deal between stages
  const moveDealMutation = useMutation({
    mutationFn: async ({ dealId, toStageId, fromStageId }: MoveDealData) => {
      const { data: userData } = await supabase.auth.getUser();

      // Get target stage info
      const targetStage = stages.find((s) => s.id === toStageId);

      // Prepare update data
      const updateData: Record<string, unknown> = {
        stage_id: toStageId,
      };

      // Apply stage configurations
      if (targetStage?.set_status_on_enter) {
        updateData.status = targetStage.set_status_on_enter;
      }
      if (targetStage?.set_temperature_on_enter) {
        updateData.temperature = targetStage.set_temperature_on_enter;
      }
      if (targetStage?.is_won_stage) {
        updateData.status = "won";
        updateData.closed_at = new Date().toISOString();
      }
      if (targetStage?.is_lost_stage) {
        updateData.status = "lost";
        updateData.closed_at = new Date().toISOString();
      }

      // Update deal
      const { data, error } = await supabase
        .from("crm_deals")
        .update(updateData)
        .eq("id", dealId)
        .select(`
          *,
          contact:crm_contacts(*)
        `)
        .single();

      if (error) throw error;

      // Create activity for stage change
      await supabase.from("crm_deal_activities").insert({
        deal_id: dealId,
        contact_id: data.contact_id,
        activity_type: "stage_changed",
        notes: `Movido para "${targetStage?.name || "Nova etapa"}"`,
        from_stage_id: fromStageId || null,
        to_stage_id: toStageId,
        created_by: userData.user?.id,
      });

      return data as CRMDeal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals", workspaceId] });
    },
    onError: (error) => {
      console.error("Error moving deal:", error);
      toast.error("Erro ao mover negócio");
    },
  });

  // Archive deal (remove from board)
  const archiveDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("crm_deals")
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
        })
        .eq("id", dealId)
        .select()
        .single();

      if (error) throw error;

      // Create activity
      await supabase.from("crm_deal_activities").insert({
        deal_id: dealId,
        activity_type: "deal_archived",
        notes: "Negócio arquivado",
        created_by: userData.user?.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals", workspaceId] });
      toast.success("Negócio arquivado");
    },
    onError: (error) => {
      console.error("Error archiving deal:", error);
      toast.error("Erro ao arquivar negócio");
    },
  });

  // Restore archived deal
  const restoreDealMutation = useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("crm_deals")
        .update({
          is_archived: false,
          archived_at: null,
          stage_id: stageId,
        })
        .eq("id", dealId)
        .select()
        .single();

      if (error) throw error;

      // Create activity
      await supabase.from("crm_deal_activities").insert({
        deal_id: dealId,
        activity_type: "deal_restored",
        notes: "Negócio restaurado",
        to_stage_id: stageId,
        created_by: userData.user?.id,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals", workspaceId] });
      toast.success("Negócio restaurado");
    },
    onError: (error) => {
      console.error("Error restoring deal:", error);
      toast.error("Erro ao restaurar negócio");
    },
  });

  // Delete deal permanently
  const deleteDealMutation = useMutation({
    mutationFn: async (dealId: string) => {
      const { error } = await supabase.from("crm_deals").delete().eq("id", dealId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-deals", workspaceId] });
      toast.success("Negócio removido permanentemente");
    },
    onError: (error) => {
      console.error("Error deleting deal:", error);
      toast.error("Erro ao remover negócio");
    },
  });

  return {
    deals,
    stages,
    isLoading: isLoadingDeals || isLoadingStages,
    error,
    refetch,
    createDeal: createDealMutation.mutateAsync,
    updateDeal: updateDealMutation.mutateAsync,
    moveDeal: moveDealMutation.mutateAsync,
    archiveDeal: archiveDealMutation.mutateAsync,
    restoreDeal: restoreDealMutation.mutateAsync,
    deleteDeal: deleteDealMutation.mutateAsync,
    isCreating: createDealMutation.isPending,
    isUpdating: updateDealMutation.isPending,
    isMoving: moveDealMutation.isPending,
  };
}
