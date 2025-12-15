import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface NotificationTrigger {
  id: string;
  company_id: string;
  trigger_type: string;
  trigger_name: string;
  description: string | null;
  is_active: boolean;
  conditions: Record<string, any>;
  created_at: string;
  updated_at: string;
  schedule?: TriggerSchedule;
  templates?: MessageTemplate[];
}

export interface TriggerSchedule {
  id: string;
  trigger_id: string;
  frequency_type: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  times_per_day: number;
  execution_hours: number[];
  days_of_week: number[];
  day_of_month: number | null;
  preferred_time: string;
  respect_quiet_hours: boolean;
  last_executed_at: string | null;
  next_execution_at: string | null;
}

export interface MessageTemplate {
  id: string;
  trigger_id: string;
  recipient_profile: 'gestor' | 'cliente';
  message_template: string;
  is_active: boolean;
}

export interface ClientContact {
  id: string;
  company_id: string;
  client_id: string;
  contact_name: string;
  phone: string;
  email: string | null;
  is_active: boolean;
  created_at: string;
  client?: {
    id: string;
    name: string;
    company: string;
  };
}

export interface ExecutionLog {
  id: string;
  company_id: string;
  trigger_id: string | null;
  schedule_id: string | null;
  execution_window: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  messages_sent: number;
  messages_failed: number;
  execution_details: Record<string, any>;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  trigger?: NotificationTrigger;
}

export const TRIGGER_TYPES = [
  { value: 'high_cpa', label: 'CPA Alto', icon: '⚠️', description: 'Alerta quando CPA está acima do limite' },
  { value: 'low_balance', label: 'Saldo Baixo', icon: '💰', description: 'Alerta quando saldo está baixo' },
  { value: 'disabled_account', label: 'Conta Desabilitada', icon: '🚨', description: 'Alerta quando conta é desabilitada' },
  { value: 'presentation_summary', label: 'Resumo de Apresentação', icon: '📊', description: 'Resumo após reunião de apresentação' },
  { value: 'post_published', label: 'Post Publicado', icon: '✅', description: 'Notificação quando post é publicado' },
  { value: 'post_failed', label: 'Falha na Publicação', icon: '❌', description: 'Alerta quando publicação falha' },
  { value: 'weekly_report', label: 'Relatório Semanal', icon: '📅', description: 'Relatório semanal de performance' },
  { value: 'monthly_report', label: 'Relatório Mensal', icon: '📆', description: 'Relatório mensal consolidado' },
  { value: 'custom', label: 'Personalizado', icon: '⚙️', description: 'Gatilho customizado' },
];

// Grouped template variables for better organization
export const TEMPLATE_VARIABLE_GROUPS = [
  {
    name: 'Identificação',
    icon: '👤',
    variables: [
      { variable: '{cliente}', description: 'Nome do cliente' },
      { variable: '{empresa}', description: 'Nome da empresa' },
      { variable: '{gestor}', description: 'Nome do gestor' },
    ],
  },
  {
    name: 'Métricas de Performance',
    icon: '📊',
    variables: [
      { variable: '{investimento}', description: 'Total investido no período (R$)' },
      { variable: '{impressoes}', description: 'Total de impressões' },
      { variable: '{cliques}', description: 'Total de cliques' },
      { variable: '{alcance}', description: 'Pessoas alcançadas' },
      { variable: '{conversoes}', description: 'Total de conversões/leads' },
      { variable: '{frequencia}', description: 'Frequência média' },
    ],
  },
  {
    name: 'Indicadores de Custo',
    icon: '💰',
    variables: [
      { variable: '{cpm}', description: 'Custo por mil impressões (R$)' },
      { variable: '{cpc}', description: 'Custo por clique (R$)' },
      { variable: '{cpa_atual}', description: 'Custo por aquisição atual (R$)' },
      { variable: '{ctr}', description: 'Taxa de cliques (%)' },
    ],
  },
  {
    name: 'Comparações',
    icon: '📈',
    variables: [
      { variable: '{variacao_investimento}', description: 'Variação % do investimento vs período anterior' },
      { variable: '{variacao_conversoes}', description: 'Variação % das conversões' },
      { variable: '{variacao_ctr}', description: 'Variação % do CTR' },
      { variable: '{variacao_alcance}', description: 'Variação % do alcance' },
      { variable: '{variacao_cpa}', description: 'Variação % do CPA' },
    ],
  },
  {
    name: 'Saldo e Conta',
    icon: '🏦',
    variables: [
      { variable: '{saldo}', description: 'Saldo disponível na conta (R$)' },
      { variable: '{gasto_diario}', description: 'Gasto médio diário (R$)' },
      { variable: '{dias_restantes}', description: 'Dias de saldo restante' },
    ],
  },
  {
    name: 'Período e Data',
    icon: '📅',
    variables: [
      { variable: '{data}', description: 'Data atual' },
      { variable: '{hora}', description: 'Hora atual' },
      { variable: '{periodo_inicio}', description: 'Data de início do período' },
      { variable: '{periodo_fim}', description: 'Data de fim do período' },
    ],
  },
  {
    name: 'Campanhas',
    icon: '🎯',
    variables: [
      { variable: '{campanha}', description: 'Nome da campanha' },
      { variable: '{campanhas_ativas}', description: 'Número de campanhas ativas' },
      { variable: '{melhor_campanha}', description: 'Campanha com mais conversões' },
    ],
  },
  {
    name: 'Links',
    icon: '🔗',
    variables: [
      { variable: '{link_dashboard}', description: 'Link do dashboard público do cliente' },
    ],
  },
];

