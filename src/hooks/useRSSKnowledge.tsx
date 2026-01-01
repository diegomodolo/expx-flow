import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RSSFeed {
  id: string;
  config_id: string;
  feed_url: string;
  feed_name: string | null;
  is_enabled: boolean;
  last_checked_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface RSSItem {
  id: string;
  feed_id: string;
  config_id: string;
  guid: string;
  title: string;
  link: string;
  description: string | null;
  published_at: string | null;
  is_selected: boolean;
  created_at: string;
}

// Validate RSS URL format
function isValidRSSUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function useRSSKnowledge(configId: string) {
  const queryClient = useQueryClient();

  // Fetch saved RSS feeds for this config
  const { data: feeds = [], isLoading: isLoadingFeeds } = useQuery({
    queryKey: ['rss-feeds', configId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('instagram_autopost_rss_feeds' as any)
        .select('*')
        .eq('config_id', configId)
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return data as RSSFeed[];
    },
    enabled: !!configId
  });

  // Fetch RSS items for this config
  const { data: items = [], isLoading: isLoadingItems } = useQuery({
    queryKey: ['rss-items', configId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('instagram_autopost_rss_items' as any)
        .select('*')
        .eq('config_id', configId)
        .order('published_at', { ascending: false }) as any);

      if (error) throw error;
      return data as RSSItem[];
    },
    enabled: !!configId
  });

  // Add RSS feed
  const addFeedMutation = useMutation({
    mutationFn: async ({ feedUrl, feedName }: { feedUrl: string; feedName?: string }) => {
      if (!isValidRSSUrl(feedUrl)) {
        throw new Error('URL inválida. Por favor, insira uma URL válida de feed RSS.');
      }

      // Check if feed already exists
      const existing = feeds.find(f => f.feed_url === feedUrl);
      if (existing) {
        throw new Error('Este feed RSS já está cadastrado.');
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert feed
      const { data: insertedFeed, error: insertError } = await (supabase
        .from('instagram_autopost_rss_feeds' as any)
        .insert({
          config_id: configId,
          feed_url: feedUrl,
          feed_name: feedName || null,
          is_enabled: true,
          created_by: user?.id
        })
        .select()
        .single() as any);

      if (insertError) throw insertError;

      // Trigger initial check of the feed
      try {
        await supabase.functions.invoke('check-rss-feeds', {
          body: { feedId: insertedFeed.id }
        });
      } catch (checkError) {
        console.error('Error checking new feed:', checkError);
        // Don't fail - feed was added, check can be retried
      }

      return insertedFeed;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds', configId] });
      queryClient.invalidateQueries({ queryKey: ['rss-items', configId] });
      toast.success('Feed RSS adicionado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao adicionar feed', { description: error.message });
    }
  });

  // Remove RSS feed
  const removeFeedMutation = useMutation({
    mutationFn: async (feedId: string) => {
      // First delete all items from this feed
      await (supabase
        .from('instagram_autopost_rss_items' as any)
        .delete()
        .eq('feed_id', feedId) as any);

      // Then delete the feed
      const { error } = await (supabase
        .from('instagram_autopost_rss_feeds' as any)
        .delete()
        .eq('id', feedId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds', configId] });
      queryClient.invalidateQueries({ queryKey: ['rss-items', configId] });
      toast.success('Feed RSS removido');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover feed', { description: error.message });
    }
  });

  // Toggle feed enabled status
  const toggleFeedMutation = useMutation({
    mutationFn: async ({ feedId, isEnabled }: { feedId: string; isEnabled: boolean }) => {
      const { error } = await (supabase
        .from('instagram_autopost_rss_feeds' as any)
        .update({ is_enabled: isEnabled })
        .eq('id', feedId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds', configId] });
    }
  });

  // Toggle item selection
  const toggleItemMutation = useMutation({
    mutationFn: async ({ itemId, isSelected }: { itemId: string; isSelected: boolean }) => {
      const { error } = await (supabase
        .from('instagram_autopost_rss_items' as any)
        .update({ is_selected: isSelected })
        .eq('id', itemId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rss-items', configId] });
    }
  });

  // Refresh feeds (check for new items)
  const refreshFeedsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-rss-feeds', {
        body: { configId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Falha ao atualizar feeds');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['rss-feeds', configId] });
      queryClient.invalidateQueries({ queryKey: ['rss-items', configId] });
      if (data.totalNewItems > 0) {
        toast.success(`${data.totalNewItems} novos itens encontrados`);
      } else {
        toast.info('Nenhum novo item encontrado');
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar feeds', { description: error.message });
    }
  });

  const selectedItems = items.filter(item => item.is_selected);
  const selectedCount = selectedItems.length;
  const enabledFeedsCount = feeds.filter(f => f.is_enabled).length;

  return {
    feeds,
    items,
    selectedItems,
    selectedCount,
    enabledFeedsCount,
    isLoadingFeeds,
    isLoadingItems,
    addFeed: addFeedMutation.mutateAsync,
    isAddingFeed: addFeedMutation.isPending,
    removeFeed: removeFeedMutation.mutate,
    isRemovingFeed: removeFeedMutation.isPending,
    toggleFeed: toggleFeedMutation.mutate,
    isTogglingFeed: toggleFeedMutation.isPending,
    toggleItem: toggleItemMutation.mutate,
    isTogglingItem: toggleItemMutation.isPending,
    refreshFeeds: refreshFeedsMutation.mutate,
    isRefreshingFeeds: refreshFeedsMutation.isPending
  };
}
