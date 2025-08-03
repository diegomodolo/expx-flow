import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ClientSelector } from "@/components/campaign-generator/ClientSelector";
import { FunnelStageSelector } from "@/components/campaign-generator/FunnelStageSelector";
import { CampaignTypeSelector } from "@/components/campaign-generator/CampaignTypeSelector";
import { CampaignConfiguration } from "@/components/campaign-generator/CampaignConfiguration";
import { CreativeGenerator } from "@/components/campaign-generator/CreativeGenerator";
import { CampaignReport } from "@/components/campaign-generator/CampaignReport";
import { EditableCampaignReport } from "@/components/campaign-generator/EditableCampaignReport";
import { CampaignsList } from "@/components/campaign-generator/CampaignsList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    client: null,
    funnelStage: null,
    campaignType: null,
    configuration: null,
    creatives: [],
  });
  const [viewingCampaign, setViewingCampaign] = useState<any>(null);

  const steps = [
    { number: 1, title: "Seleção do Cliente", component: ClientSelector },
    { number: 2, title: "Etapa do Funil", component: FunnelStageSelector },
    { number: 3, title: "Tipo de Campanha", component: CampaignTypeSelector },
    { number: 4, title: "Configuração", component: CampaignConfiguration },
    { number: 5, title: "Criativos", component: CreativeGenerator },
    { number: 6, title: "Relatório Final", component: CampaignReport },
  ];

  useEffect(() => {
    if (id) {
      // Se há um ID na URL, carrega a campanha para visualização
      loadCampaignForView(id);
    } else {
      // Se não há ID, mostra a lista
      setMode('list');
    }
  }, [id]);

  const loadCampaignForView = async (campaignId: string) => {
    try {
      const campaign = await getCampaign(campaignId);
      if (campaign) {
        setViewingCampaign(campaign);
        setMode('view');
        
        // Converte os dados salvos para o formato esperado pelo CampaignReport
        setCampaignData({
          client: campaign.clients as any,
          funnelStage: campaign.funnel_stage as FunnelStage,
          campaignType: campaign.campaign_type as CampaignType,
          configuration: campaign.configuration,
          creatives: campaign.creatives as any[],
        });
        setCurrentStep(6); // Vai direto para o relatório
      } else {
        navigate('/gerador-campanhas');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      navigate('/gerador-campanhas');
    }
  };

  const handleNewCampaign = () => {
    setMode('generator');
    setCurrentStep(1);
    setCampaignData({
      client: null,
      funnelStage: null,
      campaignType: null,
      configuration: null,
      creatives: [],
    });
    navigate('/gerador-campanhas');
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/gerador-campanhas/${campaignId}`);
  };

  const handleBackToList = () => {
    setMode('list');
    navigate('/gerador-campanhas');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: return campaignData.client !== null;
      case 2: return campaignData.funnelStage !== null;
      case 3: return campaignData.campaignType !== null;
      case 4: return campaignData.configuration !== null;
      case 5: return campaignData.creatives.length > 0;
      default: return true;
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateCampaignData = (field: keyof CampaignData, value: any) => {
    setCampaignData(prev => ({ ...prev, [field]: value }));
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

  // Generator mode
  const CurrentStepComponent = steps[currentStep - 1].component;

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
            <h1 className="text-2xl font-bold text-foreground">Gerador de Campanhas Inteligente</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            Passo {currentStep} de {steps.length}
          </div>
        </div>

        {/* Progress Steps */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step.number === currentStep
                      ? "bg-primary text-primary-foreground"
                      : step.number < currentStep
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.number}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      step.number < currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">{steps[currentStep - 1].title}</h3>
          </div>
        </Card>

        {/* Current Step Content */}
        <Card className="p-6">
          <CurrentStepComponent
            campaignData={campaignData}
            updateCampaignData={updateCampaignData}
          />
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Anterior
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={currentStep === steps.length || !canProceed()}
            className="flex items-center gap-2"
          >
            {currentStep === steps.length ? "Finalizar" : "Próximo"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GeradorCampanhas;