import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployeePermissions } from "./useEmployeePermissions";

export type ClientStatus = "excelente" | "atencao" | "emergencial" | "inativo" | "sem_fundos";
export type DatabaseClientStatus = "green" | "yellow" | "red" | "orange";

// Threshold for considering good lead volume (leads per week)
const GOOD_LEADS_THRESHOLD = 30;

// Threshold for considering good CPA (cost per acquisition)
const GOOD_CPA_THRESHOLD = 25;

// Mapping between database status and display status
const statusMapping = {
  database: {
    excelente: "green" as const,
    atencao: "yellow" as const,
    emergencial: "red" as const,
    inativo: "red" as const, // Map inativo to red in database
    sem_fundos: "orange" as const,
  },
  display: {
    green: "excelente" as const,
    yellow: "atencao" as const,
    red: "emergencial" as const, // Default red to emergencial
    orange: "sem_fundos" as const,
  }
};

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  sector: string;
  status: ClientStatus;
  active_campaigns: number;
  avg_cpl: number;
  avatar: string;
  monthly_budget?: number;
  target_audience?: string;
  product_name?: string;
  voice_tone?: string;
  objectives?: string;
  preferred_platforms?: string[];
  campaign_type?: string;
  notes?: string;
  ad_account_id?: string;
  leads_generated: number;
  spend?: number;
  last_sync_at?: string;
  last_sync_period?: string;
  website_url?: string;
  ai_briefing?: string;
  briefing_generated_at?: string;
  team_id?: string;
  facebook_ad_accounts?: {
    id: string;
    account_name: string;
    balance: number;
    account_status: number;
    disable_reason?: string;
    has_funding_issues: boolean;
    last_balance_check?: string;
    is_prepaid: boolean;
    funding_source_details?: any;
  };
  team?: {
    id: string;
    name: string;
    color: string;
  };
  inactive_reason?: string;
}

