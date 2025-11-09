import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CRMLeadActivity {
  id: string;
  lead_id: string;
  activity_type: 
    | 'created' 
    | 'stage_change' 
    | 'status_change' 
    | 'manual_note' 
    | 'updated' 
    | 'temperature_change'
    | 'workflow_duplicate'
    | 'workflow_created'
    | 'won' 
    | 'lost' 
    | 'unqualified';
  from_stage_id: string | null;
  to_stage_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  is_manual: boolean;
  event_sent: boolean | null;
  conversion_id: string | null;
  
  // Joined data
  user_name?: string;
  user_avatar?: string;
  from_stage_name?: string;
  to_stage_name?: string;
}

export const useCRMLeadActivities = (leadId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['crm-lead-activities', leadId],
    queryFn: async () => {
      // Buscar atividades
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('crm_lead_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (activitiesError) throw activitiesError;

      // Buscar stages para mapear nomes
      const stageIds = new Set<string>();
      activitiesData.forEach(activity => {
        if (activity.from_stage_id) stageIds.add(activity.from_stage_id);
        if (activity.to_stage_id) stageIds.add(activity.to_stage_id);
      });

      let stagesMap: Record<string, string> = {};
      if (stageIds.size > 0) {
        const { data: stagesData } = await supabase
          .from('crm_stages')
          .select('id, name')
          .in('id', Array.from(stageIds));

        if (stagesData) {
          stagesMap = stagesData.reduce((acc, stage) => {
            acc[stage.id] = stage.name;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // Buscar usuários para mapear nomes (do CRM Users)
      const userIds = new Set<string>();
      activitiesData.forEach(activity => {
        if (activity.created_by) userIds.add(activity.created_by);
      });

      let usersMap: Record<string, { name: string; avatar?: string }> = {};
      if (userIds.size > 0) {
        const { data: usersData } = await supabase
          .from('crm_users')
          .select('id, full_name')
          .in('id', Array.from(userIds));

        if (usersData) {
          usersMap = usersData.reduce((acc, user) => {
            acc[user.id] = { name: user.full_name };
            return acc;
          }, {} as Record<string, { name: string }>);
        }
      }

      // Mapear dados
      return activitiesData.map(activity => ({
        ...activity,
        user_name: activity.created_by ? usersMap[activity.created_by]?.name : null,
        user_avatar: activity.created_by ? usersMap[activity.created_by]?.avatar : null,
        from_stage_name: activity.from_stage_id ? stagesMap[activity.from_stage_id] : null,
        to_stage_name: activity.to_stage_id ? stagesMap[activity.to_stage_id] : null,
      })) as CRMLeadActivity[];
    },
    enabled: !!leadId,
  });

  const addManualActivityMutation = useMutation({
    mutationFn: async ({ leadId, notes }: { leadId: string; notes: string }) => {
      if (!notes.trim()) {
        throw new Error('A nota não pode estar vazia');
      }

      if (notes.length > 1000) {
        throw new Error('A nota não pode ter mais de 1000 caracteres');
      }

      const { data, error } = await supabase
        .from('crm_lead_activities')
        .insert({
          lead_id: leadId,
          activity_type: 'manual_note',
          notes: notes.trim(),
          is_manual: true,
          created_by: null, // Will be set by RLS if authenticated
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-activities', leadId] });
      toast({
        title: "Nota adicionada!",
        description: "A nota foi registrada no histórico.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    activities,
    isLoading,
    addManualActivity: addManualActivityMutation.mutateAsync,
    isAddingActivity: addManualActivityMutation.isPending,
  };
};