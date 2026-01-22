import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export type ValidationStatus = 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | null;

export interface RadarUrl {
  id: string;
  client_id: string;
  company_id: string;
  url: string;
  domain: string;
  label: string | null;
  is_active: boolean;
  validation_status: ValidationStatus;
  validation_status_code: number | null;
  validation_load_time_ms: number | null;
  validation_final_url: string | null;
  validation_error: string | null;
  last_validated_at: string | null;
  campaign_count: number | null;
  first_seen_at: string | null;
  last_seen_at: string | null;
  created_at: string;
  client_name: string;
  client_is_canceled: boolean;
}

export interface UrlFilters {
  clientId?: string;
  status?: ValidationStatus | 'all';
  onlyActive?: boolean;
  onlyProblematic?: boolean;
}

export interface UrlStats {
  total: number;
  ok: number;
  error: number;
  timeout: number;
  redirect: number;
  pending: number;
  slow: number;
}

export function useRadarUrls(filters: UrlFilters = {}) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: urls = [], isLoading, refetch } = useQuery({
    queryKey: ['radar-urls', companyId, filters],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('client_urls')
        .select(`
          *,
          clients!inner(id, name, is_canceled)
        `)
        .eq('company_id', companyId)
        .eq('clients.is_canceled', false);

      if (filters.onlyActive !== false) {
        query = query.eq('is_active', true);
      }

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters.status && filters.status !== 'all') {
        if (filters.status === 'pending') {
          query = query.or('validation_status.is.null,validation_status.eq.pending');
        } else {
          query = query.eq('validation_status', filters.status);
        }
      }

      if (filters.onlyProblematic) {
        query = query.in('validation_status', ['error', 'timeout']);
      }

      const { data, error } = await query.order('last_validated_at', { ascending: false, nullsFirst: true });

      if (error) throw error;

      return (data || []).map((url: any) => ({
        ...url,
        client_name: url.clients?.name || 'Unknown',
        client_is_canceled: url.clients?.is_canceled || false,
      })) as RadarUrl[];
    },
    enabled: !!companyId,
    staleTime: 30000,
  });

  // Calculate stats
  const stats: UrlStats = {
    total: urls.length,
    ok: urls.filter(u => u.validation_status === 'ok').length,
    error: urls.filter(u => u.validation_status === 'error').length,
    timeout: urls.filter(u => u.validation_status === 'timeout').length,
    redirect: urls.filter(u => u.validation_status === 'redirect').length,
    pending: urls.filter(u => !u.validation_status || u.validation_status === 'pending').length,
    slow: urls.filter(u => u.validation_load_time_ms && u.validation_load_time_ms > 3000).length,
  };

  // Get problematic URLs (error or timeout)
  const problematicUrls = urls.filter(u => 
    u.validation_status === 'error' || u.validation_status === 'timeout'
  );

  // Get slow URLs (> 3s response time)
  const slowUrls = urls.filter(u => 
    u.validation_load_time_ms && u.validation_load_time_ms > 3000
  );

  // Get redirect URLs
  const redirectUrls = urls.filter(u => u.validation_status === 'redirect');

  // Validate single URL
  const validateUrlMutation = useMutation({
    mutationFn: async (urlId: string) => {
      const { data, error } = await supabase.functions.invoke('validate-client-urls', {
        body: { url_ids: [urlId] }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      toast.success('URL validada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao validar URL: ${error.message}`);
    }
  });

  // Validate all URLs
  const validateAllMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('validate-client-urls', {
        body: { company_id: companyId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      toast.success(`Validação iniciada para ${data?.total || 'todas as'} URLs`);
    },
    onError: (error) => {
      toast.error(`Erro ao validar URLs: ${error.message}`);
    }
  });

  // Validate problematic URLs only
  const validateProblematicMutation = useMutation({
    mutationFn: async () => {
      const problematicIds = problematicUrls.map(u => u.id);
      if (problematicIds.length === 0) {
        throw new Error('Nenhuma URL problemática encontrada');
      }
      const { data, error } = await supabase.functions.invoke('validate-client-urls', {
        body: { url_ids: problematicIds }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      toast.success(`Revalidando ${data?.total || problematicUrls.length} URLs problemáticas`);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  return {
    urls,
    stats,
    problematicUrls,
    slowUrls,
    redirectUrls,
    isLoading,
    refetch,
    validateUrl: validateUrlMutation.mutate,
    validateAll: validateAllMutation.mutate,
    validateProblematic: validateProblematicMutation.mutate,
    isValidating: validateUrlMutation.isPending || validateAllMutation.isPending || validateProblematicMutation.isPending,
  };
}
