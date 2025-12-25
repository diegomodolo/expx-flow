import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WordpressAutoPostConfig {
  id: string;
  name: string | null;
  client_id: string | null;
  company_id: string;
  wordpress_site_id: string;
  post_briefing: string;
  post_type: string;
  post_status: string;
  post_category: string | null;
  scheduled_days: number[];
  scheduled_hours: number[];
  is_enabled: boolean;
  next_post_at: string | null;
  last_post_at: string | null;
  reference_image_1: string | null;
  reference_image_2: string | null;
  reference_image_3: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  wordpress_sites?: {
    id: string;
    name: string;
    site_url: string;
  };
}

export interface WordpressAutoPost {
  id: string;
  config_id: string;
  client_id: string | null;
  company_id: string;
  title: string;
  content: string;
  featured_image_url: string | null;
  excerpt: string | null;
  meta_description: string | null;
  status: string;
  scheduled_at: string;
  published_at: string | null;
  wordpress_post_id: string | null;
  wordpress_post_url: string | null;
  error_message: string | null;
  created_at: string;
}

export function useWordpressAutoPostConfigById(configId: string) {
  const queryClient = useQueryClient();

  const { data: config, isLoading, error } = useQuery({
    queryKey: ['wordpress-auto-post-config', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wordpress_auto_post_configs')
        .select(`
          *,
          wordpress_sites (
            id,
            name,
            site_url
          )
        `)
        .eq('id', configId)
        .single();

      if (error) throw error;
      return data as WordpressAutoPostConfig;
    },
    enabled: !!configId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<WordpressAutoPostConfig>) => {
      const { data, error } = await supabase
        .from('wordpress_auto_post_configs')
        .update(updates)
        .eq('id', configId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-post-config', configId] });
      toast.success('Configuração atualizada!');
    },
    onError: (error: any) => {
      console.error('Error updating config:', error);
      toast.error('Erro ao atualizar configuração');
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('wordpress_auto_post_configs')
        .delete()
        .eq('id', configId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-post-configs'] });
      toast.success('Automação excluída!');
    },
    onError: (error: any) => {
      console.error('Error deleting config:', error);
      toast.error('Erro ao excluir automação');
    },
  });

  return {
    config,
    isLoading,
    error,
    updateConfig: updateConfigMutation.mutateAsync,
    deleteConfig: deleteConfigMutation.mutateAsync,
    isUpdating: updateConfigMutation.isPending,
    isDeleting: deleteConfigMutation.isPending,
  };
}

export function useWordpressAutoPostsByConfigId(configId: string) {
  const queryClient = useQueryClient();

  const { data: posts, isLoading, error } = useQuery({
    queryKey: ['wordpress-auto-posts', configId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wordpress_auto_posts')
        .select('*')
        .eq('config_id', configId)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;
      return data as WordpressAutoPost[];
    },
    enabled: !!configId,
  });

  const pendingPosts = posts?.filter(p => p.status === 'pending' || p.status === 'publishing') || [];
  const publishedPosts = posts?.filter(p => p.status === 'published')
    .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()) || [];
  const nextPost = pendingPosts[0] || null;

  const regeneratePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // Get post data first
      const { data: postData } = await supabase
        .from('wordpress_auto_posts')
        .select('config_id, client_id, company_id')
        .eq('id', postId)
        .single();

      if (!postData) throw new Error('Post not found');

      // Delete the post
      const { error: deleteError } = await supabase
        .from('wordpress_auto_posts')
        .delete()
        .eq('id', postId);

      if (deleteError) throw deleteError;

      // Generate new post
      const { data, error } = await supabase.functions.invoke('generate-wordpress-auto-post', {
        body: {
          configId: postData.config_id,
          clientId: postData.client_id,
          companyId: postData.company_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-posts', configId] });
      toast.success('Post regenerado com sucesso!');
    },
    onError: (error: any) => {
      console.error('Error regenerating post:', error);
      toast.error('Erro ao regenerar post');
    },
  });

  const generateNextPostMutation = useMutation({
    mutationFn: async () => {
      const { data: config } = await supabase
        .from('wordpress_auto_post_configs')
        .select('id, client_id, company_id')
        .eq('id', configId)
        .single();

      if (!config) throw new Error('Config not found');

      const { data, error } = await supabase.functions.invoke('generate-wordpress-auto-post', {
        body: {
          configId: config.id,
          clientId: config.client_id,
          companyId: config.company_id,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-posts', configId] });
      toast.success('Novo post gerado!');
    },
    onError: (error: any) => {
      console.error('Error generating post:', error);
      toast.error('Erro ao gerar post');
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('wordpress_auto_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-posts', configId] });
      toast.success('Post excluído!');
    },
    onError: (error: any) => {
      console.error('Error deleting post:', error);
      toast.error('Erro ao excluir post');
    },
  });

  const updatePostMutation = useMutation({
    mutationFn: async ({ postId, updates }: { postId: string; updates: Partial<WordpressAutoPost> }) => {
      const { data, error } = await supabase
        .from('wordpress_auto_posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-posts', configId] });
      toast.success('Post atualizado!');
    },
    onError: (error: any) => {
      console.error('Error updating post:', error);
      toast.error('Erro ao atualizar post');
    },
  });

  const publishNowMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.functions.invoke('publish-wordpress-auto-post', {
        body: { postId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['wordpress-auto-posts', configId] });
      toast.success('Post publicado com sucesso!');
      if (data?.wordpressPostUrl) {
        window.open(data.wordpressPostUrl, '_blank');
      }
    },
    onError: (error: any) => {
      console.error('Error publishing post:', error);
      toast.error('Erro ao publicar post');
    },
  });

  return {
    posts: posts || [],
    pendingPosts,
    publishedPosts,
    nextPost,
    isLoading,
    error,
    regeneratePost: regeneratePostMutation.mutateAsync,
    generateNextPost: generateNextPostMutation.mutateAsync,
    deletePost: deletePostMutation.mutateAsync,
    updatePost: updatePostMutation.mutateAsync,
    publishNow: publishNowMutation.mutateAsync,
    isRegenerating: regeneratePostMutation.isPending,
    isGeneratingNext: generateNextPostMutation.isPending,
    isDeleting: deletePostMutation.isPending,
    isUpdating: updatePostMutation.isPending,
    isPublishing: publishNowMutation.isPending,
  };
}
