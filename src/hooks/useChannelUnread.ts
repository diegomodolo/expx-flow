import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';

interface UnreadCounts {
  [channelId: string]: number;
}

export function useChannelUnread() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const companyId = activeCompany?.company_id;

  const { data: unreadCounts = {} } = useQuery<UnreadCounts>({
    queryKey: ['channel-unread', companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user?.id) return {};

      // Get all channels for this company
      const { data: channels } = await supabase
        .from('internal_channels')
        .select('id')
        .eq('company_id', companyId);

      if (!channels?.length) return {};

      const channelIds = channels.map(c => c.id);

      // Get user's read status for each channel
      const { data: readStatuses } = await supabase
        .from('channel_read_status' as any)
        .select('channel_id, last_read_at')
        .eq('user_id', user.id)
        .in('channel_id', channelIds);

      const readMap = new Map(
        (readStatuses || []).map((rs: any) => [rs.channel_id, rs.last_read_at])
      );

      // Count unread messages per channel
      const counts: UnreadCounts = {};
      
      for (const channelId of channelIds) {
        const lastRead = readMap.get(channelId);
        
        let query = supabase
          .from('internal_messages')
          .select('id', { count: 'exact', head: true })
          .eq('channel_id', channelId)
          .neq('user_id', user.id);

        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }

        const { count } = await query;
        if (count && count > 0) {
          counts[channelId] = count;
        }
      }

      return counts;
    },
    enabled: !!companyId && !!user?.id,
    refetchInterval: 30000,
  });

  // Global realtime subscription: listen to ALL new messages in the company's channels
  // This updates unread counts AND the active channel's messages instantly
  useEffect(() => {
    if (!companyId || !user?.id) return;

    const channel = supabase
      .channel(`global-messages-${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Skip own messages
          if (newMsg.user_id === user.id) return;

          // Invalidate unread counts so badge updates immediately
          queryClient.invalidateQueries({ queryKey: ['channel-unread', companyId, user.id] });

          // Also invalidate the messages query for that channel so if user is viewing it, it refreshes
          queryClient.invalidateQueries({ queryKey: ['internal-messages', newMsg.channel_id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, user?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('channel_read_status' as any)
        .upsert(
          { channel_id: channelId, user_id: user.id, last_read_at: new Date().toISOString() },
          { onConflict: 'channel_id,user_id' }
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-unread', companyId, user?.id] });
    },
  });

  return {
    unreadCounts,
    markAsRead: (channelId: string) => markAsRead.mutate(channelId),
  };
}