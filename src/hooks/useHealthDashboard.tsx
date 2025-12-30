import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

export interface ClientHealthData {
  id: string;
  name: string;
  company: string;
  avatar: string | null;
  healthScore: number;
  riskLevel: "critical" | "attention" | "stable";
  riskFactors: string[];
  balance: number | null;
  activeCampaigns: number;
  lastSyncAt: string | null;
  lastSyncDaysAgo: number;
  status: string;
  statusExplanation: string | null;
  paymentType: string;
  monthlyBudget: number | null;
  avgCpl: number;
  isCanceled: boolean;
  adAccountId: string | null;
  googleAccountId: string | null;
  hasLinkedAdAccount: boolean;
  hasMetaAccount: boolean;
  hasGoogleAccount: boolean;
  // Balance analysis
  dailySpend: number | null;
  daysUntilRecharge: number | null;
  balanceStatus: "sufficient" | "tight" | "insufficient" | "no-data";
  projectedSpend: number | null;
  rechargeDay: number | null;
}

export interface HealthTask {
  id: string;
  title: string;
  clientName: string;
  clientAvatar: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
}

export interface DisqualifiedLeadClient {
  id: string;
  name: string;
  avatar: string | null;
  reportCount: number;
}

export interface HealthDashboardData {
  totalClients: number;
  criticalCount: number;
  attentionCount: number;
  stableCount: number;
  averageScore: number;
  balanceAlerts: ClientHealthData[];
  disabledAccounts: ClientHealthData[];
  inactiveClients: ClientHealthData[];
  noAdAccountClients: ClientHealthData[];
  syncAlerts: ClientHealthData[];
  worstClients: ClientHealthData[];
  disqualifiedLeadClients: DisqualifiedLeadClient[];
  pendingTasks: HealthTask[];
  allClients: ClientHealthData[];
  lastUpdate: string;
}

interface RawClientData {
  id: string;
  name: string;
  company: string;
  avatar: string | null;
  status: string;
  calculated_status: string | null;
  status_explanation: string | null;
  active_campaigns: number;
  avg_cpl: number;
  monthly_budget: number | null;
  payment_type: string;
  last_sync_at: string | null;
  is_canceled: boolean;
  meta_monthly_budget: number | null;
  google_monthly_budget: number | null;
  ad_account_id: string | null;
  google_account_id: string | null;
  meta_recharge_day: number | null;
}

interface AdAccountData {
  id: string;
  balance: number | null;
  recharge_day: number | null;
}

interface BalanceAnalysis {
  balance: number;
  dailySpend: number | null;
  daysUntilRecharge: number | null;
  balanceStatus: "sufficient" | "tight" | "insufficient" | "no-data";
  projectedSpend: number | null;
  rechargeDay: number | null;
}

