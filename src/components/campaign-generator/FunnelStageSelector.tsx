import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Search, ShoppingCart, Heart } from "lucide-react";
import type { CampaignData, FunnelStage } from "@/pages/GeradorCampanhas";

interface FunnelStageSelectorProps {
  campaignData: CampaignData;
  updateCampaignData: (field: keyof CampaignData, value: any) => void;
}

const funnelStages = [
  {
    id: "topo" as FunnelStage,
    title: "Topo de Funil",
    description: "Gerar awareness e atrair novos prospects",
    icon: Eye,
    examples: ["Conteúdo educativo", "Brand awareness", "Alcance amplo"],
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "meio" as FunnelStage,
    title: "Meio de Funil",
    description: "Nutrir leads e gerar consideração",
    icon: Search,
    examples: ["Geração de leads", "Download de materiais", "Engajamento"],
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "fundo" as FunnelStage,
    title: "Fundo de Funil",
    description: "Converter leads em clientes",
    icon: ShoppingCart,
    examples: ["Conversões", "Vendas diretas", "Demonstrações"],
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "retencao" as FunnelStage,
    title: "Retenção",
    description: "Fidelizar e fazer upsell/cross-sell",
    icon: Heart,
    examples: ["Remarketing", "Programas de fidelidade", "Novos produtos"],
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export function FunnelStageSelector({ campaignData, updateCampaignData }: FunnelStageSelectorProps) {
  if (!campaignData.client) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecione um cliente primeiro para continuar.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Escolha a Etapa do Funil</h3>
        <p className="text-muted-foreground">
          Selecione em qual etapa do funil de vendas você deseja focar esta campanha para <strong>{campaignData.client.name}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {funnelStages.map((stage) => {
          const Icon = stage.icon;
          const isSelected = campaignData.funnelStage === stage.id;
          
          return (
            <Card
              key={stage.id}
              className={`p-6 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? "ring-2 ring-primary border-primary"
                  : "hover:border-primary/50"
              }`}
              onClick={() => updateCampaignData("funnelStage", stage.id)}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${stage.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stage.color}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold">{stage.title}</h4>
                    <p className="text-sm text-muted-foreground">{stage.description}</p>
                  </div>
                </div>
                
                <div>
                  <h5 className="text-sm font-medium mb-2">Exemplos de estratégias:</h5>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {stage.examples.map((example, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                        {example}
                      </li>
                    ))}
                  </ul>
                </div>

                {isSelected && (
                  <Button className="w-full" variant="outline">
                    ✓ Etapa Selecionada
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {campaignData.funnelStage && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <p className="text-sm">
              <strong>Etapa selecionada:</strong> {funnelStages.find(s => s.id === campaignData.funnelStage)?.title}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}