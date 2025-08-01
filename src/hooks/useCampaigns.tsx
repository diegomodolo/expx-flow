import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Campaign {
  id: string;
  client_id: string;
  name: string;
  platforms: string;
  status: "active" | "paused" | "finished";
  ctr: number;
  cpc: number;
  conversions: number;
  spend: number; // Custo Total da Campanha
  cpa: number; // Custo por Aquisição/Conversão
  period: string;
  is_active: boolean;
  client?: {
    name: string;
    avatar: string;
  };
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaigns")
        .select(`
          *,
          client:clients(name, avatar)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar campanhas");
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: Omit<Campaign, "id" | "client" | "spend" | "cpa">) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .insert([{
          ...campaignData,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchCampaigns(); // Refresh the list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar campanha");
      return null;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchCampaigns(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar campanha");
    }
  };

  const toggleCampaign = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .update({ 
          is_active: isActive,
          status: isActive ? "active" : "paused"
        })
        .eq("id", id);

      if (error) throw error;
      await fetchCampaigns(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar status da campanha");
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchCampaigns(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar campanha");
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [user]);

  return {
    campaigns,
    loading,
    error,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    toggleCampaign,
    deleteCampaign,
  };
}