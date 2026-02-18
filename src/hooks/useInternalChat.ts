import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';

export interface InternalChannel {
  id: string;
  company_id: string;
  name: string;
  channel_type: 'squad' | 'client' | 'general';
  reference_id: string | null;
  icon: string | null;
  created_at: string;
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

  // Auto-select first channel
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
          event: 'INSERT',
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal-messages', activeChannelId] });
    },
  });

  const activeChannel = channels.find(c => c.id === activeChannelId) || null;

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
  };
}
