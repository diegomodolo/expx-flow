import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface PlannerTimeSlot {
  id: string;
  company_id: string;
  name: string;
  start_time: string;
  end_time: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function usePlannerSlots() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar slots de tempo
  const {
    data: timeSlots = [],
    isLoading: loading,
    error,
    refetch: fetchTimeSlots,
  } = useQuery({
    queryKey: ['planner-time-slots', activeCompany?.company_id],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from("planner_time_slots")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Mutation para criar slot
  const createSlotMutation = useMutation({
    mutationFn: async (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => {
      if (!user || !activeCompany?.company_id) {
        throw new Error('User or company not found');
      }

      const { data, error } = await supabase
        .from("planner_time_slots")
        .insert([{
          ...slotData,
          company_id: activeCompany.company_id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-time-slots'] });
      toast({
        title: "Slot criado",
        description: "Slot de tempo criado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error creating time slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar slot de tempo.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar slot
  const updateSlotMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PlannerTimeSlot> }) => {
      const { error } = await supabase
        .from("planner_time_slots")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-time-slots'] });
      toast({
        title: "Slot atualizado",
        description: "Slot de tempo atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating time slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar slot de tempo.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar slot
  const deleteSlotMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("planner_time_slots")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner-time-slots'] });
      toast({
        title: "Slot removido",
        description: "Slot de tempo removido com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error deleting time slot:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover slot de tempo.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const createTimeSlot = (slotData: Omit<PlannerTimeSlot, "id" | "created_at" | "updated_at">) => {
    return createSlotMutation.mutateAsync(slotData);
  };

  const updateTimeSlot = (id: string, updates: Partial<PlannerTimeSlot>) => {
    return updateSlotMutation.mutateAsync({ id, updates });
  };

  const deleteTimeSlot = (id: string) => {
    return deleteSlotMutation.mutateAsync(id);
  };

  // Função para reordenar slots
  const reorderSlots = async (reorderedSlots: PlannerTimeSlot[]) => {
    try {
      const updates = reorderedSlots.map((slot, index) => ({
        id: slot.id,
        display_order: index + 1,
      }));

      for (const update of updates) {
        await supabase
          .from("planner_time_slots")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
      }

      queryClient.invalidateQueries({ queryKey: ['planner-time-slots'] });
      toast({
        title: "Ordem atualizada",
        description: "Ordem dos slots atualizada com sucesso.",
      });
    } catch (error) {
      console.error('Error reordering slots:', error);
      toast({
        title: "Erro",
        description: "Erro ao reordenar slots.",
        variant: "destructive",
      });
    }
  };

  return {
    timeSlots,
    loading,
    error: error as Error | null,
    fetchTimeSlots,
    createTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    reorderSlots,
  };
}