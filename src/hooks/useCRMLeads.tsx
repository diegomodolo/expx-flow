import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CRMLead {
  id: string;
  workspace_id: string;
  stage_id: string;
  
  // Dados básicos
  full_name: string;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  
  // Redes sociais e web
  facebook: string | null;
  instagram: string | null;
  website: string | null;
  
  // Localização
  city: string | null;
  state: string | null;
  
  // UTM (rastreamento)
  utm_source: string | null;
  utm_media: string | null;
  utm_campaign: string | null;
  
  // Lead scoring
  temperature: 'cold' | 'warm' | 'hot' | null;
  
  // Gestão de vendas
  start_date: string | null;
  expected_close_date: string | null;
  quantity: number;
  value: number | null;
  
  // Responsabilidade
  responsible_id: string | null;
  
  // Workflow
  workflow_id: string | null;
  
  // Metadados originais
  notes: string | null;
  status: 'open' | 'qualified' | 'unqualified' | 'won' | 'lost';
  disqualification_reason: string | null;
  external_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CRMStage {
  id: string;
  workspace_id: string;
  board_id: string;
  name: string;
  event_mapping: string | null;
  order_index: number;
  color: string;
  auto_status_change: boolean;
  target_status: string | null;
  workflow_enabled?: boolean;
  workflow_target_board_id?: string | null;
  workflow_target_stage_id?: string | null;
  created_at: string;
}

export const useCRMLeads = (workspaceId: string, boardId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [movingLeadIds, setMovingLeadIds] = useState<Set<string>>(new Set());

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['crm-leads', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CRMLead[];
    },
    enabled: !!workspaceId,
  });

  const { data: stages = [], isLoading: isLoadingStages } = useQuery({
    queryKey: ['crm-stages', workspaceId, boardId],
    queryFn: async () => {
      let query = supabase
        .from('crm_stages')
        .select('*')
        .eq('workspace_id', workspaceId);
      
      // Só filtra por board se boardId for fornecido
      if (boardId) {
        query = query.eq('board_id', boardId);
      }
      
      const { data, error } = await query.order('order_index', { ascending: true });

      if (error) throw error;
      return data as CRMStage[];
    },
    enabled: !!workspaceId,
  });

  const createLeadMutation = useMutation({
    mutationFn: async (leadData: Partial<CRMLead>) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .insert({
          workspace_id: workspaceId,
          stage_id: leadData.stage_id!,
          full_name: leadData.full_name!,
          email: leadData.email || null,
          phone: leadData.phone || null,
          company_name: leadData.company_name || null,
          notes: leadData.notes || null,
          value: leadData.value || null,
          external_id: `crm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      // Registrar atividade de criação
      await supabase.from('crm_lead_activities').insert({
        lead_id: data.id,
        activity_type: 'created',
        notes: 'Lead criado no sistema',
        is_manual: false,
      });

      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      toast({
        title: "Lead criado!",
        description: "O lead foi adicionado ao CRM.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const moveLeadMutation = useMutation({
    mutationFn: async ({ 
      leadId, 
      toStageId, 
      fromStageId, 
      workspaceToken 
    }: { 
      leadId: string; 
      toStageId: string; 
      fromStageId: string;
      workspaceToken: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('move-crm-lead', {
        body: { leadId, toStageId, fromStageId, workspaceToken },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to move lead');

      return data;
    },
    onMutate: async ({ leadId, toStageId }) => {
      // Marcar como "em movimento"
      setMovingLeadIds(prev => new Set(prev).add(leadId));
      
      // Cancelar queries em andamento para evitar race conditions
      await queryClient.cancelQueries({ queryKey: ['crm-leads', workspaceId] });
      
      // Snapshot do estado atual para rollback
      const previousLeads = queryClient.getQueryData<CRMLead[]>(['crm-leads', workspaceId]);
      
      // Atualizar cache IMEDIATAMENTE (UI atualiza instantaneamente)
      queryClient.setQueryData<CRMLead[]>(
        ['crm-leads', workspaceId],
        (old) => {
          if (!old) return old;
          return old.map(lead => 
            lead.id === leadId 
              ? { ...lead, stage_id: toStageId, updated_at: new Date().toISOString() }
              : lead
          );
        }
      );
      
      return { previousLeads, leadId };
    },
    onSuccess: (data, variables) => {
      // Remover marcador de "em movimento"
      setMovingLeadIds(prev => {
        const next = new Set(prev);
        next.delete(variables.leadId);
        return next;
      });
      
      // Refetch em background para sincronizar com servidor
      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-links'] });
      
      if (data.eventSent) {
        toast({
          title: "Lead movido e evento enviado!",
          description: `Evento ${data.eventName} enviado ao Meta automaticamente.`,
        });
      } else {
        toast({
          title: "Lead movido!",
          description: `Movido para ${data.stageName}.`,
        });
      }
    },
    onError: (error: Error, variables, context) => {
      // Remover marcador de "em movimento"
      setMovingLeadIds(prev => {
        const next = new Set(prev);
        next.delete(variables.leadId);
        return next;
      });
      
      // Restaurar estado anterior (rollback)
      if (context?.previousLeads) {
        queryClient.setQueryData(['crm-leads', workspaceId], context.previousLeads);
      }
      
      toast({
        title: "Erro ao mover lead",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Garantir sincronização ao final
      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-activities'] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-links'] });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, updates, originalLead }: { leadId: string; updates: Partial<CRMLead>; originalLead?: CRMLead }) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return { data, updates, originalLead };
    },
    onSuccess: async ({ data, updates, originalLead }) => {
      // Registrar atividades baseadas nas mudanças
      const activities = [];

      if (originalLead && updates.status && updates.status !== originalLead.status) {
        activities.push({
          lead_id: data.id,
          activity_type: 'status_change',
          notes: `Status alterado de ${originalLead.status} para ${updates.status}`,
          is_manual: false,
        });
      }

      if (originalLead && updates.temperature && updates.temperature !== originalLead.temperature) {
        activities.push({
          lead_id: data.id,
          activity_type: 'temperature_change',
          notes: `Temperatura alterada de ${originalLead.temperature || 'não definida'} para ${updates.temperature}`,
          is_manual: false,
        });
      }

      // Se houver outras mudanças significativas (não status/temperatura), registrar como updated
      const significantChanges = Object.keys(updates).filter(
        key => key !== 'status' && key !== 'temperature' && key !== 'updated_at'
      );

      if (significantChanges.length > 0 && (!originalLead || activities.length === 0)) {
        activities.push({
          lead_id: data.id,
          activity_type: 'updated',
          notes: `Lead atualizado: ${significantChanges.join(', ')}`,
          is_manual: false,
        });
      }

      // Inserir todas as atividades
      if (activities.length > 0) {
        await supabase.from('crm_lead_activities').insert(activities);
      }

      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-activities'] });
      toast({
        title: "Lead atualizado!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromBoardMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .update({ is_archived: true })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await supabase.from('crm_lead_activities').insert({
        lead_id: data.id,
        activity_type: 'archived',
        notes: 'Lead removido do quadro',
        is_manual: false,
      });

      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-activities'] });
      toast({
        title: "Lead removido do quadro!",
        description: "O lead foi arquivado mas continua disponível na lista.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreToBoardMutation = useMutation({
    mutationFn: async (leadId: string) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .update({ is_archived: false })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      await supabase.from('crm_lead_activities').insert({
        lead_id: data.id,
        activity_type: 'restored',
        notes: 'Lead restaurado ao quadro',
        is_manual: false,
      });

      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['crm-lead-activities'] });
      toast({
        title: "Lead restaurado!",
        description: "O lead foi adicionado de volta ao quadro.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao restaurar lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    leads,
    stages,
    isLoading: isLoadingLeads || isLoadingStages,
    createLead: createLeadMutation.mutateAsync,
    isCreatingLead: createLeadMutation.isPending,
    moveLead: moveLeadMutation.mutateAsync,
    isMovingLead: moveLeadMutation.isPending,
    movingLeadIds,
    updateLead: updateLeadMutation.mutateAsync,
    isUpdatingLead: updateLeadMutation.isPending,
    removeFromBoard: removeFromBoardMutation.mutateAsync,
    isRemovingFromBoard: removeFromBoardMutation.isPending,
    restoreToBoard: restoreToBoardMutation.mutateAsync,
    isRestoringToBoard: restoreToBoardMutation.isPending,
  };
};
