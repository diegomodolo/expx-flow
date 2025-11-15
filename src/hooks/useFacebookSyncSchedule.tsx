import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface SyncOptions {
  period: string;
  campaigns: boolean;
  adsets: boolean;
  ads: boolean;
  includeInactive: boolean;
}

export interface SyncSchedule {
  id: string;
  company_id: string;
  is_enabled: boolean;
  sync_options: SyncOptions;
  scheduled_times: string[];
  executions_per_day: number;
  last_execution_at: string | null;
  next_execution_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionLog {
  id: string;
  company_id: string;
  schedule_id: string | null;
  status: 'running' | 'completed' | 'failed' | 'partial';
  clients_processed: number;
  clients_total: number;
  sync_options: SyncOptions;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  execution_details: any;
}

export const useFacebookSyncSchedule = () => {
  const [schedule, setSchedule] = useState<SyncSchedule | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchSchedule = async () => {
    if (!activeCompany?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-facebook-sync-schedule', {
        body: {
          action: 'get',
          company_id: activeCompany.company_id,
        },
      });

      if (error) throw error;
      setSchedule(data.schedule);
    } catch (error: any) {
      console.error('Error fetching schedule:', error);
      toast({
        title: 'Erro ao carregar configuração',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutionLogs = async () => {
    if (!activeCompany?.company_id) return;

    try {
      setLogsLoading(true);
      const { data, error } = await supabase
        .from('facebook_sync_execution_logs')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Cast com validação de tipo
      const logs = (data || []).map(log => ({
        ...log,
        status: log.status as 'running' | 'completed' | 'failed' | 'partial',
        sync_options: log.sync_options as unknown as SyncOptions,
      }));
      
      setExecutionLogs(logs);
    } catch (error: any) {
      console.error('Error fetching execution logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const saveSchedule = async (
    isEnabled: boolean,
    syncOptions: SyncOptions,
    executionsPerDay: number
  ) => {
    if (!activeCompany?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-facebook-sync-schedule', {
        body: {
          action: 'upsert',
          company_id: activeCompany.company_id,
          is_enabled: isEnabled,
          sync_options: syncOptions,
          executions_per_day: executionsPerDay,
        },
      });

      if (error) throw error;

      setSchedule(data.schedule);
      toast({
        title: 'Configuração salva',
        description: 'As configurações de sincronização foram atualizadas com sucesso.',
      });

      return data.schedule;
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Erro ao salvar configuração',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleSchedule = async (enabled: boolean) => {
    if (!activeCompany?.company_id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-facebook-sync-schedule', {
        body: {
          action: 'patch',
          company_id: activeCompany.company_id,
          is_enabled: enabled,
        },
      });

      if (error) throw error;

      setSchedule(data.schedule);
      toast({
        title: enabled ? 'Sincronização ativada' : 'Sincronização desativada',
        description: enabled 
          ? 'A sincronização automática foi ativada.' 
          : 'A sincronização automática foi desativada.',
      });

      return data.schedule;
    } catch (error: any) {
      console.error('Error toggling schedule:', error);
      toast({
        title: 'Erro ao alterar status',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteSchedule = async () => {
    if (!activeCompany?.company_id) return;

    try {
      setLoading(true);
      const { error } = await supabase.functions.invoke('manage-facebook-sync-schedule', {
        body: {
          action: 'delete',
          company_id: activeCompany.company_id,
        },
      });

      if (error) throw error;

      setSchedule(null);
      toast({
        title: 'Configuração removida',
        description: 'A configuração de sincronização foi removida.',
      });
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Erro ao remover configuração',
        description: error.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      fetchSchedule();
      fetchExecutionLogs();
    }
  }, [activeCompany?.company_id]);

  return {
    schedule,
    executionLogs,
    loading,
    logsLoading,
    fetchSchedule,
    fetchExecutionLogs,
    saveSchedule,
    toggleSchedule,
    deleteSchedule,
  };
};
