import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BarChart3, TrendingUp, DollarSign, Target } from "lucide-react";
import { useClientContext } from "./ClienteContext";
import { ClientBriefingTab } from "@/components/clients/ClientBriefingTab";
import { useCampaigns } from "@/hooks/useCampaigns";

export function ClienteAnalise() {
  const { client, refetchClient } = useClientContext();
  const { campaigns } = useCampaigns();

  // Filtrar campanhas do cliente
  const clientCampaigns = campaigns.filter(c => c.client_id === client?.id);

  // Calcular métricas gerais
  const totalSpend = clientCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
  const totalConversions = clientCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
  const avgCTR = clientCampaigns.length > 0 
    ? clientCampaigns.reduce((sum, c) => sum + (c.ctr || 0), 0) / clientCampaigns.length 
    : 0;

  // Top 3 melhores campanhas
  const topCampaigns = [...clientCampaigns]
    .filter(c => c.status === 'active' && c.conversions > 0)
    .sort((a, b) => (b.conversions / b.spend) - (a.conversions / a.spend))
    .slice(0, 3);

  // Top 3 campanhas que precisam atenção
  const attentionCampaigns = [...clientCampaigns]
    .filter(c => c.status === 'active')
    .sort((a, b) => (b.cpa || 0) - (a.cpa || 0))
    .slice(0, 3);

  const handleBriefingUpdate = (updatedClient: any) => {
    refetchClient();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Análise Completa</h2>
        <p className="text-muted-foreground">
          Análise detalhada do negócio e performance de {client?.name}
        </p>
      </div>

      {/* Briefing Inteligente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Briefing Inteligente do Negócio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClientBriefingTab
            client={client}
            formData={{ website_url: client?.website_url || '' }}
            onBriefingUpdate={handleBriefingUpdate}
          />
        </CardContent>
      </Card>

      {/* Performance Geral */}
      <Card>
        <CardHeader>
          <CardTitle>📊 Performance Geral (Últimos 30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Investimento</p>
                <p className="text-xl font-bold">
                  R$ {totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-xl font-bold">{totalConversions}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPA Médio</p>
                <p className="text-xl font-bold">
                  R$ {avgCPA.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CTR Médio</p>
                <p className="text-xl font-bold">{avgCTR.toFixed(2)}%</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campanhas em Destaque */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              🏆 Top 3 Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma campanha ativa com conversões no momento.
              </p>
            ) : (
              <div className="space-y-3">
                {topCampaigns.map((campaign, index) => (
                  <div key={campaign.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-green-600">#{index + 1}</span>
                          <p className="font-medium text-sm">{campaign.name}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Conversões: {campaign.conversions}</span>
                          <span>CPA: R$ {(campaign.cpa || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded inline-block">
                      ROI: {campaign.spend > 0 ? ((campaign.conversions / campaign.spend) * 100).toFixed(0) : 0}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Precisam Atenção */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              ⚠️ Precisam Atenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attentionCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Todas as campanhas estão performando bem!
              </p>
            ) : (
              <div className="space-y-3">
                {attentionCampaigns.map((campaign, index) => (
                  <div key={campaign.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-sm mb-1">{campaign.name}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Conversões: {campaign.conversions || 0}</span>
                          <span className="font-semibold text-orange-700">
                            CPA: R$ {(campaign.cpa || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded inline-block">
                      {campaign.cpa > 50 ? 'CPA Alto' : campaign.ctr < 1 ? 'CTR Baixo' : 'Revisar Performance'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
