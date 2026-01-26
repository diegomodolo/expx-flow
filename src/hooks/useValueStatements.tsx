import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface ValueStatement {
  id: string;
  clientId: string;
  companyId: string;
  periodMonth: number;
  periodYear: number;
  totalInvestment: number;
  totalReturn: number;
  leadsGenerated: number;
  conversions: number;
  bestCampaignId: string | null;
  bestCreativeId: string | null;
  executiveSummary: string | null;
  nextMonthPlan: string | null;
  publicToken: string;
  status: 'draft' | 'sent' | 'viewed' | 'approved';
  sentAt: string | null;
  viewedAt: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  clients?: {
    name: string;
    company: string;
  };
}

interface RawValueStatement {
  id: string;
  client_id: string;
  company_id: string;
  period_month: number;
  period_year: number;
  total_investment: number;
  total_return: number;
  leads_generated: number;
  conversions: number;
  best_campaign_id: string | null;
  best_creative_id: string | null;
  executive_summary: string | null;
  next_month_plan: string | null;
  public_token: string;
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company: string;
  };
}

function transformValueStatement(raw: RawValueStatement): ValueStatement {
  return {
    id: raw.id,
    clientId: raw.client_id,
    companyId: raw.company_id,
    periodMonth: raw.period_month,
    periodYear: raw.period_year,
    totalInvestment: raw.total_investment,
    totalReturn: raw.total_return,
    leadsGenerated: raw.leads_generated,
    conversions: raw.conversions,
    bestCampaignId: raw.best_campaign_id,
    bestCreativeId: raw.best_creative_id,
    executiveSummary: raw.executive_summary,
    nextMonthPlan: raw.next_month_plan,
    publicToken: raw.public_token,
    status: raw.status as ValueStatement['status'],
    sentAt: raw.sent_at,
    viewedAt: raw.viewed_at,
    approvedAt: raw.approved_at,
    approvalNotes: raw.approval_notes,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    clients: raw.clients,
  };
}

export function useValueStatements(clientId?: string) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['value-statements', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      let query = supabase
        .from('value_statements')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(transformValueStatement);
    },
    enabled: !!activeCompany?.company_id,
  });

  const createValueStatement = useMutation({
    mutationFn: async (statement: {
      clientId: string;
      periodMonth: number;
      periodYear: number;
      totalInvestment: number;
      totalReturn: number;
      leadsGenerated?: number;
      conversions?: number;
      executiveSummary?: string;
      nextMonthPlan?: string;
    }) => {
      if (!activeCompany?.company_id) throw new Error('No company selected');

      const publicToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('value_statements')
        .insert({
          client_id: statement.clientId,
          company_id: activeCompany.company_id,
          period_month: statement.periodMonth,
          period_year: statement.periodYear,
          total_investment: statement.totalInvestment,
          total_return: statement.totalReturn,
          leads_generated: statement.leadsGenerated || 0,
          conversions: statement.conversions || 0,
          executive_summary: statement.executiveSummary || null,
          next_month_plan: statement.nextMonthPlan || null,
          public_token: publicToken,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['value-statements'] });
      toast.success('Comprovante de valor criado!');
    },
    onError: (error) => {
      toast.error('Erro ao criar comprovante');
      console.error(error);
    },
  });

  const sendValueStatement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('value_statements')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['value-statements'] });
      toast.success('Comprovante enviado ao cliente!');
    },
    onError: (error) => {
      toast.error('Erro ao enviar comprovante');
      console.error(error);
    },
  });

  // Stats
  const statements = data || [];
  const pendingApproval = statements.filter(s => s.status === 'sent' || s.status === 'viewed');
  const approved = statements.filter(s => s.status === 'approved');
  const approvalRate = statements.length > 0 
    ? Math.round((approved.length / statements.length) * 100) 
    : 0;

  return {
    statements,
    pendingApproval,
    approved,
    approvalRate,
    isLoading,
    error,
    refetch,
    createValueStatement,
    sendValueStatement,
  };
}
