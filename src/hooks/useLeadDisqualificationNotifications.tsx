import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";

export const useLeadDisqualificationNotifications = () => {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  const fetchUnviewedCount = async () => {
    if (!activeCompany?.company_id) return;

    try {
      console.log('Fetchando unviewed count para company:', activeCompany.company_id);
      const { data, error } = await supabase
        .from('lead_disqualification_reports')
        .select('id')
        .eq('company_id', activeCompany.company_id)
        .is('viewed_at', null);

      if (error) throw error;

      const count = data?.length || 0;
      console.log('Unviewed count encontrado:', count);
      setUnviewedCount(count);
    } catch (err) {
      console.error('Error fetching unviewed count:', err);
    }
  };

  const markAllAsViewed = async () => {
    if (!activeCompany?.company_id || !user?.id) return;

    try {
      setLoading(true);

      // Primeiro buscar quantos reports precisam ser marcados
      const { data: unviewedReports } = await supabase
        .from('lead_disqualification_reports')
        .select('id')
        .eq('company_id', activeCompany.company_id)
        .is('viewed_at', null);

      if (!unviewedReports || unviewedReports.length === 0) {
        setUnviewedCount(0);
        return;
      }

      const { error } = await supabase
        .from('lead_disqualification_reports')
        .update({
          viewed_at: new Date().toISOString(),
          viewed_by: user.id
        })
        .eq('company_id', activeCompany.company_id)
        .is('viewed_at', null);

      if (error) throw error;

      // Atualizar imediatamente o contador local
      setUnviewedCount(0);
      
      console.log(`Marcados ${unviewedReports.length} reports como visualizados`);
    } catch (err) {
      console.error('Error marking reports as viewed:', err);
      toast({
        title: "Erro",
        description: "Não foi possível marcar os reports como visualizados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnviewedCount();

    // Escutar evento customizado para forçar refresh
    const handleRefresh = () => {
      console.log('Evento customizado recebido, atualizando contador');
      fetchUnviewedCount();
    };

    window.addEventListener('refreshNotificationCount', handleRefresh);

    // Setup realtime subscription
    if (activeCompany?.company_id) {
      const channel = supabase
        .channel('lead-disqualification-notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'lead_disqualification_reports',
            filter: `company_id=eq.${activeCompany.company_id}`
          },
          () => {
            console.log('Novo lead disqualification report recebido');
            fetchUnviewedCount();
            toast({
              title: "Novo lead desqualificado",
              description: "Um novo report de lead desqualificado foi recebido",
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lead_disqualification_reports',
            filter: `company_id=eq.${activeCompany.company_id}`
          },
          (payload) => {
            console.log('Lead disqualification report atualizado:', payload);
            // Só atualizar se não estamos na tela de admin (para evitar loops)
            if (window.location.pathname !== '/leads-desqualificados') {
              fetchUnviewedCount();
            }
          }
        )
        .subscribe();

      return () => {
        window.removeEventListener('refreshNotificationCount', handleRefresh);
        supabase.removeChannel(channel);
      };
    }

    return () => {
      window.removeEventListener('refreshNotificationCount', handleRefresh);
    };
  }, [activeCompany?.company_id]);

  return {
    unviewedCount,
    loading,
    markAllAsViewed,
    fetchUnviewedCount
  };
};