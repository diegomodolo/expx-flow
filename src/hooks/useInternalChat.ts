import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';

export interface InternalChannel {
  id: string;
  company_id: string;
  name: string;
  channel_type: 'squad' | 'client' | 'general' | 'dm';
  reference_id: string | null;
  icon: string | null;
  created_at: string;
  // DM-specific extras (populated client-side)
  dm_user_id?: string;
  dm_user_avatar?: string;
}

export interface InternalMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  task_reference_id: string | null;
  thread_parent_id: string | null;
  reply_count: number;
  is_pinned: boolean;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  topic_title: string | null;
  created_at: string;
  // Joined data
  user_name?: string;
  user_avatar?: string;
}

export function useInternalChat() {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const companyId = activeCompany?.company_id;

  // Fetch or auto-create channels
  const { data: channels = [], isLoading: channelsLoading } = useQuery({
    queryKey: ['internal-channels', companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Check if channels exist
      const { data: existing, error } = await supabase
        .from('internal_channels')
        .select('*')
        .eq('company_id', companyId)
        .order('channel_type')
        .order('name');

      if (error) throw error;

      if (existing && existing.length > 0) {
        return existing as InternalChannel[];
      }

      // Auto-create channels from teams and clients
      const channelsToCreate: Array<{
        company_id: string;
        name: string;
        channel_type: string;
        reference_id?: string;
        icon?: string;
      }> = [];

      // General channel
      channelsToCreate.push({
        company_id: companyId,
        name: 'Geral',
        channel_type: 'general',
        icon: '💬',
      });

      // Squad channels from teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('company_id', companyId);

      if (teams) {
        for (const team of teams) {
          channelsToCreate.push({
            company_id: companyId,
            name: team.name,
            channel_type: 'squad',
            reference_id: team.id,
            icon: '👥',
          });
        }
      }

      // Client channels
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .limit(20);

      if (clients) {
        for (const client of clients) {
          channelsToCreate.push({
            company_id: companyId,
            name: client.name,
            channel_type: 'client',
            reference_id: client.id,
            icon: '🏢',
          });
        }
      }

      if (channelsToCreate.length === 0) return [];

      const { data: created, error: createError } = await supabase
        .from('internal_channels')
        .insert(channelsToCreate)
        .select();

      if (createError) throw createError;
      return (created || []) as InternalChannel[];
    },
    enabled: !!companyId,
  });

  // Realtime subscription for channels (new squads, etc.)
  useEffect(() => {
    if (!companyId) return;
    const channelSub = supabase
      .channel(`internal-channels-${companyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_channels',
        filter: `company_id=eq.${companyId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['internal-channels', companyId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channelSub); };
  }, [companyId, queryClient]);

  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      // Prefer general channel
      const general = channels.find(c => c.channel_type === 'general');
      setActiveChannelId(general?.id || channels[0].id);
    }
  }, [channels, activeChannelId]);

  // Fetch messages for active channel
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ['internal-messages', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return [];

      const { data, error } = await supabase
        .from('internal_messages')
        .select('*')
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      // Fetch user profiles for messages
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return (data || []).map(msg => ({
        ...msg,
        user_name: profileMap.get(msg.user_id)?.full_name || 'Usuário',
        user_avatar: profileMap.get(msg.user_id)?.avatar_url || undefined,
      })) as InternalMessage[];
    },
    enabled: !!activeChannelId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!activeChannelId) return;

    // Clean up previous subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`internal-messages-${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'internal_messages',
          filter: `channel_id=eq.${activeChannelId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['internal-messages', activeChannelId] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannelId, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ content, threadParentId }: { content: string; threadParentId?: string }) => {
      if (!activeChannelId || !user?.id) throw new Error('Missing data');

      // Check for task references (#UUID pattern)
      const taskRefMatch = content.match(/#([a-f0-9-]{36})/i);
      const taskRefId = taskRefMatch ? taskRefMatch[1] : null;

      const insertData: any = {
        channel_id: activeChannelId,
        user_id: user.id,
        content,
        task_reference_id: taskRefId,
      };

      if (threadParentId) {
        insertData.thread_parent_id = threadParentId;
      }

      const { error } = await supabase
        .from('internal_messages')
        .insert(insertData);

      if (error) throw error;

      // Trigger AI notification for other channel members (fire-and-forget)
      if (activeChannel && user?.id) {
        supabase.functions.invoke('prioritize-notification', {
          body: {
            message_content: content,
            sender_name: user.user_metadata?.full_name || 'Usuário',
            channel_name: activeChannel.name,
            channel_type: activeChannel.channel_type,
            company_id: companyId,
            user_id: user.id, // This will be replaced server-side per recipient
            channel_id: activeChannelId,
            message_id: null, // Would need the inserted message id
          },
        }).catch(err => console.warn('Notification trigger failed:', err));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-messages', activeChannelId] });
    },
  });

  const activeChannel = channels.find(c => c.id === activeChannelId) || null;

  /**
   * Get or create a DM channel between the current user and another user.
   * Returns the channel id.
   */
  const getOrCreateDMChannel = async (otherUserId: string, otherUserName: string): Promise<string | null> => {
    console.log('[DM] getOrCreateDMChannel called', { otherUserId, otherUserName, companyId, userId: user?.id });

    if (!companyId || !user?.id) {
      console.error('[DM] Missing companyId or user.id', { companyId, userId: user?.id });
      return null;
    }

    const pair = [user.id, otherUserId].sort().join(':');
    console.log('[DM] pair string:', pair);

    // Check if DM channel already exists
    const { data: existing, error: fetchError } = await supabase
      .from('internal_channels')
      .select('id')
      .eq('company_id', companyId)
      .eq('channel_type', 'dm')
      .eq('reference_id', pair)
      .maybeSingle();

    console.log('[DM] fetch existing result:', { existing, fetchError });

    if (fetchError) {
      console.error('[DM] Failed to fetch DM channel:', fetchError.message, fetchError.details, fetchError.hint, fetchError.code);
    }

    if (existing) {
      console.log('[DM] Found existing channel:', existing.id);
      return existing.id;
    }

    // Create new DM channel
    console.log('[DM] Creating new DM channel...');
    const { data: created, error } = await supabase
      .from('internal_channels')
      .insert({
        company_id: companyId,
        name: otherUserName,
        channel_type: 'dm',
        reference_id: pair,
        icon: '💬',
      })
      .select('id')
      .single();

    console.log('[DM] create result:', { created, error });

    if (error) {
      console.error('[DM] Failed to create DM channel:', error.message, error.details, error.hint, error.code);
      return null;
    }

    // Invalidate channels cache so the new DM appears in the sidebar
    await queryClient.invalidateQueries({ queryKey: ['internal-channels', companyId] });

    console.log('[DM] Created channel:', created.id);
    return created.id;
  };

  return {
    channels,
    channelsLoading,
    activeChannel,
    activeChannelId,
    setActiveChannelId,
    messages,
    messagesLoading,
    sendMessage: (content: string, threadParentId?: string) => sendMessage.mutate({ content, threadParentId }),
    sendingMessage: sendMessage.isPending,
    getOrCreateDMChannel,
  };
}
