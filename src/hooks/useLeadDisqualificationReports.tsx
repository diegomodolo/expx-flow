import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

export interface LeadDisqualificationReport {
  id: string;
  client_id: string;
  company_id: string;
  token_id: string;
  reporter_name: string;
  lead_received_date: string;
  disqualification_reason: 'fora_perfil' | 'informacoes_incorretas' | 'contato_errado' | 'ligacao_sem_resposta' | 'outro';
  additional_notes?: string;
  evidence_file_url?: string;
  conversation_link?: string;
  created_at: string;
  updated_at: string;
  viewed_at?: string;
  viewed_by?: string;
}

interface ReportsFilters {
  clientId?: string;
  reason?: string;
  startDate?: string;
  endDate?: string;
  viewedStatus?: string;
}

export const useLeadDisqualificationReports = (filters?: ReportsFilters) => {
  const [reports, setReports] = useState<LeadDisqualificationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchReports = async () => {
    if (!activeCompany?.company_id) return;
    
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('lead_disqualification_reports')
        .select('*')
        .eq('company_id', activeCompany.company_id);

      if (filters?.clientId && filters.clientId !== 'all') {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters?.reason && filters.reason !== 'all') {
        query = query.eq('disqualification_reason', filters.reason);
      }

      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters?.viewedStatus && filters.viewedStatus !== 'all') {
        if (filters.viewedStatus === 'viewed') {
          query = query.not('viewed_at', 'is', null);
        } else if (filters.viewedStatus === 'unviewed') {
          query = query.is('viewed_at', null);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setReports((data || []) as LeadDisqualificationReport[]);
    } catch (err) {
      console.error('Error fetching lead disqualification reports:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar reports');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os reports de desqualificação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels = {
      'fora_perfil': 'Fora do perfil',
      'informacoes_incorretas': 'Informações incorretas',
      'contato_errado': 'Contato errado',
      'ligacao_sem_resposta': 'Ligação sem resposta',
      'outro': 'Outro'
    };
    return labels[reason as keyof typeof labels] || reason;
  };

  const exportReports = async (format: 'csv' | 'pdf') => {
    try {
      // Implementar exportação aqui
      toast({
        title: "Sucesso",
        description: `Exportação ${format.toUpperCase()} iniciada`,
      });
    } catch (err) {
      console.error('Error exporting reports:', err);
      toast({
        title: "Erro",
        description: "Não foi possível exportar os reports",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeCompany?.company_id, filters?.clientId, filters?.reason, filters?.startDate, filters?.endDate, filters?.viewedStatus]);

  return {
    reports,
    loading,
    error,
    fetchReports,
    getReasonLabel,
    exportReports
  };
};