// Helper function to get all client metrics for rule evaluation
const getClientMetrics = async (
  clientId: string,
  companyId: string
): Promise<Record<string, number | boolean | null>> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Fetch client data including funding and manual status
  const { data: clientData } = await supabase
    .from("clients")
    .select(`
      status,
      inactive_reason,
      facebook_ad_accounts!ad_account_id (
        balance,
        account_status,
        has_funding_issues,
        disable_reason
      )
    `)
    .eq("id", clientId)
    .maybeSingle();

  // Fetch campaigns data
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("*")
    .eq("client_id", clientId)
    .eq("company_id", companyId);

  // Fetch ads data for quality rankings
  const { data: ads } = await supabase
    .from("ads")
    .select("quality_ranking, engagement_rate_ranking, conversion_rate_ranking, status")
    .eq("client_id", clientId)
    .eq("company_id", companyId);

  // Fetch last optimization
  const { data: lastOptimization } = await supabase
    .from("optimization_history")
    .select("performed_at")
    .eq("client_id", clientId)
    .eq("company_id", companyId)
    .order("performed_at", { ascending: false })
    .limit(1);

  const { data: lastChange } = await supabase
    .from("change_audit_log")
    .select("created_at")
    .eq("client_id", clientId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1);

  // Extract funding information
  const adAccount = clientData?.facebook_ad_accounts?.[0];
  const hasFundingIssues = adAccount ? (
    adAccount.account_status !== 1 || 
    adAccount.balance <= 0 || 
    adAccount.has_funding_issues ||
    (adAccount.disable_reason && adAccount.disable_reason.toLowerCase().includes('funding'))
  ) : false;
  const accountBalance = adAccount?.balance || 0;
  const accountStatus = adAccount?.account_status || 0;

  // Extract manual status
  const manualInactiveStatus = clientData?.status === "red" && !!clientData?.inactive_reason;

  if (!campaigns) {
    return {
      current_week_leads: 0,
      previous_week_leads: 0,
      leads_last_7_days: 0,
      leads_last_30_days: 0,
      average_cpl: 0,
      average_ctr: 0,
      average_cpa: 0,
      current_week_cpa: 0,
      current_week_spend: 0,
      active_campaigns_count: 0,
      recent_campaigns_count: 0,
      days_since_last_optimization: 999,
      lead_drop_percentage: 0,
      has_funding_issues: hasFundingIssues,
      has_quality_issues: false,
      has_reproved_ads: false,
      account_balance: accountBalance,
      account_status: accountStatus,
      days_without_changes: 999,
      manual_inactive_status: manualInactiveStatus,
    };
  }

  // Calculate metrics
  const activeCampaigns = campaigns.filter(c => 
    c.is_active && c.status === 'active' && new Date(c.updated_at) >= sevenDaysAgo
  );

  const recentCampaigns = campaigns.filter(c => 
    new Date(c.updated_at) >= thirtyDaysAgo
  );

  const currentWeekLeads = campaigns
    .filter(c => new Date(c.updated_at) >= sevenDaysAgo)
    .reduce((sum, c) => sum + (c.conversions || 0), 0);

  const previousWeekLeads = campaigns
    .filter(c => new Date(c.updated_at) >= fourteenDaysAgo && new Date(c.updated_at) < sevenDaysAgo)
    .reduce((sum, c) => sum + (c.conversions || 0), 0);

  const leads30Days = campaigns
    .filter(c => new Date(c.updated_at) >= thirtyDaysAgo)
    .reduce((sum, c) => sum + (c.conversions || 0), 0);

  const totalCTR = activeCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0);
  const averageCTR = activeCampaigns.length > 0 ? totalCTR / activeCampaigns.length : 0;

  const currentWeekSpend = campaigns
    .filter(c => new Date(c.updated_at) >= sevenDaysAgo)
    .reduce((sum, c) => sum + (c.spend || 0), 0);
  
  const currentWeekCPA = currentWeekLeads > 0 ? currentWeekSpend / currentWeekLeads : 0;

  const lastOptimizationDate = lastOptimization?.[0]?.performed_at 
    ? new Date(lastOptimization[0].performed_at)
    : lastChange?.[0]?.created_at 
    ? new Date(lastChange[0].created_at)
    : null;

  const daysSinceLastOptimization = lastOptimizationDate 
    ? Math.floor((now.getTime() - lastOptimizationDate.getTime()) / (24 * 60 * 60 * 1000))
    : 999;

  const hasQualityIssues = ads?.some(ad => 
    ad.quality_ranking === 'BELOW_AVERAGE' || 
    ad.engagement_rate_ranking === 'BELOW_AVERAGE' ||
    ad.conversion_rate_ranking === 'BELOW_AVERAGE'
  ) || false;

  const hasReprovedAds = ads?.some(ad => ad.status === 'disapproved') || false;

  const leadDropPercentage = previousWeekLeads > 0 
    ? ((previousWeekLeads - currentWeekLeads) / previousWeekLeads) * 100 
    : 0;

  return {
    current_week_leads: currentWeekLeads,
    previous_week_leads: previousWeekLeads,
    leads_last_7_days: currentWeekLeads,
    leads_last_30_days: leads30Days,
    average_cpl: 0,
    average_ctr: averageCTR,
    average_cpa: 0,
    current_week_cpa: currentWeekCPA,
    current_week_spend: currentWeekSpend,
    active_campaigns_count: activeCampaigns.length,
    recent_campaigns_count: recentCampaigns.length,
    days_since_last_optimization: daysSinceLastOptimization,
    lead_drop_percentage: leadDropPercentage,
    has_funding_issues: hasFundingIssues,
    has_quality_issues: hasQualityIssues,
    has_reproved_ads: hasReprovedAds,
    account_balance: accountBalance,
    account_status: accountStatus,
    days_without_changes: daysSinceLastOptimization,
    manual_inactive_status: manualInactiveStatus,
  };
};

// Helper function to evaluate a single rule against metrics
const evaluateRule = (
  rule: any,
  metrics: Record<string, any>
): boolean => {
  const { conditions } = rule.conditions;
  const logic = rule.conditions.logic;
  
  const results = conditions.map((condition: any) => {
    const value = metrics[condition.field];
    
    switch (condition.operator) {
      case '<': return Number(value) < Number(condition.value);
      case '>': return Number(value) > Number(condition.value);
      case '<=': return Number(value) <= Number(condition.value);
      case '>=': return Number(value) >= Number(condition.value);
      case '=': 
        if (condition.type === 'boolean') {
          return Boolean(value) === Boolean(condition.value);
        }
        return value === condition.value;
      case '!=': return value !== condition.value;
      default: return false;
    }
  });
  
  return logic === 'AND' 
    ? results.every(r => r === true)
    : results.some(r => r === true);
};

