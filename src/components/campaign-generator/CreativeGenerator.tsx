import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Image, Video, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CampaignData } from "@/pages/GeradorCampanhas";

interface CreativeGeneratorProps {
  campaignData: CampaignData;
  updateCampaignData: (field: keyof CampaignData, value: any) => void;
}

interface Creative {
  id: string;
  adSetName: string;
  headline: string;
  primaryText: string;
  description: string;
  callToAction: string;
  imageDescription: string;
  videoSuggestion?: string;
  variations: {
    headline: string[];
    primaryText: string[];
    description: string[];
  };
}

export function CreativeGenerator({ campaignData, updateCampaignData }: CreativeGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const { toast } = useToast();

  if (!campaignData.client || !campaignData.funnelStage || !campaignData.campaignType || !campaignData.configuration) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Complete as etapas anteriores para continuar.
      </div>
    );
  }

  const generateCreatives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-creatives', {
        body: {
          client: campaignData.client,
          funnelStage: campaignData.funnelStage,
          campaignType: campaignData.campaignType,
          configuration: campaignData.configuration
        }
      });

      if (error) throw error;

      if (data?.creatives) {
        setCreatives(data.creatives);
        updateCampaignData("creatives", data.creatives);
      }
    } catch (error) {
      console.error('Erro ao gerar criativos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar os criativos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (campaignData.configuration && creatives.length === 0) {
      generateCreatives();
    }
  }, [campaignData.configuration]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        <div className="text-center">
          <h3 className="font-medium">Gerando Criativos Inteligentes</h3>
          <p className="text-sm text-muted-foreground">
            Criando variações baseadas no tom de voz e histórico de performance...
          </p>
        </div>
      </div>
    );
  }

  if (creatives.length === 0) {
    return (
      <div className="text-center py-8">
        <Button onClick={generateCreatives} className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Gerar Criativos
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Criativos Gerados</h3>
          <p className="text-muted-foreground">
            {creatives.length} conjuntos de criativos gerados para <strong>{campaignData.client.name}</strong>
          </p>
        </div>
        <Button 
          onClick={generateCreatives}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Regenerar
        </Button>
      </div>

      <div className="space-y-6">
        {creatives.map((creative, index) => (
          <Card key={creative.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-lg">Conjunto {index + 1}: {creative.adSetName}</h4>
              <Badge variant="outline">3 variações</Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Criativo Principal */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Criativo Principal
                  </h5>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">TÍTULO</div>
                      <div className="font-semibold">{creative.headline}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">TEXTO PRINCIPAL</div>
                      <div className="text-sm">{creative.primaryText}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">DESCRIÇÃO</div>
                      <div className="text-sm text-muted-foreground">{creative.description}</div>
                    </div>
                    <div className="p-3 bg-primary/5 rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">CALL TO ACTION</div>
                      <div className="font-medium text-primary">{creative.callToAction}</div>
                    </div>
                  </div>
                </div>

                {/* Sugestões Visuais */}
                <div>
                  <h5 className="font-medium mb-2 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Elementos Visuais
                  </h5>
                  <div className="space-y-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-1">IMAGEM SUGERIDA</div>
                      <div className="text-sm">{creative.imageDescription}</div>
                    </div>
                    {creative.videoSuggestion && (
                      <div className="p-3 bg-muted rounded-lg">
                        <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                          <Video className="w-3 h-3" />
                          VÍDEO SUGERIDO
                        </div>
                        <div className="text-sm">{creative.videoSuggestion}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Variações para Teste A/B */}
              <div>
                <h5 className="font-medium mb-3">Variações para Teste A/B</h5>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">TÍTULOS ALTERNATIVOS</div>
                    <div className="space-y-1">
                      {creative.variations.headline.map((variation, i) => (
                        <div key={i} className="text-xs p-2 bg-muted rounded text-muted-foreground">
                          {variation}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">TEXTOS ALTERNATIVOS</div>
                    <div className="space-y-1">
                      {creative.variations.primaryText.map((variation, i) => (
                        <div key={i} className="text-xs p-2 bg-muted rounded text-muted-foreground">
                          {variation}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-2">DESCRIÇÕES ALTERNATIVAS</div>
                    <div className="space-y-1">
                      {creative.variations.description.map((variation, i) => (
                        <div key={i} className="text-xs p-2 bg-muted rounded text-muted-foreground">
                          {variation}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {creatives.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h4 className="font-medium mb-2">Dicas para Otimização</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>• Teste todas as variações simultaneamente para identificar as melhores performers</p>
            <p>• Monitore CTR, CPM e taxa de conversão nas primeiras 48h</p>
            <p>• Pause criativos com performance abaixo da média após 3 dias</p>
            <p>• Considere criar vídeos baseados nas imagens de melhor performance</p>
          </div>
        </Card>
      )}
    </div>
  );
}