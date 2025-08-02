import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  sector: string;
  status: "green" | "yellow" | "red";
  active_campaigns: number;
  avg_cpl: number;
  avatar: string;
  monthly_budget?: number;
  target_audience?: string;
  product_name?: string;
  voice_tone?: string;
  objectives?: string;
  preferred_platforms?: string[];
  campaign_type?: string;
  notes?: string;
  ad_account_id?: string;
  leads_generated: number;
  last_sync_at?: string;
  last_sync_period?: string;
  facebook_ad_accounts?: {
    id: string;
    account_name: string;
    balance: number;
    account_status: number;
    disable_reason?: string;
    has_funding_issues: boolean;
    last_balance_check?: string;
    is_prepaid: boolean;
    funding_source_details?: any;
  };
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();

  const fetchClients = async () => {
    if (!user || !activeCompany) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          facebook_ad_accounts!ad_account_id (
            id,
            account_name,
            balance,
            account_status,
            disable_reason,
            has_funding_issues,
            last_balance_check,
            is_prepaid,
            funding_source_details
          )
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClients(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  };

  const createClient = async (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => {
    if (!user || !activeCompany) return null;

    try {
      const { data, error } = await supabase
        .from("clients")
        .insert([{
          ...clientData,
          user_id: user.id,
          company_id: activeCompany.company_id,
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchClients(); // Refresh the list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente");
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from("clients")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchClients(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente");
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchClients(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar cliente");
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user?.id, activeCompany?.company_id]);

  // Listen for campaign sync updates
  useEffect(() => {
    const handleClientsUpdated = () => {
      fetchClients();
    };

    window.addEventListener('clientsUpdated', handleClientsUpdated);
    return () => window.removeEventListener('clientsUpdated', handleClientsUpdated);
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
  };
}