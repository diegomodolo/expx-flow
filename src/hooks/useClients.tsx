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
  google_account_id?: string;
  facebook_page_id?: string;
  instagram_account_id?: string;
  leads_generated: number;
  spend?: number;
  last_sync_at?: string;
  last_sync_period?: string;
  website_url?: string;
  ai_briefing?: string;
  briefing_generated_at?: string;
  team_id?: string;
  dashboard_token?: string;
  is_canceled?: boolean;
  canceled_at?: string;
  gestor_id?: string;
  gestor?: {
    id: string;
    name: string;
    avatar?: string;
  };
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
    recharge_day?: number;
  };
  facebook_page?: {
    id: string;
    page_id: string;
    page_name: string;
    page_category: string | null;
  };
  instagram_account?: {
    id: string;
    instagram_id: string;
    username: string;
    profile_picture_url: string | null;
    followers_count: number;
  };
  team?: {
    id: string;
    name: string;
    color: string;
  };
  inactive_reason?: string;
  payment_type?: 'prepaid' | 'postpaid';
  ai_reference_image_1?: string;
  ai_reference_image_2?: string;
  ai_reference_image_3?: string;
  
  // Platform-specific financial settings
  meta_monthly_budget?: number;
  meta_payment_type?: string;
  meta_recharge_day?: number;
  
  google_monthly_budget?: number;
  google_payment_type?: string;
  google_recharge_day?: number;
  
  linkedin_monthly_budget?: number;
  linkedin_payment_type?: string;
  linkedin_recharge_day?: number;
  
  tiktok_monthly_budget?: number;
  tiktok_payment_type?: string;
  tiktok_recharge_day?: number;
  
  twitter_monthly_budget?: number;
  twitter_payment_type?: string;
  twitter_recharge_day?: number;
  
  // Consolidated metrics (Meta + Google)
  consolidated_spend?: number;
  consolidated_conversions?: number;
  consolidated_active_campaigns?: number;
  consolidated_budget?: number;
  consolidated_cpa?: number;
  
  // Platform-specific metrics breakdown
  meta_spend?: number;
  meta_conversions?: number;
  meta_active_campaigns?: number;
  google_spend?: number;
  google_conversions?: number;
  google_active_campaigns?: number;
  
  // Platforms configured flags
  has_meta?: boolean;
  has_google?: boolean;
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

