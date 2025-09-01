import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCompany } from "@/contexts/CompanyContext";
import { useEmployeePermissions } from "./useEmployeePermissions";

export type ClientStatus = "excelente" | "atencao" | "emergencial" | "inativo";
export type DatabaseClientStatus = "green" | "yellow" | "red";

// Threshold for considering good lead volume (leads per week)
const GOOD_LEADS_THRESHOLD = 5;

// Mapping between database status and display status
const statusMapping = {
  database: {
    excelente: "green" as const,
    atencao: "yellow" as const,
    emergencial: "red" as const,
    inativo: "red" as const, // Map inativo to red in database
  },
  display: {
    green: "excelente" as const,
    yellow: "atencao" as const,
    red: "emergencial" as const, // Default red to emergencial
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
}

// Function to calculate automatic status based on campaign metrics (exported for reuse)
export const calculateClientStatus = async (
  clientId: string, 
  companyId?: string
): Promise<{ status: ClientStatus; explanation: string }> => {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
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

    // FIX: Zero leads in current week should ALWAYS be emergencial
    if (currentWeekLeads === 0) {
      const problems = [];
      if (currentWeekLeads === 0) problems.push("• Nenhum lead gerado esta semana");
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
    if (activeCampaigns.length === 0 || (averageCTR < 0.8 && !hasGoodLeadVolume) || hasReprovedAds || daysSinceLastOptimization > 30) {
      const problems = [];
      if (activeCampaigns.length === 0) problems.push("• Sem campanhas ativas recentes");
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

    // FIX: Excelente status should require currentWeekLeads > 0
    if (activeCampaigns.length > 0 && currentWeekLeads > 0 && (currentWeekLeads >= previousWeekLeads) && averageCTR > 1.5 && daysSinceLastOptimization < 7 && !hasQualityIssues) {
      const positivePoints = [];
      positivePoints.push("• Campanhas ativas e performando bem");
      positivePoints.push("• CTR acima da média");
      positivePoints.push("• Leads sendo gerados consistentemente");
      positivePoints.push("• Otimizações recentes");
      positivePoints.push("• Sem problemas de qualidade");

      return {
        status: "excelente",
        explanation: `✅ Performance excelente! Cliente em ótimo estado.\n\nPontos positivos:\n${positivePoints.join('\n')}\n\nMétricas atuais:\n• CTR médio: ${averageCTR.toFixed(2)}%\n• Leads esta semana: ${currentWeekLeads}\n• Leads semana anterior: ${previousWeekLeads}\n• Variação: +${((currentWeekLeads - previousWeekLeads) / Math.max(previousWeekLeads, 1) * 100).toFixed(1)}%\n• Campanhas ativas: ${activeCampaigns.length}\n• Última otimização: há ${daysSinceLastOptimization} dias`
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
    createClient,
    updateClient,
    deleteClient,
  };
}