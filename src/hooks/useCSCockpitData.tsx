import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { format, subDays, differenceInDays } from 'date-fns';

// Types
export interface FireAlert {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  type: 'nps_detractor' | 'leads_drop' | 'campaign_paused' | 'cpa_exploding' | 'critical_risk';
  severity: 'critical' | 'high';
  message: string;
  detectedAt: string;
  actions: Array<{ label: string; action: 'whatsapp' | 'call' | 'view_campaign' | 'view_client' }>;
}

export interface DailyTask {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  type: 'onboarding' | 'qbr' | 'touchpoint' | 'nps_collect' | 'celebrate';
  title: string;
  subtitle: string;
  dueType: 'overdue' | 'today' | 'upcoming';
  completed: boolean;
  primaryAction: { label: string; action: string };
}

export interface Opportunity {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatar: string | null;
  type: 'upsell_budget' | 'upsell_roas' | 'victory' | 'renewal';
  title: string;
  description: string;
  value?: number;
  primaryAction: { label: string; action: string };
}

export interface CockpitData {
  fires: FireAlert[];
  tasks: DailyTask[];
  opportunities: Opportunity[];
  progress: {
    completed: number;
    total: number;
  };
}

export function useCSCockpitData(squadId?: string | null) {
  const { activeCompany } = useCompany();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cs-cockpit-data', activeCompany?.company_id, squadId],
    queryFn: async (): Promise<CockpitData> => {
      if (!activeCompany?.company_id) {
        return { fires: [], tasks: [], opportunities: [], progress: { completed: 0, total: 0 } };
      }

      // Fetch clients with health configs
      let clientsQuery = supabase
        .from('clients')
        .select(`
          id, name, avatar, company, team_id,
          client_health_config (
            id, nps_score, nps_collected_at, last_cs_contact_at,
            churn_risk_level, onboarding_status, target_roas, target_cpl,
            health_score_total, health_score_financial
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .eq('is_canceled', false);

      if (squadId) {
        clientsQuery = clientsQuery.eq('team_id', squadId);
      }

      const { data: clients, error: clientsError } = await clientsQuery;
      if (clientsError) throw clientsError;

      const clientIds = (clients || []).map((c: any) => c.id);

      // Fetch campaigns for performance data
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, client_id, name, status, spend, conversions, cpa')
        .in('client_id', clientIds)
        .eq('company_id', activeCompany.company_id);

      // Fetch pending milestones
      const { data: milestones } = await supabase
        .from('client_milestones')
        .select('*')
        .in('client_id', clientIds)
        .is('completed_at', null);

      // Fetch QBR reports for scheduling
      const { data: qbrReports } = await supabase
        .from('qbr_reports')
        .select('client_id, period_end, status')
        .in('client_id', clientIds)
        .order('period_end', { ascending: false });

      const fires: FireAlert[] = [];
      const tasks: DailyTask[] = [];
      const opportunities: Opportunity[] = [];

      const today = new Date();

      (clients || []).forEach((client: any) => {
        const healthConfig = client.client_health_config?.[0];
        const clientCampaigns = (campaigns || []).filter((c: any) => c.client_id === client.id);
        const clientMilestones = (milestones || []).filter((m: any) => m.client_id === client.id);
        const clientQBRs = (qbrReports || []).filter((q: any) => q.client_id === client.id);

        // === FIRES (Alertas Críticos) ===

        // 1. NPS Detrator (score <= 6 nos últimos 3 dias)
        if (healthConfig?.nps_score !== null && healthConfig.nps_score <= 6) {
          const collectedAt = healthConfig.nps_collected_at ? new Date(healthConfig.nps_collected_at) : null;
          const isRecent = collectedAt && differenceInDays(today, collectedAt) <= 3;
          
          if (isRecent) {
            fires.push({
              id: `nps-${client.id}`,
              clientId: client.id,
              clientName: client.name,
              clientAvatar: client.avatar,
              type: 'nps_detractor',
              severity: healthConfig.nps_score <= 4 ? 'critical' : 'high',
              message: `NPS ${healthConfig.nps_score} registrado`,
              detectedAt: healthConfig.nps_collected_at,
              actions: [
                { label: 'WhatsApp', action: 'whatsapp' },
                { label: 'Ligar', action: 'call' },
              ],
            });
          }
        }

        // 2. Cliente Crítico
        if (healthConfig?.churn_risk_level === 'critical') {
          fires.push({
            id: `critical-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'critical_risk',
            severity: 'critical',
            message: 'Risco de churn crítico detectado',
            detectedAt: new Date().toISOString(),
            actions: [
              { label: 'Ver Cliente', action: 'view_client' },
              { label: 'Ligar', action: 'call' },
            ],
          });
        }

        // 3. Campanhas pausadas inesperadamente
        const pausedCampaigns = clientCampaigns.filter((c: any) => c.status === 'paused');
        if (pausedCampaigns.length > 0) {
          fires.push({
            id: `paused-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'campaign_paused',
            severity: 'high',
            message: `${pausedCampaigns.length} campanha(s) pausada(s)`,
            detectedAt: new Date().toISOString(),
            actions: [
              { label: 'Ver Campanhas', action: 'view_campaign' },
            ],
          });
        }

        // 4. CPA explodindo (> 200% da meta)
        if (healthConfig?.target_cpl) {
          const activeCampaigns = clientCampaigns.filter((c: any) => c.status === 'active' && c.cpa);
          const avgCPA = activeCampaigns.length > 0
            ? activeCampaigns.reduce((sum: number, c: any) => sum + (c.cpa || 0), 0) / activeCampaigns.length
            : null;
          
          if (avgCPA && avgCPA > healthConfig.target_cpl * 2) {
            fires.push({
              id: `cpa-${client.id}`,
              clientId: client.id,
              clientName: client.name,
              clientAvatar: client.avatar,
              type: 'cpa_exploding',
              severity: 'high',
              message: `CPA ${Math.round(avgCPA / healthConfig.target_cpl * 100)}% acima da meta`,
              detectedAt: new Date().toISOString(),
              actions: [
                { label: 'Ver Campanhas', action: 'view_campaign' },
              ],
            });
          }
        }

        // === TAREFAS DO DIA ===

        // 1. Onboarding pendente
        const onboardingMilestones = clientMilestones.filter((m: any) => m.milestone_type === 'onboarding');
        if (onboardingMilestones.length > 0 || healthConfig?.onboarding_status === 'in_progress') {
          const totalOnboarding = 5; // Assumindo 5 etapas de onboarding
          const completedOnboarding = totalOnboarding - onboardingMilestones.length;
          
          tasks.push({
            id: `onboarding-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'onboarding',
            title: 'Call de Onboarding',
            subtitle: `Etapa ${completedOnboarding + 1}/${totalOnboarding}`,
            dueType: 'today',
            completed: false,
            primaryAction: { label: 'Fazer Call', action: 'call' },
          });
        }

        // 2. Touchpoint (sem contato há > 10 dias)
        const lastContact = healthConfig?.last_cs_contact_at 
          ? new Date(healthConfig.last_cs_contact_at) 
          : null;
        const daysSinceContact = lastContact ? differenceInDays(today, lastContact) : 999;
        
        if (daysSinceContact > 10) {
          tasks.push({
            id: `touchpoint-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'touchpoint',
            title: 'Registrar Touchpoint',
            subtitle: lastContact ? `${daysSinceContact} dias sem contato` : 'Nunca contatado',
            dueType: daysSinceContact > 14 ? 'overdue' : 'upcoming',
            completed: false,
            primaryAction: { label: 'Mandar Oi', action: 'whatsapp' },
          });
        }

        // 3. NPS não coletado há > 30 dias
        const npsCollectedAt = healthConfig?.nps_collected_at 
          ? new Date(healthConfig.nps_collected_at) 
          : null;
        const daysSinceNPS = npsCollectedAt ? differenceInDays(today, npsCollectedAt) : 999;
        
        if (daysSinceNPS > 30) {
          tasks.push({
            id: `nps-collect-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'nps_collect',
            title: 'Coletar NPS',
            subtitle: npsCollectedAt ? `Último: ${daysSinceNPS} dias atrás` : 'Nunca coletado',
            dueType: daysSinceNPS > 45 ? 'overdue' : 'upcoming',
            completed: false,
            primaryAction: { label: 'Enviar Pesquisa', action: 'send_nps' },
          });
        }

        // 4. QBR - Check if last QBR was > 90 days ago
        const lastQBR = clientQBRs[0]; // Already sorted by period_end desc
        const lastQBRDate = lastQBR ? new Date(lastQBR.period_end) : null;
        const daysSinceQBR = lastQBRDate ? differenceInDays(today, lastQBRDate) : 999;
        
        if (daysSinceQBR > 90) {
          tasks.push({
            id: `qbr-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'qbr',
            title: 'Enviar QBR',
            subtitle: lastQBRDate ? `Último há ${daysSinceQBR} dias` : 'Nunca enviado',
            dueType: daysSinceQBR > 120 ? 'overdue' : 'upcoming',
            completed: false,
            primaryAction: { label: 'Gerar QBR', action: 'generate_qbr' },
          });
        }

        // === OPORTUNIDADES ===

        // 1. Upsell por ROAS alto (> 150% da meta)
        const totalSpend = clientCampaigns.reduce((sum: number, c: any) => sum + (c.spend || 0), 0);
        const totalConversions = clientCampaigns.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);
        const currentROAS = totalSpend > 0 && totalConversions > 0 
          ? (totalConversions * 100) / totalSpend 
          : null;
        
        if (currentROAS && healthConfig?.target_roas && currentROAS > healthConfig.target_roas * 1.5) {
          opportunities.push({
            id: `upsell-roas-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'upsell_roas',
            title: 'Expandir Investimento',
            description: `ROAS ${Math.round(currentROAS / healthConfig.target_roas * 100)}% acima da meta`,
            primaryAction: { label: 'Propor Upsell', action: 'propose_upsell' },
          });
        }

        // 2. Vitórias (Health Score alto + bons resultados)
        if (healthConfig?.health_score_total >= 80 && healthConfig?.health_score_financial >= 80) {
          opportunities.push({
            id: `victory-${client.id}`,
            clientId: client.id,
            clientName: client.name,
            clientAvatar: client.avatar,
            type: 'victory',
            title: 'Cliente em Excelência!',
            description: 'Resultados acima da expectativa',
            primaryAction: { label: 'Celebrar', action: 'celebrate' },
          });
        }
      });

      // Sort fires by severity
      fires.sort((a, b) => {
        if (a.severity === 'critical' && b.severity !== 'critical') return -1;
        if (b.severity === 'critical' && a.severity !== 'critical') return 1;
        return 0;
      });

      // Sort tasks by dueType
      const dueOrder = { overdue: 0, today: 1, upcoming: 2 };
      tasks.sort((a, b) => dueOrder[a.dueType] - dueOrder[b.dueType]);

      return {
        fires,
        tasks,
        opportunities,
        progress: {
          completed: tasks.filter(t => t.completed).length,
          total: tasks.length,
        },
      };
    },
    enabled: !!activeCompany?.company_id,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  return {
    cockpitData: data || { fires: [], tasks: [], opportunities: [], progress: { completed: 0, total: 0 } },
    isLoading,
    error,
    refetch,
  };
}