// Helper function to generate status explanation
const generateExplanation = (
  status: ClientStatus,
  metrics: Record<string, any>,
  ruleName?: string
): string => {
  const statusEmojis = {
    sem_fundos: "💳",
    inativo: "⚫",
    emergencial: "🚨",
    atencao: "⚠️",
    excelente: "✅"
  };

  const emoji = statusEmojis[status] || "ℹ️";
  const baseExplanations = {
    sem_fundos: "Conta sem fundos suficientes para rodar anúncios",
    inativo: "Cliente inativo há mais de 30 dias",
    emergencial: "Situação crítica! Cliente precisa de atenção urgente",
    atencao: "Cliente requer monitoramento",
    excelente: "Performance excelente! Cliente em ótimo estado"
  };

  let explanation = `${emoji} ${baseExplanations[status] || "Status calculado baseado em regras customizadas"}`;
  
  if (ruleName) {
    explanation += `\n\nRegra aplicada: ${ruleName}`;
  }
  
  // Add relevant metrics
  explanation += `\n\nMétricas principais:`;
  if (metrics.current_week_leads !== undefined) {
    explanation += `\n• Leads esta semana: ${metrics.current_week_leads}`;
  }
  if (metrics.previous_week_leads !== undefined) {
    explanation += `\n• Leads semana anterior: ${metrics.previous_week_leads}`;
  }
  if (metrics.average_ctr !== undefined) {
    explanation += `\n• CTR médio: ${metrics.average_ctr.toFixed(2)}%`;
  }
  if (metrics.current_week_cpa !== undefined && metrics.current_week_cpa > 0) {
    explanation += `\n• CPA esta semana: R$ ${metrics.current_week_cpa.toFixed(2)}`;
  }
  if (metrics.active_campaigns_count !== undefined) {
    explanation += `\n• Campanhas ativas: ${metrics.active_campaigns_count}`;
  }
  if (metrics.days_since_last_optimization !== undefined && metrics.days_since_last_optimization < 999) {
    explanation += `\n• Última otimização: há ${metrics.days_since_last_optimization} dias`;
  }
  
  // Special flags
  if (metrics.has_funding_issues) {
    explanation += `\n\n⚠️ Problema de fundos detectado`;
  }
  if (metrics.has_reproved_ads) {
    explanation += `\n⚠️ Anúncios reprovados detectados`;
  }
  if (metrics.has_quality_issues) {
    explanation += `\n⚠️ Problemas de qualidade detectados`;
  }
  if (metrics.manual_inactive_status) {
    explanation += `\n⚠️ Cliente marcado como inativo manualmente`;
  }

  return explanation;
};

