import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InstagramAutoPostConfig {
  id: string;
  client_id: string;
  company_id: string;
  instagram_account_id: string;
  post_briefing: string;
  scheduled_days: number[];
  scheduled_hours: number[];
  is_enabled: boolean;
  next_post_at: string | null;
  last_post_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface InstagramAutoPost {
  id: string;
  config_id: string;
  client_id: string;
  company_id: string;
  image_url: string;
  caption: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  scheduled_at: string;
  published_at: string | null;
  instagram_media_id: string | null;
  error_message: string | null;
  created_at: string;
}

export function useInstagramAutoPostConfig(clientId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['instagram-auto-post-config', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .select('*')
        .eq('client_id', clientId)
        .maybeSingle();

      if (error) throw error;
      return data as InstagramAutoPostConfig | null;
    },
    enabled: !!clientId
  });

  const createConfigMutation = useMutation({
    mutationFn: async (configData: {
      instagram_account_id: string;
      post_briefing: string;
      scheduled_days: number[];
      scheduled_hours: number[];
      company_id: string;
      created_by: string;
    }) => {
      // First create the config
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .insert({
          client_id: clientId,
          ...configData,
          is_enabled: true
        })
        .select()
        .single();

      if (error) throw error;

      // Then generate the first post
      const { error: generateError } = await supabase.functions.invoke('generate-instagram-auto-post', {
        body: {
          configId: data.id,
          clientId: clientId,
          companyId: configData.company_id
        }
      });

      if (generateError) {
        console.error('Error generating first post:', generateError);
        // Don't throw - config was created successfully
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-post-config', clientId] });
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts', clientId] });
      toast({
        title: 'Configuração criada!',
        description: 'Postagens automáticas ativadas. Gerando primeiro post...',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar configuração',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<InstagramAutoPostConfig>) => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .update(updates)
        .eq('client_id', clientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-post-config', clientId] });
      toast({
        title: 'Configuração atualizada!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('instagram_auto_post_configs')
        .delete()
        .eq('client_id', clientId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-post-config', clientId] });
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts', clientId] });
      toast({
        title: 'Configuração removida',
        description: 'Postagens automáticas desativadas.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  return {
    config,
    isLoading,
    error,
    createConfig: createConfigMutation.mutate,
    updateConfig: updateConfigMutation.mutate,
    deleteConfig: deleteConfigMutation.mutate,
    isCreating: createConfigMutation.isPending,
    isUpdating: updateConfigMutation.isPending,
    isDeleting: deleteConfigMutation.isPending
  };
}

export function useInstagramAutoPosts(clientId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['instagram-auto-posts', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_posts')
        .select('*')
        .eq('client_id', clientId)
        .order('scheduled_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as InstagramAutoPost[];
    },
    enabled: !!clientId
  });

  const nextPost = posts?.find(p => p.status === 'pending');
  const publishedPosts = posts?.filter(p => p.status === 'published') || [];

  const regeneratePostMutation = useMutation({
    mutationFn: async (configId: string) => {
      // Delete current pending post
      if (nextPost) {
        await supabase
          .from('instagram_auto_posts')
          .delete()
          .eq('id', nextPost.id);
      }

      // Get company_id from config
      const { data: config } = await supabase
        .from('instagram_auto_post_configs')
        .select('company_id')
        .eq('id', configId)
        .single();

      // Generate new post
      const { error } = await supabase.functions.invoke('generate-instagram-auto-post', {
        body: {
          configId,
          clientId,
          companyId: config?.company_id
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts', clientId] });
      toast({
        title: 'Post regenerado!',
        description: 'Novo post gerado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao regenerar',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ postId, caption }: { postId: string; caption: string }) => {
      const { error } = await supabase
        .from('instagram_auto_posts')
        .update({ caption })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts', clientId] });
      toast({
        title: 'Legenda atualizada!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar legenda',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  return {
    posts,
    nextPost,
    publishedPosts,
    isLoading,
    error,
    regeneratePost: regeneratePostMutation.mutate,
    updateCaption: updateCaptionMutation.mutate,
    isRegenerating: regeneratePostMutation.isPending,
    isUpdatingCaption: updateCaptionMutation.isPending
  };
}
