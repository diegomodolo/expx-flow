import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

interface OrganizedTask {
  taskId: string;
  slotId: string;
  date: string;
  estimatedMinutes: number;
  reason: string;
  taskTitle: string;
  slotName: string;
  slotTime: string;
}

interface OrganizationPlan {
  organizedTasks: OrganizedTask[];
  statistics: {
    totalTasks: number;
    totalEstimatedTime: number;
    averageTaskTime: number;
    daysUsed: number;
  };
  warnings: string[];
}

interface OrganizeTasksParams {
  tasks: any[];
  timeSlots: any[];
  startDate: string;
  daysToOrganize?: number;
  scope?: {
    type: 'all' | 'specific';
    employeeId?: string;
    includePeriod: number;
    includeUnassigned: boolean;
  };
  employees?: any[];
}

export const useTaskOrganizer = () => {
  const [organizationPlan, setOrganizationPlan] = useState<OrganizationPlan | null>(null);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizingStep, setOrganizingStep] = useState(0);
  const [organizingMessage, setOrganizingMessage] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  // Mutation para chamar a Edge Function de organização
  const organizeMutation = useMutation({
    mutationFn: async (params: OrganizeTasksParams) => {
      console.log('🚀 Starting AI organization with params:', params);
      
      // Simular progresso das etapas
      setOrganizingStep(0);
      setOrganizingMessage("Analisando tarefas e contexto...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrganizingStep(1);
      setOrganizingMessage("Avaliando disponibilidade dos colaboradores...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setOrganizingStep(2);
      setOrganizingMessage("Combinando tarefas com slots de tempo...");
      
      const { data, error } = await supabase.functions.invoke('organize-tasks-with-ai', {
        body: params
      });

      if (error) {
        console.error('Error calling organize function:', error);
        throw error;
      }

      setOrganizingStep(3);
      setOrganizingMessage("Otimizando distribuição final...");
      await new Promise(resolve => setTimeout(resolve, 500));

      return data as OrganizationPlan;
    },
    onSuccess: (data) => {
      console.log('✅ Organization plan received:', data);
      setOrganizationPlan(data);
      toast({
        title: "Organização criada",
        description: `${data.organizedTasks.length} tarefas organizadas pela IA.`,
      });
    },
    onError: (error) => {
      console.error('Error organizing tasks:', error);
      toast({
        title: "Erro na organização",
        description: "Não foi possível organizar as tarefas com a IA.",
        variant: "destructive",
      });
    },
  });

  // Mutation para aplicar o plano de organização
  const applyOrganizationMutation = useMutation({
    mutationFn: async (plan: OrganizationPlan) => {
      console.log('📝 Applying organization plan for', plan.organizedTasks.length, 'tasks');
      
      // Aplicar cada tarefa organizada
      const updates = await Promise.all(
        plan.organizedTasks.map(async (organizedTask) => {
          const { taskId, slotId, date, estimatedMinutes } = organizedTask;
          
          // Buscar dados do slot para calcular horários
          const { data: slotData, error: slotError } = await supabase
            .from('planner_time_slots')
            .select('start_time, end_time')
            .eq('id', slotId)
            .single();

          if (slotError) {
            console.error(`Error fetching slot ${slotId}:`, slotError);
            throw slotError;
          }

          // Calcular start_date e due_date baseado no slot
          const startDateTime = new Date(`${date}T${slotData.start_time}`);
          const endDateTime = new Date(startDateTime.getTime() + (estimatedMinutes * 60000)); // Adicionar tempo estimado
          
          // Garantir que não ultrapasse o fim do slot
          const slotEndTime = new Date(`${date}T${slotData.end_time}`);
          const finalEndTime = endDateTime > slotEndTime ? slotEndTime : endDateTime;

          const updates = {
            start_date: startDateTime.toISOString(),
            due_date: finalEndTime.toISOString(),
            deadline: date,
            organized_by_ai: true, // Marcar que foi organizada pela IA
            ai_estimated_minutes: estimatedMinutes
          };

          console.log(`📅 Updating task ${taskId} with:`, updates);

          const { error: updateError } = await supabase
            .from('tasks')
            .update(updates)
            .eq('id', taskId);

          if (updateError) {
            console.error(`Error updating task ${taskId}:`, updateError);
            throw updateError;
          }

          return { taskId, success: true };
        })
      );

      return updates;
    },
    onSuccess: (updates) => {
      console.log('✅ Organization plan applied successfully:', updates);
      
      // Invalidar queries para atualizar a UI
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      
      toast({
        title: "Organização aplicada",
        description: `${updates.length} tarefas foram organizadas com sucesso.`,
      });
      
      // Limpar o plano após aplicar
      setOrganizationPlan(null);
    },
    onError: (error) => {
      console.error('Error applying organization:', error);
      toast({
        title: "Erro ao aplicar organização",
        description: "Não foi possível aplicar a organização das tarefas.",
        variant: "destructive",
      });
    },
  });

  const organizeTasksWithAI = async (params: OrganizeTasksParams) => {
    setIsOrganizing(true);
    try {
      await organizeMutation.mutateAsync(params);
    } finally {
      setIsOrganizing(false);
    }
  };

  const applyOrganization = async () => {
    if (!organizationPlan) return;
    await applyOrganizationMutation.mutateAsync(organizationPlan);
  };

  const cancelOrganization = () => {
    setOrganizationPlan(null);
  };

  return {
    organizationPlan,
    isOrganizing: isOrganizing || organizeMutation.isPending,
    isApplying: applyOrganizationMutation.isPending,
    organizingStep,
    organizingMessage,
    organizeTasksWithAI,
    applyOrganization,
    cancelOrganization,
  };
};