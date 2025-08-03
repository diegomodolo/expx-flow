import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Share2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CampaignData } from "@/pages/GeradorCampanhas";

interface CampaignReportProps {
  campaignData: CampaignData;
  updateCampaignData: (field: keyof CampaignData, value: any) => void;
}

export function CampaignReport({ campaignData }: CampaignReportProps) {
  const { toast } = useToast();

  if (!campaignData.client || !campaignData.configuration || !campaignData.creatives) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Complete todas as etapas para visualizar o relatório final.
      </div>
    );
  }

  const handleExport = () => {
    // Implementar exportação para PDF ou outro formato
    toast({
      title: "Exportação Iniciada",
      description: "O relatório da campanha será baixado em breve",
    });
  };

  const handleShare = () => {
    // Implementar compartilhamento
    toast({
      title: "Link Copiado",
      description: "Link do relatório copiado para a área de transferência",
    });
  };

  const { configuration, creatives, client } = campaignData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">Relatório Final da Campanha</h3>
          <p className="text-muted-foreground">
            Estratégia completa gerada para <strong>{client.name}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShare} className="flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            Compartilhar
          </Button>
          <Button onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Resumo Executivo */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Resumo Executivo
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-primary">R$ {configuration.budget?.daily}</div>
            <div className="text-sm text-muted-foreground">Orçamento Diário</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-primary">{configuration.adSets?.length || 3}</div>
            <div className="text-sm text-muted-foreground">Conjuntos de Anúncios</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-primary">{creatives.length * 3}</div>
            <div className="text-sm text-muted-foreground">Criativos Gerados</div>
          </div>
          <div className="text-center p-3 bg-muted rounded-lg">
            <div className="text-lg font-bold text-primary">{configuration.schedule?.duration}</div>
            <div className="text-sm text-muted-foreground">Dias de Veiculação</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{campaignData.funnelStage}</Badge>
          <Badge variant="outline">{campaignData.campaignType}</Badge>
          <Badge variant="secondary">{client.sector}</Badge>
        </div>
      </Card>

      {/* Estrutura da Campanha */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Estrutura da Campanha</h4>
        <div className="space-y-4">
          <div>
            <h5 className="font-medium">Objetivo</h5>
            <p className="text-sm text-muted-foreground">{configuration.objective || campaignData.campaignType}</p>
          </div>
          <div>
            <h5 className="font-medium">Segmentação Principal</h5>
            <p className="text-sm text-muted-foreground">{configuration.targeting?.demographics}</p>
          </div>
          <div>
            <h5 className="font-medium">Estratégia de Lance</h5>
            <p className="text-sm text-muted-foreground">{configuration.bidding?.strategy}</p>
          </div>
          <div>
            <h5 className="font-medium">Cronograma</h5>
            <p className="text-sm text-muted-foreground">
              {configuration.schedule?.startDate} até {configuration.schedule?.endDate} - {configuration.schedule?.optimalHours}
            </p>
          </div>
        </div>
      </Card>

      {/* Resumo dos Criativos */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Criativos por Conjunto</h4>
        <div className="space-y-4">
          {creatives.map((creative, index) => (
            <div key={creative.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h5 className="font-medium">Conjunto {index + 1}: {creative.adSetName}</h5>
                <Badge variant="outline">3 variações</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium mb-1">Título Principal</div>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {creative.headline}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium mb-1">Call to Action</div>
                  <div className="text-sm text-primary bg-primary/10 p-2 rounded">
                    {creative.callToAction}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm font-medium mb-1">Elemento Visual</div>
                <div className="text-xs text-muted-foreground">
                  {creative.imageDescription}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Recomendações Estratégicas */}
      {configuration.recommendations && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h4 className="font-semibold mb-4">Recomendações Estratégicas</h4>
          <div className="space-y-3">
            {configuration.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Próximos Passos */}
      <Card className="p-6 bg-muted/50">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Próximos Passos
        </h4>
        <div className="space-y-2 text-sm">
          <p>✅ Revisar e aprovar a estratégia gerada</p>
          <p>⏳ Criar as campanhas no Facebook Ads Manager</p>
          <p>⏳ Produzir os elementos visuais sugeridos</p>
          <p>⏳ Configurar acompanhamento e métricas</p>
          <p>⏳ Iniciar testes A/B com as variações</p>
          <p>⏳ Monitorar performance e otimizar</p>
        </div>
      </Card>

      <div className="text-center">
        <Button size="lg" className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Estratégia Concluída
        </Button>
      </div>
    </div>
  );
}