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
      has_funding_issues: false,
      has_quality_issues: false,
      has_reproved_ads: false,
      account_balance: 0,
      account_status: 0,
      days_without_changes: 999,
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
    ad.conversion_rate_ranking === 'BELOW_AVERAGE' ||
    ad.status === 'disapproved'
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
    average_cpl: 0, // Not calculated in original
    average_ctr: averageCTR,
    average_cpa: 0, // Not calculated in original
    current_week_cpa: currentWeekCPA,
    current_week_spend: currentWeekSpend,
    active_campaigns_count: activeCampaigns.length,
    recent_campaigns_count: recentCampaigns.length,
    days_since_last_optimization: daysSinceLastOptimization,
    lead_drop_percentage: leadDropPercentage,
    has_funding_issues: false, // Checked separately
    has_quality_issues: hasQualityIssues,
    has_reproved_ads: hasReprovedAds,
    account_balance: 0, // Checked separately
    account_status: 1, // Checked separately
    days_without_changes: daysSinceLastOptimization,
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

  switch (status) {
    case "sem_fundos":
      return `${emoji} Conta sem fundos suficientes para rodar anúncios!\n\nAção necessária: Adicionar saldo à conta do Facebook Ads.`;
    
    case "inativo":
      return `${emoji} Cliente inativo há mais de 30 dias!\n\nProblemas identificados:\n• Sem campanhas ativas\n• Nenhum lead gerado\n• Sem otimizações recentes`;
    
    case "emergencial":
      const problems = [];
      if (metrics.current_week_leads < 7) problems.push(`• Poucos leads esta semana (${metrics.current_week_leads})`);
      if (metrics.active_campaigns_count === 0) problems.push("• Sem campanhas ativas");
      if (metrics.has_reproved_ads) problems.push("• Anúncios reprovados");
      if (metrics.days_since_last_optimization > 30) problems.push("• Sem otimização há mais de 30 dias");
      
      return `${emoji} Situação crítica! Este cliente precisa de atenção urgente.\n\nProblemas identificados:\n${problems.join('\n')}\n\nMétricas atuais:\n• CTR médio: ${metrics.average_ctr?.toFixed(2)}%\n• Leads esta semana: ${metrics.current_week_leads}\n• Campanhas ativas: ${metrics.active_campaigns_count}`;
    
    case "atencao":
      const attentionPoints = [];
      if (metrics.lead_drop_percentage >= 30) attentionPoints.push(`• Queda de ${metrics.lead_drop_percentage.toFixed(1)}% nos leads`);
      if (metrics.has_quality_issues) attentionPoints.push("• Alertas de qualidade nos anúncios");
      if (metrics.days_since_last_optimization >= 8) attentionPoints.push("• Otimização não recente");
      
      return `${emoji} Cliente requer monitoramento.\n\nPontos de atenção:\n${attentionPoints.join('\n')}\n\nMétricas atuais:\n• CTR médio: ${metrics.average_ctr?.toFixed(2)}%\n• Leads esta semana: ${metrics.current_week_leads}`;
    
    case "excelente":
      return `${emoji} Performance excelente! Cliente em ótimo estado.\n\nPontos positivos:\n• Campanhas performando bem\n• Bom volume de leads\n• Métricas consistentes\n\nMétricas atuais:\n• CTR médio: ${metrics.average_ctr?.toFixed(2)}%\n• Leads esta semana: ${metrics.current_week_leads}\n• CPA: R$ ${metrics.current_week_cpa?.toFixed(2)}`;
    
    default:
      return `${emoji} Performance dentro da média.`;
  }
};