export function useClients(options?: { includeCanceled?: boolean }) {
  const includeCanceled = options?.includeCanceled ?? false;
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
    
    // Check if user has permission to access clients or related modules
    // Use currentUserPermissions directly instead of hasPermission function
    const hasClientsPermission = currentUserPermissions.includes('clientes');
    const hasContentPermission = currentUserPermissions.includes('gerador-conteudo');
    const hasCampaignsPermission = currentUserPermissions.includes('campanhas');
    
    if (!isOwner && !hasClientsPermission && !hasContentPermission && !hasCampaignsPermission) {
      setClients([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      let query = supabase
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
            funding_source_details,
            recharge_day
          ),
          facebook_page:facebook_pages!facebook_page_id (
            id,
            page_id,
            page_name,
            page_category
          ),
          instagram_account:instagram_accounts!instagram_account_id (
            id,
            instagram_id,
            username,
            profile_picture_url,
            followers_count
          ),
          team:teams!team_id (
            id,
            name,
            color
          ),
          gestor:employees!gestor_id (
            id,
            name,
            avatar
          )
        `)
        .eq("company_id", activeCompany.company_id);
      
      // Apply is_canceled filter unless includeCanceled is true
      if (!includeCanceled) {
        query = query.eq("is_canceled", false);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      
      // Use cached status from database, fallback to calculating if not available
      const clientsWithStatus = await Promise.all((data || []).map(async (client) => {
        // PRIORITY 1: If status is different from calculated_status, it means manual override
        // Use the manual status from the status field
        if (client.status && client.calculated_status && client.status !== client.calculated_status) {
          return {
            ...client,
            status: statusMapping.display[client.status] as ClientStatus,
            statusExplanation: '✏️ Status definido manualmente'
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
            status: statusMapping.display[client.calculated_status] as ClientStatus,
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
      
      // Calculate consolidated metrics (Meta + Google) for each client
      const clientsWithConsolidatedMetrics = await Promise.all(clientsWithStatus.map(async (client) => {
        // Fetch Meta campaigns (from campaigns table)
        const { data: metaCampaigns } = await supabase
          .from('campaigns')
          .select('spend, conversions, is_active, status')
          .eq('client_id', client.id);
        
        // Fetch Google campaigns (from google_campaigns table)
        const { data: googleCampaigns } = await supabase
          .from('google_campaigns')
          .select('spend, conversions, is_active, status')
          .eq('client_id', client.id);
        
        // Meta metrics
        const metaSpend = metaCampaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
        const metaConversions = metaCampaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
        const metaActiveCampaigns = metaCampaigns?.filter(c => c.is_active && c.status === 'active').length || 0;
        
        // Google metrics
        const googleSpend = googleCampaigns?.reduce((sum, c) => sum + (c.spend || 0), 0) || 0;
        const googleConversions = googleCampaigns?.reduce((sum, c) => sum + (c.conversions || 0), 0) || 0;
        const googleActiveCampaigns = googleCampaigns?.filter(c => c.is_active).length || 0;
        
        // Consolidated metrics
        const consolidatedSpend = metaSpend + googleSpend;
        const consolidatedConversions = metaConversions + googleConversions;
        const consolidatedActiveCampaigns = metaActiveCampaigns + googleActiveCampaigns;
        
        // Consolidated budget calculation:
        // 1. If both platform-specific budgets are set, use their sum
        // 2. If only one is set and the other platform is configured, use monthly_budget as total
        // 3. If neither is set, fall back to monthly_budget
        const metaBudget = client.meta_monthly_budget || 0;
        const googleBudget = client.google_monthly_budget || 0;
        const hasMetaAccount = !!client.ad_account_id;
        const hasGoogleAccount = !!client.google_account_id;
        
        let consolidatedBudget: number;
        if (metaBudget > 0 && googleBudget > 0) {
          // Both platform budgets are explicitly set - use their sum
          consolidatedBudget = metaBudget + googleBudget;
        } else if ((hasMetaAccount && hasGoogleAccount) && (metaBudget > 0 || googleBudget > 0)) {
          // Client uses both platforms but only one budget is set
          // Use monthly_budget as the total if available, otherwise sum what we have
          consolidatedBudget = client.monthly_budget || (metaBudget + googleBudget);
        } else if (metaBudget > 0 || googleBudget > 0) {
          // Only one platform budget is set
          consolidatedBudget = metaBudget + googleBudget;
        } else {
          // No platform-specific budgets, use monthly_budget
          consolidatedBudget = client.monthly_budget || 0;
        }
        
        // Consolidated CPA
        const consolidatedCpa = consolidatedConversions > 0 ? consolidatedSpend / consolidatedConversions : 0;
        
        // Platform flags
        const hasMeta = !!client.ad_account_id;
        const hasGoogle = !!client.google_account_id;
        
        return {
          ...client,
          spend: consolidatedSpend,
          leads_generated: consolidatedConversions,
          active_campaigns: consolidatedActiveCampaigns,
          avg_cpl: consolidatedCpa,
          // Consolidated fields
          consolidated_spend: consolidatedSpend,
          consolidated_conversions: consolidatedConversions,
          consolidated_active_campaigns: consolidatedActiveCampaigns,
          consolidated_budget: consolidatedBudget,
          consolidated_cpa: consolidatedCpa,
          // Platform breakdowns
          meta_spend: metaSpend,
          meta_conversions: metaConversions,
          meta_active_campaigns: metaActiveCampaigns,
          google_spend: googleSpend,
          google_conversions: googleConversions,
          google_active_campaigns: googleActiveCampaigns,
          // Platform flags
          has_meta: hasMeta,
          has_google: hasGoogle,
        };
      }));
      
      setClients(clientsWithConsolidatedMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao buscar clientes");
    } finally {
      setLoading(false);
    }
  }, [user, activeCompany, isOwner, permissionsLoading, currentUserPermissions, includeCanceled]);

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
        payment_type: clientData.payment_type || 'prepaid',
        // Convert empty strings to null for UUID fields
        ad_account_id: clientData.ad_account_id === "" ? null : clientData.ad_account_id,
        google_account_id: clientData.google_account_id === "" ? null : clientData.google_account_id,
        facebook_page_id: (clientData as any).facebook_page_id === "" ? null : (clientData as any).facebook_page_id,
        instagram_account_id: (clientData as any).instagram_account_id === "" ? null : (clientData as any).instagram_account_id,
        team_id: clientData.team_id === "" || clientData.team_id === "none" ? null : clientData.team_id,
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
      console.error("Supabase erro ao criar cliente:", err);
      setError(err instanceof Error ? err.message : "Erro ao criar cliente");
      return null;
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      // Whitelist de campos permitidos para atualização
      const allowedFields = [
        'name', 'email', 'company', 'sector', 'avatar', 'monthly_budget',
        'target_audience', 'product_name', 'voice_tone', 'objectives',
        'preferred_platforms', 'campaign_type', 'notes', 'ad_account_id',
        'google_account_id', 'facebook_page_id', 'instagram_account_id',
        'website_url', 'inactive_reason', 'team_id',
        'ai_briefing', 'briefing_generated_at', 'offline_event_set_id', 'payment_type',
        'presentation_logo', 'presentation_bg_image', 'presentation_overlay_color', 'presentation_overlay_opacity',
        'ai_reference_image_1', 'ai_reference_image_2', 'ai_reference_image_3',
        // Platform-specific financial fields
        'meta_monthly_budget', 'meta_payment_type', 'meta_recharge_day',
        'google_monthly_budget', 'google_payment_type', 'google_recharge_day',
        'linkedin_monthly_budget', 'linkedin_payment_type', 'linkedin_recharge_day',
        'tiktok_monthly_budget', 'tiktok_payment_type', 'tiktok_recharge_day',
        'twitter_monthly_budget', 'twitter_payment_type', 'twitter_recharge_day',
        // Cancellation fields
        'is_canceled', 'canceled_at',
        // Gestor field
        'gestor_id'
      ];
      
      // Filtrar apenas campos permitidos e converter strings vazias em null para UUIDs
      const filteredUpdates = Object.keys(updates)
        .filter(key => allowedFields.includes(key))
        .reduce((obj, key) => {
          let value = updates[key as keyof Client];
          
          // Converter strings vazias para null em campos UUID
          if ((key === 'ad_account_id' || key === 'google_account_id' || key === 'team_id' || key === 'facebook_page_id' || key === 'instagram_account_id' || key === 'gestor_id') && value === "") {
            value = null;
          }
          
          obj[key] = value;
          return obj;
        }, {} as any);
      
      // Map status to database format if present
      if (updates.status) {
        filteredUpdates.status = statusMapping.database[updates.status];
      }

      const { error } = await supabase
        .from("clients")
        .update(filteredUpdates)
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