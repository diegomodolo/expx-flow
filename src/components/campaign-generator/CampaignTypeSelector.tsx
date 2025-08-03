import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Target, Users, ShoppingBag, RotateCcw, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { CampaignData, CampaignType } from "@/pages/GeradorCampanhas";

interface CampaignTypeSelectorProps {
  campaignData: CampaignData;
  updateCampaignData: (field: keyof CampaignData, value: any) => void;
}

const campaignTypes = {
  awareness: {
    id: "awareness" as CampaignType,
    title: "Brand Awareness",
    description: "Aumentar o conhecimento da marca",
    icon: Zap,
    suitableFor: ["topo"],
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  traffic: {
    id: "traffic" as CampaignType,
    title: "Tráfego para Site",
    description: "Direcionar visitantes qualificados",
    icon: Target,
    suitableFor: ["topo", "meio"],
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  leads: {
    id: "leads" as CampaignType,
    title: "Geração de Leads",
    description: "Capturar dados de prospects",
    icon: Users,
    suitableFor: ["meio"],
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  conversions: {
    id: "conversions" as CampaignType,
    title: "Conversões",
    description: "Vendas e ações de alto valor",
    icon: ShoppingBag,
    suitableFor: ["fundo"],
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  remarketing: {
    id: "remarketing" as CampaignType,
    title: "Remarketing",
    description: "Reconverter visitantes anteriores",
    icon: RotateCcw,
    suitableFor: ["meio", "fundo", "retencao"],
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  retention: {
    id: "retention" as CampaignType,
    title: "Retenção e Fidelidade",
    description: "Manter e expandir clientes atuais",
    icon: Heart,
    suitableFor: ["retencao"],
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
};

export function CampaignTypeSelector({ campaignData, updateCampaignData }: CampaignTypeSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  if (!campaignData.client || !campaignData.funnelStage) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecione um cliente e etapa do funil primeiro para continuar.
      </div>
    );
  }

  const suitableTypes = Object.values(campaignTypes).filter(type =>
    type.suitableFor.includes(campaignData.funnelStage!)
  );

  const generateSuggestions = async () => {
    if (!campaignData.client || !campaignData.funnelStage) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-campaign-strategy', {
        body: {
          client: campaignData.client,
          funnelStage: campaignData.funnelStage,
          step: 'campaign_type_suggestion'
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar sugestões personalizadas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSuggestions();
  }, [campaignData.client, campaignData.funnelStage]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Tipo de Campanha</h3>
        <p className="text-muted-foreground">
          Com base no histórico de <strong>{campaignData.client.name}</strong> e na etapa <strong>{campaignData.funnelStage}</strong> do funil, 
          selecione o tipo de campanha mais adequado.
        </p>
      </div>

      {suggestions.length > 0 && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Recomendações da IA
          </h4>
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <p key={index} className="text-sm text-muted-foreground">
                • {suggestion}
              </p>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suitableTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = campaignData.campaignType === type.id;
          
          return (
            <Card
              key={type.id}
              className={`p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => updateCampaignData("campaignType", type.id)}
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.bgColor}`}>
                    <Icon className={`w-5 h-5 ${type.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">{type.title}</h4>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">{type.description}</p>

                <div className="flex flex-wrap gap-1">
                  {type.suitableFor.map(stage => (
                    <Badge key={stage} variant="outline" className="text-xs">
                      {stage}
                    </Badge>
                  ))}
                </div>

                {isSelected && (
                  <Button size="sm" className="w-full" variant="outline">
                    ✓ Selecionado
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-muted-foreground">Gerando sugestões personalizadas...</span>
        </div>
      )}

      {campaignData.campaignType && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <p className="text-sm">
              <strong>Tipo selecionado:</strong> {campaignTypes[campaignData.campaignType].title}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}