function calculateBalanceAnalysis(
  balance: number | null,
  monthlyBudget: number | null,
  rechargeDay: number | null
): BalanceAnalysis {
  const actualBalance = balance ?? 0;
  
  // Estimate daily spend based on monthly budget (assuming 30 days)
  const estimatedDailySpend = monthlyBudget ? monthlyBudget / 30 : null;
  
  // Se não tem saldo
  if (!balance || balance === 0) {
    return {
      balance: actualBalance,
      dailySpend: estimatedDailySpend,
      daysUntilRecharge: null,
      balanceStatus: "insufficient",
      projectedSpend: null,
      rechargeDay,
    };
  }
  
  // Se não tem budget para calcular
  if (!estimatedDailySpend || estimatedDailySpend === 0) {
    // Classificar apenas pelo saldo absoluto
    let status: "sufficient" | "tight" | "insufficient" | "no-data" = "no-data";
    if (actualBalance < 100) status = "insufficient";
    else if (actualBalance < 300) status = "tight";
    else status = "sufficient";
    
    return {
      balance: actualBalance,
      dailySpend: null,
      daysUntilRecharge: null,
      balanceStatus: status,
      projectedSpend: null,
      rechargeDay,
    };
  }
  
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  let nextRechargeDate: Date;
  
  // Se tem dia de recarga configurado, usar ele
  if (rechargeDay && rechargeDay >= 1 && rechargeDay <= 31) {
    if (currentDay < rechargeDay) {
      nextRechargeDate = new Date(currentYear, currentMonth, rechargeDay);
    } else {
      nextRechargeDate = new Date(currentYear, currentMonth + 1, rechargeDay);
    }
    
    const maxDayInMonth = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth() + 1, 0).getDate();
    if (rechargeDay > maxDayInMonth) {
      nextRechargeDate = new Date(nextRechargeDate.getFullYear(), nextRechargeDate.getMonth(), maxDayInMonth);
    }
  } else {
    // Fallback: usar último dia do mês atual
    nextRechargeDate = new Date(currentYear, currentMonth + 1, 0);
  }
  
  const timeDiff = nextRechargeDate.getTime() - now.getTime();
  const daysUntilRecharge = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  
  const projectedSpend = estimatedDailySpend * daysUntilRecharge;
  const coveragePercentage = (actualBalance / projectedSpend) * 100;
  
  let balanceStatus: "sufficient" | "tight" | "insufficient";
  if (coveragePercentage >= 100) {
    balanceStatus = "sufficient";
  } else if (coveragePercentage >= 70) {
    balanceStatus = "tight";
  } else {
    balanceStatus = "insufficient";
  }
  
  return {
    balance: actualBalance,
    dailySpend: estimatedDailySpend,
    daysUntilRecharge,
    balanceStatus,
    projectedSpend,
    rechargeDay,
  };
}

