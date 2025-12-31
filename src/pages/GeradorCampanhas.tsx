import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { EditableCampaignReport } from "@/components/campaign-generator/EditableCampaignReport";
import { CampaignsList } from "@/components/campaign-generator/CampaignsList";
import { CampaignGeneratorSimplified } from "@/components/campaign-generator/CampaignGeneratorSimplified";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { useGeneratedCampaigns } from "@/hooks/useGeneratedCampaigns";
import type { Client } from "@/hooks/useClients";

export type FunnelStage = "topo" | "meio" | "fundo" | "retencao";
export type CampaignType = "awareness" | "traffic" | "leads" | "conversions" | "remarketing" | "retention";

export interface CampaignData {
  client: Client | null;
  funnelStage: FunnelStage | null;
  campaignType: CampaignType | null;
  configuration: any;
  creatives: any[];
}

const GeradorCampanhas = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { getCampaign } = useGeneratedCampaigns();
  
  const [mode, setMode] = useState<'list' | 'generator' | 'view'>('list');
  const [campaignData, setCampaignData] = useState<CampaignData>({
    client: null,
    funnelStage: null,
    campaignType: null,
    configuration: null,
    creatives: [],
  });
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadCampaignForView(id);
    } else {
      setMode('list');
    }
  }, [id]);

  const loadCampaignForView = async (campaignId: string) => {
    try {
      const campaign = await getCampaign(campaignId);
      if (campaign) {
        setViewingCampaign(campaign);
        setMode('view');
        setCampaignData({
          client: campaign.clients as any,
          funnelStage: campaign.funnel_stage as FunnelStage,
          campaignType: campaign.campaign_type as CampaignType,
          configuration: campaign.configuration,
          creatives: campaign.creatives as any[],
        });
      } else {
        navigate('/geradores/campanhas');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      navigate('/geradores/campanhas');
    }
  };

  const handleNewCampaign = () => {
    setMode('generator');
    setCampaignData({
      client: null,
      funnelStage: null,
      campaignType: null,
      configuration: null,
      creatives: [],
    });
    navigate('/geradores/campanhas');
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/geradores/campanhas/${campaignId}`);
  };

  const handleBackToList = () => {
    setMode('list');
    navigate('/geradores/campanhas');
  };

  if (mode === 'list') {
    return (
      <DashboardLayout>
        <CampaignsList
          onNewCampaign={handleNewCampaign}
          onViewCampaign={handleViewCampaign}
        />
      </DashboardLayout>
    );
  }

  if (mode === 'view') {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="outline"
                onClick={handleBackToList}
                className="flex items-center gap-2 mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Lista
              </Button>
              <h1 className="text-2xl font-bold text-foreground">
                {viewingCampaign?.title}
              </h1>
            </div>
          </div>
          
          <EditableCampaignReport
            campaign={viewingCampaign}
            onSave={() => loadCampaignForView(id!)}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Generator mode - simplified single screen
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/geradores')}
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Geradores
          </Button>
          <span className="text-muted-foreground">/</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToList}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Lista
          </Button>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerador de Campanhas Inteligente</h1>
          <p className="text-muted-foreground">Crie estratégias de campanha otimizadas com IA</p>
        </div>

        <CampaignGeneratorSimplified onBack={handleBackToList} />
      </div>
    </DashboardLayout>
  );
};

export default GeradorCampanhas;