import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, DollarSign, Users, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CampaignData } from "@/pages/GeradorCampanhas";

interface CampaignConfigurationProps {
  campaignData: CampaignData;
  updateCampaignData: (field: keyof CampaignData, value: any) => void;
}

export function CampaignConfiguration({ campaignData, updateCampaignData }: CampaignConfigurationProps) {
  const [loading, setLoading] = useState(false);
  const [configuration, setConfiguration] = useState<any>(null);
  const { toast } = useToast();

  if (!campaignData.client || !campaignData.funnelStage || !campaignData.campaignType) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Complete as etapas anteriores para continuar.
      </div>
    );
  }

  const generateConfiguration = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-strategy', {
        body: {
          client: campaignData.client,
          funnelStage: campaignData.funnelStage,
          campaignType: campaignData.campaignType,
          step: 'campaign_configuration'
        }
      });

      if (error) throw error;

      if (data?.configuration) {
        setConfiguration(data.configuration);
        updateCampaignData("configuration", data.configuration);
      }
    } catch (error) {
      console.error('Erro ao gerar configuração:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar a configuração da campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignData.client && campaignData.funnelStage && campaignData.campaignType) {
      generateConfiguration();
    }
  }, [campaignData.client, campaignData.funnelStage, campaignData.campaignType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <div className="text-center">
          <h3 className="font-medium">Gerando Configuração Inteligente</h3>
          <p className="text-sm text-muted-foreground">
            Analisando histórico e otimizando parâmetros...
          </p>
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="text-center py-8">
        <Button onClick={generateConfiguration} className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Gerar Configuração
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Configuração da Campanha</h3>
        <p className="text-muted-foreground">
          Configuração otimizada baseada no histórico de performance de <strong>{campaignData.client.name}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <DollarSign className="w-5 h-5 text-green-600" />
            <h4 className="font-medium">Orçamento</h4>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">R$ {configuration.budget?.daily}</div>
            <div className="text-sm text-muted-foreground">por dia</div>
            <div className="text-xs text-muted-foreground">
              Total: R$ {configuration.budget?.total} ({configuration.budget?.duration} dias)
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium">Alcance</h4>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{configuration.targeting?.estimatedReach}</div>
            <div className="text-sm text-muted-foreground">pessoas</div>
            <div className="text-xs text-muted-foreground">
              Público estimado
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Settings className="w-5 h-5 text-purple-600" />
            <h4 className="font-medium">Conjuntos</h4>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{configuration.adSets?.length || 3}</div>
            <div className="text-sm text-muted-foreground">ad sets</div>
            <div className="text-xs text-muted-foreground">
              Segmentações diferentes
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Calendar className="w-5 h-5 text-orange-600" />
            <h4 className="font-medium">Duração</h4>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold">{configuration.schedule?.duration}</div>
            <div className="text-sm text-muted-foreground">dias</div>
            <div className="text-xs text-muted-foreground">
              {configuration.schedule?.startDate} até {configuration.schedule?.endDate}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Segmentação Detalhada
          </h4>
          <div className="space-y-3">
            {configuration.targeting?.demographics && (
              <div>
                <h5 className="text-sm font-medium">Demografia</h5>
                <p className="text-sm text-muted-foreground">{configuration.targeting.demographics}</p>
              </div>
            )}
            {configuration.targeting?.interests && (
              <div>
                <h5 className="text-sm font-medium">Interesses</h5>
                <div className="flex flex-wrap gap-1 mt-1">
                  {configuration.targeting.interests.map((interest: string, index: number) => (
                    <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {configuration.targeting?.behaviors && (
              <div>
                <h5 className="text-sm font-medium">Comportamentos</h5>
                <p className="text-sm text-muted-foreground">{configuration.targeting.behaviors}</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Estratégia de Veiculação
          </h4>
          <div className="space-y-3">
            <div>
              <h5 className="text-sm font-medium">Horários Otimizados</h5>
              <p className="text-sm text-muted-foreground">{configuration.schedule?.optimalHours}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium">Distribuição de Orçamento</h5>
              <p className="text-sm text-muted-foreground">{configuration.budget?.distribution}</p>
            </div>
            <div>
              <h5 className="text-sm font-medium">Estratégia de Lance</h5>
              <p className="text-sm text-muted-foreground">{configuration.bidding?.strategy}</p>
            </div>
          </div>
        </Card>
      </div>

      {configuration.recommendations && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h4 className="font-semibold mb-3">Recomendações Estratégicas</h4>
          <div className="space-y-2">
            {configuration.recommendations.map((rec: string, index: number) => (
              <p key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {rec}
              </p>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={generateConfiguration}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Settings className="w-4 h-4" />
          Regenerar Configuração
        </Button>
      </div>
    </div>
  );
}