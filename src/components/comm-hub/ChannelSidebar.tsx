import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Hash, Users, Building2, MessageCircle, MessageSquare } from 'lucide-react';
import type { InternalChannel } from '@/hooks/useInternalChat';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChannelSidebarProps {
  channels: InternalChannel[];
  activeChannelId: string | null;
  onSelectChannel: (id: string) => void;
  loading?: boolean;
  unreadCounts?: Record<string, number>;
}

export function ChannelSidebar({ channels, activeChannelId, onSelectChannel, loading, unreadCounts = {} }: ChannelSidebarProps) {
  const { user } = useAuth();
  const squads = channels.filter(c => c.channel_type === 'squad');
  const clients = channels.filter(c => c.channel_type === 'client');
  const general = channels.filter(c => c.channel_type === 'general');
  const dms = channels.filter(c => c.channel_type === 'dm');

  // Fetch profiles to resolve DM partner names/avatars
  const dmUserIds = dms
    .map(c => {
      if (!c.reference_id || !user?.id) return null;
      const parts = c.reference_id.split(':');
      return parts.find(id => id !== user.id) || null;
    })
    .filter(Boolean) as string[];

  const { data: dmProfiles = [] } = useQuery({
    queryKey: ['dm-profiles', dmUserIds.join(',')],
    queryFn: async () => {
      if (dmUserIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', dmUserIds);
      return data || [];
    },
    enabled: dmUserIds.length > 0,
  });

  const profileMap = new Map(dmProfiles.map(p => [p.user_id, p]));

  const getIcon = (type: string) => {
    switch (type) {
      case 'squad': return Users;
      case 'client': return Building2;
      case 'dm': return MessageSquare;
      default: return MessageCircle;
    }
  };

  const renderChannel = (channel: InternalChannel) => {
    const Icon = getIcon(channel.channel_type);
    const isActive = channel.id === activeChannelId;
    const unread = unreadCounts[channel.id] || 0;

    // For DM channels, show partner's name and avatar
    let displayName = channel.name;
    let avatarUrl: string | null = null;
    if (channel.channel_type === 'dm' && channel.reference_id && user?.id) {
      const otherId = channel.reference_id.split(':').find(id => id !== user.id);
      if (otherId) {
        const profile = profileMap.get(otherId);
        displayName = profile?.full_name || channel.name;
        avatarUrl = profile?.avatar_url || null;
      }
    }

    return (
      <button
        key={channel.id}
        onClick={() => onSelectChannel(channel.id)}
        className={cn(
          'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150',
          'hover:bg-accent/60',
          isActive
            ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary'
            : 'text-muted-foreground border-l-2 border-transparent',
          unread > 0 && !isActive && 'text-foreground font-semibold'
        )}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-4 h-4 rounded-full object-cover shrink-0" />
        ) : (
          <Icon className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate flex-1 text-left">{displayName}</span>
        {unread > 0 && !isActive && (
          <Badge className="h-5 min-w-[20px] rounded-full px-1.5 text-[10px] shrink-0">
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="w-60 border-r border-border bg-card/50 backdrop-blur-sm p-4 space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-60 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-title-md text-foreground flex items-center gap-2">
          <Hash className="w-4 h-4 text-primary" />
          Canais
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {general.length > 0 && (
            <div>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Geral</p>
              <div className="space-y-0.5">{general.map(renderChannel)}</div>
            </div>
          )}

          {squads.length > 0 && (
            <div>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Squads</p>
              <div className="space-y-0.5">{squads.map(renderChannel)}</div>
            </div>
          )}

          {dms.length > 0 && (
            <div>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Mensagens Diretas</p>
              <div className="space-y-0.5">{dms.map(renderChannel)}</div>
            </div>
          )}

          {clients.length > 0 && (
            <div>
              <p className="text-label-sm text-muted-foreground uppercase tracking-wider px-3 mb-1.5">Clientes</p>
              <div className="space-y-0.5">{clients.map(renderChannel)}</div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
