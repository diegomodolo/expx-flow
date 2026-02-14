import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface YouTubeCategory {
  id: string;
  client_id: string;
  company_id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
  updated_at: string;
  channel_ids: string[];
}

export function useYouTubeCategories(clientId: string, companyId: string) {
  const [categories, setCategories] = useState<YouTubeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCategories = useCallback(async () => {
    if (!clientId || !companyId) return;

    try {
      // Fetch categories
      const { data: catData, error: catError } = await supabase
        .from('youtube_channel_categories')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (catError) throw catError;

      // Fetch links
      const categoryIds = (catData || []).map((c: any) => c.id);
      let links: any[] = [];
      if (categoryIds.length > 0) {
        const { data: linkData, error: linkError } = await supabase
          .from('youtube_channel_category_links')
          .select('*')
          .in('category_id', categoryIds);

        if (linkError) throw linkError;
        links = linkData || [];
      }

      // Map categories with their channel_ids
      const mapped: YouTubeCategory[] = (catData || []).map((c: any) => ({
        ...c,
        color: c.color || '#6366f1',
        channel_ids: links
          .filter((l: any) => l.category_id === c.id)
          .map((l: any) => l.channel_id),
      }));

      setCategories(mapped);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (name: string, description?: string, color?: string) => {
    try {
      const { data, error } = await supabase
        .from('youtube_channel_categories')
        .insert({
          client_id: clientId,
          company_id: companyId,
          name,
          description: description || null,
          color: color || '#6366f1',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Categoria criada!' });
      await fetchCategories();
      return data;
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast({ title: 'Erro ao criar categoria', variant: 'destructive' });
      return null;
    }
  };

  const updateCategory = async (categoryId: string, updates: { name?: string; description?: string; color?: string }) => {
    try {
      const { error } = await supabase
        .from('youtube_channel_categories')
        .update(updates)
        .eq('id', categoryId);

      if (error) throw error;

      toast({ title: 'Categoria atualizada!' });
      await fetchCategories();
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: 'Erro ao atualizar', variant: 'destructive' });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_channel_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      toast({ title: 'Categoria excluída' });
      setCategories(prev => prev.filter(c => c.id !== categoryId));
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({ title: 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const linkChannel = async (categoryId: string, channelId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_channel_category_links')
        .insert({ category_id: categoryId, channel_id: channelId });

      if (error) throw error;
      await fetchCategories();
    } catch (error: any) {
      // Ignore duplicate
      if (error?.code === '23505') return;
      console.error('Error linking channel:', error);
      toast({ title: 'Erro ao vincular canal', variant: 'destructive' });
    }
  };

  const unlinkChannel = async (categoryId: string, channelId: string) => {
    try {
      const { error } = await supabase
        .from('youtube_channel_category_links')
        .delete()
        .eq('category_id', categoryId)
        .eq('channel_id', channelId);

      if (error) throw error;
      await fetchCategories();
    } catch (error) {
      console.error('Error unlinking channel:', error);
      toast({ title: 'Erro ao desvincular canal', variant: 'destructive' });
    }
  };

  // Get channel IDs for a specific category
  const getChannelIdsForCategory = (categoryId: string | null): string[] | null => {
    if (!categoryId) return null; // null means "all"
    const cat = categories.find(c => c.id === categoryId);
    return cat?.channel_ids || [];
  };

  return {
    categories,
    loading,
    createCategory,
    updateCategory,
    deleteCategory,
    linkChannel,
    unlinkChannel,
    getChannelIdsForCategory,
    refetch: fetchCategories,
  };
}
