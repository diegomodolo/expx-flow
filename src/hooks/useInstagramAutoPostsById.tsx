import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InstagramAutoPostConfig {
  id: string;
  client_id: string | null;
  company_id: string;
  instagram_account_id: string;
  name: string | null;
  post_briefing: string;
  single_post_prompt: string | null;
  carousel_prompt: string | null;
  scheduled_days: number[];
  scheduled_hours: number[];
  is_enabled: boolean;
  next_post_at: string | null;
  last_post_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  youtube_channel_url: string | null;
}

interface InstagramAutoPost {
  id: string;
  config_id: string;
  client_id: string | null;
  company_id: string;
  image_url: string;
  image_urls?: string[];
  post_type?: 'single' | 'carousel';
  caption: string;
  status: 'pending' | 'publishing' | 'published' | 'failed';
  scheduled_at: string;
  published_at: string | null;
  instagram_media_id: string | null;
  error_message: string | null;
  created_at: string;
  grammar_validated?: boolean;
  grammar_validation_attempts?: number;
  grammar_errors?: string[] | null;
}

// Hook to fetch config by ID (for standalone automations)
export function useInstagramAutoPostConfigById(configId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['instagram-auto-post-config-by-id', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (error) throw error;
      return data as InstagramAutoPostConfig;
    },
    enabled: !!configId
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<InstagramAutoPostConfig>) => {
      const { data, error } = await supabase
        .from('instagram_auto_post_configs')
        .update(updates)
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-post-config-by-id', configId] });
      queryClient.invalidateQueries({ queryKey: ['instagram-automations'] });
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
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-post-config-by-id', configId] });
      queryClient.invalidateQueries({ queryKey: ['instagram-automations'] });
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
      toast({
        title: 'Configuração removida',
        description: 'Automação desativada com sucesso.',
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
    updateConfig: updateConfigMutation.mutate,
    deleteConfig: deleteConfigMutation.mutate,
    isUpdating: updateConfigMutation.isPending,
    isDeleting: deleteConfigMutation.isPending
  };
}

// Hook to fetch posts by config ID
export function useInstagramAutoPostsByConfigId(configId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['instagram-auto-posts-by-config', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('instagram_auto_posts')
        .select('*')
        .eq('config_id', configId)
        .order('scheduled_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      return data as InstagramAutoPost[];
    },
    enabled: !!configId
  });

  const pendingPosts = posts?.filter(p => p.status === 'pending').sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  ) || [];
  
  const nextPost = pendingPosts[0] || null;
  const publishedPosts = posts?.filter(p => p.status === 'published').sort((a, b) => 
    new Date(b.published_at || b.scheduled_at).getTime() - new Date(a.published_at || a.scheduled_at).getTime()
  ) || [];

  const regeneratePostMutation = useMutation({
    mutationFn: async ({ configId, postId }: { configId: string; postId: string }) => {
      await supabase
        .from('instagram_auto_posts')
        .delete()
        .eq('id', postId);

      const { data: config } = await supabase
        .from('instagram_auto_post_configs')
        .select('company_id')
        .eq('id', configId)
        .single();

      const { error } = await supabase.functions.invoke('generate-instagram-auto-post', {
        body: {
          configId,
          companyId: config?.company_id
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
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

  const generateNextPostMutation = useMutation({
    mutationFn: async ({ configId, companyId }: { configId: string; companyId: string }) => {
      const { error } = await supabase.functions.invoke('generate-instagram-auto-post', {
        body: {
          configId,
          companyId
        }
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
      toast({
        title: 'Post gerado!',
        description: 'Nova postagem gerada para o próximo horário.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao gerar post',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('instagram_auto_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
      toast({
        title: 'Post removido',
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

  const updateCaptionMutation = useMutation({
    mutationFn: async ({ postId, caption }: { postId: string; caption: string }) => {
      const { error } = await supabase
        .from('instagram_auto_posts')
        .update({ caption })
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
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

  const publishNowMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke('publish-instagram-auto-post', {
        body: { postId }
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error || 'Erro ao publicar');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
      toast({
        title: 'Post publicado!',
        description: 'O post foi publicado no Instagram com sucesso.',
      });
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
      toast({
        title: 'Erro ao publicar',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  const validateGrammarMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Find the post to get image URLs
      const post = posts?.find(p => p.id === postId);
      if (!post) throw new Error('Post não encontrado');

      const imageUrls = post.image_urls || [post.image_url];
      
      const { data, error } = await supabase.functions.invoke('validate-image-text', {
        body: { imageUrls, postId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['instagram-auto-posts-by-config', configId] });
      if (data.hasErrors) {
        toast({
          title: 'Verificação concluída',
          description: `Encontrados ${data.errors?.length || 0} possíveis erros de texto.`,
          variant: 'destructive',
        });
      } else if (data.hasText) {
        toast({
          title: 'Texto verificado!',
          description: 'Nenhum erro de ortografia encontrado.',
        });
      } else {
        toast({
          title: 'Verificação concluída',
          description: 'Nenhum texto foi encontrado nas imagens.',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro na verificação',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  return {
    posts,
    pendingPosts,
    nextPost,
    publishedPosts,
    isLoading,
    error,
    regeneratePost: regeneratePostMutation.mutate,
    generateNextPost: generateNextPostMutation.mutate,
    deletePost: deletePostMutation.mutate,
    updateCaption: updateCaptionMutation.mutate,
    publishNow: publishNowMutation.mutate,
    validateGrammar: validateGrammarMutation.mutate,
    isRegenerating: regeneratePostMutation.isPending,
    isGeneratingNext: generateNextPostMutation.isPending,
    isDeleting: deletePostMutation.isPending,
    isUpdatingCaption: updateCaptionMutation.isPending,
    isPublishing: publishNowMutation.isPending,
    isValidatingGrammar: validateGrammarMutation.isPending
  };
}