// Function to calculate automatic status based on campaign metrics (exported for reuse)
export const calculateClientStatus = async (
  clientId: string, 
  companyId?: string
): Promise<{ status: ClientStatus; explanation: string }> => {
  try {
    // Get all client metrics (now includes ALL metrics including funding and manual status)
    const metrics = await getClientMetrics(clientId, companyId || '');

    // Fetch custom rules for this company
    const { data: rules } = await supabase
      .from("client_status_rules")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("rule_order", { ascending: true });

    // Apply rules in order
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        if (evaluateRule(rule, metrics)) {
          return {
            status: rule.status_output as ClientStatus,
            explanation: generateExplanation(rule.status_output as ClientStatus, metrics, rule.rule_name)
          };
        }
      }
    }
    
    // Fallback if no rule matched
    return {
      status: "atencao",
      explanation: generateExplanation("atencao", metrics, "Nenhuma regra correspondente")
    };

  } catch (error) {
    console.error('Error calculating client status:', error);
    return {
      status: "atencao",
      explanation: "Erro ao calcular status. Requer análise manual."
    };
  }
};

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recalculatingProgress, setRecalculatingProgress] = useState<{
    current: number;
    total: number;
    clientName: string;
  }>({ current: 0, total: 0, clientName: '' });
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { hasPermission, isOwner, permissionsLoading, currentUserPermissions } = useEmployeePermissions();

  const fetchClients = useCallback(async () => {
    if (!user || !activeCompany) return;
    
    // During permissions loading, don't fetch for non-owners
    if (permissionsLoading && !isOwner) {
      setLoading(true);
      return;
    }
    
    // Check if user has permission to access clients or content generator
    // Use currentUserPermissions directly instead of hasPermission function
    const hasClientsPermission = currentUserPermissions.includes('clientes');
    const hasContentPermission = currentUserPermissions.includes('gerador-conteudo');
    
    if (!isOwner && !hasClientsPermission && !hasContentPermission) {
      setClients([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          facebook_ad_accounts!ad_account_id (
            id,
            account_name,
            balance,
            account_status,
            disable_reason,
            has_funding_issues,
            last_balance_check,
            is_prepaid,
            funding_source_details
          ),
          team:teams!team_id (
            id,
            name,
            color
          )
        `)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Use cached status from database, fallback to calculating if not available
      const clientsWithStatus = await Promise.all((data || []).map(async (client) => {
        // PRIORITY 1: If manual_status is set, always use it (user override)
        if (client.manual_status) {
          return {
            ...client,
            status: statusMapping.display[client.manual_status] as ClientStatus,
            statusExplanation: '⚠️ Cliente marcado como inativo manualmente'
          };
        }

        // PRIORITY 2: If status was calculated and is recent (less than 24h old), use cached version
        const statusAge = client.status_calculated_at 
          ? Date.now() - new Date(client.status_calculated_at).getTime()
          : Infinity;
        const isStatusFresh = statusAge < 24 * 60 * 60 * 1000; // 24 hours

        if (client.calculated_status && isStatusFresh) {
          return {
            ...client,
            status: client.calculated_status as ClientStatus,
            statusExplanation: client.status_explanation || ''
          };
        } else {
          // PRIORITY 3: Fallback - calculate on-the-fly if no cached status or stale
          const { status, explanation } = await calculateClientStatus(client.id, activeCompany.company_id);
          return {
            ...client,
            status,
            statusExplanation: explanation
          };
        }
      }));
      
      // Calculate total spend for each client
      const clientsWithSpend = await Promise.all(clientsWithStatus.map(async (client) => {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('spend')
          .eq('client_id', client.id);
        
        const totalSpend = campaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
        
        return {
          ...client,
          spend: totalSpend
        };
      }));
      
      setClients(clientsWithSpend);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  }, [user, activeCompany, isOwner, permissionsLoading, currentUserPermissions]);

  const createClient = async (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => {
    if (!user || !activeCompany) return null;

    try {
      // Map status to database format
      const { status, ...restData } = clientData;
      const dbData = {
        ...restData,
        status: statusMapping.database[status],
        user_id: user.id,
        company_id: activeCompany.company_id,
      };

      const { data, error } = await supabase
        .from("clients")
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      await fetchClients(); // Refresh the list
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar cliente");
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      // Map status to database format if present
      const { status, ...restUpdates } = updates;
      
      // If status is being updated, set it as manual_status to override automatic calculation
      const dbUpdates = {
        ...restUpdates,
        ...(status && { 
          status: statusMapping.database[status],
          manual_status: statusMapping.database[status]
        })
      };

      const { error } = await supabase
        .from("clients")
        .update(dbUpdates)
        .eq("id", id);

      if (error) throw error;
      await fetchClients(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar cliente");
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchClients(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao deletar cliente");
    }
  };

  const recalculateAllStatus = async () => {
    if (!user || !activeCompany) return { success: false, count: 0 };
    
    try {
      // Initialize progress
      setRecalculatingProgress({ current: 1, total: 1, clientName: 'Processando...' });

      // Call edge function to recalculate all statuses in background
      const { data, error } = await supabase.functions.invoke('recalculate-client-statuses', {
        body: { companyId: activeCompany.company_id }
      });

      if (error) throw error;

      // Refresh the clients list to show updated statuses
      await fetchClients();

      // Reset progress
      setRecalculatingProgress({ current: 0, total: 0, clientName: '' });

      return { 
        success: data?.success || true, 
        count: data?.successCount || 0 
      };
    } catch (err) {
      console.error("Error recalculating all statuses:", err);
      setRecalculatingProgress({ current: 0, total: 0, clientName: '' });
      setError(err instanceof Error ? err.message : "Erro ao recalcular status");
      return { success: false, count: 0 };
    }
  };

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Listen for campaign sync updates
  useEffect(() => {
    const handleClientsUpdated = () => {
      fetchClients();
    };

    window.addEventListener('clientsUpdated', handleClientsUpdated);
    return () => window.removeEventListener('clientsUpdated', handleClientsUpdated);
  }, [fetchClients]);

  return {
    clients,
    loading,
    error,
    fetchClients,
    recalculateAllStatus,
    recalculatingProgress,
    createClient,
    updateClient,
    deleteClient,
  };
}