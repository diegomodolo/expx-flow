import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CRMTag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CRMLeadTag {
  id: string;
  lead_id: string;
  tag_id: string;
  created_at: string;
}

export const useCRMTags = (workspaceId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['crm-tags', workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data as CRMTag[];
    },
    enabled: !!workspaceId,
  });

  const createTagMutation = useMutation({
    mutationFn: async (tagData: { name: string; color: string }) => {
      const { data, error } = await supabase
        .from('crm_tags')
        .insert({
          workspace_id: workspaceId,
          name: tagData.name,
          color: tagData.color,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tags', workspaceId] });
      toast({
        title: "Tag criada!",
        description: "A tag foi adicionada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('crm_tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-tags', workspaceId] });
      toast({
        title: "Tag removida!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    tags,
    isLoading,
    createTag: createTagMutation.mutateAsync,
    isCreatingTag: createTagMutation.isPending,
    deleteTag: deleteTagMutation.mutateAsync,
    isDeletingTag: deleteTagMutation.isPending,
  };
};

export const useLeadTags = (leadId: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leadTags = [], isLoading } = useQuery({
    queryKey: ['crm-lead-tags', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_lead_tags')
        .select(`
          *,
          tag:crm_tags(*)
        `)
        .eq('lead_id', leadId);

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  const attachTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { data, error } = await supabase
        .from('crm_lead_tags')
        .insert({
          lead_id: leadId,
          tag_id: tagId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-tags', leadId] });
      toast({
        title: "Tag adicionada!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao adicionar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeTagMutation = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase
        .from('crm_lead_tags')
        .delete()
        .eq('lead_id', leadId)
        .eq('tag_id', tagId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-lead-tags', leadId] });
      toast({
        title: "Tag removida!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    leadTags,
    isLoading,
    attachTag: attachTagMutation.mutateAsync,
    isAttachingTag: attachTagMutation.isPending,
    removeTag: removeTagMutation.mutateAsync,
    isRemovingTag: removeTagMutation.isPending,
  };
};
