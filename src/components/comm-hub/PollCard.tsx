import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { BarChart3, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PollCardProps {
  messageId: string;
}

interface PollData {
  id: string;
  question: string;
  options: string[];
  allow_multiple: boolean;
  is_anonymous: boolean;
  created_by: string;
}

interface VoteData {
  option_index: number;
  user_id: string;
}

export function PollCard({ messageId }: PollCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: poll } = useQuery({
    queryKey: ['internal-poll', messageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('internal_polls')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (error) return null;
      return {
        ...data,
        options: (data.options as any) as string[],
      } as PollData;
    },
  });

  const { data: votes = [] } = useQuery({
    queryKey: ['internal-poll-votes', poll?.id],
    queryFn: async () => {
      if (!poll?.id) return [];
      const { data, error } = await supabase
        .from('internal_poll_votes')
        .select('option_index, user_id')
        .eq('poll_id', poll.id);

      if (error) return [];
      return data as VoteData[];
    },
    enabled: !!poll?.id,
  });

  // Realtime for votes
  useEffect(() => {
    if (!poll?.id) return;
    const channel = supabase
      .channel(`poll-votes-${poll.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'internal_poll_votes',
        filter: `poll_id=eq.${poll.id}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['internal-poll-votes', poll.id] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [poll?.id, queryClient]);

  const handleVote = useCallback(async (optionIndex: number) => {
    if (!poll || !user?.id) return;

    const myVoteForOption = votes.find(v => v.user_id === user.id && v.option_index === optionIndex);

    try {
      if (myVoteForOption) {
        // Remove vote
        await supabase
          .from('internal_poll_votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('user_id', user.id)
          .eq('option_index', optionIndex);
      } else {
        if (!poll.allow_multiple) {
          // Remove existing votes first
          await supabase
            .from('internal_poll_votes')
            .delete()
            .eq('poll_id', poll.id)
            .eq('user_id', user.id);
        }

        await supabase
          .from('internal_poll_votes')
          .insert({
            poll_id: poll.id,
            user_id: user.id,
            option_index: optionIndex,
          });
      }

      queryClient.invalidateQueries({ queryKey: ['internal-poll-votes', poll.id] });
    } catch (err) {
      console.error('Vote error:', err);
      toast.error('Erro ao votar');
    }
  }, [poll, user?.id, votes, queryClient]);

  if (!poll) return null;

  const totalVotes = votes.length;
  const uniqueVoters = new Set(votes.map(v => v.user_id)).size;
  const myVotes = new Set(votes.filter(v => v.user_id === user?.id).map(v => v.option_index));

  return (
    <div className="mt-2 rounded-xl border border-border bg-card p-3 max-w-sm">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{poll.question}</span>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((option, index) => {
          const optionVotes = votes.filter(v => v.option_index === index).length;
          const percentage = totalVotes > 0 ? Math.round((optionVotes / totalVotes) * 100) : 0;
          const isSelected = myVotes.has(index);

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              className={cn(
                'relative w-full text-left rounded-lg px-3 py-2 text-sm transition-all overflow-hidden border',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 bg-background'
              )}
            >
              {/* Progress bar */}
              <div
                className="absolute inset-0 bg-primary/10 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  <span className={cn('truncate', isSelected && 'font-medium text-primary')}>
                    {option}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {optionVotes} ({percentage}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {uniqueVoters} {uniqueVoters === 1 ? 'voto' : 'votos'}
        </span>
        <div className="flex items-center gap-2">
          {poll.allow_multiple && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Múltipla escolha</span>
          )}
          {poll.is_anonymous && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Anônima</span>
          )}
        </div>
      </div>
    </div>
  );
}
