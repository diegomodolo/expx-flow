import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

interface LeadDisqualificationToken {
  id: string;
  client_id: string;
  company_id: string;
  token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useLeadDisqualificationTokens = (clientId?: string) => {
  const [tokens, setTokens] = useState<LeadDisqualificationToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchTokens = async () => {
    if (!activeCompany?.company_id) return;
    
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('lead_disqualification_tokens')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .eq('is_active', true);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      setTokens(data || []);
    } catch (err) {
      console.error('Error fetching lead disqualification tokens:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar tokens');
      toast({
        title: "Erro",
        description: "Não foi possível carregar os tokens de desqualificação",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const regenerateToken = async (tokenId: string) => {
    try {
      const { data, error } = await supabase
        .from('lead_disqualification_tokens')
        .update({ 
          token: crypto.randomUUID(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Token regenerado com sucesso",
      });

      fetchTokens();
      return data;
    } catch (err) {
      console.error('Error regenerating token:', err);
      toast({
        title: "Erro",
        description: "Não foi possível regenerar o token",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deactivateToken = async (tokenId: string) => {
    try {
      const { error } = await supabase
        .from('lead_disqualification_tokens')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Token desativado com sucesso",
      });

      fetchTokens();
    } catch (err) {
      console.error('Error deactivating token:', err);
      toast({
        title: "Erro",
        description: "Não foi possível desativar o token",
        variant: "destructive",
      });
      throw err;
    }
  };

  const getPublicReportUrl = (token: string) => {
    return `${window.location.origin}/report-lead-desqualificado/${token}`;
  };

  useEffect(() => {
    fetchTokens();
  }, [activeCompany?.company_id, clientId]);

  return {
    tokens,
    loading,
    error,
    fetchTokens,
    regenerateToken,
    deactivateToken,
    getPublicReportUrl
  };
};