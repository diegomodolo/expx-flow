import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  // Group URLs by domain
  const urlsByDomain = urls.reduce((acc, url) => {
    if (!acc[url.domain]) {
      acc[url.domain] = [];
    }
    acc[url.domain].push(url);
    return acc;
  }, {} as Record<string, ClientUrl[]>);

  return {
    urls,
    urlsByDomain,
    loading: isLoading,
    addUrl: (url: string, label?: string) => addUrlMutation.mutateAsync({ url, label }),
    updateUrl: (id: string, data: Partial<ClientUrl>) => updateUrlMutation.mutateAsync({ id, data }),
    deleteUrl: (id: string) => deleteUrlMutation.mutateAsync(id),
    toggleActive,
    refetch,
    isAdding: addUrlMutation.isPending,
    isUpdating: updateUrlMutation.isPending,
    isDeleting: deleteUrlMutation.isPending,
  };
}