// Function to calculate automatic status based on campaign metrics (exported for reuse)
export const calculateClientStatus = async (
  clientId: string, 
  companyId?: string
): Promise<{ status: ClientStatus; explanation: string }> => {
  try {
    // PRIORITY CHECK 1: Manual inactive status
    const { data: clientData } = await supabase
      .from("clients")
      .select(`
        status, 
        inactive_reason,
        facebook_ad_accounts!ad_account_id (
          balance,
          account_status,
          has_funding_issues,
          disable_reason,
          last_balance_check
        )
      `)
      .eq("id", clientId)
      .maybeSingle();

    // Client is inactive if status is 'red' AND has an inactive_reason
    if (clientData?.status === "red" && clientData?.inactive_reason) {
      const fundingKeywords = ['sem fundos', 'saldo', 'funding', 'balance', 'gastos', 'campanhas ativas sem gastos'];
      const isFundingIssue = fundingKeywords.some(keyword => 
        clientData.inactive_reason.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (isFundingIssue) {
        return { 
          status: "sem_fundos", 
          explanation: clientData.inactive_reason 
        };
      } else {
        return { 
          status: "inativo", 
          explanation: "Cliente marcado como inativo manualmente" 
        };
      }
    }

    // PRIORITY CHECK 2: Funding issues (sem fundos)
    const adAccount = clientData?.facebook_ad_accounts?.[0];
    if (adAccount) {
      const hasFundingIssues = 
        adAccount.account_status !== 1 || 
        adAccount.balance <= 0 || 
        adAccount.has_funding_issues ||
        (adAccount.disable_reason && adAccount.disable_reason.toLowerCase().includes('funding'));
      
      if (hasFundingIssues) {
        return {
          status: "sem_fundos",
          explanation: `💳 Conta sem fundos suficientes para rodar anúncios!\n\nProblemas identificados:\n• Saldo atual: ${adAccount.balance}\n• Status da conta: ${adAccount.account_status === 1 ? 'Ativa' : 'Inativa'}\n• Problemas de financiamento: ${adAccount.has_funding_issues ? 'Sim' : 'Não'}\n• Última verificação: ${adAccount.last_balance_check ? new Date(adAccount.last_balance_check).toLocaleDateString() : 'N/A'}\n\nAção necessária: Adicionar saldo à conta do Facebook Ads para reativar as campanhas.`
        };
      }
    }

    // Get all client metrics
    const metrics = await getClientMetrics(clientId, companyId || '');

    // Fetch custom rules for this company
    const { data: rules } = await supabase
      .from("client_status_rules")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("rule_order", { ascending: true });

    // If custom rules exist, use them
    if (rules && rules.length > 0) {
      for (const rule of rules) {
        if (evaluateRule(rule, metrics)) {
          return {
            status: rule.status_output as ClientStatus,
            explanation: generateExplanation(rule.status_output as ClientStatus, metrics, rule.rule_name)
          };
        }
      }
      
      // Fallback if no rule matched
      return {
        status: "atencao",
        explanation: generateExplanation("atencao", metrics)
      };
    }

    // FALLBACK: Use hardcoded logic if no custom rules exist
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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

    if (!campaigns || campaigns.length === 0) {
      return {
        status: "inativo",
        explanation: "Cliente sem campanhas ativas há mais de 30 dias. Nenhuma ação ou otimização foi feita recentemente."
      };
    }

    // Check active campaigns in last 7 days
    const activeCampaigns = campaigns.filter(c => 
      c.is_active && c.status === 'active' && new Date(c.updated_at) >= sevenDaysAgo
    );

    // Check campaigns active in last 30 days
    const recentCampaigns = campaigns.filter(c => 
      new Date(c.updated_at) >= thirtyDaysAgo
    );

    // Calculate current week vs previous week leads
    const currentWeekLeads = campaigns
      .filter(c => new Date(c.updated_at) >= sevenDaysAgo)
      .reduce((sum, c) => sum + (c.conversions || 0), 0);

    const previousWeekLeads = campaigns
      .filter(c => new Date(c.updated_at) >= fourteenDaysAgo && new Date(c.updated_at) < sevenDaysAgo)
      .reduce((sum, c) => sum + (c.conversions || 0), 0);

    // Calculate average CTR
    const totalCTR = activeCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0);
    const averageCTR = activeCampaigns.length > 0 ? totalCTR / activeCampaigns.length : 0;

    // Calculate spend and CPA for current week
    const currentWeekSpend = campaigns
      .filter(c => new Date(c.updated_at) >= sevenDaysAgo)
      .reduce((sum, c) => sum + (c.spend || 0), 0);
    
    const currentWeekCPA = currentWeekLeads > 0 ? currentWeekSpend / currentWeekLeads : 0;

    // Check last optimization date
    const lastOptimizationDate = lastOptimization?.[0]?.performed_at 
      ? new Date(lastOptimization[0].performed_at)
      : lastChange?.[0]?.created_at 
      ? new Date(lastChange[0].created_at)
      : null;

    const daysSinceLastOptimization = lastOptimizationDate 
      ? Math.floor((now.getTime() - lastOptimizationDate.getTime()) / (24 * 60 * 60 * 1000))
      : 999;

    // Check for quality issues
    const hasQualityIssues = ads?.some(ad => 
      ad.quality_ranking === 'BELOW_AVERAGE' || 
      ad.engagement_rate_ranking === 'BELOW_AVERAGE' ||
      ad.conversion_rate_ranking === 'BELOW_AVERAGE' ||
      ad.status === 'disapproved'
    ) || false;

    const hasReprovedAds = ads?.some(ad => ad.status === 'disapproved') || false;

    // Calculate lead drop percentage
    const leadDropPercentage = previousWeekLeads > 0 
      ? ((previousWeekLeads - currentWeekLeads) / previousWeekLeads) * 100 
      : 0;

    // Apply status rules - FIX: Zero leads should always be emergencial
    if (recentCampaigns.length === 0 || (currentWeekLeads === 0 && previousWeekLeads === 0 && daysSinceLastOptimization > 30)) {
      return {
        status: "inativo",
        explanation: `⚫ Cliente inativo há mais de 30 dias!\n\nProblemas identificados:\n• Sem campanhas ativas\n• Nenhum lead gerado\n• Sem otimizações recentes\n\nMétricas atuais:\n• Campanhas ativas: 0\n• Leads esta semana: ${currentWeekLeads}\n• Última otimização: há ${daysSinceLastOptimization} dias`
      };
    }

    // FIX: Low leads should ALWAYS be emergencial
    if (currentWeekLeads < 7) {
      const problems = [];
      if (currentWeekLeads < 7) problems.push(`• Poucos leads gerados esta semana (${currentWeekLeads})`);
      if (averageCTR < 0.8) problems.push("• CTR muito baixo");
      if (hasReprovedAds) problems.push("• Anúncios reprovados");
      if (daysSinceLastOptimization > 30) problems.push("• Sem otimização há muito tempo");

      return {
        status: "emergencial",
        explanation: `🚨 Situação crítica! Este cliente precisa de atenção urgente.\n\nProblemas identificados:\n${problems.join('\n')}\n\nMétricas atuais:\n• CTR médio: ${averageCTR.toFixed(2)}%\n• Leads esta semana: ${currentWeekLeads}\n• Leads semana anterior: ${previousWeekLeads}\n• Campanhas ativas: ${activeCampaigns.length}\n• Última otimização: há ${daysSinceLastOptimization} dias`
      };
    }

    // Check if lead volume compensates for low CTR
    const hasGoodLeadVolume = currentWeekLeads >= GOOD_LEADS_THRESHOLD;

    // Emergencial status - adjust CTR condition based on lead volume
    if (activeCampaigns.length === 0 || (averageCTR < 0.8 && !hasGoodLeadVolume) || hasReprovedAds || daysSinceLastOptimization > 30 || currentWeekLeads < 7) {
      const problems = [];
      if (activeCampaigns.length === 0) problems.push("• Sem campanhas ativas recentes");
      if (currentWeekLeads < 7) problems.push(`• Poucos leads gerados esta semana (${currentWeekLeads})`);
      if (averageCTR < 0.8 && !hasGoodLeadVolume) problems.push("• CTR muito baixo");
      if (hasReprovedAds) problems.push("• Anúncios reprovados");
      if (daysSinceLastOptimization > 30) problems.push("• Sem otimização há mais de 30 dias");

      // Add positive note if CTR is low but leads are good
      const positiveNotes = [];
      if (averageCTR < 0.8 && hasGoodLeadVolume) {
        positiveNotes.push("• Volume de leads compensando CTR baixo");
      }

      const explanationParts = [
        "🚨 Situação crítica! Este cliente precisa de atenção urgente.",
        `\nProblemas identificados:\n${problems.join('\n')}`
      ];

      if (positiveNotes.length > 0) {
        explanationParts.push(`\nPontos positivos:\n${positiveNotes.join('\n')}`);
      }

      explanationParts.push(`\nMétricas atuais:\n• CTR médio: ${averageCTR.toFixed(2)}%\n• Leads esta semana: ${currentWeekLeads}\n• Leads semana anterior: ${previousWeekLeads}\n• Campanhas ativas: ${activeCampaigns.length}\n• Última otimização: há ${daysSinceLastOptimization} dias`);

      return {
        status: "emergencial",
        explanation: explanationParts.join('')
      };
    }

    // Atenção status - adjust CTR condition based on lead volume
    if (leadDropPercentage >= 30 || (averageCTR >= 0.8 && averageCTR <= 1.5 && !hasGoodLeadVolume) || hasQualityIssues || (daysSinceLastOptimization >= 8 && daysSinceLastOptimization <= 30)) {
      const problems = [];
      if (leadDropPercentage >= 30) problems.push(`• Queda de ${leadDropPercentage.toFixed(1)}% nos leads`);
      if (averageCTR >= 0.8 && averageCTR <= 1.5 && !hasGoodLeadVolume) problems.push("• CTR na média, pode melhorar");
      if (hasQualityIssues) problems.push("• Alertas de qualidade nos anúncios");
      if (daysSinceLastOptimization >= 8 && daysSinceLastOptimization <= 30) problems.push("• Otimização não recente");

      // Add positive note if CTR is average but leads are good
      const positiveNotes = [];
      if (averageCTR >= 0.8 && averageCTR <= 1.5 && hasGoodLeadVolume) {
        positiveNotes.push("• Volume de leads compensando CTR na média");
      }

      const explanationParts = [
        "⚠️ Cliente requer monitoramento.",
        `\nPontos de atenção:\n${problems.join('\n')}`
      ];

      if (positiveNotes.length > 0) {
        explanationParts.push(`\nPontos positivos:\n${positiveNotes.join('\n')}`);
      }

      explanationParts.push(`\nMétricas atuais:\n• CTR médio: ${averageCTR.toFixed(2)}%\n• Leads esta semana: ${currentWeekLeads}\n• Leads semana anterior: ${previousWeekLeads}\n• Variação: ${leadDropPercentage > 0 ? '-' : '+'}${Math.abs(leadDropPercentage).toFixed(1)}%\n• Campanhas ativas: ${activeCampaigns.length}\n• Última otimização: há ${daysSinceLastOptimization} dias`);

      return {
        status: "atencao",
        explanation: explanationParts.join('')
      };
    }

    // Excelente status - múltiplos critérios alternativos:
    const hasHighVolumeGoodCPA = currentWeekLeads >= 30 && currentWeekCPA <= GOOD_CPA_THRESHOLD && currentWeekCPA > 0;
    const hasMediumVolumeExcellentCPA = currentWeekLeads >= 20 && currentWeekCPA <= 15 && currentWeekCPA > 0;
    const hasVeryHighVolumeAcceptableCPA = currentWeekLeads >= 100 && currentWeekCPA <= 35 && currentWeekCPA > 0;
    const hasHighCTRAndOptimization = averageCTR > 1.5 && daysSinceLastOptimization < 7;
    
    if (activeCampaigns.length > 0 && currentWeekLeads > 0 && (currentWeekLeads >= previousWeekLeads) && 
        (hasHighVolumeGoodCPA || hasMediumVolumeExcellentCPA || hasVeryHighVolumeAcceptableCPA || hasHighCTRAndOptimization) && !hasQualityIssues) {
      
      const positivePoints = [];
      positivePoints.push("• Campanhas ativas e performando bem");
      
      if (hasHighVolumeGoodCPA || hasMediumVolumeExcellentCPA || hasVeryHighVolumeAcceptableCPA) {
        if (hasVeryHighVolumeAcceptableCPA) {
          positivePoints.push("• Volume muito alto de leads");
        } else if (hasMediumVolumeExcellentCPA) {
          positivePoints.push("• Volume bom com CPA excelente");
        } else {
          positivePoints.push("• Volume alto com CPA bom");
        }
        positivePoints.push(`• CPA eficiente: R$ ${currentWeekCPA.toFixed(2)}`);
      }
      
      if (hasHighCTRAndOptimization) {
        positivePoints.push("• CTR acima da média");
        positivePoints.push("• Otimizações recentes");
      }
      
      positivePoints.push("• Leads sendo gerados consistentemente");
      positivePoints.push("• Sem problemas de qualidade");

      const cpaText = currentWeekCPA > 0 ? `\n• CPA: R$ ${currentWeekCPA.toFixed(2)}` : '';
      
      return {
        status: "excelente",
        explanation: `✅ Performance excelente! Cliente em ótimo estado.\n\nPontos positivos:\n${positivePoints.join('\n')}\n\nMétricas atuais:\n• CTR médio: ${averageCTR.toFixed(2)}%\n• Leads esta semana: ${currentWeekLeads}\n• Leads semana anterior: ${previousWeekLeads}\n• Variação: +${((currentWeekLeads - previousWeekLeads) / Math.max(previousWeekLeads, 1) * 100).toFixed(1)}%${cpaText}\n• Campanhas ativas: ${activeCampaigns.length}\n• Última otimização: há ${daysSinceLastOptimization} dias`
      };
    }

    // Default to "atencao" if none of the other conditions are met
    return {
      status: "atencao",
      explanation: `⚠️ Cliente requer monitoramento.\n\nSituação:\n• Performance dentro da média\n• Pode ser otimizada\n\nMétricas atuais:\n• CTR médio: ${averageCTR.toFixed(2)}%\n• Leads esta semana: ${currentWeekLeads}\n• Leads semana anterior: ${previousWeekLeads}\n• Campanhas ativas: ${activeCampaigns.length}\n• Última otimização: há ${daysSinceLastOptimization} dias`
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
      
      // Calculate automatic status for each client and map from database format
      const clientsWithStatus = await Promise.all((data || []).map(async (client) => {
        const { status, explanation } = await calculateClientStatus(client.id, activeCompany.company_id);
        return {
          ...client,
          status, // This is already ClientStatus from calculateClientStatus
          statusExplanation: explanation
        };
      }));
      
      setClients(clientsWithStatus);
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
      const dbUpdates = {
        ...restUpdates,
        ...(status && { status: statusMapping.database[status] })
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
      setLoading(true);
      
      // Buscar todos os clientes
      const { data: clientsData, error } = await supabase
        .from("clients")
        .select("id")
        .eq("company_id", activeCompany.company_id);
      
      if (error) throw error;
      
      // Recalcular status de todos os clientes
      await fetchClients();
      
      return { success: true, count: clientsData?.length || 0 };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao recalcular status");
      return { success: false, count: 0 };
    } finally {
      setLoading(false);
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
    createClient,
    updateClient,
    deleteClient,
  };
}