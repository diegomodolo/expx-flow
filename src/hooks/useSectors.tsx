import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Sector {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useSectors = () => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchSectors = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sectors")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSectors(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar setores");
    } finally {
      setLoading(false);
    }
  };

  const createSector = async (name: string): Promise<Sector | null> => {
    if (!user) {
      setError("Usuário não autenticado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("sectors")
        .insert([
          {
            name: name.trim(),
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSectors((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
        return data;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar setor");
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
        .from("sectors")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setSectors((prev) =>
          prev.map((sector) => (sector.id === id ? data : sector))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        return data;
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
      const { error } = await supabase.from("sectors").delete().eq("id", id);

      if (error) throw error;

      setSectors((prev) => prev.filter((sector) => sector.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir setor");
      return false;
    }
  };

  useEffect(() => {
    fetchSectors();
  }, [user?.id]);

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