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

      // Fetch existing channels
      const { data: existing, error } = await supabase
        .from('internal_channels')
        .select('*')
        .eq('company_id', companyId)
        .order('channel_type')
        .order('name');

      if (error) throw error;

      const allExistingChannels = (existing || []) as InternalChannel[];

      // Build a set of existing client channel reference_ids
      const existingClientRefs = new Set(
        allExistingChannels
          .filter(c => c.channel_type === 'client')
          .map(c => c.reference_id)
      );

      // Fetch ALL active (non-canceled) clients for this company
      const { data: allClients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .eq('is_canceled', false);

      // Find clients that don't have a channel yet
      const missingClients = (allClients || []).filter(c => !existingClientRefs.has(c.id));

      // Build set of active client IDs to filter the channel list
      const activeClientIds = new Set((allClients || []).map(c => c.id));

      // Filter out channels for canceled clients
      const existingChannels = allExistingChannels.filter(c => {
        if (c.channel_type === 'client' && c.reference_id) {
          return activeClientIds.has(c.reference_id);
        }
        return true;
      });

      // If no channels exist at all, also create general channel
      const channelsToCreate: Array<{
        company_id: string;
        name: string;
        channel_type: string;
        reference_id?: string;
        icon?: string;
      }> = [];

      if (allExistingChannels.length === 0) {
        channelsToCreate.push({
          company_id: companyId,
          name: 'Geral',
          channel_type: 'general',
          icon: '💬',
        });

        // Also create squad channels if none exist
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
      }

      // Add missing client channels
      for (const client of missingClients) {
        channelsToCreate.push({
          company_id: companyId,
          name: client.name,
          channel_type: 'client',
          reference_id: client.id,
          icon: '🏢',
        });
      }

      // Create any missing channels
      if (channelsToCreate.length > 0) {
        const { data: created, error: createError } = await supabase
          .from('internal_channels')
          .insert(channelsToCreate)
          .select();

        if (createError) console.error('Failed to create missing channels:', createError);

        // Return combined list
        const newChannels = (created || []) as InternalChannel[];
        return [...existingChannels, ...newChannels].sort((a, b) => {
          if (a.channel_type !== b.channel_type) return a.channel_type.localeCompare(b.channel_type);
          return a.name.localeCompare(b.name);
        });
      }

      return existingChannels;
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

      const insertData: unknown = {
        channel_id: activeChannelId,
        user_id: user.id,
        content,
        task_reference_id: taskRefId,
      };

      if (threadParentId) {
        insertData.thread_parent_id = threadParentId;
      }

      const { data: inserted, error } = await supabase
        .from('internal_messages')
        .insert(insertData)
        .select('id')
        .single();

      if (error) throw error;

      // Extract @mentions from content and resolve to user IDs
      if (inserted && companyId) {
        const mentionRegex = /@([^\s@]+(?:\s[^\s@]+)*?)(?=\s@|\s*$|\s[^@])/g;
        const mentionNames: string[] = [];
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
          mentionNames.push(match[1].trim());
        }

        if (mentionNames.length > 0) {
          // Fetch all employees to resolve names to user IDs
          const { data: employees } = await supabase
            .from('employees')
            .select('user_id, name')
            .eq('company_id', companyId)
            .eq('status', 'active')
            .not('user_id', 'is', null);

          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', (employees || []).map(e => e.user_id).filter(Boolean) as string[]);

          const nameToUserId = new Map<string, string>();
          for (const emp of (employees || [])) {
            if (emp.user_id && emp.name) nameToUserId.set(emp.name.toLowerCase(), emp.user_id);
          }
          for (const p of (profiles || [])) {
            if (p.full_name) nameToUserId.set(p.full_name.toLowerCase(), p.user_id);
          }

          const mentionInserts: Array<{
            message_id: string;
            channel_id: string;
            mentioned_user_id: string;
            mentioner_user_id: string;
          }> = [];

          const mentionedUserIds = new Set<string>();

          for (const name of mentionNames) {
            const userId = nameToUserId.get(name.toLowerCase());
            if (userId && userId !== user.id && !mentionedUserIds.has(userId)) {
              mentionedUserIds.add(userId);
              mentionInserts.push({
                message_id: inserted.id,
                channel_id: activeChannelId,
                mentioned_user_id: userId,
                mentioner_user_id: user.id,
              });
            }
          }

          if (mentionInserts.length > 0) {
            // Insert mention records
            await supabase
              .from('internal_message_mentions' as unknown)
              .insert(mentionInserts);

            // Create notifications for mentioned users
            const senderName = user.user_metadata?.full_name || 'Alguém';
            const channelName = activeChannel?.name || 'canal';
            const notifInserts = Array.from(mentionedUserIds).map(uid => ({
              user_id: uid,
              company_id: companyId,
              type: 'mention',
              title: `${senderName} mencionou você`,
              message: `Você foi mencionado em #${channelName}: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
              reference_id: activeChannelId,
              reference_type: 'channel',
              is_read: false,
            }));

            await supabase
              .from('user_notifications' as unknown)
              .insert(notifInserts);
          }
        }
      }

      // Trigger AI notification for other channel members (fire-and-forget)
      if (activeChannel && user?.id) {
        supabase.functions.invoke('prioritize-notification', {
          body: {
            message_content: content,
            sender_name: user.user_metadata?.full_name || 'Usuário',
            channel_name: activeChannel.name,
            channel_type: activeChannel.channel_type,
            company_id: companyId,
            user_id: user.id,
            channel_id: activeChannelId,
            message_id: inserted?.id || null,
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

    if (!companyId || !user?.id) {
      console.error('[DM] Missing companyId or user.id', { companyId, userId: user?.id });
      return null;
    }

    const pair = [user.id, otherUserId].sort().join(':');

    // Check if DM channel already exists
    const { data: existing, error: fetchError } = await supabase
      .from('internal_channels')
      .select('id')
      .eq('company_id', companyId)
      .eq('channel_type', 'dm')
      .eq('reference_id', pair)
      .maybeSingle();


    if (fetchError) {
      console.error('[DM] Failed to fetch DM channel:', fetchError.message, fetchError.details, fetchError.hint, fetchError.code);
    }

    if (existing) {

      return existing.id;
    }

    // Create new DM channel

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


    if (error) {
      console.error('[DM] Failed to create DM channel:', error.message, error.details, error.hint, error.code);
      return null;
    }

    // Invalidate channels cache so the new DM appears in the sidebar
    await queryClient.invalidateQueries({ queryKey: ['internal-channels', companyId] });


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
