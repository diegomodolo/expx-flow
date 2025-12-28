import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "./useAuth";

export interface TVMetrics {
  totalInvestment: number;
  totalLeads: number;
  averageCPA: number;
  averageCTR: number;
  mqlRate: number;
  investmentChange: number;
  leadsChange: number;
  cpaChange: number;
  ctrChange: number;
}

export interface TVCampaign {
  id: string;
  name: string;
  clientName: string;
  clientId: string;
  spend: number;
  conversions: number;
  cpa: number;
  ctr: number;
  status: string;
}

export interface TVAlert {
  id: string;
  type: "danger" | "warning" | "opportunity";
  title: string;
  description: string;
  clientName: string;
  campaignName: string;
  metric: string;
  value: string;
}

export interface TVClient {
  id: string;
  name: string;
  status: string;
  statusExplanation: string | null;
  activeCampaigns: number;
  avgCpl: number;
}

export interface TVTask {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  clientName: string | null;
  status: string;
}

export interface TrafegoDashboardData {
  metrics: TVMetrics;
  topCampaigns: TVCampaign[];
  alerts: TVAlert[];
  clientsOnAlert: TVClient[];
  pendingTasks: TVTask[];
  lastSync: string;
}

export function useTrafegoDashboard(refreshInterval: number = 5 * 60 * 1000) {
  const { activeCompany } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["trafego-dashboard", activeCompany?.company_id],
    enabled: !!user && !!activeCompany,
    refetchInterval: refreshInterval,
    staleTime: 60 * 1000, // 1 min
    queryFn: async (): Promise<TrafegoDashboardData> => {
      if (!activeCompany) throw new Error("No active company");

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      // Fetch all data in parallel
      const [
        campaignsRes,
        prevCampaignsRes,
        clientsRes,
        tasksRes,
      ] = await Promise.all([
        // Current period campaigns
        supabase
          .from("campaigns")
          .select(`*, clients!inner(id, name, status)`)
          .eq("company_id", activeCompany.company_id)
          .gte("created_at", thirtyDaysAgo.toISOString()),
        
        // Previous period campaigns
        supabase
          .from("campaigns")
          .select("spend, conversions, ctr")
          .eq("company_id", activeCompany.company_id)
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString()),
        
        // Clients with status
        supabase
          .from("clients")
          .select("id, name, status, calculated_status, status_explanation, active_campaigns, avg_cpl")
          .eq("company_id", activeCompany.company_id),
        
        // Pending tasks
        supabase
          .from("tasks")
          .select("id, title, priority, due_date, status, clients(name)")
          .eq("company_id", activeCompany.company_id)
          .in("status", ["todo", "progress"])
          .order("priority", { ascending: false })
          .order("due_date", { ascending: true })
          .limit(10),
      ]);

      const campaigns = campaignsRes.data || [];
      const prevCampaigns = prevCampaignsRes.data || [];
      const clients = clientsRes.data || [];
      const tasks = tasksRes.data || [];

      // Calculate metrics
      const totalInvestment = campaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalLeads = campaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      const averageCPA = totalLeads > 0 ? totalInvestment / totalLeads : 0;
      const totalCtr = campaigns.reduce((sum, c) => sum + (c.ctr || 0), 0);
      const averageCTR = campaigns.length > 0 ? totalCtr / campaigns.length : 0;

      // Previous period metrics
      const prevInvestment = prevCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const prevLeads = prevCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      const prevCPA = prevLeads > 0 ? prevInvestment / prevLeads : 0;
      const prevCtr = prevCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0);
      const prevAvgCTR = prevCampaigns.length > 0 ? prevCtr / prevCampaigns.length : 0;

      // Calculate changes
      const calcChange = (curr: number, prev: number) => 
        prev > 0 ? ((curr - prev) / prev) * 100 : 0;

      const metrics: TVMetrics = {
        totalInvestment,
        totalLeads,
        averageCPA,
        averageCTR,
        mqlRate: 0, // Can be calculated from lead quality data if available
        investmentChange: calcChange(totalInvestment, prevInvestment),
        leadsChange: calcChange(totalLeads, prevLeads),
        cpaChange: calcChange(averageCPA, prevCPA),
        ctrChange: calcChange(averageCTR, prevAvgCTR),
      };

      // Top campaigns by CPA (lower is better, filter only those with conversions)
      const activeCampaigns = campaigns.filter(c => 
        c.status === "active" && (c.conversions || 0) > 0
      );
      
      const topCampaigns: TVCampaign[] = activeCampaigns
        .sort((a, b) => (a.cpa || 999999) - (b.cpa || 999999))
        .slice(0, 10)
        .map(c => ({
          id: c.id,
          name: c.name,
          clientName: (c.clients as any)?.name || "N/A",
          clientId: (c.clients as any)?.id || "",
          spend: c.spend || 0,
          conversions: c.conversions || 0,
          cpa: c.cpa || 0,
          ctr: c.ctr || 0,
          status: c.status,
        }));

      // Generate alerts
      const alerts: TVAlert[] = [];
      
      // High CPA alerts
      activeCampaigns
        .filter(c => (c.cpa || 0) > 50 && (c.conversions || 0) > 0)
        .slice(0, 3)
        .forEach(c => {
          alerts.push({
            id: `cpa-${c.id}`,
            type: "danger",
            title: "CPA Alto",
            description: `CPA acima de R$ 50`,
            clientName: (c.clients as any)?.name || "N/A",
            campaignName: c.name,
            metric: "CPA",
            value: `R$ ${(c.cpa || 0).toFixed(2)}`,
          });
        });

      // Low CTR alerts
      activeCampaigns
        .filter(c => (c.ctr || 0) < 1 && (c.impressions || 0) > 1000)
        .slice(0, 3)
        .forEach(c => {
          alerts.push({
            id: `ctr-${c.id}`,
            type: "warning",
            title: "CTR Baixo",
            description: `CTR abaixo de 1%`,
            clientName: (c.clients as any)?.name || "N/A",
            campaignName: c.name,
            metric: "CTR",
            value: `${(c.ctr || 0).toFixed(2)}%`,
          });
        });

      // Scaling opportunities
      activeCampaigns
        .filter(c => (c.cpa || 999) < 30 && (c.conversions || 0) >= 5)
        .slice(0, 3)
        .forEach(c => {
          alerts.push({
            id: `scale-${c.id}`,
            type: "opportunity",
            title: "Oportunidade de Escala",
            description: `CPA excelente, considerar aumentar budget`,
            clientName: (c.clients as any)?.name || "N/A",
            campaignName: c.name,
            metric: "CPA",
            value: `R$ ${(c.cpa || 0).toFixed(2)}`,
          });
        });

      // Clients on alert (yellow/red status)
      const clientsOnAlert: TVClient[] = clients
        .filter(c => {
          const status = c.calculated_status || c.status;
          return status === "atencao" || status === "emergencia";
        })
        .map(c => ({
          id: c.id,
          name: c.name,
          status: c.calculated_status || c.status,
          statusExplanation: c.status_explanation,
          activeCampaigns: c.active_campaigns || 0,
          avgCpl: c.avg_cpl || 0,
        }));

      // Pending tasks
      const pendingTasks: TVTask[] = tasks.map(t => ({
        id: t.id,
        title: t.title,
        priority: t.priority || "medium",
        dueDate: t.due_date,
        clientName: (t.clients as any)?.name || null,
        status: t.status,
      }));

      return {
        metrics,
        topCampaigns,
        alerts,
        clientsOnAlert,
        pendingTasks,
        lastSync: new Date().toISOString(),
      };
    },
  });
}
