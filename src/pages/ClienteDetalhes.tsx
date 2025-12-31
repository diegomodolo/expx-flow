import { useState, useMemo } from "react";
import { useParams, Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ClientDetailsLayout } from "@/components/clients/ClientDetailsLayout";
import { ClientContextProvider } from "./cliente/ClienteContext";
import { ClienteDashboard } from "./cliente/ClienteDashboard";
import { ClienteCampanhas } from "./cliente/ClienteCampanhas";
import { ClienteConjuntos } from "./cliente/ClienteConjuntos";
import { ClienteCriativos } from "./cliente/ClienteCriativos";
import { ClienteFunil } from "./cliente/ClienteFunil";
import { ClienteAlertas } from "./cliente/ClienteAlertas";
import { ClienteAnalise } from "./cliente/ClienteAnalise";
import { ClienteCompetitiva } from "./cliente/ClienteCompetitiva";
import { ClienteRelatorio } from "./cliente/ClienteRelatorio";
import { ClienteComparacao } from "./cliente/ClienteComparacao";
import { ClienteContato } from "./cliente/ClienteContato";
import { ClienteAnotacoes } from "./cliente/ClienteAnotacoes";
import { ClienteLeadsDesqualificados } from "./cliente/ClienteLeadsDesqualificados";
import { ClienteConversoes } from "./cliente/ClienteConversoes";
import { ClienteHistorico } from "./cliente/ClienteHistorico";
import { ClienteCRM } from "./cliente/ClienteCRM";
import ClienteAutomacoes from "./cliente/ClienteAutomacoes";
import { ClienteRedesSociais } from "./cliente/ClienteRedesSociais";
import { ClientePublicos } from "./cliente/ClientePublicos";
import { ClienteApresentacoes } from "./cliente/ClienteApresentacoes";
import ClientePixels from "./ClientePixels";
import InstagramAutoPostsPage from "./clients/InstagramAutoPostsPage";
import { ClienteTarefas } from "./cliente/ClienteTarefas";
import { ClienteTendencias } from "./cliente/ClienteTendencias";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useUnifiedCampaigns, useUnifiedMetrics } from "@/hooks/useUnifiedCampaigns";
import { Loader2 } from "lucide-react";
import { useOfflineConversions } from "@/hooks/useOfflineConversions";
import { useCompany } from "@/contexts/CompanyContext";
import { UnifiedSyncButton } from "@/components/clients/UnifiedSyncButton";

const ClienteDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { activeCompany } = useCompany();
  const { client, loading, error, refetch } = useClientDetails(id || "");
  const { conversions } = useOfflineConversions(id || "");
  
  // Use unified campaigns hook
  const { 
    metrics: unifiedMetrics, 
    isLoading: campaignsLoading,
    campaigns: unifiedCampaigns 
  } = useUnifiedMetrics({
    clientId: id,
    companyId: activeCompany?.company_id,
    includeInactive: true,
  });

  // Estados para filtros de navegação entre abas
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);

  // Calculate campaign metrics from unified data
  const totalCampaigns = unifiedMetrics.meta.campaigns + unifiedMetrics.google.campaigns;
  const activeCampaigns = unifiedMetrics.active_campaigns;
  // Total leads = conversions from Meta + Google (from unified metrics)
  const totalLeadsGenerated = unifiedMetrics.meta.conversions + unifiedMetrics.google.conversions;
  const totalInvested = unifiedMetrics.total_spend;

  // Calculate sync period in days
  const syncPeriodDays = useMemo(() => {
    if (!client?.last_sync_period) return 30;
    
    const periodMap: Record<string, number> = {
      'last_7d': 7,
      'last_14d': 14,
      'last_30d': 30,
      'last_90d': 90,
      'this_month': 30,
      'last_month': 30,
    };
    
    return periodMap[client.last_sync_period] || 30;
  }, [client?.last_sync_period]);

  // Filter conversions by synced period
  const conversionsInPeriod = useMemo(() => {
    if (!conversions || conversions.length === 0) return [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - syncPeriodDays);
    
    return conversions.filter(conversion => {
      const conversionDate = new Date(conversion.created_at);
      return conversionDate >= cutoffDate;
    });
  }, [conversions, syncPeriodDays]);

  // Calculate total sales
  const totalSales = useMemo(() => {
    return conversionsInPeriod.reduce((total, conversion) => {
      return total + (conversion.value || 0);
    }, 0);
  }, [conversionsInPeriod]);

  // Calculate ROI
  const roi = useMemo(() => {
    if (totalInvested === 0) return 0;
    return ((totalSales - totalInvested) / totalInvested) * 100;
  }, [totalSales, totalInvested]);

  // Handle sync complete
  const handleSyncComplete = () => {
    refetch();
  };

  // Calculate funnel completeness score from unified campaigns
  const funnelCompletenessScore = useMemo(() => {
    if (!unifiedCampaigns || unifiedCampaigns.length === 0) return 0;
    
    const campaignsWithConversions = unifiedCampaigns.filter(c => (c.conversions || 0) > 0).length;
    
    return Math.round((campaignsWithConversions / unifiedCampaigns.length) * 100);
  }, [unifiedCampaigns]);

  // Data for CPL by Campaign chart (horizontal bar chart) - using unified campaigns
  const cplByCampaignData = useMemo(() => {
    if (!unifiedCampaigns || unifiedCampaigns.length === 0) {
      return [];
    }

    return unifiedCampaigns
      .filter(campaign => (campaign.cpa || 0) > 0)
      .map(campaign => ({
        name: campaign.name.length > 25 ? campaign.name.substring(0, 25) + '...' : campaign.name,
        fullName: campaign.name,
        cpl: campaign.cpa || 0,
        status: campaign.status,
        conversions: campaign.conversions,
        spend: campaign.spend || 0,
        platform: campaign.platform,
      }))
      .sort((a, b) => a.cpl - b.cpl)
      .slice(0, 8);
  }, [unifiedCampaigns]);

  // Data for Investment Distribution chart (pie chart) - using unified campaigns
  const investmentDistributionData = useMemo(() => {
    if (!unifiedCampaigns || unifiedCampaigns.length === 0) {
      return [];
    }

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff0088', '#8800ff'];
    
    return unifiedCampaigns
      .filter(campaign => (campaign.spend || 0) > 0)
      .map((campaign, index) => ({
        name: campaign.name.length > 20 ? campaign.name.substring(0, 20) + '...' : campaign.name,
        fullName: campaign.name,
        value: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        color: colors[index % colors.length],
        platform: campaign.platform,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [unifiedCampaigns]);

  if (loading || campaignsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-lg font-semibold">Cliente não encontrado</p>
            <p className="text-sm text-muted-foreground">{error || "Ocorreu um erro ao carregar os dados do cliente"}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const contextValue = {
    client,
    selectedCampaignId,
    setSelectedCampaignId,
    selectedAdSetId,
    setSelectedAdSetId,
    refetchClient: refetch,
  };

  return (
    <DashboardLayout>
      <ClientContextProvider value={contextValue}>
        <ClientDetailsLayout clientId={id || ""} clientName={client.name}>
          <Routes>
            <Route 
              index 
              element={
                <ClienteDashboard
                  client={client}
                  syncButton={
                    <UnifiedSyncButton
                      clientId={id || ""}
                      companyId={activeCompany?.id || ""}
                      hasMetaAccount={!!client.ad_account_id}
                      hasGoogleAccount={!!(client as any).google_account_id}
                      onSyncComplete={handleSyncComplete}
                    />
                  }
                  totalCampaigns={totalCampaigns}
                  activeCampaigns={activeCampaigns}
                  totalLeadsGenerated={totalLeadsGenerated}
                  totalInvested={totalInvested}
                  totalSales={totalSales}
                  roi={roi}
                  syncPeriodDays={syncPeriodDays}
                  conversionsInPeriod={conversionsInPeriod}
                  funnelCompletenessScore={funnelCompletenessScore}
                  cplByCampaignData={cplByCampaignData}
                  investmentDistributionData={investmentDistributionData}
                  metaMetrics={{
                    spend: unifiedMetrics.meta.spend,
                    conversions: unifiedMetrics.meta.conversions,
                    campaigns: unifiedMetrics.meta.campaigns,
                  }}
                  googleMetrics={{
                    spend: unifiedMetrics.google.spend,
                    conversions: unifiedMetrics.google.conversions,
                    campaigns: unifiedMetrics.google.campaigns,
                  }}
                  unifiedCampaigns={unifiedCampaigns || []}
                />
              } 
            />
            <Route path="campanhas" element={<ClienteCampanhas />} />
            <Route path="conjuntos" element={<ClienteConjuntos />} />
            <Route path="criativos" element={<ClienteCriativos />} />
            <Route path="funil" element={<ClienteFunil />} />
            <Route path="alertas" element={<ClienteAlertas />} />
            <Route path="analise" element={<ClienteAnalise />} />
            <Route path="competitiva" element={<ClienteCompetitiva />} />
            <Route path="relatorio" element={<ClienteRelatorio />} />
            <Route path="comparacao" element={<ClienteComparacao />} />
            <Route path="contato" element={<ClienteContato />} />
            <Route path="anotacoes" element={<ClienteAnotacoes />} />
            <Route path="leads-desqualificados" element={<ClienteLeadsDesqualificados />} />
            <Route path="conversoes" element={<ClienteConversoes />} />
            <Route path="historico" element={<ClienteHistorico />} />
            <Route path="tarefas" element={<ClienteTarefas clientId={id || ""} clientName={client?.name || ""} />} />
            <Route path="crm" element={<ClienteCRM />} />
            <Route path="automacoes" element={<ClienteAutomacoes />} />
            <Route path="redes-sociais" element={<ClienteRedesSociais />} />
            <Route path="publicos" element={<ClientePublicos />} />
            <Route path="apresentacoes" element={<ClienteApresentacoes />} />
            <Route path="pixels" element={<ClientePixels />} />
            <Route path="auto-posts" element={<InstagramAutoPostsPage />} />
            <Route path="tendencias" element={<ClienteTendencias />} />
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </ClientDetailsLayout>
      </ClientContextProvider>
    </DashboardLayout>
  );
};

export default ClienteDetalhes;
