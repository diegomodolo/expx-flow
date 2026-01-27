import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export type ValidationStatus = 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | 'empty' | 'suspicious' | null;

export interface RadarUrl {
  id: string;
  client_id: string;
  company_id: string;
  url: string;
  domain: string;
  source: 'manual' | 'meta_sync' | 'google_sync';
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
  // Campaign status fields
  has_active_campaign?: boolean;
  active_campaign_count?: number;
  total_campaign_count?: number;
  // Content analysis fields
  content_match_score: number | null;
  content_analysis_summary: string | null;
  content_analyzed_at: string | null;
}

export interface UrlFilters {
  clientId?: string;
  status?: ValidationStatus | 'all';
  onlyActive?: boolean;
  onlyProblematic?: boolean;
  onlyActiveCampaigns?: boolean;
  includeManualUrls?: boolean;
}

export interface UrlStats {
  total: number;
  ok: number;
  error: number;
  timeout: number;
  redirect: number;
  pending: number;
  slow: number;
  empty: number;
  suspicious: number;
}

interface CampaignStatusData {
  url_id: string;
  has_active_campaign: boolean;
  active_campaign_count: number;
  total_campaign_count: number;
}

export function useRadarUrls(filters: UrlFilters = {}) {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  // Fetch campaign status data
  const { data: campaignStatusData = [] } = useQuery({
    queryKey: ['radar-urls-campaign-status', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .rpc('get_urls_with_campaign_status', { p_company_id: companyId });
      
      if (error) {
        console.error('Error fetching campaign status:', error);
        return [];
      }
      
      return (data || []) as CampaignStatusData[];
    },
    enabled: !!companyId,
    staleTime: 60000,
  });

  const { data: rawUrls = [], isLoading, refetch } = useQuery({
    queryKey: ['radar-urls', companyId, filters.clientId, filters.status, filters.onlyActive, filters.onlyProblematic],
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

  // Merge URLs with campaign status data
  const urlsWithCampaignStatus = rawUrls.map(url => {
    const campaignStatus = campaignStatusData.find(cs => cs.url_id === url.id);
    return {
      ...url,
      has_active_campaign: campaignStatus?.has_active_campaign ?? false,
      active_campaign_count: campaignStatus?.active_campaign_count ?? 0,
      total_campaign_count: campaignStatus?.total_campaign_count ?? 0,
    };
  });

  // Apply campaign filter (include manual URLs if toggle is enabled)
  const urls = filters.onlyActiveCampaigns !== false
    ? urlsWithCampaignStatus.filter(url => {
        // If includeManualUrls is true, keep manual URLs regardless of campaign status
        if (filters.includeManualUrls && url.source === 'manual') {
          return true;
        }
        return url.has_active_campaign;
      })
    : urlsWithCampaignStatus;

  // Calculate stats
  const stats: UrlStats = {
    total: urls.length,
    ok: urls.filter(u => u.validation_status === 'ok').length,
    error: urls.filter(u => u.validation_status === 'error').length,
    timeout: urls.filter(u => u.validation_status === 'timeout').length,
    redirect: urls.filter(u => u.validation_status === 'redirect').length,
    pending: urls.filter(u => !u.validation_status || u.validation_status === 'pending').length,
    slow: urls.filter(u => u.validation_load_time_ms && u.validation_load_time_ms > 3000).length,
    empty: urls.filter(u => u.validation_status === 'empty').length,
    suspicious: urls.filter(u => u.validation_status === 'suspicious').length,
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

  // Get empty URLs
  const emptyUrls = urls.filter(u => u.validation_status === 'empty');

  // Get suspicious URLs
  const suspiciousUrls = urls.filter(u => u.validation_status === 'suspicious');

  // Analyze single URL content
  const analyzeContentMutation = useMutation({
    mutationFn: async (urlId: string) => {
      const { data, error } = await supabase.functions.invoke('analyze-url-content', {
        body: { url_id: urlId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      if (data?.results?.[0]?.score !== undefined) {
        const score = data.results[0].score;
        if (score < 50) {
          toast.warning(`Conteúdo suspeito detectado! Score: ${score}%`);
        } else {
          toast.success(`Análise concluída. Score: ${score}%`);
        }
      } else {
        toast.success('Análise de conteúdo concluída');
      }
    },
    onError: (error) => {
      toast.error(`Erro ao analisar conteúdo: ${error.message}`);
    }
  });

  // Analyze all URLs content
  const analyzeAllContentMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('analyze-url-content', {
        body: { company_id: companyId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      toast.success(`Análise concluída: ${data?.analyzed || 0} URLs analisadas, ${data?.suspicious || 0} suspeitas`);
    },
    onError: (error) => {
      toast.error(`Erro ao analisar URLs: ${error.message}`);
    }
  });

  // Analyze suspicious URLs only
  const analyzeSuspiciousMutation = useMutation({
    mutationFn: async () => {
      const suspiciousIds = suspiciousUrls.map(u => u.id);
      if (suspiciousIds.length === 0) {
        throw new Error('Nenhuma URL suspeita encontrada');
      }
      const { data, error } = await supabase.functions.invoke('analyze-url-content', {
        body: { url_ids: suspiciousIds }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      toast.success(`Reanálise concluída: ${data?.analyzed || 0} URLs`);
    },
    onError: (error) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

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

  // Import URLs from campaigns
  const importUrlsMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company not found');
      const { data, error } = await supabase.functions.invoke('import-campaign-urls', {
        body: { company_id: companyId }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-urls'] });
      if (data?.imported > 0) {
        toast.success(`${data.imported} novas URLs importadas de ${data.scanned_campaigns} campanhas`);
      } else {
        toast.info('Nenhuma nova URL encontrada nas campanhas ativas');
      }
    },
    onError: (error) => {
      toast.error(`Erro ao importar URLs: ${error.message}`);
    }
  });

  return {
    urls,
    stats,
    problematicUrls,
    slowUrls,
    redirectUrls,
    emptyUrls,
    suspiciousUrls,
    isLoading,
    refetch,
    validateUrl: validateUrlMutation.mutate,
    validateAll: validateAllMutation.mutateAsync,
    validateProblematic: validateProblematicMutation.mutate,
    isValidating: validateUrlMutation.isPending || validateAllMutation.isPending || validateProblematicMutation.isPending,
    // Content analysis
    analyzeContent: analyzeContentMutation.mutate,
    analyzeAllContent: analyzeAllContentMutation.mutateAsync,
    analyzeSuspicious: analyzeSuspiciousMutation.mutate,
    isAnalyzing: analyzeContentMutation.isPending || analyzeAllContentMutation.isPending || analyzeSuspiciousMutation.isPending,
    // Import URLs
    importUrls: importUrlsMutation.mutate,
    isImporting: importUrlsMutation.isPending,
  };
}
