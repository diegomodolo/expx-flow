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
  created_at: string;
}

export const useCRMLeads = (workspaceId: string, boardId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading: isLoadingLeads } = useQuery({
    queryKey: ['crm-leads', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .eq('workspace_id', workspaceId)
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
    onSuccess: () => {
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
      
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
    onError: (error: Error) => {
      toast({
        title: "Erro ao mover lead",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, updates }: { leadId: string; updates: Partial<CRMLead> }) => {
      const { data, error } = await supabase
        .from('crm_leads')
        .update(updates)
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-leads', workspaceId] });
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

  return {
    leads,
    stages,
    isLoading: isLoadingLeads || isLoadingStages,
    createLead: createLeadMutation.mutateAsync,
    isCreatingLead: createLeadMutation.isPending,
    moveLead: moveLeadMutation.mutateAsync,
    isMovingLead: moveLeadMutation.isPending,
    updateLead: updateLeadMutation.mutateAsync,
    isUpdatingLead: updateLeadMutation.isPending,
  };
};
