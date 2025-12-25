import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";

export interface SystemAlert {
  id: string;
  company_id: string;
  client_id: string | null;
  alert_type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  details: Record<string, any>;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

export function useSystemAlerts() {
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['system-alerts', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const { data, error } = await supabase
        .from('system_alerts')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching system alerts:', error);
        throw error;
      }

      return data as SystemAlert[];
    },
    enabled: !!activeCompany?.id,
    refetchInterval: 60000, // Refetch every minute
  });

  const unreadCount = alerts.filter(a => !a.is_read).length;
  const unresolvedCriticalCount = alerts.filter(a => !a.is_resolved && a.severity === 'critical').length;

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('system_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao marcar como lido",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsResolvedMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          is_resolved: true, 
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast({
        title: "Alerta resolvido",
        description: "O alerta foi marcado como resolvido.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao resolver alerta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!activeCompany?.id) return;

      const { error } = await supabase
        .from('system_alerts')
        .update({ is_read: true })
        .eq('company_id', activeCompany.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-alerts'] });
      toast({
        title: "Alertas marcados como lidos",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao marcar alertas como lidos",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    alerts,
    isLoading,
    unreadCount,
    unresolvedCriticalCount,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAsResolved: markAsResolvedMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}
