import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from '@/hooks/use-toast';

export type RoutineFrequency = 'daily' | 'weekly' | 'monthly';
export type RoutineCategory = 'saldo' | 'campanhas' | 'performance' | 'criativos' | 'alertas' | 'relatorios' | 'otimizacao' | 'outros';
export type RoutineExecutionStatus = 'pending' | 'completed_on_time' | 'completed_late' | 'skipped';
export type RoutinePriority = 'low' | 'medium' | 'high';

export interface RoutineTemplate {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  frequency: RoutineFrequency;
  category: RoutineCategory;
  default_time: string;
  priority: RoutinePriority;
  day_of_week: number | null;
  day_of_month: number | null;
  sla_minutes: number;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoutineExecution {
  id: string;
  template_id: string;
  company_id: string;
  employee_id: string | null;
  client_id: string | null;
  scheduled_date: string;
  scheduled_time: string;
  due_at: string;
  completed_at: string | null;
  status: RoutineExecutionStatus;
  notes: string | null;
  time_spent_minutes: number | null;
  created_at: string;
  updated_at: string;
  template?: RoutineTemplate;
}

export interface CreateTemplateData {
  title: string;
  description?: string;
  frequency: RoutineFrequency;
  category: RoutineCategory;
  default_time: string;
  priority: RoutinePriority;
  day_of_week?: number;
  day_of_month?: number;
  sla_minutes?: number;
}

// Hook para templates de rotinas
export function useRoutineTemplates() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['routine-templates', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('routine_templates')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('default_time', { ascending: true });
      
      if (error) throw error;
      return data as RoutineTemplate[];
    },
    enabled: !!activeCompany?.company_id,
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: CreateTemplateData) => {
      if (!activeCompany?.company_id) throw new Error('Company not found');
      
      const { data, error } = await supabase
        .from('routine_templates')
        .insert({
          ...templateData,
          company_id: activeCompany.company_id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-templates'] });
      toast({ title: 'Rotina criada com sucesso' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar rotina', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RoutineTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('routine_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-templates'] });
      toast({ title: 'Rotina atualizada' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao atualizar rotina', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('routine_templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-templates'] });
      toast({ title: 'Rotina excluída' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir rotina', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}

// Hook para execuções de rotinas
export function useRoutineExecutions(date?: Date) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];

  const { data: executions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['routine-executions', activeCompany?.company_id, dateStr],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];
      
      const { data, error } = await supabase
        .from('routine_executions')
        .select(`
          *,
          template:routine_templates(*)
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('scheduled_date', dateStr)
        .order('scheduled_time', { ascending: true });
      
      if (error) throw error;
      return data as (RoutineExecution & { template: RoutineTemplate })[];
    },
    enabled: !!activeCompany?.company_id,
  });

  // Criar execuções do dia automaticamente
  const createDailyExecutions = useMutation({
    mutationFn: async () => {
      if (!activeCompany?.company_id) throw new Error('Company not found');
      
      const { data, error } = await supabase
        .rpc('create_daily_routine_executions', {
          p_company_id: activeCompany.company_id,
          p_date: dateStr,
        });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-executions'] });
    },
  });

  // Marcar execução como concluída
  const completeExecution = useMutation({
    mutationFn: async ({ id, notes, timeSpentMinutes }: { 
      id: string; 
      notes?: string; 
      timeSpentMinutes?: number;
    }) => {
      const now = new Date();
      const execution = executions.find(e => e.id === id);
      const dueAt = execution ? new Date(execution.due_at) : now;
      
      const status: RoutineExecutionStatus = now <= dueAt 
        ? 'completed_on_time' 
        : 'completed_late';
      
      const { data, error } = await supabase
        .from('routine_executions')
        .update({
          status,
          completed_at: now.toISOString(),
          notes,
          time_spent_minutes: timeSpentMinutes,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['routine-executions'] });
      const isLate = data.status === 'completed_late';
      toast({ 
        title: isLate ? 'Rotina concluída com atraso' : 'Rotina concluída no prazo',
        variant: isLate ? 'default' : 'default',
      });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao concluir rotina', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Pular execução
  const skipExecution = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('routine_executions')
        .update({
          status: 'skipped',
          notes,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-executions'] });
      toast({ title: 'Rotina pulada' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao pular rotina', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Estatísticas do dia
  const stats = {
    total: executions.length,
    completed: executions.filter(e => e.status === 'completed_on_time' || e.status === 'completed_late').length,
    pending: executions.filter(e => e.status === 'pending').length,
    skipped: executions.filter(e => e.status === 'skipped').length,
    onTime: executions.filter(e => e.status === 'completed_on_time').length,
    late: executions.filter(e => e.status === 'completed_late').length,
    progress: executions.length > 0 
      ? Math.round((executions.filter(e => e.status !== 'pending').length / executions.length) * 100)
      : 0,
  };

  return {
    executions,
    stats,
    isLoading,
    error,
    refetch,
    createDailyExecutions,
    completeExecution,
    skipExecution,
  };
}

// Hook para criar templates padrão do sistema
export function useDefaultRoutineTemplates() {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const createDefaultTemplates = useMutation({
    mutationFn: async () => {
      if (!activeCompany?.company_id) throw new Error('Company not found');

      const defaultTemplates: CreateTemplateData[] = [
        // Rotinas Diárias
        {
          title: 'Conferir saldo de todas as contas',
          description: 'Verificar se todas as contas têm saldo suficiente para o dia',
          frequency: 'daily',
          category: 'saldo',
          default_time: '08:00',
          priority: 'high',
          sla_minutes: 60,
        },
        {
          title: 'Verificar status de campanhas ativas',
          description: 'Checar se todas as campanhas estão rodando normalmente',
          frequency: 'daily',
          category: 'campanhas',
          default_time: '09:00',
          priority: 'high',
          sla_minutes: 60,
        },
        {
          title: 'Analisar alertas críticos',
          description: 'Revisar e resolver alertas de performance e conta',
          frequency: 'daily',
          category: 'alertas',
          default_time: '09:30',
          priority: 'high',
          sla_minutes: 30,
        },
        {
          title: 'Registrar ações realizadas',
          description: 'Documentar todas as otimizações e mudanças do dia',
          frequency: 'daily',
          category: 'outros',
          default_time: '17:00',
          priority: 'medium',
          sla_minutes: 60,
        },
        // Rotinas Semanais
        {
          title: 'Revisão geral de performance',
          description: 'Análise completa de métricas de todos os clientes',
          frequency: 'weekly',
          category: 'performance',
          default_time: '09:00',
          priority: 'high',
          day_of_week: 1, // Segunda-feira
          sla_minutes: 120,
        },
        {
          title: 'Ajuste de orçamentos',
          description: 'Realocar budgets conforme performance semanal',
          frequency: 'weekly',
          category: 'campanhas',
          default_time: '10:00',
          priority: 'medium',
          day_of_week: 2, // Terça-feira
          sla_minutes: 90,
        },
        {
          title: 'Validação de criativos',
          description: 'Revisar performance de criativos e aprovar/reprovar',
          frequency: 'weekly',
          category: 'criativos',
          default_time: '14:00',
          priority: 'medium',
          day_of_week: 3, // Quarta-feira
          sla_minutes: 90,
        },
        {
          title: 'Planejamento da semana seguinte',
          description: 'Definir prioridades e metas para próxima semana',
          frequency: 'weekly',
          category: 'outros',
          default_time: '15:00',
          priority: 'medium',
          day_of_week: 5, // Sexta-feira
          sla_minutes: 60,
        },
      ];

      const { data, error } = await supabase
        .from('routine_templates')
        .insert(defaultTemplates.map(t => ({
          ...t,
          company_id: activeCompany.company_id,
          is_system: true,
        })))
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routine-templates'] });
      toast({ title: 'Templates padrão criados com sucesso' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao criar templates', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  return { createDefaultTemplates };
}