// Flat array for backwards compatibility
export const TEMPLATE_VARIABLES = TEMPLATE_VARIABLE_GROUPS.flatMap(g => g.variables);

// Calculate next execution time based on schedule
function calculateNextExecutionTime(schedule: {
  frequency_type: string;
  execution_hours: number[];
  days_of_week: number[];
  day_of_month: number | null;
}): Date {
  const now = new Date();
  const next = new Date(now);
  
  switch (schedule.frequency_type) {
    case 'realtime':
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
      
    case 'hourly':
      next.setHours(next.getHours() + 1);
      next.setMinutes(0, 0, 0);
      break;
      
    case 'daily': {
      const currentHour = now.getHours();
      const hours = schedule.execution_hours || [9];
      const nextHour = hours.find(h => h > currentHour);
      
      if (nextHour !== undefined) {
        next.setHours(nextHour, 0, 0, 0);
      } else {
        next.setDate(next.getDate() + 1);
        next.setHours(hours[0] || 9, 0, 0, 0);
      }
      break;
    }
      
    case 'weekly': {
      const currentDay = now.getDay();
      const currentDayHour = now.getHours();
      const execHour = (schedule.execution_hours || [9])[0] || 9;
      const daysOfWeek = schedule.days_of_week || [1, 2, 3, 4, 5];
      
      if (daysOfWeek.includes(currentDay) && currentDayHour < execHour) {
        next.setHours(execHour, 0, 0, 0);
      } else {
        let daysToAdd = 1;
        for (let i = 1; i <= 7; i++) {
          const checkDay = (currentDay + i) % 7;
          if (daysOfWeek.includes(checkDay)) {
            daysToAdd = i;
            break;
          }
        }
        next.setDate(next.getDate() + daysToAdd);
        next.setHours(execHour, 0, 0, 0);
      }
      break;
    }
      
    case 'monthly': {
      const targetDay = schedule.day_of_month || 1;
      const monthExecHour = (schedule.execution_hours || [9])[0] || 9;
      
      if (now.getDate() < targetDay || (now.getDate() === targetDay && now.getHours() < monthExecHour)) {
        next.setDate(targetDay);
        next.setHours(monthExecHour, 0, 0, 0);
      } else {
        next.setMonth(next.getMonth() + 1);
        next.setDate(targetDay);
        next.setHours(monthExecHour, 0, 0, 0);
      }
      break;
    }
  }
  
  return next;
}

