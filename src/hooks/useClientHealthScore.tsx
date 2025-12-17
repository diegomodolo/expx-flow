import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

export interface ClientHealthData {
  id: string;
  name: string;
  healthScore: number;
  riskLevel: 'critical' | 'attention' | 'stable';
  status: string;
  balance: number | null;
  isPrePaid: boolean;
  accountStatus: number | null;
  hasFundingIssues: boolean;
  activeCampaigns: number;
  daysSinceLastActivity: number;
  lastSyncAt: string | null;
  disableReason: string | null;
  avatar: string | null;
  sector: string;
  // Score breakdown
  scoreBreakdown: {
    balanceScore: number;
    accountScore: number;
    activityScore: number;
    campaignScore: number;
  };
  // Risk factors
  riskFactors: string[];
}

interface RawClientData {
  id: string;
  name: string;
  status: string;
  payment_type: string;
  last_sync_at: string | null;
  avatar: string | null;
  sector: string;
  ad_account: {
    balance: number | null;
    account_status: number | null;
    has_funding_issues: boolean | null;
    is_prepaid: boolean | null;
    disable_reason: string | null;
  } | null;
  campaigns: {
    id: string;
    status: string;
    updated_at: string;
  }[];
}

function calculateHealthScore(client: RawClientData): ClientHealthData {
  let totalScore = 100;
  const riskFactors: string[] = [];
  const scoreBreakdown = {
    balanceScore: 25,
    accountScore: 25,
    activityScore: 25,
    campaignScore: 25,
  };

  const adAccount = client.ad_account;
  const isPrePaid = adAccount?.is_prepaid ?? client.payment_type === 'prepaid';
  const balance = adAccount?.balance ?? null;
  const accountStatus = adAccount?.account_status ?? null;
  const hasFundingIssues = adAccount?.has_funding_issues ?? false;
  const disableReason = adAccount?.disable_reason ?? null;

  // 1. Balance Score (25 points) - Only for prepaid accounts
  if (isPrePaid) {
    if (balance === null || balance === undefined) {
      scoreBreakdown.balanceScore = 15; // Unknown balance
      riskFactors.push('Saldo não sincronizado');
    } else if (balance <= 0) {
      scoreBreakdown.balanceScore = 0;
      riskFactors.push('Sem saldo na conta');
    } else if (balance < 50) {
      scoreBreakdown.balanceScore = 10;
      riskFactors.push('Saldo crítico (<R$50)');
    } else if (balance < 200) {
      scoreBreakdown.balanceScore = 18;
      riskFactors.push('Saldo baixo (<R$200)');
    } else {
      scoreBreakdown.balanceScore = 25;
    }
  } else {
    // Post-paid accounts don't have balance concerns
    scoreBreakdown.balanceScore = 25;
  }

  // 2. Account Status Score (25 points)
  if (accountStatus === null) {
    scoreBreakdown.accountScore = 20; // No account linked
  } else if (accountStatus !== 1) {
    scoreBreakdown.accountScore = 0;
    riskFactors.push('Conta de anúncios desabilitada');
    if (disableReason) {
      riskFactors.push(`Motivo: ${disableReason}`);
    }
  } else if (hasFundingIssues) {
    scoreBreakdown.accountScore = 10;
    riskFactors.push('Problemas de pagamento detectados');
  } else {
    scoreBreakdown.accountScore = 25;
  }

  // 3. Activity Score (25 points) - Based on last sync
  const daysSinceLastActivity = client.last_sync_at
    ? Math.floor((Date.now() - new Date(client.last_sync_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastActivity > 30) {
    scoreBreakdown.activityScore = 5;
    riskFactors.push('Sem sincronização há mais de 30 dias');
  } else if (daysSinceLastActivity > 14) {
    scoreBreakdown.activityScore = 10;
    riskFactors.push('Sem sincronização há mais de 14 dias');
  } else if (daysSinceLastActivity > 7) {
    scoreBreakdown.activityScore = 18;
    riskFactors.push('Sem sincronização há mais de 7 dias');
  } else {
    scoreBreakdown.activityScore = 25;
  }

  // 4. Campaign Score (25 points)
  const activeCampaigns = client.campaigns?.filter(c => c.status === 'active').length ?? 0;
  const totalCampaigns = client.campaigns?.length ?? 0;

  if (totalCampaigns === 0) {
    scoreBreakdown.campaignScore = 10;
    riskFactors.push('Nenhuma campanha cadastrada');
  } else if (activeCampaigns === 0) {
    scoreBreakdown.campaignScore = 5;
    riskFactors.push('Nenhuma campanha ativa');
  } else if (activeCampaigns < 2) {
    scoreBreakdown.campaignScore = 18;
  } else {
    scoreBreakdown.campaignScore = 25;
  }

  // Calculate total score
  totalScore = scoreBreakdown.balanceScore + scoreBreakdown.accountScore + 
               scoreBreakdown.activityScore + scoreBreakdown.campaignScore;

  // Determine risk level
  let riskLevel: 'critical' | 'attention' | 'stable' = 'stable';
  if (totalScore < 40 || hasFundingIssues || accountStatus !== 1 || (isPrePaid && balance !== null && balance <= 0)) {
    riskLevel = 'critical';
  } else if (totalScore < 70 || riskFactors.length >= 2) {
    riskLevel = 'attention';
  }

  return {
    id: client.id,
    name: client.name,
    healthScore: Math.round(totalScore),
    riskLevel,
    status: client.status,
    balance,
    isPrePaid,
    accountStatus,
    hasFundingIssues,
    activeCampaigns,
    daysSinceLastActivity,
    lastSyncAt: client.last_sync_at,
    disableReason,
    avatar: client.avatar,
    sector: client.sector,
    scoreBreakdown,
    riskFactors,
  };
}

export function useClientHealthScore() {
  const { activeCompany } = useCompany();

  const { data: clientsHealth, isLoading, error, refetch } = useQuery({
    queryKey: ['client-health-scores', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data: clients, error } = await supabase
        .from('clients')
        .select(`
          id,
          name,
          status,
          payment_type,
          last_sync_at,
          avatar,
          sector,
          ad_account:facebook_ad_accounts!clients_ad_account_id_fkey (
            balance,
            account_status,
            has_funding_issues,
            is_prepaid,
            disable_reason
          ),
          campaigns (
            id,
            status,
            updated_at
          )
        `)
        .eq('company_id', activeCompany.company_id);

      if (error) throw error;

      // Calculate health scores for each client
      const healthData = (clients || []).map((client: any) => 
        calculateHealthScore({
          ...client,
          ad_account: client.ad_account?.[0] || client.ad_account || null,
        })
      );

      // Sort by risk (critical first, then attention, then stable)
      // Within same risk level, sort by health score (lowest first)
      return healthData.sort((a, b) => {
        const riskOrder = { critical: 0, attention: 1, stable: 2 };
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return a.healthScore - b.healthScore;
      });
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Aggregate statistics
  const stats = useMemo(() => {
    if (!clientsHealth) return { critical: 0, attention: 0, stable: 0, averageScore: 0 };
    
    const critical = clientsHealth.filter(c => c.riskLevel === 'critical').length;
    const attention = clientsHealth.filter(c => c.riskLevel === 'attention').length;
    const stable = clientsHealth.filter(c => c.riskLevel === 'stable').length;
    const averageScore = clientsHealth.length > 0
      ? Math.round(clientsHealth.reduce((sum, c) => sum + c.healthScore, 0) / clientsHealth.length)
      : 0;

    return { critical, attention, stable, averageScore };
  }, [clientsHealth]);

  return {
    clientsHealth: clientsHealth || [],
    isLoading,
    error,
    refetch,
    stats,
  };
}
