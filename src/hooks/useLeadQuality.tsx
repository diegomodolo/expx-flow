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
    if (!activeCompany?.company_id) return;

    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Buscando dados de qualidade de leads para empresa:', activeCompany.company_id);

      // Primeiro, buscar dados sem filtro de período para debug
      const { data: allCampaigns, error: allCampaignsError } = await supabase
        .from('campaigns')
        .select('conversions, updated_at')
        .eq('company_id', activeCompany.company_id);

      if (allCampaignsError) throw allCampaignsError;

      const { data: allReports, error: allReportsError } = await supabase
        .from('lead_disqualification_reports')
        .select('id, lead_received_date')
        .eq('company_id', activeCompany.company_id);

      if (allReportsError) throw allReportsError;

      console.log('📊 Total de campanhas encontradas:', allCampaigns?.length || 0);
      console.log('📊 Total de reports encontrados:', allReports?.length || 0);

      const totalLeadsAll = allCampaigns?.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0) || 0;
      console.log('📊 Total de leads (todas as campanhas):', totalLeadsAll);

      // Buscar dados de sincronização mais recente para determinar o período
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('last_sync_at, last_sync_period')
        .eq('company_id', activeCompany.company_id)
        .not('last_sync_at', 'is', null)
        .order('last_sync_at', { ascending: false })
        .limit(1);

      if (clientsError) throw clientsError;

      let periodStart: string | undefined;
      let periodEnd: string | undefined;
      let totalLeads = totalLeadsAll;
      let disqualifiedLeads = allReports?.length || 0;

      // Se houver sincronização recente, aplicar filtro de período
      if (clients && clients.length > 0) {
        const lastSync = clients[0];
        const syncDate = new Date(lastSync.last_sync_at);
        
        console.log('🔄 Última sincronização:', lastSync.last_sync_at, 'Período:', lastSync.last_sync_period);
        
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
            periodStart = new Date(syncDate.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
            break;
          default:
            periodStart = new Date(syncDate.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        }
        periodEnd = syncDate.toISOString().split('T')[0];

        console.log('📅 Período filtrado:', periodStart, 'até', periodEnd);

        // Aplicar filtro de período nas campanhas
        const filteredCampaigns = allCampaigns?.filter(campaign => {
          const campaignDate = campaign.updated_at.split('T')[0];
          return campaignDate >= periodStart! && campaignDate <= periodEnd!;
        }) || [];

        totalLeads = filteredCampaigns.reduce((sum, campaign) => sum + (campaign.conversions || 0), 0);

        // Aplicar filtro de período nos relatórios
        const filteredReports = allReports?.filter(report => {
          const reportDate = report.lead_received_date;
          return reportDate >= periodStart! && reportDate <= periodEnd!;
        }) || [];

        disqualifiedLeads = filteredReports.length;

        console.log('📊 Campanhas no período:', filteredCampaigns.length);
        console.log('📊 Reports no período:', filteredReports.length);
      } else {
        console.log('⚠️ Nenhuma sincronização encontrada, usando todos os dados');
        // Fallback: usar últimos 30 dias se não houver sincronização
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        periodStart = thirtyDaysAgo.toISOString().split('T')[0];
        periodEnd = new Date().toISOString().split('T')[0];
      }

      console.log('🎯 Total de leads calculado:', totalLeads);
      console.log('❌ Leads desqualificados:', disqualifiedLeads);

      const qualifiedLeads = Math.max(0, totalLeads - disqualifiedLeads);
      const mqlPercentage = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

      console.log('✅ Leads qualificados:', qualifiedLeads);
      console.log('📈 Percentual MQL:', mqlPercentage.toFixed(2) + '%');

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
  }, [activeCompany?.company_id]);

  return {
    data,
    loading,
    error,
    refetch: fetchLeadQualityData
  };
}