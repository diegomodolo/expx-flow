import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Target, 
  Eye, 
  Users, 
  MousePointer, 
  TrendingUp,
  BarChart3,
  Star,
  Clock,
  Activity
} from "lucide-react";

interface Campaign {
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

interface CampaignMetricsModalProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
}

export const CampaignMetricsModal = ({ campaign, isOpen, onClose }: CampaignMetricsModalProps) => {
  if (!campaign) return null;

  // Calcular métricas derivadas
  const clicks = campaign.clicks || Math.round((campaign.impressions || 0) * (campaign.ctr / 100));
  const conversionRate = clicks > 0 ? ((campaign.conversions / clicks) * 100) : 0;
  
  // Função para formatar rankings
  const formatRanking = (ranking?: string) => {
    if (!ranking || ranking === 'UNKNOWN') return 'Dados insuficientes';
    return ranking;
  };
  const campaignAge = Math.floor((Date.now() - new Date(campaign.created_at).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Indicadores da Campanha</span>
          </DialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            <p className="text-sm text-gray-600 font-medium">{campaign.name}</p>
            <Badge className={
              campaign.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }>
              {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Indicadores Financeiros */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span>📊 Indicadores Financeiros</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Custo Total Investido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {campaign.spend.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Valor já gasto na campanha</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">CPA (Custo por Aquisição)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    R$ {campaign.cpa.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Custo de cada conversão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">ROAS / ROI</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-400">
                    N/A
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Dados de receita necessários</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>🎯 Indicadores de Performance</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>Impressões</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {campaign.impressions?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Exibições do anúncio</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>Alcance Único</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-indigo-600">
                    {campaign.reach?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Pessoas únicas alcançadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <MousePointer className="w-4 h-4" />
                    <span>CTR</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">
                    {campaign.ctr.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Taxa de cliques</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Conversões</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {campaign.conversions}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total de conversões</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Taxa de Conversão</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    {conversionRate.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Conversões ÷ Cliques</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Cliques</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-cyan-600">
                    {(campaign.clicks || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {campaign.clicks && campaign.clicks > 0 ? 'Cliques diretos' : 'Aguardando dados'}
                  </p>
                  {campaign.clicks === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">💡 Sincronize para obter dados atualizados</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Qualidade */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <span>⚙️ Indicadores de Qualidade</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Frequência</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600">
                    {campaign.frequency ? campaign.frequency.toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Média de exibições por pessoa</p>
                  {campaign.frequency && campaign.frequency > 3 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Alta frequência - possível desgaste</p>
                  )}
                  {campaign.frequency && campaign.frequency <= 3 && (
                    <p className="text-xs text-green-600 mt-1">✅ Frequência ideal</p>
                  )}
                  {!campaign.frequency && (
                    <p className="text-xs text-yellow-600 mt-1">💡 Ideal: {'<'} 3 exibições</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Relevância do Anúncio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatRanking(campaign.quality_ranking)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Quality Ranking do Facebook</p>
                  {campaign.engagement_rate_ranking && campaign.engagement_rate_ranking !== 'UNKNOWN' && (
                    <p className="text-xs text-blue-600 mt-1">
                      📊 Engajamento: {formatRanking(campaign.engagement_rate_ranking)}
                    </p>
                  )}
                  {campaign.conversion_rate_ranking && campaign.conversion_rate_ranking !== 'UNKNOWN' && (
                    <p className="text-xs text-green-600 mt-1">
                      🎯 Conversão: {formatRanking(campaign.conversion_rate_ranking)}
                    </p>
                  )}
                  {(!campaign.quality_ranking || campaign.quality_ranking === 'UNKNOWN') && (
                    <p className="text-xs text-yellow-600 mt-1">💡 Facebook ainda está coletando dados de qualidade</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Tendência */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-red-600" />
              <span>⏱ Indicadores de Tendência</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>CPL Atual vs. Histórico</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">R$ {campaign.cpa.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Campanha ativa há {campaignAge} dias
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    📈 Análise histórica em desenvolvimento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Conversões Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{campaign.conversions} total</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Evolução nos últimos dias
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    📊 Gráfico de tendência em desenvolvimento
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resumo Geral */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>📋 Resumo Executivo</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Eficiência</p>
                  <p className="text-blue-600">
                    CTR: {campaign.ctr.toFixed(2)}% | Conv: {conversionRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Custos</p>
                  <p className="text-green-600">
                    CPC: R$ {campaign.cpc.toFixed(2)} | CPA: R$ {campaign.cpa.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Volume</p>
                  <p className="text-purple-600">
                    {campaign.conversions} conversões | R$ {campaign.spend.toFixed(0)} investido
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Status</p>
                  <p className={campaign.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                    {campaign.status === 'active' ? '✅ Ativa' : '⏸️ Pausada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};