import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface HandRaiseButtonProps {
  channelId: string | null;
}

export function HandRaiseButton({ channelId }: HandRaiseButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: raises = [] } = useQuery({
    queryKey: ['hand-raises', channelId],
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await supabase
        .from('channel_hand_raises' as any)
        .select('*')
        .eq('channel_id', channelId)
        .is('dismissed_at', null);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!channelId,
    refetchInterval: 5000,
  });

  const myHandRaised = raises.some((r: any) => r.user_id === user?.id);

  const toggleHand = useMutation({
    mutationFn: async () => {
      if (!channelId || !user?.id) return;

      if (myHandRaised) {
        await supabase
          .from('channel_hand_raises' as any)
          .delete()
          .eq('channel_id', channelId)
          .eq('user_id', user.id);
      } else {
        const profileRes = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        await supabase
          .from('channel_hand_raises' as any)
          .upsert({
            channel_id: channelId,
            user_id: user.id,
            user_name: profileRes.data?.full_name || 'Usuário',
            raised_at: new Date().toISOString(),
            dismissed_at: null,
          }, { onConflict: 'channel_id,user_id' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hand-raises', channelId] });
      toast.success(myHandRaised ? 'Mão abaixada' : '✋ Mão levantada!');
    },
    onError: () => toast.error('Erro ao levantar mão'),
  });

  const otherRaises = raises.filter((r: any) => r.user_id !== user?.id);

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={myHandRaised ? 'default' : 'ghost'}
              size="icon"
              className={cn('h-8 w-8 relative', myHandRaised && 'animate-pulse')}
              onClick={() => toggleHand.mutate()}
              disabled={!channelId}
            >
              <Hand className="w-4 h-4" />
              {raises.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-warning text-warning-foreground text-[10px] rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5 font-bold">
                  {raises.length}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {myHandRaised ? 'Abaixar mão' : 'Levantar mão'}
            {otherRaises.length > 0 && (
              <div className="mt-1 text-xs">
                {otherRaises.map((r: any) => r.user_name).join(', ')} levantou a mão
              </div>
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
