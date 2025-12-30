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
}

export interface HealthTask {
  id: string;
  title: string;
  clientName: string;
  clientAvatar: string | null;
  dueDate: string | null;
  priority: "high" | "medium" | "low";
}

export interface HealthDashboardData {
  // KPIs
  totalClients: number;
  criticalCount: number;
  attentionCount: number;
  stableCount: number;
  averageScore: number;
  
  // Alertas de Saldo (pré-pagos)
  balanceAlerts: ClientHealthData[];
  
  // Contas com problemas (status problemático)
  disabledAccounts: ClientHealthData[];
  
  // Sem campanhas ativas
  inactiveClients: ClientHealthData[];
  
  // Sem sincronização recente (+7 dias)
  syncAlerts: ClientHealthData[];
  
  // Ranking piores scores
  worstClients: ClientHealthData[];
  
  // Tarefas pendentes
  pendingTasks: HealthTask[];
  
  // Todos os clientes processados
  allClients: ClientHealthData[];
  
  // Última atualização
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
}

function calculateHealthScore(client: RawClientData, balance: number | null): ClientHealthData {
  let score = 100;
  const riskFactors: string[] = [];

  // Check sync status (max -25 points)
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

  // Check active campaigns (max -25 points)
  if (client.active_campaigns === 0) {
    score -= 25;
    riskFactors.push("Nenhuma campanha ativa");
  } else if (client.active_campaigns < 2) {
    score -= 10;
    riskFactors.push("Poucas campanhas ativas");
  }

  // Check balance for prepaid clients (max -30 points)
  if (client.payment_type === "pre_paid") {
    if (balance !== null) {
      if (balance < 50) {
        score -= 30;
        riskFactors.push("Saldo crítico (< R$50)");
      } else if (balance < 200) {
        score -= 20;
        riskFactors.push("Saldo baixo (< R$200)");
      } else if (balance < 500) {
        score -= 10;
        riskFactors.push("Saldo moderado (< R$500)");
      }
    } else {
      score -= 15;
      riskFactors.push("Saldo não informado");
    }
  }

  // Check status (max -20 points)
  const problemStatus = ["pausado", "paused", "disabled", "problem", "blocked", "suspended"];
  const currentStatus = (client.calculated_status || client.status || "").toLowerCase();
  
  if (problemStatus.some(s => currentStatus.includes(s))) {
    score -= 20;
    riskFactors.push(`Status problemático: ${client.calculated_status || client.status}`);
  }

  // Ensure score stays in valid range
  score = Math.max(0, Math.min(100, score));

  // Determine risk level
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
          ad_account_id
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("is_canceled", false);

      if (clientsError) throw clientsError;

      // Get ad account IDs from clients
      const adAccountIds = (clients || [])
        .map(c => c.ad_account_id)
        .filter((id): id is string => id !== null);
      
      // Fetch balances from ad accounts by their IDs
      let balanceMap = new Map<string, number>();
      
      if (adAccountIds.length > 0) {
        const { data: adAccounts, error: accountsError } = await supabase
          .from("facebook_ad_accounts")
          .select("id, balance")
          .in("id", adAccountIds);

        if (!accountsError && adAccounts) {
          // Map ad_account_id -> balance
          const adAccountBalanceMap = new Map<string, number>();
          adAccounts.forEach((acc) => {
            if (acc.id && acc.balance !== null) {
              adAccountBalanceMap.set(acc.id, Number(acc.balance));
            }
          });
          
          // Map client_id -> balance via ad_account_id
          (clients || []).forEach(client => {
            if (client.ad_account_id && adAccountBalanceMap.has(client.ad_account_id)) {
              balanceMap.set(client.id, adAccountBalanceMap.get(client.ad_account_id)!);
            }
          });
        }
      }

      // Fetch pending tasks - use 'todo' status which is valid
      const { data: tasks, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          due_date,
          priority,
          clients (
            name,
            avatar
          )
        `)
        .eq("company_id", activeCompany.company_id)
        .eq("status", "todo")
        .order("due_date", { ascending: true })
        .limit(10);

      if (tasksError) throw tasksError;

      // Process clients
      const processedClients = (clients || []).map((client) => 
        calculateHealthScore(client as RawClientData, balanceMap.get(client.id) || null)
      );

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

      // Filter specific alerts
      const balanceAlerts = processedClients.filter(c => 
        c.paymentType === "pre_paid" && c.balance !== null && c.balance < 500
      ).slice(0, 6);

      const disabledAccounts = processedClients.filter(c => {
        const status = c.status.toLowerCase();
        return ["pausado", "paused", "disabled", "problem", "blocked", "suspended"].some(s => status.includes(s));
      }).slice(0, 6);

      const inactiveClients = processedClients.filter(c => c.activeCampaigns === 0).slice(0, 6);

      const syncAlerts = processedClients.filter(c => c.lastSyncDaysAgo > 7).slice(0, 6);

      const worstClients = processedClients.filter(c => c.riskLevel !== "stable").slice(0, 6);

      // Process tasks - handle the array response from join
      const pendingTasks: HealthTask[] = (tasks || []).map((task) => {
        const clientData = Array.isArray(task.clients) ? task.clients[0] : task.clients;
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
        syncAlerts,
        worstClients,
        pendingTasks,
        allClients: processedClients,
        lastUpdate: new Date().toISOString(),
      };
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 1000 * 60 * 5, // 5 minutes
  });
}
