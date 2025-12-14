import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface ScheduledPost {
  id: string;
  company_id: string;
  client_id: string | null;
  created_by: string;
  content_type: 'image' | 'video' | 'carousel' | 'reel';
  caption: string | null;
  media_urls: string[];
  thumbnail_url: string | null;
  platforms: string[];
  facebook_page_id: string | null;
  instagram_account_id: string | null;
  scheduled_at: string;
  timezone: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  facebook_post_id: string | null;
  instagram_media_id: string | null;
  published_at: string | null;
  error_message: string | null;
  retry_count: number;
  visual_creative_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  facebook_page?: {
    id: string;
    page_name: string;
    page_id: string;
  } | null;
  instagram_account?: {
    id: string;
    username: string;
    profile_picture_url: string | null;
  } | null;
  client?: {
    id: string;
    name: string;
    company: string;
  } | null;
}

export interface CreateScheduledPostInput {
  client_id?: string | null;
  content_type: 'image' | 'video' | 'carousel' | 'reel';
  caption?: string;
  media_urls: string[];
  thumbnail_url?: string;
  platforms: string[];
  facebook_page_id?: string | null;
  instagram_account_id?: string | null;
  scheduled_at: string;
  timezone?: string;
  status?: 'draft' | 'scheduled';
  visual_creative_id?: string | null;
  metadata?: Record<string, any>;
}

export const useScheduledPosts = () => {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchPosts = async (filters?: { status?: string; startDate?: string; endDate?: string }) => {
    if (!activeCompany?.company_id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('scheduled_posts')
        .select(`
          *,
          facebook_page:facebook_pages(id, page_name, page_id),
          instagram_account:instagram_accounts(id, username, profile_picture_url),
          client:clients(id, name, company)
        `)
        .eq('company_id', activeCompany.company_id)
        .order('scheduled_at', { ascending: true });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.startDate) {
        query = query.gte('scheduled_at', filters.startDate);
      }
      
      if (filters?.endDate) {
        query = query.lte('scheduled_at', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPosts((data || []) as ScheduledPost[]);
    } catch (error: any) {
      console.error('Error fetching scheduled posts:', error);
      toast({
        title: 'Erro ao carregar posts',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (input: CreateScheduledPostInput): Promise<ScheduledPost | null> => {
    if (!activeCompany?.company_id) return null;

    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('scheduled_posts')
        .insert({
          company_id: activeCompany.company_id,
          created_by: user.user.id,
          client_id: input.client_id || null,
          content_type: input.content_type,
          caption: input.caption || null,
          media_urls: input.media_urls,
          thumbnail_url: input.thumbnail_url || null,
          platforms: input.platforms,
          facebook_page_id: input.facebook_page_id || null,
          instagram_account_id: input.instagram_account_id || null,
          scheduled_at: input.scheduled_at,
          timezone: input.timezone || 'America/Sao_Paulo',
          status: input.status || 'scheduled',
          visual_creative_id: input.visual_creative_id || null,
          metadata: input.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Post agendado!',
        description: `O post será publicado em ${new Date(input.scheduled_at).toLocaleString('pt-BR')}`,
      });

      await fetchPosts();
      return data as ScheduledPost;
    } catch (error: any) {
      console.error('Error creating scheduled post:', error);
      toast({
        title: 'Erro ao agendar post',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updatePost = async (id: string, updates: Partial<CreateScheduledPostInput>): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Post atualizado!',
        description: 'As alterações foram salvas.',
      });

      await fetchPosts();
      return true;
    } catch (error: any) {
      console.error('Error updating scheduled post:', error);
      toast({
        title: 'Erro ao atualizar post',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Post excluído',
        description: 'O agendamento foi removido.',
      });

      await fetchPosts();
      return true;
    } catch (error: any) {
      console.error('Error deleting scheduled post:', error);
      toast({
        title: 'Erro ao excluir post',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelPost = async (id: string): Promise<boolean> => {
    return updatePost(id, { status: 'cancelled' } as any);
  };

  const reschedulePost = async (id: string, newScheduledAt: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('scheduled_posts')
        .update({ 
          scheduled_at: newScheduledAt,
          status: 'scheduled',
          error_message: null,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Post reagendado!',
        description: `Nova data: ${new Date(newScheduledAt).toLocaleString('pt-BR')}`,
      });

      await fetchPosts();
      return true;
    } catch (error: any) {
      console.error('Error rescheduling post:', error);
      toast({
        title: 'Erro ao reagendar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const publishNow = async (id: string): Promise<boolean> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('publish-scheduled-post', {
        body: { postId: id }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: 'Post publicado!',
          description: 'O post foi publicado com sucesso.',
        });
      } else {
        toast({
          title: 'Erro na publicação',
          description: data.error || 'Ocorreu um erro ao publicar',
          variant: 'destructive',
        });
      }

      await fetchPosts();
      return data.success;
    } catch (error: any) {
      console.error('Error publishing post:', error);
      toast({
        title: 'Erro ao publicar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany?.company_id) {
      fetchPosts();
    }
  }, [activeCompany?.company_id]);

  return {
    posts,
    loading,
    fetchPosts,
    createPost,
    updatePost,
    deletePost,
    cancelPost,
    reschedulePost,
    publishNow,
  };
};