export function useWhatsAppNotifications(companyId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch triggers with schedules and templates
  const { data: triggers = [], isLoading: isLoadingTriggers } = useQuery({
    queryKey: ['whatsapp-triggers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data: triggersData, error: triggersError } = await supabase
        .from('whatsapp_notification_triggers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (triggersError) throw triggersError;
      
      // Fetch schedules and templates for each trigger
      const triggersWithDetails = await Promise.all(
        (triggersData || []).map(async (trigger) => {
          const [scheduleRes, templatesRes] = await Promise.all([
            supabase
              .from('whatsapp_trigger_schedules')
              .select('*')
              .eq('trigger_id', trigger.id)
              .single(),
            supabase
              .from('whatsapp_message_templates')
              .select('*')
              .eq('trigger_id', trigger.id),
          ]);
          
          return {
            ...trigger,
            schedule: scheduleRes.data || undefined,
            templates: templatesRes.data || [],
          } as NotificationTrigger;
        })
      );
      
      return triggersWithDetails;
    },
    enabled: !!companyId,
  });

  // Fetch client contacts
  const { data: contacts = [], isLoading: isLoadingContacts } = useQuery({
    queryKey: ['whatsapp-contacts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_client_contacts')
        .select(`
          *,
          client:clients(id, name, company)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientContact[];
    },
    enabled: !!companyId,
  });

  // Fetch execution logs
  const { data: executionLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ['whatsapp-logs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('whatsapp_execution_log')
        .select(`
          *,
          trigger:whatsapp_notification_triggers(id, trigger_name, trigger_type)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as ExecutionLog[];
    },
    enabled: !!companyId,
  });

  // Create trigger mutation
  const createTriggerMutation = useMutation({
    mutationFn: async (data: {
      trigger: Partial<NotificationTrigger>;
      schedule: Partial<TriggerSchedule>;
      templates: { gestor: string; cliente: string };
    }) => {
      if (!companyId) throw new Error('Company ID required');

      // Create trigger
      const { data: trigger, error: triggerError } = await supabase
        .from('whatsapp_notification_triggers')
        .insert({
          company_id: companyId,
          trigger_type: data.trigger.trigger_type,
          trigger_name: data.trigger.trigger_name,
          description: data.trigger.description,
          is_active: data.trigger.is_active ?? true,
          conditions: data.trigger.conditions || {},
        })
        .select()
        .single();

      if (triggerError) throw triggerError;

      // Create schedule with calculated next_execution_at
      const scheduleData = {
        frequency_type: data.schedule.frequency_type || 'daily',
        times_per_day: data.schedule.times_per_day || 1,
        execution_hours: data.schedule.execution_hours || [9],
        days_of_week: data.schedule.days_of_week || [1, 2, 3, 4, 5],
        day_of_month: data.schedule.day_of_month || null,
        preferred_time: data.schedule.preferred_time || '09:00:00',
        respect_quiet_hours: data.schedule.respect_quiet_hours ?? true,
      };
      
      // Calculate next execution time
      const nextExecution = calculateNextExecutionTime(scheduleData as any);
      
      const { error: scheduleError } = await supabase
        .from('whatsapp_trigger_schedules')
        .insert({
          trigger_id: trigger.id,
          ...scheduleData,
          next_execution_at: nextExecution.toISOString(),
        });

      if (scheduleError) throw scheduleError;

      // Create templates
      const templates = [
        { trigger_id: trigger.id, recipient_profile: 'gestor' as const, message_template: data.templates.gestor },
        { trigger_id: trigger.id, recipient_profile: 'cliente' as const, message_template: data.templates.cliente },
      ];

      const { error: templatesError } = await supabase
        .from('whatsapp_message_templates')
        .insert(templates);

      if (templatesError) throw templatesError;

      return trigger;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-triggers'] });
      toast({ title: 'Gatilho criado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar gatilho', description: error.message, variant: 'destructive' });
    },
  });

  // Update trigger mutation
  const updateTriggerMutation = useMutation({
    mutationFn: async (data: {
      triggerId: string;
      trigger: Partial<NotificationTrigger>;
      schedule: Partial<TriggerSchedule>;
      templates: { gestor: string; cliente: string };
    }) => {
      // Update trigger
      const { error: triggerError } = await supabase
        .from('whatsapp_notification_triggers')
        .update({
          trigger_type: data.trigger.trigger_type,
          trigger_name: data.trigger.trigger_name,
          description: data.trigger.description,
          is_active: data.trigger.is_active,
          conditions: data.trigger.conditions,
        })
        .eq('id', data.triggerId);

      if (triggerError) throw triggerError;

      // Update schedule with recalculated next_execution_at
      const scheduleData = {
        frequency_type: data.schedule.frequency_type,
        times_per_day: data.schedule.times_per_day,
        execution_hours: data.schedule.execution_hours,
        days_of_week: data.schedule.days_of_week,
        day_of_month: data.schedule.day_of_month,
        preferred_time: data.schedule.preferred_time,
        respect_quiet_hours: data.schedule.respect_quiet_hours,
      };
      
      // Recalculate next execution time when schedule is updated
      const nextExecution = calculateNextExecutionTime(scheduleData as any);
      
      const { error: scheduleError } = await supabase
        .from('whatsapp_trigger_schedules')
        .update({
          ...scheduleData,
          next_execution_at: nextExecution.toISOString(),
        })
        .eq('trigger_id', data.triggerId);

      if (scheduleError) throw scheduleError;

      // Update templates
      for (const profile of ['gestor', 'cliente'] as const) {
        const { error } = await supabase
          .from('whatsapp_message_templates')
          .update({ message_template: data.templates[profile] })
          .eq('trigger_id', data.triggerId)
          .eq('recipient_profile', profile);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-triggers'] });
      toast({ title: 'Gatilho atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar gatilho', description: error.message, variant: 'destructive' });
    },
  });

  // Delete trigger mutation
  const deleteTriggerMutation = useMutation({
    mutationFn: async (triggerId: string) => {
      const { error } = await supabase
        .from('whatsapp_notification_triggers')
        .delete()
        .eq('id', triggerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-triggers'] });
      toast({ title: 'Gatilho excluído com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir gatilho', description: error.message, variant: 'destructive' });
    },
  });

  // Toggle trigger active
  const toggleTriggerMutation = useMutation({
    mutationFn: async ({ triggerId, isActive }: { triggerId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('whatsapp_notification_triggers')
        .update({ is_active: isActive })
        .eq('id', triggerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-triggers'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar gatilho', description: error.message, variant: 'destructive' });
    },
  });

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (contact: Partial<ClientContact>) => {
      if (!companyId) throw new Error('Company ID required');

      const { data, error } = await supabase
        .from('whatsapp_client_contacts')
        .insert({
          company_id: companyId,
          client_id: contact.client_id,
          contact_name: contact.contact_name,
          phone: contact.phone,
          email: contact.email || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast({ title: 'Contato adicionado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao adicionar contato', description: error.message, variant: 'destructive' });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (contact: Partial<ClientContact> & { id: string }) => {
      const { error } = await supabase
        .from('whatsapp_client_contacts')
        .update({
          contact_name: contact.contact_name,
          phone: contact.phone,
          email: contact.email,
          is_active: contact.is_active,
        })
        .eq('id', contact.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast({ title: 'Contato atualizado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar contato', description: error.message, variant: 'destructive' });
    },
  });

  // Delete contact mutation
  const deleteContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const { error } = await supabase
        .from('whatsapp_client_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-contacts'] });
      toast({ title: 'Contato removido com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover contato', description: error.message, variant: 'destructive' });
    },
  });

  // Get stats
  const stats = {
    totalTriggers: triggers.length,
    activeTriggers: triggers.filter(t => t.is_active).length,
    totalContacts: contacts.length,
    messagesToday: executionLogs.filter(l => 
      new Date(l.created_at).toDateString() === new Date().toDateString()
    ).reduce((acc, l) => acc + l.messages_sent, 0),
    messagesThisWeek: executionLogs.filter(l => {
      const logDate = new Date(l.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    }).reduce((acc, l) => acc + l.messages_sent, 0),
    messagesThisMonth: executionLogs.filter(l => {
      const logDate = new Date(l.created_at);
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return logDate >= monthAgo;
    }).reduce((acc, l) => acc + l.messages_sent, 0),
  };

  return {
    triggers,
    contacts,
    executionLogs,
    stats,
    isLoading: isLoadingTriggers || isLoadingContacts || isLoadingLogs,
    isLoadingTriggers,
    isLoadingContacts,
    isLoadingLogs,
    createTrigger: createTriggerMutation.mutate,
    isCreatingTrigger: createTriggerMutation.isPending,
    updateTrigger: updateTriggerMutation.mutate,
    isUpdatingTrigger: updateTriggerMutation.isPending,
    deleteTrigger: deleteTriggerMutation.mutate,
    isDeletingTrigger: deleteTriggerMutation.isPending,
    toggleTrigger: toggleTriggerMutation.mutate,
    createContact: createContactMutation.mutate,
    isCreatingContact: createContactMutation.isPending,
    updateContact: updateContactMutation.mutate,
    isUpdatingContact: updateContactMutation.isPending,
    deleteContact: deleteContactMutation.mutate,
    isDeletingContact: deleteContactMutation.isPending,
  };
}
