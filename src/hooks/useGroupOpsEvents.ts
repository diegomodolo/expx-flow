import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface GroupOpsEvent {
  id: string;
  company_id: string;
  group_id: string;
  member_id: string | null;
  type: string;
  payload_json: any;
  timestamp: string;
  created_at: string;
}

export const EVENT_TYPES = [
  { value: 'MESSAGE', label: 'Mensagem', icon: '💬', color: 'bg-blue-500' },
  { value: 'CHECKIN_REPLY', label: 'Check-in', icon: '✅', color: 'bg-green-500' },
  { value: 'CHALLENGE_JOIN', label: 'Desafio', icon: '🏆', color: 'bg-yellow-500' },
  { value: 'BADGE_EARNED', label: 'Badge', icon: '🎖️', color: 'bg-purple-500' },
  { value: 'MEMBER_JOIN', label: 'Entrada', icon: '👋', color: 'bg-emerald-500' },
  { value: 'MEMBER_LEAVE', label: 'Saída', icon: '🚪', color: 'bg-red-500' },
  { value: 'MODERATION', label: 'Moderação', icon: '🛡️', color: 'bg-orange-500' },
  { value: 'SCORE_CHANGE', label: 'Pontuação', icon: '⭐', color: 'bg-amber-500' },
  { value: 'CAMPAIGN_SENT', label: 'Campanha', icon: '📢', color: 'bg-indigo-500' },
  { value: 'BOT_ACTION', label: 'Bot', icon: '🤖', color: 'bg-cyan-500' },
];

export function useGroupOpsEvents(groupId?: string) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const eventsQuery = useQuery({
    queryKey: ['groupops-events', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return [];
      let query = supabase
        .from('groupops_events')
        .select('*')
        .eq('company_id', companyId)
        .order('timestamp', { ascending: false })
        .limit(200);
      if (groupId) query = query.eq('group_id', groupId);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as GroupOpsEvent[];
    },
    enabled: !!companyId,
  });

  return {
    events: eventsQuery.data ?? [],
    isLoading: eventsQuery.isLoading,
    refetch: eventsQuery.refetch,
  };
}
