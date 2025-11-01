import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import type { Node, Edge } from "@xyflow/react";

export interface BlockType {
  id: string;
  name: string;
  display_name: string;
  category: string;
  icon: string | null;
  color: string;
  default_description: string | null;
}

interface FunnelFlowData {
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
}

export interface Funnel {
  id: string;
  company_id: string;
  client_id: string;
  user_id: string;
  name: string;
  description: string | null;
  flow_data: FunnelFlowData;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useFunnels(clientId?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  // Fetch funnels for a client
  const { data: funnels, isLoading: loadingFunnels } = useQuery({
    queryKey: ["funnels", clientId, activeCompany?.company_id],
    queryFn: async () => {
      if (!clientId || !activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from("acquisition_funnels")
        .select("*")
        .eq("client_id", clientId)
        .eq("company_id", activeCompany.company_id)
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(item => ({
        ...item,
        flow_data: item.flow_data as unknown as FunnelFlowData
      })) as Funnel[];
    },
    enabled: !!clientId && !!activeCompany?.company_id,
  });

  // Fetch single funnel by ID
  const fetchFunnelById = async (funnelId: string) => {
    const { data, error } = await supabase
      .from("acquisition_funnels")
      .select("*")
      .eq("id", funnelId)
      .single();

    if (error) throw error;
    return {
      ...data,
      flow_data: data.flow_data as unknown as FunnelFlowData
    } as Funnel;
  };

  // Fetch block types
  const { data: blockTypes, isLoading: loadingBlockTypes } = useQuery({
    queryKey: ["funnel-block-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnel_block_types")
        .select("*")
        .order("category", { ascending: true })
        .order("display_name", { ascending: true });

      if (error) throw error;
      return data as BlockType[];
    },
  });

  // Create funnel
  const createFunnel = useMutation({
    mutationFn: async (data: {
      client_id: string;
      name: string;
      description?: string;
    }) => {
      if (!activeCompany?.company_id) {
        throw new Error("Nenhuma empresa ativa selecionada");
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user) {
        throw new Error("Usuário não autenticado");
      }

      const { data: newFunnel, error } = await supabase
        .from("acquisition_funnels")
        .insert({
          company_id: activeCompany.company_id,
          user_id: session.session.user.id,
          client_id: data.client_id,
          name: data.name,
          description: data.description,
          flow_data: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } as any,
        })
        .select()
        .single();

      if (error) throw error;
      
      return {
        ...newFunnel,
        flow_data: newFunnel.flow_data as unknown as FunnelFlowData
      } as Funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      toast({
        title: "Funil criado com sucesso",
        description: "O funil foi criado e está pronto para ser editado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar funil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update funnel
  const updateFunnel = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      flow_data?: FunnelFlowData;
    }) => {
      const { data: updatedFunnel, error } = await supabase
        .from("acquisition_funnels")
        .update({
          name: data.name,
          description: data.description,
          flow_data: data.flow_data as any,
        })
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return {
        ...updatedFunnel,
        flow_data: updatedFunnel.flow_data as unknown as FunnelFlowData
      } as Funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar funil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete funnel (soft delete)
  const deleteFunnel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("acquisition_funnels")
        .update({ is_active: false })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["funnels"] });
      toast({
        title: "Funil arquivado",
        description: "O funil foi arquivado com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao arquivar funil",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    funnels,
    loadingFunnels,
    blockTypes,
    loadingBlockTypes,
    fetchFunnelById,
    createFunnel: createFunnel.mutate,
    isCreating: createFunnel.isPending,
    updateFunnel: updateFunnel.mutate,
    isUpdating: updateFunnel.isPending,
    deleteFunnel: deleteFunnel.mutate,
    isDeleting: deleteFunnel.isPending,
  };
}
