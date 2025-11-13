import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface AutomationSchedule {
  id: string;
  client_id: string;
  company_id: string;
  is_enabled: boolean;
  executions_per_day: number;
  scheduled_times: string[];
  cron_job_ids: any;
  last_execution_at?: string;
  next_execution_at?: string;
  created_at: string;
  updated_at: string;
}

export const useAutomationSchedule = (clientId?: string) => {
  const [schedule, setSchedule] = useState<AutomationSchedule | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchSchedule = async () => {
    if (!clientId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('automation_schedules')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      setSchedule(data);
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast({
        title: "Erro ao carregar agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOrUpdateSchedule = async (config: {
    is_enabled: boolean;
    executions_per_day: number;
  }) => {
    if (!clientId || !activeCompany) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        'manage-automation-schedule',
        {
          body: {
            client_id: clientId,
            company_id: activeCompany.id,
            is_enabled: config.is_enabled,
            executions_per_day: config.executions_per_day,
          }
        }
      );

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao configurar agendamento');
      }

      setSchedule(data.schedule);

      toast({
        title: config.is_enabled ? "Agendamento ativado" : "Agendamento atualizado",
        description: config.is_enabled 
          ? `Automações executarão ${config.executions_per_day}x por dia`
          : "Configurações atualizadas com sucesso",
      });

      return data.schedule;
    } catch (error: any) {
      console.error('Error creating/updating schedule:', error);
      toast({
        title: "Erro ao configurar agendamento",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (enabled: boolean) => {
    if (!schedule) return;

    return createOrUpdateSchedule({
      is_enabled: enabled,
      executions_per_day: schedule.executions_per_day,
    });
  };

  const deleteSchedule = async () => {
    if (!clientId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.functions.invoke(
        'manage-automation-schedule',
        {
          method: 'DELETE',
          body: { client_id: clientId }
        }
      );

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao deletar agendamento');
      }

      setSchedule(null);

      toast({
        title: "Agendamento removido",
        description: "Automações não serão mais executadas automaticamente",
      });
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: "Erro ao remover agendamento",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && activeCompany) {
      fetchSchedule();
    }
  }, [clientId, activeCompany]);

  return {
    schedule,
    loading,
    fetchSchedule,
    createOrUpdateSchedule,
    toggleSchedule,
    deleteSchedule,
  };
};
