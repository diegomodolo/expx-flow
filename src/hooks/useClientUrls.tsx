import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ValidationStatus = 'ok' | 'error' | 'timeout' | 'redirect' | 'pending' | null;

export interface ClientUrl {
  id: string;
  client_id: string;
  company_id: string;
  url: string;
  domain: string;
  source: 'manual' | 'meta_sync' | 'google_sync';
  label: string | null;
  is_active: boolean;
  first_seen_at: string;
  last_seen_at: string;
  campaign_count: number;
  created_at: string;
  updated_at: string;
  // Validation fields
  last_validated_at: string | null;
  validation_status: ValidationStatus;
  validation_status_code: number | null;
  validation_load_time_ms: number | null;
  validation_error: string | null;
  validation_final_url: string | null;
}

interface UseClientUrlsOptions {
  clientId: string;
  companyId: string;
}

export function useClientUrls({ clientId, companyId }: UseClientUrlsOptions) {
  const queryClient = useQueryClient();
  const queryKey = ['client-urls', clientId];

  // Fetch URLs for client
  const { data: urls = [], isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_urls')
        .select('*')
        .eq('client_id', clientId)
        .order('domain', { ascending: true })
        .order('last_seen_at', { ascending: false });
      
      if (error) throw error;
      return data as ClientUrl[];
    },
    enabled: !!clientId,
  });

  // Add URL mutation
  const addUrlMutation = useMutation({
    mutationFn: async ({ url, label }: { url: string; label?: string }) => {
      // Parse URL to get domain
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace(/^www\./, '');
      const cleanUrl = url.split('?')[0]; // Remove query params
      
      const { data, error } = await supabase
        .from('client_urls')
        .insert({
          client_id: clientId,
          company_id: companyId,
          url: cleanUrl,
          domain,
          source: 'manual',
          label: label || null,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('URL adicionada com sucesso');
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        toast.error('Esta URL já está cadastrada para este cliente');
      } else {
        toast.error('Erro ao adicionar URL');
      }
    },
  });

  // Update URL mutation
  const updateUrlMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ClientUrl> }) => {
      const { data: updated, error } = await supabase
        .from('client_urls')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('URL atualizada');
    },
    onError: () => {
      toast.error('Erro ao atualizar URL');
    },
  });

  // Delete URL mutation
  const deleteUrlMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_urls')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('URL removida');
    },
    onError: () => {
      toast.error('Erro ao remover URL');
    },
  });

  // Toggle active state
  const toggleActive = useCallback(async (id: string) => {
    const url = urls.find(u => u.id === id);
    if (url) {
      await updateUrlMutation.mutateAsync({ 
        id, 
        data: { is_active: !url.is_active } 
      });
    }
  }, [urls, updateUrlMutation]);

  // Import existing URLs from ads tables
  const importExistingUrls = useCallback(async () => {
    try {
      // Fetch URLs from Meta Ads
      const { data: metaAds, error: metaError } = await supabase
        .from('ads')
        .select('link_url')
        .eq('client_id', clientId)
        .not('link_url', 'is', null)
        .not('link_url', 'eq', '');
      
      if (metaError) throw metaError;

      // Fetch URLs from Google Ads
      const { data: googleAds, error: googleError } = await supabase
        .from('google_ads')
        .select('final_url')
        .eq('client_id', clientId)
        .not('final_url', 'is', null)
        .not('final_url', 'eq', '');
      
      if (googleError) throw googleError;

      // Combine and deduplicate URLs
      const urlSet = new Map<string, { url: string; source: string }>();
      
      metaAds?.forEach(ad => {
        if (ad.link_url) {
          const cleanUrl = ad.link_url.split('?')[0];
          if (!urlSet.has(cleanUrl)) {
            urlSet.set(cleanUrl, { url: cleanUrl, source: 'meta_sync' });
          }
        }
      });

      googleAds?.forEach(ad => {
        if (ad.final_url) {
          const cleanUrl = ad.final_url.split('?')[0];
          if (!urlSet.has(cleanUrl)) {
            urlSet.set(cleanUrl, { url: cleanUrl, source: 'google_sync' });
          }
        }
      });

      let importedCount = 0;
      let skippedCount = 0;

      // Insert each URL using RPC function
      for (const [cleanUrl, { source }] of urlSet) {
        try {
          const urlObj = new URL(cleanUrl);
          const domain = urlObj.hostname.replace(/^www\./, '');
          
          const { error } = await supabase.rpc('upsert_client_url', {
            p_client_id: clientId,
            p_company_id: companyId,
            p_url: cleanUrl,
            p_domain: domain,
            p_source: source
          });

          if (error) {
            skippedCount++;
          } else {
            importedCount++;
          }
        } catch {
          skippedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey });
      
      if (importedCount > 0) {
        toast.success(`${importedCount} URL(s) importada(s) com sucesso`);
      } else if (urlSet.size === 0) {
        toast.info('Nenhuma URL encontrada nos anúncios sincronizados');
      } else {
        toast.info('Todas as URLs já estavam cadastradas');
      }

      return { imported: importedCount, skipped: skippedCount };
    } catch (error) {
      console.error('Error importing URLs:', error);
      toast.error('Erro ao importar URLs');
      throw error;
    }
  }, [clientId, companyId, queryClient, queryKey]);

  // Group URLs by domain
  const urlsByDomain = urls.reduce((acc, url) => {
    if (!acc[url.domain]) {
      acc[url.domain] = [];
    }
    acc[url.domain].push(url);
    return acc;
  }, {} as Record<string, ClientUrl[]>);

  // Validate URLs mutation
  const validateUrlsMutation = useMutation({
    mutationFn: async (urlIds?: string[]) => {
      const payload = urlIds ? { url_ids: urlIds } : { client_id: clientId };
      
      const { data, error } = await supabase.functions.invoke('validate-client-urls', {
        body: payload
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      const count = data?.results?.length || 0;
      toast.success(`${count} URL(s) validada(s)`);
    },
    onError: (error: any) => {
      console.error('Validation error:', error);
      toast.error('Erro ao validar URLs');
    },
  });

  // Validate single URL
  const validateUrl = useCallback(async (urlId: string) => {
    return validateUrlsMutation.mutateAsync([urlId]);
  }, [validateUrlsMutation]);

  // Validate all active URLs
  const validateAllUrls = useCallback(async () => {
    return validateUrlsMutation.mutateAsync(undefined);
  }, [validateUrlsMutation]);

  return {
    urls,
    urlsByDomain,
    loading: isLoading,
    addUrl: (url: string, label?: string) => addUrlMutation.mutateAsync({ url, label }),
    updateUrl: (id: string, data: Partial<ClientUrl>) => updateUrlMutation.mutateAsync({ id, data }),
    deleteUrl: (id: string) => deleteUrlMutation.mutateAsync(id),
    toggleActive,
    importExistingUrls,
    validateUrl,
    validateAllUrls,
    refetch,
    isAdding: addUrlMutation.isPending,
    isUpdating: updateUrlMutation.isPending,
    isDeleting: deleteUrlMutation.isPending,
    isValidating: validateUrlsMutation.isPending,
  };
}
