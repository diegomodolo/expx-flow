import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export function useGroupOpsDashboard(groupId?: string) {
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  const statsQuery = useQuery({
    queryKey: ['groupops-dashboard', companyId, groupId],
    queryFn: async () => {
      if (!companyId) return null;

      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      // Build queries based on groupId filter
      let membersQ = supabase.from('groupops_members').select('id, status, risk_level, silent_days, streak_days, display_name', { count: 'exact' }).eq('company_id', companyId).eq('status', 'active');
      let msgs24hQ = supabase.from('groupops_messages').select('id', { count: 'exact' }).eq('company_id', companyId).gte('timestamp', h24);
      let msgs7dQ = supabase.from('groupops_messages').select('id', { count: 'exact' }).eq('company_id', companyId).gte('timestamp', d7);
      let msgs30dQ = supabase.from('groupops_messages').select('id', { count: 'exact' }).eq('company_id', companyId).gte('timestamp', d30);
      let topScoresQ = supabase.from('groupops_score_ledger').select('member_id, points').eq('company_id', companyId).gte('timestamp', d7);
      // Also fetch messages with sender info for fallback ranking
      let msgRankQ = supabase.from('groupops_messages').select('author_member_id').eq('company_id', companyId).gte('timestamp', d7).not('author_member_id', 'is', null);

      if (groupId) {
        membersQ = membersQ.eq('group_id', groupId);
        msgs24hQ = msgs24hQ.eq('group_id', groupId);
        msgs7dQ = msgs7dQ.eq('group_id', groupId);
        msgs30dQ = msgs30dQ.eq('group_id', groupId);
        topScoresQ = topScoresQ.eq('group_id', groupId);
        msgRankQ = msgRankQ.eq('group_id', groupId);
      }

      const [membersRes, msgs24h, msgs7d, msgs30d, topScores, msgRank] = await Promise.all([
        membersQ,
        msgs24hQ,
        msgs7dQ,
        msgs30dQ,
        topScoresQ,
        msgRankQ,
      ]);

      const members = membersRes.data ?? [];
      const silentMembers = members.filter(m => (m.silent_days ?? 0) >= 14);
      const riskMembers = members.filter(m => m.risk_level === 'high');

      // Aggregate top scores by member
      const scoreMap = new Map<string, number>();
      (topScores.data ?? []).forEach((s: any) => {
        scoreMap.set(s.member_id, (scoreMap.get(s.member_id) ?? 0) + s.points);
      });

      let top10: { memberId: string; name: string; score: number }[];

      if (scoreMap.size > 0) {
        // Use score_ledger data
        top10 = Array.from(scoreMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([memberId, score]) => {
            const member = members.find(m => m.id === memberId);
            return { memberId, name: member?.display_name ?? 'Desconhecido', score };
          });
      } else {
        // Fallback: rank by message count in last 7 days
        const msgCountMap = new Map<string, number>();
        (msgRank.data ?? []).forEach((m: any) => {
          if (m.author_member_id) {
            msgCountMap.set(m.author_member_id, (msgCountMap.get(m.author_member_id) || 0) + 1);
          }
        });
        top10 = Array.from(msgCountMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([memberId, count]) => {
            const member = members.find(m => m.id === memberId);
            return { memberId, name: member?.display_name ?? 'Desconhecido', score: count };
          });
      }

      return {
        totalMembers: membersRes.count ?? 0,
        messages24h: msgs24h.count ?? 0,
        messages7d: msgs7d.count ?? 0,
        messages30d: msgs30d.count ?? 0,
        silentMembers,
        riskMembers,
        top10,
      };
    },
    enabled: !!companyId,
  });

  return { stats: statsQuery.data, isLoading: statsQuery.isLoading };
}
