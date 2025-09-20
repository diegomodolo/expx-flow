import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface LeadQualityData {
  totalLeads: number;
  disqualifiedLeads: number;
  mqlPercentage: number;
  periodStart?: string;
  periodEnd?: string;
}

export function useLeadQuality() {
  const [data, setData] = useState<LeadQualityData>({
    totalLeads: 0,
    disqualifiedLeads: 0,
    mqlPercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeCompany } = useCompany();

  const fetchLeadQualityData = async () => {
    if (!activeCompany?.id) return;

    setLoading(true);
    setError(null);

    try {
      // Buscar dados de sincronização mais recente para determinar o período
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('last_sync_at, last_sync_period')
        .eq('company_id', activeCompany.id)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1);

      if (clientsError) throw clientsError;

      let periodStart: string | undefined;
      let periodEnd: string | undefined;

      if (clients && clients.length > 0) {
        const lastSync = clients[0];
        const syncDate = new Date(lastSync.last_sync_at);
        
        // Calcular período baseado na última sincronização
        switch (lastSync.last_sync_period) {
          case '7_days':
            periodStart = new Date(syncDate.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            break;
          case '30_days':
            periodStart = new Date(syncDate.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            break;
          case '90_days':
            periodStart = new Date(syncDate.getTime() - (90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            break;
          case 'custom':
            // Para período customizado, assumir 30 dias por padrão
            periodStart = new Date(syncDate.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            break;
          default:
            periodStart = new Date(syncDate.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        }
        periodEnd = syncDate.toISOString().split('T')[0];
      }

      // Buscar total de leads (conversões) no período
      let campaignsQuery = supabase
        .from('campaigns')
        .select('conversions')
        .eq('company_id', activeCompany.id);

      if (periodStart && periodEnd) {
        campaignsQuery = campaignsQuery
          .gte('updated_at', periodStart)
          .lte('updated_at', periodEnd);
      }

      const { data: campaigns, error: campaignsError } = await campaignsQuery;
      
      if (campaignsError) throw campaignsError;

      const totalLeads = campaigns?.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0) || 0;

      // Buscar leads desqualificados no período
      let reportsQuery = supabase
        .from('lead_disqualification_reports')
        .select('id')
        .eq('company_id', activeCompany.id);

      if (periodStart && periodEnd) {
        reportsQuery = reportsQuery
          .gte('lead_received_date', periodStart)
          .lte('lead_received_date', periodEnd);
      }

      const { data: reports, error: reportsError } = await reportsQuery;
      
      if (reportsError) throw reportsError;

      const disqualifiedLeads = reports?.length || 0;
      const qualifiedLeads = Math.max(0, totalLeads - disqualifiedLeads);
      const mqlPercentage = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

      setData({
        totalLeads,
        disqualifiedLeads,
        mqlPercentage,
        periodStart,
        periodEnd
      });

    } catch (err) {
      console.error('Error fetching lead quality data:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de qualidade de leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadQualityData();
  }, [activeCompany?.id]);

  return {
    data,
    loading,
    error,
    refetch: fetchLeadQualityData
  };
}