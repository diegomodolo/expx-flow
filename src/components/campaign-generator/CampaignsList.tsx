import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useGeneratedCampaigns } from "@/hooks/useGeneratedCampaigns";
import { Skeleton } from "@/components/ui/skeleton";

interface CampaignsListProps {
  onNewCampaign: () => void;
  onViewCampaign: (campaignId: string) => void;
}

export function CampaignsList({ onNewCampaign, onViewCampaign }: CampaignsListProps) {
  const { campaigns, loading } = useGeneratedCampaigns();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-18" />
              </div>
              <Skeleton className="h-4 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-6">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma campanha gerada ainda</h3>
          <p className="text-muted-foreground mb-6">
            Comece criando sua primeira estratégia de campanha inteligente
          </p>
        </div>
        <Button onClick={onNewCampaign} size="lg" className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Gerar Primeira Campanha
        </Button>
      </div>
    );
  }

  const getFunnelStageLabel = (stage: string) => {
    const labels = {
      topo: "Topo",
      meio: "Meio", 
      fundo: "Fundo",
      retencao: "Retenção"
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  const getCampaignTypeLabel = (type: string) => {
    const labels = {
      awareness: "Reconhecimento",
      traffic: "Tráfego",
      leads: "Leads",
      conversions: "Conversões",
      remarketing: "Remarketing",
      retention: "Retenção"
    };
    return labels[type as keyof typeof labels] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campanhas Geradas</h1>
          <p className="text-muted-foreground">
            {campaigns.length} {campaigns.length === 1 ? 'estratégia criada' : 'estratégias criadas'}
          </p>
        </div>
        <Button onClick={onNewCampaign} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Campanha
        </Button>
      </div>

      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-semibold text-lg">{campaign.title}</h3>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary">
                    {getFunnelStageLabel(campaign.funnel_stage)}
                  </Badge>
                  <Badge variant="outline">
                    {getCampaignTypeLabel(campaign.campaign_type)}
                  </Badge>
                  {campaign.clients && (
                    <Badge variant="default">
                      {campaign.clients.company}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {campaign.clients?.name || 'Cliente não encontrado'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(campaign.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => onViewCampaign(campaign.id)}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Ver Detalhes
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}