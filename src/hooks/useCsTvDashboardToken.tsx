import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export function useCsTvDashboardToken() {
  const { activeCompany } = useCompany();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (activeCompany?.company_id) {
      fetchToken();
    }
  }, [activeCompany?.company_id]);

  const fetchToken = async () => {
    if (!activeCompany?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('cs_tv_dashboard_token')
        .eq('id', activeCompany.company_id)
        .single();

      if (error) throw error;
      setToken((data as any)?.cs_tv_dashboard_token || null);
    } catch (error) {
      console.error('Error fetching CS TV dashboard token:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async (): Promise<string | null> => {
    if (!activeCompany?.company_id) return null;
    
    setGenerating(true);
    try {
      // Generate token using database function
      const { data: tokenData, error: tokenError } = await (supabase
        .rpc as any)('generate_cs_tv_dashboard_token');

      if (tokenError) {
        console.error('Error generating token via RPC:', tokenError);
        throw tokenError;
      }

      const newToken = tokenData as string;

      // Use secure RPC to set the token
      const { error: setError } = await (supabase
        .rpc as any)('set_cs_tv_dashboard_token', {
          p_company_id: activeCompany.company_id,
          p_token: newToken
        });

      if (setError) {
        console.error('Error setting token via RPC:', setError);
        throw setError;
      }

      setToken(newToken);
      toast.success('Token do CS TV gerado com sucesso!');
      return newToken;
    } catch (error) {
      console.error('Error generating CS TV dashboard token:', error);
      toast.error('Erro ao gerar token do CS TV');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const regenerateToken = async (): Promise<string | null> => {
    return generateToken();
  };

  const getPublicUrl = () => {
    if (!token) return null;
    return `${window.location.origin}/cs-tv/${token}`;
  };

  return {
    token,
    loading,
    generating,
    generateToken,
    regenerateToken,
    getPublicUrl,
    refetch: fetchToken
  };
}
