import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface WordpressSite {
  id: string;
  company_id: string;
  name: string;
  site_url: string;
  username: string;
  app_password: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export function useWordpressSites(companyId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: sites, isLoading, error } = useQuery({
    queryKey: ['wordpress-sites', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wordpress_sites')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WordpressSite[];
    },
    enabled: !!companyId,
  });

  const addSiteMutation = useMutation({
    mutationFn: async (siteData: {
      name: string;
      site_url: string;
      username: string;
      app_password: string;
    }) => {
      const { data, error } = await supabase
        .from('wordpress_sites')
        .insert({
          ...siteData,
          company_id: companyId,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites', companyId] });
      toast.success('Site WordPress adicionado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error adding WordPress site:', error);
      toast.error('Erro ao adicionar site WordPress');
    },
  });

  const updateSiteMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<WordpressSite> & { id: string }) => {
      const { data, error } = await supabase
        .from('wordpress_sites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites', companyId] });
      toast.success('Site WordPress atualizado!');
    },
    onError: (error: any) => {
      console.error('Error updating WordPress site:', error);
      toast.error('Erro ao atualizar site WordPress');
    },
  });

  const deleteSiteMutation = useMutation({
    mutationFn: async (siteId: string) => {
      const { error } = await supabase
        .from('wordpress_sites')
        .delete()
        .eq('id', siteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-sites', companyId] });
      toast.success('Site WordPress removido!');
    },
    onError: (error: any) => {
      console.error('Error deleting WordPress site:', error);
      toast.error('Erro ao remover site WordPress');
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (credentials: {
      siteUrl: string;
      username: string;
      appPassword: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('test-wordpress-connection', {
        body: credentials,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Conexão estabelecida!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Falha na conexão');
    },
  });

  return {
    sites: sites || [],
    isLoading,
    error,
    addSite: addSiteMutation.mutateAsync,
    updateSite: updateSiteMutation.mutateAsync,
    deleteSite: deleteSiteMutation.mutateAsync,
    testConnection: testConnectionMutation.mutateAsync,
    isAdding: addSiteMutation.isPending,
    isUpdating: updateSiteMutation.isPending,
    isDeleting: deleteSiteMutation.isPending,
    isTesting: testConnectionMutation.isPending,
  };
}
