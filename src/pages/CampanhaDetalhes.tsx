import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Edit, BarChart3, Users, Target, TrendingUp, Eye, Calendar, DollarSign } from "lucide-react";
import { useCampaigns } from "@/hooks/useCampaigns";
import { CampaignMetricsModal } from "@/components/campaigns/CampaignMetricsModal";

// Interface local para compatibilidade
interface CampaignForModal {
  id: string;
  name: string;
  status: string;
  spend: number;
  cpa: number;
  ctr: number;
  cpc: number;
  conversions: number;
  impressions?: number;
  clicks?: number;
  reach?: number;
  frequency?: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  created_at: string;
}

export default function CampanhaDetalhes() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { campaigns, loading } = useCampaigns();
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  
  const campaign = campaigns.find(c => c.id === id);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "ativa":
      case "active":
        return "bg-emerald-100 text-emerald-800";
      case "pausada":
      case "paused":
        return "bg-amber-100 text-amber-800";
      case "finalizada":
      case "finished":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const getPerformanceLevel = (ctr: number, cpc: number) => {
    if (ctr >= 3 && cpc <= 2) return { level: "Excelente", color: "text-emerald-600" };
    if (ctr >= 2 && cpc <= 3) return { level: "Bom", color: "text-blue-600" };
    if (ctr >= 1.5 && cpc <= 4) return { level: "Regular", color: "text-amber-600" };
    return { level: "Crítico", color: "text-red-600" };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!campaign) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-2xl font-bold text-muted-foreground mb-4">Campanha não encontrada</h2>
          <Button onClick={() => navigate("/campanhas")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Campanhas
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const performance = getPerformanceLevel(campaign.ctr || 0, campaign.cpc || 0);
  const conversionRate = campaign.conversions && campaign.clicks 
    ? ((campaign.conversions / campaign.clicks) * 100).toFixed(2)
    : "0.00";

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/campanhas")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            <p className="text-muted-foreground">{campaign.client?.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowMetricsModal(true)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Métricas Detalhadas
          </Button>
        </div>
      </div>

      {/* Status e Performance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
              <div className={`w-3 h-3 rounded-full ${
                campaign.status?.toLowerCase() === "ativa" ? "bg-emerald-500" : 
                campaign.status?.toLowerCase() === "pausada" ? "bg-amber-500" : "bg-slate-500"
              }`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance</p>
                <p className={`text-lg font-semibold ${performance.color}`}>
                  {performance.level}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CTR</p>
                <p className="text-lg font-semibold text-foreground">
                  {campaign.ctr?.toFixed(2)}%
                </p>
              </div>
              <Target className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Conversões</p>
                <p className="text-lg font-semibold text-foreground">
                  {campaign.conversions || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>Investimento e Resultados</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Investimento Total</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {campaign.spend?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CPC Médio</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {campaign.cpc?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CPA</p>
                <p className="text-xl font-semibold text-foreground">
                  R$ {campaign.cpa?.toFixed(2) || '0,00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-xl font-semibold text-foreground">
                  {conversionRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5" />
              <span>Alcance e Engajamento</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Impressões</p>
                <p className="text-2xl font-bold text-foreground">
                  {campaign.impressions?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cliques</p>
                <p className="text-2xl font-bold text-foreground">
                  {campaign.clicks?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Alcance</p>
                <p className="text-xl font-semibold text-foreground">
                  {campaign.reach?.toLocaleString('pt-BR') || '0'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Frequência</p>
                <p className="text-xl font-semibold text-foreground">
                  {campaign.frequency?.toFixed(2) || '0,00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progresso da Campanha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            <span>Progresso da Campanha</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Data de Início: {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString('pt-BR') : 'N/A'}</span>
              <span>Status: {campaign.status}</span>
            </div>
            <Progress value={75} className="w-full" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>75% concluída</span>
              <span>Estimativa de conclusão: 30 dias</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights e Recomendações */}
      <Card>
        <CardHeader>
          <CardTitle>Insights e Recomendações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Oportunidade de Melhoria</h4>
              <p className="text-blue-800">
                {campaign.ctr && campaign.ctr < 2 
                  ? "O CTR está abaixo da média. Considere testar novos criativos ou ajustar o público-alvo."
                  : "O CTR está em bom nível. Continue monitorando e testando variações."}
              </p>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-900 mb-2">📈 Performance</h4>
              <p className="text-green-800">
                {campaign.conversions && campaign.conversions > 50 
                  ? "Excelente número de conversões! A campanha está performando bem."
                  : "Considere otimizar para aumentar o número de conversões."}
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-900 mb-2">⚠️ Atenção</h4>
              <p className="text-amber-800">
                {campaign.cpc && campaign.cpc > 3 
                  ? "CPC está elevado. Revise as palavras-chave e configurações de lance."
                  : "CPC está em nível adequado. Continue monitorando."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Métricas */}
      {showMetricsModal && campaign && (
        <CampaignMetricsModal
          campaign={{
            ...campaign,
            created_at: campaign.created_at || new Date().toISOString()
          }}
          isOpen={showMetricsModal}
          onClose={() => setShowMetricsModal(false)}
        />
      )}
    </DashboardLayout>
  );
}