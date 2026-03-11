import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

// Simple notification sound using Web Audio API
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as unknown).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
    
    setTimeout(() => ctx.close(), 500);
  } catch (e) {
    // Silently fail if audio is blocked
  }
}

export function DMNotificationListener() {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const companyId = activeCompany?.company_id;
  const profileCacheRef = useRef<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());

  const fetchSenderProfile = useCallback(async (userId: string) => {
    const cached = profileCacheRef.current.get(userId);
    if (cached) return cached;

    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      profileCacheRef.current.set(userId, data);
    }
    return data;
  }, []);

  const fetchChannelInfo = useCallback(async (channelId: string) => {
    const { data } = await supabase
      .from('internal_channels')
      .select('id, channel_type, reference_id')
      .eq('id', channelId)
      .maybeSingle();
    return data;
  }, []);

  useEffect(() => {
    if (!companyId || !user?.id) return;

    const channel = supabase
      .channel(`dm-notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'internal_messages',
        },
        async (payload) => {
          const msg = payload.new as unknown;

          // Skip own messages
          if (msg.user_id === user.id) return;

          // Check if channel is a DM that involves current user
          const channelInfo = await fetchChannelInfo(msg.channel_id);
          if (!channelInfo || channelInfo.channel_type !== 'dm') return;

          // Check if reference_id contains our user id
          const refId = channelInfo.reference_id || '';
          if (!refId.includes(user.id)) return;

          // This is a DM for us! Fetch sender info
          const sender = await fetchSenderProfile(msg.user_id);
          const senderName = sender?.full_name || 'Usuário';
          const senderAvatar = sender?.avatar_url;
          const messagePreview = msg.content?.length > 80
            ? msg.content.substring(0, 80) + '…'
            : msg.content || 'Nova mensagem';

          // Play sound
          playNotificationSound();

          // Invalidate unread counts
          queryClient.invalidateQueries({ queryKey: ['channel-unread'] });
          queryClient.invalidateQueries({ queryKey: ['channel-mention-unread'] });

          // Show toast notification
          toast.custom(
            (t) => (
              <div
                onClick={() => {
                  toast.dismiss(t);
                  // Navigate to dashboard (comm hub) and set the active channel
                  // Store the target channel ID so CommunicationDashboard can pick it up
                  sessionStorage.setItem('dm-navigate-channel', msg.channel_id);
                  if (location.pathname !== '/dashboard') {
                    navigate('/dashboard');
                  } else {
                    // Already on dashboard, dispatch event to switch channel
                    window.dispatchEvent(new CustomEvent('dm-switch-channel', { detail: msg.channel_id }));
                  }
                }}
                className="flex items-start gap-3 bg-card border border-border rounded-xl p-4 shadow-lg cursor-pointer hover:bg-accent/50 transition-colors w-full max-w-sm"
              >
                {senderAvatar ? (
                  <img
                    src={senderAvatar}
                    alt={senderName}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{senderName}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{messagePreview}</p>
                </div>
              </div>
            ),
            {
              duration: 6000,
              position: 'top-right',
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, user?.id, queryClient, navigate, location.pathname, fetchSenderProfile, fetchChannelInfo]);

  return null;
}