function calculateHealthScore(
  client: RawClientData, 
  balance: number | null,
  balanceAnalysis: BalanceAnalysis
): ClientHealthData {
  const hasMetaAccount = !!client.ad_account_id;
  const hasGoogleAccount = !!client.google_account_id;
  const hasLinkedAdAccount = hasMetaAccount || hasGoogleAccount;
  let score = 100;
  const riskFactors: string[] = [];

  const lastSyncDaysAgo = client.last_sync_at
    ? Math.floor((Date.now() - new Date(client.last_sync_at).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (lastSyncDaysAgo > 30) {
    score -= 25;
    riskFactors.push("Sem sincronização há mais de 30 dias");
  } else if (lastSyncDaysAgo > 14) {
    score -= 15;
    riskFactors.push("Sincronização atrasada (+14 dias)");
  } else if (lastSyncDaysAgo > 7) {
    score -= 10;
    riskFactors.push("Sincronização atrasada (+7 dias)");
  }

  if (client.active_campaigns === 0) {
    score -= 25;
    riskFactors.push("Nenhuma campanha ativa");
  } else if (client.active_campaigns < 2) {
    score -= 10;
    riskFactors.push("Poucas campanhas ativas");
  }

  if (client.payment_type === "prepaid") {
    if (balanceAnalysis.balanceStatus === "insufficient") {
      score -= 30;
      riskFactors.push("Saldo não vai durar até a recarga");
    } else if (balanceAnalysis.balanceStatus === "tight") {
      score -= 15;
      riskFactors.push("Saldo apertado até a recarga");
    }
  }

  const problemStatus = ["pausado", "paused", "disabled", "problem", "blocked", "suspended"];
  const currentStatus = (client.calculated_status || client.status || "").toLowerCase();
  
  if (problemStatus.some(s => currentStatus.includes(s))) {
    score -= 20;
    riskFactors.push(`Status problemático: ${client.calculated_status || client.status}`);
  }

  score = Math.max(0, Math.min(100, score));

  let riskLevel: "critical" | "attention" | "stable";
  if (score < 40) {
    riskLevel = "critical";
  } else if (score < 70) {
    riskLevel = "attention";
  } else {
    riskLevel = "stable";
  }

  return {
    id: client.id,
    name: client.name,
    company: client.company,
    avatar: client.avatar,
    healthScore: score,
    riskLevel,
    riskFactors,
    balance,
    activeCampaigns: client.active_campaigns,
    lastSyncAt: client.last_sync_at,
    lastSyncDaysAgo,
    status: client.calculated_status || client.status,
    statusExplanation: client.status_explanation,
    paymentType: client.payment_type,
    monthlyBudget: client.monthly_budget || client.meta_monthly_budget || client.google_monthly_budget,
    avgCpl: client.avg_cpl,
    isCanceled: client.is_canceled,
    adAccountId: client.ad_account_id,
    googleAccountId: client.google_account_id,
    hasLinkedAdAccount,
    hasMetaAccount,
    hasGoogleAccount,
    dailySpend: balanceAnalysis.dailySpend,
    daysUntilRecharge: balanceAnalysis.daysUntilRecharge,
    balanceStatus: balanceAnalysis.balanceStatus,
    projectedSpend: balanceAnalysis.projectedSpend,
    rechargeDay: balanceAnalysis.rechargeDay,
  };
}

export function useHealthDashboard() {
  const { activeCompany } = useCompany();

  return useQuery({
    queryKey: ["health-dashboard", activeCompany?.company_id],
    queryFn: async (): Promise<HealthDashboardData> => {
      if (!activeCompany?.company_id) {
        throw new Error("No active company");
      }

      // Fetch clients
      const { data: clients, error: clientsError } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          company,
          avatar,
          status,
          calculated_status,
          status_explanation,
          active_campaigns,
          avg_cpl,
          monthly_budget,
          payment_type,
          last_sync_at,
          is_canceled,
          meta_monthly_budget,
          google_monthly_budget,
          ad_account_id,
          google_account_id,
          meta_recharge_day
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("is_canceled", false);

      if (clientsError) throw clientsError;

      // Get ad account IDs from clients
      const adAccountIds = (clients || [])
        .map(c => c.ad_account_id)
        .filter((id): id is string => id !== null);
      
      // Fetch ad accounts with balance and recharge_day
      let adAccountMap = new Map<string, AdAccountData>();
      
      if (adAccountIds.length > 0) {
        const { data: adAccounts, error: accountsError } = await supabase
          .from("facebook_ad_accounts")
          .select("id, balance, recharge_day")
          .in("id", adAccountIds);

        if (!accountsError && adAccounts) {
          adAccounts.forEach((acc) => {
            if (acc.id) {
              adAccountMap.set(acc.id, {
                id: acc.id,
                balance: acc.balance !== null ? Number(acc.balance) : null,
                recharge_day: acc.recharge_day,
              });
            }
          });
        }
      }

      // Fetch disqualified leads reports (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: disqualifiedReports, error: reportsError } = await supabase
        .from("lead_disqualification_reports")
        .select("client_id")
        .eq("company_id", activeCompany.company_id)
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Count reports per client
      const reportCountMap = new Map<string, number>();
      if (!reportsError && disqualifiedReports) {
        disqualifiedReports.forEach((report) => {
          const count = reportCountMap.get(report.client_id) || 0;
          reportCountMap.set(report.client_id, count + 1);
        });
      }

      // Fetch pending tasks
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          due_date,
          priority,
          related_client_id
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("status", "todo")
        .order("due_date", { ascending: true })
        .limit(10);

      if (tasksError) throw tasksError;
      
      // Get client info for tasks that have related_client_id
      const taskClientIds = (tasks || [])
        .map(t => t.related_client_id)
        .filter((id): id is string => id !== null);
      
      let taskClientMap = new Map<string, { name: string; avatar: string | null }>();
      
      if (taskClientIds.length > 0) {
        const { data: taskClients } = await supabase
          .from("clients")
          .select("id, name, avatar")
          .in("id", taskClientIds);
        
        (taskClients || []).forEach(c => {
          taskClientMap.set(c.id, { name: c.name, avatar: c.avatar });
        });
      }

      // Process clients
      const processedClients = (clients || []).map((client) => {
        const adAccount = client.ad_account_id ? adAccountMap.get(client.ad_account_id) : null;
        const balance = adAccount?.balance ?? null;
        const monthlyBudget = client.monthly_budget || client.meta_monthly_budget || client.google_monthly_budget;
        const rechargeDay = client.meta_recharge_day || adAccount?.recharge_day || null;
        const balanceAnalysis = calculateBalanceAnalysis(balance, monthlyBudget, rechargeDay);
        
        return calculateHealthScore(
          client as RawClientData, 
          balance,
          balanceAnalysis
        );
      });

      // Sort by risk level and score
      const riskOrder = { critical: 0, attention: 1, stable: 2 };
      processedClients.sort((a, b) => {
        if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
          return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
        }
        return a.healthScore - b.healthScore;
      });

      // Calculate stats
      const criticalCount = processedClients.filter(c => c.riskLevel === "critical").length;
      const attentionCount = processedClients.filter(c => c.riskLevel === "attention").length;
      const stableCount = processedClients.filter(c => c.riskLevel === "stable").length;
      const averageScore = processedClients.length > 0
        ? Math.round(processedClients.reduce((sum, c) => sum + c.healthScore, 0) / processedClients.length)
        : 0;

      // Balance alerts: prepaid clients with insufficient or tight balance
      const balanceAlerts = processedClients.filter(c => 
        c.paymentType === "prepaid" && 
        (c.balanceStatus === "insufficient" || c.balanceStatus === "tight")
      )
      .sort((a, b) => {
        const statusOrder = { insufficient: 0, tight: 1, sufficient: 2, "no-data": 3 };
        return statusOrder[a.balanceStatus] - statusOrder[b.balanceStatus];
      })
      .slice(0, 6);

      const disabledAccounts = processedClients.filter(c => {
        const status = c.status.toLowerCase();
        return ["pausado", "paused", "disabled", "problem", "blocked", "suspended"].some(s => status.includes(s));
      }).slice(0, 6);

      const inactiveClients = processedClients.filter(c => c.activeCampaigns === 0).slice(0, 6);

      const noAdAccountClients = processedClients.filter(c => !c.hasLinkedAdAccount).slice(0, 6);

      const syncAlerts = processedClients.filter(c => 
        c.hasLinkedAdAccount && c.lastSyncDaysAgo > 7
      ).slice(0, 6);

      const worstClients = processedClients.filter(c => c.riskLevel !== "stable").slice(0, 6);

      // Build disqualified leads clients list
      const disqualifiedLeadClients: DisqualifiedLeadClient[] = [];
      const clientMap = new Map(processedClients.map(c => [c.id, c]));
      
      const sortedReports = Array.from(reportCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      
      for (const [clientId, count] of sortedReports) {
        const client = clientMap.get(clientId);
        if (client) {
          disqualifiedLeadClients.push({
            id: client.id,
            name: client.name,
            avatar: client.avatar,
            reportCount: count,
          });
        }
      }

      // Process tasks
      const pendingTasks: HealthTask[] = (tasks || []).map((task) => {
        const clientData = task.related_client_id 
          ? taskClientMap.get(task.related_client_id) 
          : null;
        return {
          id: task.id,
          title: task.title,
          clientName: clientData?.name || "Sem cliente",
          clientAvatar: clientData?.avatar || null,
          dueDate: task.due_date,
          priority: task.priority || "medium",
        };
      });

      return {
        totalClients: processedClients.length,
        criticalCount,
        attentionCount,
        stableCount,
        averageScore,
        balanceAlerts,
        disabledAccounts,
        inactiveClients,
        noAdAccountClients,
        syncAlerts,
        worstClients,
        disqualifiedLeadClients,
        pendingTasks,
        allClients: processedClients,
        lastUpdate: new Date().toISOString(),
      };
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}
