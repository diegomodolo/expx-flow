import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";
import { Card } from "@/components/ui/card";
import { SearchableClientSelect } from "@/components/ui/searchable-client-select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, Target, Calendar, TrendingUp } from "lucide-react";
import type { CampaignData } from "@/pages/GeradorCampanhas";

interface ClientSelectorProps {
  campaignData: CampaignData;
  updateCampaignData: (field: keyof CampaignData, value: any) => void;
}

export function ClientSelector({ campaignData, updateCampaignData }: ClientSelectorProps) {
  const { clients, loading } = useClients();
  const { campaigns } = useCampaigns();

  const getClientCampaigns = (clientId: string) => {
    return campaigns.filter(campaign => campaign.client_id === clientId);
  };

  const getClientMetrics = (clientId: string) => {
    const clientCampaigns = getClientCampaigns(clientId);
    const totalSpend = clientCampaigns.reduce((sum, c) => sum + c.spend, 0);
    const totalConversions = clientCampaigns.reduce((sum, c) => sum + c.conversions, 0);
    const avgCPA = clientCampaigns.length > 0 
      ? clientCampaigns.reduce((sum, c) => sum + c.cpa, 0) / clientCampaigns.length 
      : 0;
    
    return { totalSpend, totalConversions, avgCPA, campaignCount: clientCampaigns.length };
  };

  if (loading) {
    return <div className="text-center py-8">Carregando clientes...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Selecione o Cliente</h3>
        <p className="text-muted-foreground">
          Escolha o cliente para quem você deseja gerar uma campanha inteligente.
        </p>
      </div>

      <SearchableClientSelect
        clients={clients.map(c => ({ id: c.id, name: c.name, extra: c.company }))}
        value={campaignData.client?.id || ""}
        onValueChange={(value) => {
          const selectedClient = clients.find(client => client.id === value);
          updateCampaignData("client", selectedClient || null);
        }}
        placeholder="Selecione um cliente..."
      />

      {campaignData.client && (
        <Card className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={campaignData.client.avatar} />
                <AvatarFallback>
                  {campaignData.client.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="text-xl font-semibold">{campaignData.client.name}</h4>
                <p className="text-muted-foreground">{campaignData.client.company}</p>
                <Badge variant="outline" className="mt-1">
                  {campaignData.client.sector}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <Building2 className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Campanhas Ativas</div>
                <div className="text-lg font-bold">{campaignData.client.active_campaigns}</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Total Gasto</div>
                <div className="text-lg font-bold">
                  R$ {getClientMetrics(campaignData.client.id).totalSpend.toLocaleString()}
                </div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">Conversões</div>
                <div className="text-lg font-bold">
                  {getClientMetrics(campaignData.client.id).totalConversions}
                </div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
                <div className="text-sm font-medium">CPA Médio</div>
                <div className="text-lg font-bold">
                  R$ {getClientMetrics(campaignData.client.id).avgCPA.toFixed(2)}
                </div>
              </div>
            </div>

            {campaignData.client.objectives && (
              <div>
                <h5 className="font-medium mb-2">Objetivos</h5>
                <p className="text-sm text-muted-foreground">{campaignData.client.objectives}</p>
              </div>
            )}

            {campaignData.client.target_audience && (
              <div>
                <h5 className="font-medium mb-2">Público-Alvo</h5>
                <p className="text-sm text-muted-foreground">{campaignData.client.target_audience}</p>
              </div>
            )}

            {campaignData.client.ai_briefing && (
              <div>
                <h5 className="font-medium mb-2">Briefing IA</h5>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {campaignData.client.ai_briefing}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}