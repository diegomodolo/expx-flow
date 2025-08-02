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
  Activity,
  Settings,
  Zap
} from "lucide-react";

interface AdSet {
  id: string;
  facebook_id: string;
  name: string;
  status: string;
  daily_budget: number;
  lifetime_budget: number;
  bid_strategy: string;
  optimization_goal: string;
  targeting: string;
  cpm: number;
  ctr: number;
  cpc: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  reach?: number;
  frequency?: number;
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
  created_at: string;
}

interface AdSetMetricsModalProps {
  adSet: AdSet | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdSetMetricsModal = ({ adSet, isOpen, onClose }: AdSetMetricsModalProps) => {
  if (!adSet) return null;

  // Calcular métricas derivadas
  const conversionRate = adSet.clicks > 0 ? ((adSet.conversions / adSet.clicks) * 100) : 0;
  
  const formatAdSetAge = () => {
    const createdDate = new Date(adSet.created_at);
    const now = new Date();
    const diffInMs = now.getTime() - createdDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays >= 1) {
      return `${diffInDays} ${diffInDays === 1 ? 'dia' : 'dias'}`;
    } else {
      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
      if (diffInHours >= 1) {
        return `${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
      } else {
        const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
        return `${Math.max(1, diffInMinutes)} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
      }
    }
  };
  
  // Função para formatar rankings
  const formatRanking = (ranking?: string) => {
    if (!ranking || ranking === 'UNKNOWN') return 'Dados insuficientes';
    return ranking;
  };

  // Função para formatar targeting
  const formatTargeting = (targeting?: string) => {
    if (!targeting) return 'Não especificado';
    try {
      const targetingObj = JSON.parse(targeting);
      return Object.keys(targetingObj).join(', ');
    } catch {
      return targeting;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Indicadores do Conjunto de Anúncios</span>
          </DialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            <p className="text-sm text-gray-600 font-medium">{adSet.name}</p>
            <Badge className={
              adSet.status === 'ACTIVE' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }>
              {adSet.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Indicadores de Investimento */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span>📊 Indicadores de Investimento</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Orçamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {adSet.daily_budget > 0 && (
                      <div>
                        <p className="text-lg font-bold text-blue-600">
                          R$ {adSet.daily_budget.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Orçamento diário</p>
                      </div>
                    )}
                    {adSet.lifetime_budget > 0 && (
                      <div>
                        <p className="text-lg font-bold text-purple-600">
                          R$ {adSet.lifetime_budget.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Orçamento total</p>
                      </div>
                    )}
                    {adSet.daily_budget === 0 && adSet.lifetime_budget === 0 && (
                      <p className="text-gray-400">Não definido</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Custo Total Investido</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {adSet.spend.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Valor já gasto</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">CPA (Custo por Aquisição)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {adSet.cpa.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Custo médio por conversão</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Entrega */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Target className="w-5 h-5 text-blue-600" />
              <span>🎯 Indicadores de Entrega</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>Impressões</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {adSet.impressions.toLocaleString()}
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
                    {adSet.reach?.toLocaleString() || 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Pessoas únicas alcançadas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Frequência</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-600">
                    {adSet.frequency ? adSet.frequency.toFixed(2) : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Média de exibições por pessoa</p>
                  {adSet.frequency && adSet.frequency > 3 && (
                    <p className="text-xs text-red-600 mt-1">⚠️ Alta frequência</p>
                  )}
                  {adSet.frequency && adSet.frequency <= 3 && (
                    <p className="text-xs text-green-600 mt-1">✅ Frequência ideal</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Posicionamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-purple-600">
                    Automático
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Facebook otimiza posicionamentos</p>
                  <p className="text-xs text-blue-600 mt-1">📱 Feed, Stories, Reels, etc.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Performance */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-600" />
              <span>⚙️ Indicadores de Performance</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <MousePointer className="w-4 h-4" />
                    <span>CTR</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">
                    {adSet.ctr.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Taxa de cliques</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">CPC</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-cyan-600">
                    R$ {adSet.cpc.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Custo por clique</p>
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
                    {adSet.conversions}
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
            </div>
          </div>

          {/* Indicadores de Qualidade e Otimização */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Settings className="w-5 h-5 text-purple-600" />
              <span>📈 Indicadores de Qualidade e Otimização</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Segmentação Utilizada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {formatTargeting(adSet.targeting)}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {adSet.optimization_goal && (
                        <Badge variant="outline" className="text-xs">
                          🎯 {adSet.optimization_goal}
                        </Badge>
                      )}
                      {adSet.bid_strategy && (
                        <Badge variant="outline" className="text-xs">
                          💰 {adSet.bid_strategy}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Classificação de Qualidade</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-purple-600">
                    {formatRanking(adSet.quality_ranking)}
                  </p>
                  <div className="space-y-1 mt-2">
                    {adSet.engagement_rate_ranking && adSet.engagement_rate_ranking !== 'UNKNOWN' && (
                      <p className="text-xs text-blue-600">
                        📊 Engajamento: {formatRanking(adSet.engagement_rate_ranking)}
                      </p>
                    )}
                    {adSet.conversion_rate_ranking && adSet.conversion_rate_ranking !== 'UNKNOWN' && (
                      <p className="text-xs text-green-600">
                        🎯 Conversão: {formatRanking(adSet.conversion_rate_ranking)}
                      </p>
                    )}
                    {(!adSet.quality_ranking || adSet.quality_ranking === 'UNKNOWN') && (
                      <p className="text-xs text-yellow-600">💡 Facebook ainda coletando dados</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CPM e Informações Adicionais */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-red-600" />
              <span>📊 Indicadores Complementares</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">CPM</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-indigo-600">
                    R$ {adSet.cpm.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Custo por mil impressões</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Data de Criação</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold">{formatAdSetAge()}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tempo desde a criação
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Cliques Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-cyan-600">
                    {adSet.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Total de cliques recebidos
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resumo Executivo */}
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
                    CTR: {adSet.ctr.toFixed(2)}% | Conv: {conversionRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Custos</p>
                  <p className="text-green-600">
                    CPC: R$ {adSet.cpc.toFixed(2)} | CPA: R$ {adSet.cpa.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Volume</p>
                  <p className="text-purple-600">
                    {adSet.conversions} conversões | {adSet.impressions.toLocaleString()} impressões
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Status</p>
                  <p className={adSet.status === 'ACTIVE' ? 'text-green-600' : 'text-yellow-600'}>
                    {adSet.status === 'ACTIVE' ? '✅ Ativo' : '⏸️ Pausado'}
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