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
import { useClientDetails } from "@/hooks/useClientDetails";
import { useAdSets } from "@/hooks/useAdSets";
import { useAds } from "@/hooks/useAds";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog, SyncOptions } from "@/components/facebook/SyncPeriodDialog";
import { Loader2 } from "lucide-react";
import { useOfflineConversions } from "@/hooks/useOfflineConversions";

const ClienteDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { client, loading, error, refetch } = useClientDetails(id || "");
  const { adSets, loading: adSetsLoading, refetch: refetchAdSets } = useAdSets(id || "");
  const { ads, loading: adsLoading, refetch: refetchAds } = useAds(id || "");
  const { syncCampaigns, syncing: syncLoading, progress } = useFacebookCampaignSync();
  const { conversions } = useOfflineConversions(id || "");
  
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  
  // Estados para filtros de navegação entre abas
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedAdSetId, setSelectedAdSetId] = useState<string | null>(null);

  // Calculate campaign metrics (with safe access)
  const totalCampaigns = client?.campaigns?.length || 0;
  const activeCampaigns = client?.campaigns?.filter(c => c.status === 'active' || c.is_active === true).length || 0;
  const totalLeadsGenerated = client?.leads_generated || 0;
  const totalInvested = client?.campaigns?.reduce((total, campaign) => total + (campaign.spend || 0), 0) || 0;

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

  // Handle sync
  const handleSyncConfirm = async (options: SyncOptions) => {
    if (!id) return;
    
    try {
      await syncCampaigns(id, options.period, {
        campaigns: true,
        adsets: true,
        ads: true
      });
      await refetch();
      await refetchAdSets();
      await refetchAds();
      setSyncDialogOpen(false);
    } catch (error) {
      console.error('Error syncing campaigns:', error);
    }
  };

  // Calculate funnel completeness score
  const funnelCompletenessScore = useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) return 0;
    
    const totalCampaigns = client.campaigns.length;
    const campaignsWithConversions = client.campaigns.filter(c => (c.conversions || 0) > 0).length;
    
    return Math.round((campaignsWithConversions / totalCampaigns) * 100);
  }, [client?.campaigns]);

  // Data for CPL by Campaign chart (horizontal bar chart)
  const cplByCampaignData = useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) {
      return [];
    }

    return client.campaigns
      .filter(campaign => (campaign.cpa || 0) > 0)
      .map(campaign => ({
        name: campaign.name.length > 25 ? campaign.name.substring(0, 25) + '...' : campaign.name,
        fullName: campaign.name,
        cpl: campaign.cpa || 0,
        status: campaign.status,
        conversions: campaign.conversions,
        spend: campaign.spend || 0
      }))
      .sort((a, b) => a.cpl - b.cpl)
      .slice(0, 8);
  }, [client?.campaigns]);

  // Data for Investment Distribution chart (pie chart)
  const investmentDistributionData = useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) {
      return [];
    }

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff0088', '#8800ff'];
    
    return client.campaigns
      .filter(campaign => (campaign.spend || 0) > 0)
      .map((campaign, index) => ({
        name: campaign.name.length > 20 ? campaign.name.substring(0, 20) + '...' : campaign.name,
        fullName: campaign.name,
        value: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [client?.campaigns]);

  if (loading) {
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
    refetchAdSets,
    refetchAds,
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
                  syncLoading={syncLoading}
                  onSyncClick={() => setSyncDialogOpen(true)}
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
            <Route path="*" element={<Navigate to="" replace />} />
          </Routes>
        </ClientDetailsLayout>

        {/* Sync Period Dialog */}
        <SyncPeriodDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          onConfirm={handleSyncConfirm}
          syncing={syncLoading}
          title="Sincronizar Campanhas do Cliente"
        />
      </ClientContextProvider>
    </DashboardLayout>
  );
};

export default ClienteDetalhes;
