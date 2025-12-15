import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useState } from "react";

export interface Sector {
  id: string;
  name: string;
  description?: string | null;
  company_id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Hook unificado para gerenciar setores/segmentos
 * Usa a tabela lead_segments com segment_type = 'sector'
 * para manter sincronização entre cadastro de clientes e Lead Intelligence Hub
 */
export const useSectors = () => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const companyId = activeCompany?.company_id;

  const { data: sectors = [], isLoading: loading, refetch: fetchSectors } = useQuery({
    queryKey: ['sectors', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from("lead_segments")
        .select("id, name, description, company_id, created_at, updated_at")
        .eq("company_id", companyId)
        .eq("segment_type", "sector")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as Sector[];
    },
    enabled: !!user && !!companyId,
  });

  const createSector = async (name: string): Promise<Sector | null> => {
    if (!user) {
      setError("Usuário não autenticado");
      return null;
    }

    if (!companyId) {
      setError("Nenhuma empresa selecionada");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("lead_segments")
        .insert([
          {
            name: name.trim(),
            company_id: companyId,
            segment_type: "sector",
            is_auto: false,
          },
        ])
        .select("id, name, description, company_id, created_at, updated_at")
        .single();

      if (error) throw error;

      if (data) {
        // Invalida ambas as queries para sincronizar
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
        queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
        return data as Sector;
      }
      return null;
    } catch (err: any) {
      if (err.code === '23505') {
        setError(`O setor "${name.trim()}" já existe nesta empresa`);
      } else {
        setError(err instanceof Error ? err.message : "Erro ao criar setor");
      }
      return null;
    }
  };

  const updateSector = async (id: string, updates: Partial<Sector>): Promise<Sector | null> => {
    if (!user) {
      setError("Usuário não autenticado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("lead_segments")
        .update({ name: updates.name, description: updates.description })
        .eq("id", id)
        .select("id, name, description, company_id, created_at, updated_at")
        .single();

      if (error) throw error;

      if (data) {
        queryClient.invalidateQueries({ queryKey: ['sectors'] });
        queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
        return data as Sector;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar setor");
      return null;
    }
  };

  const deleteSector = async (id: string): Promise<boolean> => {
    if (!user) {
      setError("Usuário não autenticado");
      return false;
    }

    try {
      const { error } = await supabase.from("lead_segments").delete().eq("id", id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['sectors'] });
      queryClient.invalidateQueries({ queryKey: ['lead-segments'] });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir setor");
      return false;
    }
  };

  return {
    sectors,
    loading,
    error,
    fetchSectors,
    createSector,
    updateSector,
    deleteSector,
  };
};
