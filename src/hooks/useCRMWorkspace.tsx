import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CRMWorkspace {
  id: string;
  company_id: string;
  client_id: string;
  access_token: string;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
}

export const useCRMWorkspace = (clientId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: workspace, isLoading, error } = useQuery({
    queryKey: ['crm-workspace', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_workspaces')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as CRMWorkspace | null;
    },
    enabled: !!clientId,
  });

  const generateWorkspaceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-crm-workspace', {
        body: { clientId },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create workspace');

      return data.workspace;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workspace', clientId] });
      toast({
        title: "Mini CRM criado!",
        description: "O workspace do CRM foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar CRM",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      if (!workspace) throw new Error('No workspace found');

      const { error } = await supabase
        .from('crm_workspaces')
        .update({ is_active: isActive })
        .eq('id', workspace.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-workspace', clientId] });
      toast({
        title: workspace?.is_active ? "CRM desativado" : "CRM ativado",
        description: "Status atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    workspace,
    isLoading,
    error,
    generateWorkspace: generateWorkspaceMutation.mutateAsync,
    isGenerating: generateWorkspaceMutation.isPending,
    toggleActive: toggleActiveMutation.mutateAsync,
    isTogglingActive: toggleActiveMutation.isPending,
  };
};
