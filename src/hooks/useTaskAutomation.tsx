import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

interface CreateTaskFromAlertParams {
  alertType: string;
  alertDescription: string;
  relatedCampaignId?: string;
  relatedClientId?: string;
  alertId?: string;
}

export const useTaskAutomation = () => {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTaskFromAlert = useMutation({
    mutationFn: async (params: CreateTaskFromAlertParams) => {
      if (!activeCompany?.company_id) {
        throw new Error('No company selected');
      }

      const { data, error } = await supabase.rpc('create_task_from_alert', {
        _company_id: activeCompany.company_id,
        _alert_type: params.alertType,
        _alert_description: params.alertDescription,
        _related_campaign_id: params.relatedCampaignId || null,
        _related_client_id: params.relatedClientId || null,
        _alert_id: params.alertId || null,
      });

      if (error) {
        console.error('Error creating task from alert:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task-stats'] });
      toast({
        title: "Tarefa criada",
        description: "Tarefa automática criada com base no alerta.",
      });
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa automática.",
        variant: "destructive",
      });
    },
  });

  const convertAlertToTask = (alert: any) => {
    const alertType = alert.type === 'danger' ? 'high_cpa' : 'scale_opportunity';
    
    createTaskFromAlert.mutate({
      alertType,
      alertDescription: alert.description,
      relatedCampaignId: alert.campaign_id,
      relatedClientId: alert.client_id,
      alertId: alert.id,
    });
  };

  return {
    createTaskFromAlert,
    convertAlertToTask,
    isCreating: createTaskFromAlert.isPending,
  };
};