import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampaignAction = 'toggle' | 'rename' | 'budget' | 'duplicate';

interface CampaignActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useCampaignActions(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<CampaignAction | null>(null);

  const executeFacebookAction = async (
    campaignId: string,
    clientId: string,
    action: string,
    payload: Record<string, any>
  ): Promise<CampaignActionResult> => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-facebook-campaign', {
        body: {
          campaignId,
          clientId,
          action,
          ...payload
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data?.error) {
        return { success: false, error: data.error };
      }

      return { success: true, message: data?.message };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Erro desconhecido' };
    }
  };

  const toggleStatus = async (campaignId: string, clientId: string, newStatus: 'active' | 'paused') => {
    setLoading(true);
    setCurrentAction('toggle');

    try {
      const result = await executeFacebookAction(campaignId, clientId, 'toggle', { status: newStatus });

      if (result.success) {
        toast.success(`Campanha ${newStatus === 'active' ? 'ativada' : 'pausada'} com sucesso`);
        onSuccess?.();
      } else {
        // Fallback to local update
        const { error } = await supabase
          .from("campaigns")
          .update({ 
            is_active: newStatus === 'active',
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", campaignId);

        if (error) throw error;
        toast.success(`Status atualizado localmente (Meta não sincronizado)`);
        onSuccess?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar status');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const renameCampaign = async (campaignId: string, clientId: string, newName: string) => {
    setLoading(true);
    setCurrentAction('rename');

    try {
      const result = await executeFacebookAction(campaignId, clientId, 'rename', { name: newName });

      if (result.success) {
        toast.success('Campanha renomeada com sucesso');
      } else {
        // Fallback to local update
        const { error } = await supabase
          .from("campaigns")
          .update({ 
            name: newName,
            updated_at: new Date().toISOString()
          })
          .eq("id", campaignId);

        if (error) throw error;
        toast.success('Nome atualizado localmente (Meta não sincronizado)');
      }
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renomear campanha');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const updateBudget = async (
    campaignId: string, 
    clientId: string, 
    budgetType: 'daily' | 'lifetime',
    amount: number
  ) => {
    setLoading(true);
    setCurrentAction('budget');

    try {
      const result = await executeFacebookAction(campaignId, clientId, 'budget', { 
        budgetType,
        amount: Math.round(amount * 100) // Convert to cents for Meta API
      });

      if (result.success) {
        toast.success('Orçamento atualizado com sucesso');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Erro ao atualizar orçamento no Meta');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar orçamento');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  const duplicateCampaign = async (campaignId: string, clientId: string, newName?: string) => {
    setLoading(true);
    setCurrentAction('duplicate');

    try {
      const result = await executeFacebookAction(campaignId, clientId, 'duplicate', { 
        newName: newName || undefined
      });

      if (result.success) {
        toast.success('Campanha duplicada com sucesso');
        onSuccess?.();
      } else {
        toast.error(result.error || 'Erro ao duplicar campanha no Meta');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao duplicar campanha');
    } finally {
      setLoading(false);
      setCurrentAction(null);
    }
  };

  return {
    loading,
    currentAction,
    toggleStatus,
    renameCampaign,
    updateBudget,
    duplicateCampaign
  };
}
