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
  average_ticket?: number; // Ticket médio do produto para cálculo de ROI
  impressions?: number;
  reach?: number;
  frequency?: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  objective?: string; // Tipo/objetivo da campanha
  created_at?: string;
  updated_at?: string;
  clicks?: number;
  client?: {
    name: string;
    avatar: string;
  };
}

export function useCampaigns(clientId?: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchCampaigns = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Construir query base
      let query = supabase
        .from("campaigns")
        .select(`
          *,
          client:clients(name, avatar)
        `);
      
      // Aplicar filtro de cliente se fornecido
      if (clientId) {
        query = query.eq("client_id", clientId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

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
      // First, get the campaign to find the client_id
      const campaign = campaigns.find(c => c.id === id);
      if (!campaign) {
        throw new Error("Campanha não encontrada");
      }

      // Try to update via Facebook API first
      try {
        const { data: result, error: functionError } = await supabase.functions.invoke('manage-facebook-campaign', {
          body: {
            campaignId: id,
            status: isActive ? "active" : "paused",
            clientId: campaign.client_id
          }
        });

        if (functionError) {
          console.warn('Facebook API update failed, falling back to local update:', functionError);
          throw functionError;
        }

        if (result?.error) {
          console.warn('Facebook API returned error, falling back to local update:', result.error);
          throw new Error(result.error);
        }

        // Facebook update successful, refresh campaigns to get latest data
        await fetchCampaigns();
        return;

      } catch (facebookError) {
        console.warn('Facebook API update failed, falling back to local update:', facebookError);
        
        // Fallback to local update only
        const { error } = await supabase
          .from("campaigns")
          .update({ 
            is_active: isActive,
            status: isActive ? "active" : "paused"
          })
          .eq("id", id);

        if (error) throw error;
        await fetchCampaigns(); // Refresh the list
      }

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
  }, [user, clientId]);

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