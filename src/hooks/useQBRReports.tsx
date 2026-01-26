import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface QBRReport {
  id: string;
  clientId: string;
  companyId: string;
  periodStart: string;
  periodEnd: string;
  metricsSnapshot: Record<string, any> | null;
  bestCreatives: string[];
  executiveSummary: string | null;
  actionPlan: string | null;
  status: 'draft' | 'scheduled' | 'presented' | 'archived';
  presentedAt: string | null;
  publicToken: string | null;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  clients?: {
    name: string;
    company: string;
  };
}

interface RawQBRReport {
  id: string;
  client_id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  metrics_snapshot: any;
  best_creatives: string[];
  executive_summary: string | null;
  action_plan: string | null;
  status: string;
  presented_at: string | null;
  public_token: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

function transformQBRReport(raw: RawQBRReport): QBRReport {
  return {
    id: raw.id,
    clientId: raw.client_id,
    companyId: raw.company_id,
    periodStart: raw.period_start,
    periodEnd: raw.period_end,
    metricsSnapshot: raw.metrics_snapshot,
    bestCreatives: raw.best_creatives || [],
    executiveSummary: raw.executive_summary,
    actionPlan: raw.action_plan,
    status: raw.status as QBRReport['status'],
    presentedAt: raw.presented_at,
    publicToken: raw.public_token,
    viewCount: raw.view_count || 0,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    clients: raw.clients,
  };
}

export function useQBRReports(clientId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['qbr-reports', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('qbr_reports')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(transformQBRReport);
    },
    enabled: !!activeCompany?.company_id,
  });

  const createQBR = useMutation({
    mutationFn: async (qbr: {
      clientId: string;
      periodStart: string;
      periodEnd: string;
      metricsSnapshot?: Record<string, any>;
      executiveSummary?: string;
      actionPlan?: string;
    }) => {
      if (!activeCompany?.company_id) throw new Error('No company selected');

      const publicToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('qbr_reports')
        .insert({
          client_id: qbr.clientId,
          company_id: activeCompany.company_id,
          period_start: qbr.periodStart,
          period_end: qbr.periodEnd,
          metrics_snapshot: qbr.metricsSnapshot || null,
          executive_summary: qbr.executiveSummary || null,
          action_plan: qbr.actionPlan || null,
          public_token: publicToken,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbr-reports'] });
      toast.success('QBR criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar QBR');
      console.error(error);
    },
  });

  const updateQBR = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QBRReport> & { id: string }) => {
      const { error } = await supabase
        .from('qbr_reports')
        .update({
          executive_summary: updates.executiveSummary,
          action_plan: updates.actionPlan,
          status: updates.status,
          presented_at: updates.presentedAt,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qbr-reports'] });
      toast.success('QBR atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar QBR');
      console.error(error);
    },
  });

  // Find clients with overdue QBR (> 85 days since last presentation)
  const qbrOverdue = data?.filter(qbr => {
    if (!qbr.presentedAt) return true;
    const daysSince = Math.floor((Date.now() - new Date(qbr.presentedAt).getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 85;
  }) || [];

  return {
    reports: data || [],
    qbrOverdue,
    isLoading,
    error,
    refetch,
    createQBR,
    updateQBR,
  };
}
