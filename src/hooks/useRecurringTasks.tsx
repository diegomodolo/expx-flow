import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useToast } from "@/hooks/use-toast";
import { addDays, addWeeks, addMonths, addYears } from "date-fns";

export interface RecurringTaskTemplate {
  id: string;
  company_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high";
  assigned_to: string;
  recurrence_type: "daily" | "weekly" | "monthly" | "yearly";
  recurrence_interval: number;
  days_before_visible: number;
  days_to_complete: number;
  next_generation_date: string;
  last_generated_at: string | null;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  assigned_employee?: {
    id: string;
    name: string;
    avatar?: string;
    user_id: string;
  } | null;
  client?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateRecurringTaskData {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high";
  assigned_to: string;
  client_id?: string | null;
  recurrence_type: "daily" | "weekly" | "monthly" | "yearly";
  recurrence_interval: number;
  days_before_visible: number;
  days_to_complete: number;
}

export function useRecurringTasks(clientId?: string) {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar templates
  const {
    data: templates = [],
    isLoading: loading,
    error,
    refetch: fetchTemplates,
  } = useQuery({
    queryKey: ['recurring-task-templates', activeCompany?.company_id, clientId],
    queryFn: async () => {
      if (!user || !activeCompany?.company_id) return [];

      let query = supabase
        .from("recurring_task_templates")
        .select("*")
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      // Filtrar por cliente se especificado
      if (clientId) {
        query = query.eq("client_id", clientId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Buscar dados dos colaboradores atribuídos
      const assignedIds = [...new Set(data.map(t => t.assigned_to))];
      const { data: employeesData } = await supabase
        .from("employees")
        .select("id, name, avatar, user_id")
        .eq("company_id", activeCompany.company_id)
        .in("user_id", assignedIds);

      // Buscar dados dos clientes
      const clientIds = [...new Set(data.map(t => t.client_id).filter(Boolean))];
      let clientsData: any[] = [];
      if (clientIds.length > 0) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        clientsData = clients || [];
      }

      // Combinar dados
      return data.map(template => ({
        ...template,
        assigned_employee: employeesData?.find(e => e.user_id === template.assigned_to) || null,
        client: template.client_id ? clientsData.find(c => c.id === template.client_id) || null : null,
      })) as RecurringTaskTemplate[];
    },
    enabled: !!user && !!activeCompany?.company_id,
  });

  // Mutation para criar template
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: CreateRecurringTaskData) => {
      if (!user || !activeCompany?.company_id) {
        throw new Error('User or company not found');
      }

      const { data, error } = await supabase
        .from("recurring_task_templates")
        .insert([{
          ...templateData,
          company_id: activeCompany.company_id,
          created_by: user.id,
          next_generation_date: new Date().toISOString().split('T')[0],
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task-templates'] });
      toast({
        title: "Tarefa recorrente criada",
        description: "O template foi criado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error creating recurring task template:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar tarefa recorrente.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("recurring_task_templates")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task-templates'] });
      toast({
        title: "Template atualizado",
        description: "O template foi atualizado com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error updating recurring task template:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar template.",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_task_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-task-templates'] });
      toast({
        title: "Template excluído",
        description: "O template foi excluído com sucesso.",
      });
    },
    onError: (error) => {
      console.error('Error deleting recurring task template:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir template.",
        variant: "destructive",
      });
    },
  });

  // Função para gerar tarefas a partir dos templates
  const generateTasksFromTemplates = async () => {
    if (!user || !activeCompany?.company_id) return;

    const today = new Date().toISOString().split('T')[0];

    // Buscar templates que precisam gerar tarefas
    const { data: templatestoGenerate, error: fetchError } = await supabase
      .from("recurring_task_templates")
      .select("*")
      .eq("company_id", activeCompany.company_id)
      .eq("is_active", true)
      .lte("next_generation_date", today);

    if (fetchError || !templatestoGenerate?.length) return;

    for (const template of templatestoGenerate) {
      // Calcular datas
      const visibilityDate = new Date();
      visibilityDate.setDate(visibilityDate.getDate() - template.days_before_visible);
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.days_to_complete);

      // Criar tarefa
      const { error: taskError } = await supabase
        .from("tasks")
        .insert([{
          title: template.title,
          description: template.description || '',
          priority: template.priority as "low" | "medium" | "high",
          status: 'todo' as const,
          progress: 0,
          origin: 'automation' as const,
          user_id: template.assigned_to,
          assigned_user_id: template.assigned_to,
          company_id: activeCompany.company_id,
          related_client_id: template.client_id,
          recurring_template_id: template.id,
          visibility_date: visibilityDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          responsible_name: '',
          deadline: dueDate.toISOString().split('T')[0],
          team_id: null,
        }]);

      if (taskError) {
        console.error('Error creating task from template:', taskError);
        continue;
      }

      // Calcular próxima data de geração
      let nextDate = new Date(template.next_generation_date);
      switch (template.recurrence_type) {
        case 'daily':
          nextDate = addDays(nextDate, template.recurrence_interval);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, template.recurrence_interval);
          break;
        case 'monthly':
          nextDate = addMonths(nextDate, template.recurrence_interval);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, template.recurrence_interval);
          break;
      }

      // Atualizar template com próxima data
      await supabase
        .from("recurring_task_templates")
        .update({
          next_generation_date: nextDate.toISOString().split('T')[0],
          last_generated_at: new Date().toISOString(),
        })
        .eq("id", template.id);
    }

    // Invalidar queries
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['recurring-task-templates'] });
  };

  // Helper functions
  const createTemplate = (data: CreateRecurringTaskData) => {
    return createTemplateMutation.mutateAsync(data);
  };

  const updateTemplate = (id: string, updates: Partial<Omit<CreateRecurringTaskData, 'priority'> & { is_active: boolean; priority?: "low" | "medium" | "high" }>) => {
    return updateTemplateMutation.mutateAsync({ id, updates });
  };

  const deleteTemplate = (id: string) => {
    return deleteTemplateMutation.mutateAsync(id);
  };

  const toggleTemplateActive = (id: string, isActive: boolean) => {
    return updateTemplateMutation.mutateAsync({ id, updates: { is_active: isActive } });
  };

  return {
    templates,
    loading,
    error: error as Error | null,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateActive,
    generateTasksFromTemplates,
  };
}
