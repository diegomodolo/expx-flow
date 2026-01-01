import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
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
  
  const [mode, setMode] = useState<'list' | 'generator' | 'edit'>('list');
  const [existingCampaign, setExistingCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadCampaignForEdit(id);
    } else {
      setMode('list');
      setExistingCampaign(null);
    }
  }, [id]);

  const loadCampaignForEdit = async (campaignId: string) => {
    try {
      setLoading(true);
      const campaign = await getCampaign(campaignId);
      if (campaign) {
        setExistingCampaign(campaign);
        setMode('edit');
      } else {
        navigate('/geradores/campanhas');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      navigate('/geradores/campanhas');
    } finally {
      setLoading(false);
    }
  };

  const handleNewCampaign = () => {
    setMode('generator');
    setExistingCampaign(null);
    navigate('/geradores/campanhas');
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/geradores/campanhas/${campaignId}`);
  };

  const handleBackToList = () => {
    setMode('list');
    setExistingCampaign(null);
    navigate('/geradores/campanhas');
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

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

  // Both 'generator' (new) and 'edit' (existing) modes use CampaignGeneratorSimplified
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
          <h1 className="text-2xl font-bold text-foreground">
            {mode === 'edit' ? 'Editar Campanha' : 'Gerador de Campanhas Inteligente'}
          </h1>
          <p className="text-muted-foreground">
            {mode === 'edit' 
              ? 'Edite os detalhes da sua campanha' 
              : 'Crie estratégias de campanha otimizadas com IA'}
          </p>
        </div>

        <CampaignGeneratorSimplified 
          onBack={handleBackToList} 
          existingCampaign={existingCampaign}
        />
      </div>
    </DashboardLayout>
  );
};

export default GeradorCampanhas;