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
  Heart,
  MessageCircle,
  Share2,
  Play,
  AlertTriangle,
  Zap
} from "lucide-react";

interface Ad {
  id: string;
  facebook_id: string;
  name: string;
  status: string;
  creative_type: string;
  creative_body: string;
  creative_title: string;
  creative_description: string;
  image_url: string;
  video_url: string;
  link_url: string;
  call_to_action: string;
  ctr: number;
  cpc: number;
  cpm: number;
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
  likes: number;
  comments: number;
  shares: number;
  video_views: number;
  video_view_percentage: number;
  negative_feedback: number;
  video_completion_rate: number;
  created_at: string;
}

interface AdCreativeMetricsModalProps {
  ad: Ad | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AdCreativeMetricsModal = ({ ad, isOpen, onClose }: AdCreativeMetricsModalProps) => {
  if (!ad) return null;

  // Calcular métricas derivadas
  const conversionRate = ad.clicks > 0 ? ((ad.conversions / ad.clicks) * 100) : 0;
  
  // Função para formatar rankings
  const formatRanking = (ranking?: string) => {
    if (!ranking || ranking === 'UNKNOWN') return 'Dados insuficientes';
    
    const translations: { [key: string]: string } = {
      'ABOVE_AVERAGE': 'Acima da Média',
      'AVERAGE': 'Média',
      'BELOW_AVERAGE': 'Abaixo da Média',
      'BELOW_AVERAGE_35': 'Bem Abaixo da Média (35%)',
      'BELOW_AVERAGE_20': 'Muito Abaixo da Média (20%)',
      'BELOW_AVERAGE_10': 'Extremamente Baixo (10%)',
      'HIGH': 'Alto',
      'MEDIUM': 'Médio',
      'LOW': 'Baixo',
      'ACTIVE': 'Ativo',
      'PAUSED': 'Pausado',
      'PENDING_REVIEW': 'Aguardando Revisão',
      'DISAPPROVED': 'Reprovado',
      'PREAPPROVED': 'Pré-aprovado',
      'PENDING_BILLING_INFO': 'Aguardando Info de Pagamento',
      'CAMPAIGN_PAUSED': 'Campanha Pausada',
      'ARCHIVED': 'Arquivado'
    };
    
    return translations[ranking] || ranking;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Indicadores do Criativo</span>
          </DialogTitle>
          <div className="flex items-center space-x-2 mt-2">
            <p className="text-sm text-gray-600 font-medium">{ad.name}</p>
            <Badge className={
              ad.status === 'ACTIVE' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }>
              {ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
            </Badge>
            <Badge 
              variant={ad.creative_type === 'video' ? 'default' : 'secondary'}
              className="text-xs"
            >
              {ad.creative_type || 'Imagem'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Coluna Esquerda - Prévia do Criativo */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span>Prévia do Criativo</span>
              </h3>
              <Card className="p-4">
                {/* Preview Visual */}
                <div className="mb-6">
                  {ad.creative_type === 'video' && ad.video_url ? (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Play className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-600">Vídeo Criativo</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {ad.video_views.toLocaleString()} visualizações
                          </p>
                          {ad.video_url && (
                            <a 
                              href={ad.video_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-block mt-2 text-blue-600 text-xs hover:underline"
                            >
                              Ver no Facebook
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : ad.creative_type === 'image' && ad.image_url ? (
                    <div className="relative rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={ad.image_url} 
                        alt={ad.creative_title || ad.name}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="flex items-center justify-center h-48 bg-gray-100">
                                <div class="text-center">
                                  <svg class="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                  <p class="text-sm text-gray-600">Imagem não disponível</p>
                                </div>
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
                      <div className="text-center">
                        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Criativo de Texto</p>
                        <p className="text-xs text-gray-500">Apenas texto, sem mídia visual</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Conteúdo do Anúncio */}
                <div className="space-y-4">
                  {ad.creative_title && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Título</p>
                      <p className="text-lg font-semibold text-gray-900">{ad.creative_title}</p>
                    </div>
                  )}
                  
                  {ad.creative_body && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Texto Principal</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{ad.creative_body}</p>
                    </div>
                  )}
                  
                  {ad.creative_description && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Descrição</p>
                      <p className="text-sm text-gray-600">{ad.creative_description}</p>
                    </div>
                  )}

                  {ad.call_to_action && ad.call_to_action !== '{}' && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Chamada para Ação</p>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {ad.call_to_action}
                      </Badge>
                    </div>
                  )}

                  {ad.link_url && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Link de Destino</p>
                      <a 
                        href={ad.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {ad.link_url}
                      </a>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {ad.creative_type === 'video' ? '🎥 Vídeo' : 
                         ad.creative_type === 'image' ? '🖼️ Imagem' : '📝 Texto'}
                      </Badge>
                      <Badge variant={ad.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {ad.status === 'active' ? '✅ Ativo' : '⏸️ Pausado'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Coluna Direita - Indicadores */}
          <div className="space-y-6">

          {/* Indicadores de Engajamento */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-600" />
              <span>Indicadores de Engajamento</span>
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
                    {ad.ctr.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Taxa de cliques</p>
                  {ad.ctr > 1.5 && (
                    <p className="text-xs text-green-600 mt-1">✅ Excelente engajamento</p>
                  )}
                  {ad.ctr <= 1.5 && ad.ctr > 1.0 && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ Bom engajamento</p>
                  )}
                  {ad.ctr <= 1.0 && (
                    <p className="text-xs text-red-600 mt-1">📉 Baixo engajamento</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Cliques Totais</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">
                    {ad.clicks.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Interações diretas</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Heart className="w-4 h-4" />
                    <span>Curtidas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">
                    {ad.likes.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Curtidas e reações reais</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <Share2 className="w-4 h-4" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-green-600">
                      {ad.comments} comentários
                    </p>
                    <p className="text-sm font-bold text-orange-600">
                      {ad.shares} compartilhamentos
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Dados reais do Facebook</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Conversão */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <span>Indicadores de Conversão</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Conversões Geradas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-green-600">
                    {ad.conversions}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total de resultados obtidos</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">CPA (Custo por Conversão)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-orange-600">
                    R$ {ad.cpa.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Custo médio por conversão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Taxa de Conversão</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-purple-600">
                    {conversionRate.toFixed(2)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Conversões ÷ Cliques</p>
                  {conversionRate > 3 && (
                    <p className="text-xs text-green-600 mt-1">🎯 Excelente conversão</p>
                  )}
                  {conversionRate <= 3 && conversionRate > 1 && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ Boa conversão</p>
                  )}
                  {conversionRate <= 1 && (
                    <p className="text-xs text-red-600 mt-1">📉 Baixa conversão</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Indicadores de Qualidade */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <span>Indicadores de Qualidade</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">CPC (Custo por Clique)</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-cyan-600">
                    R$ {ad.cpc.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Eficiência de custo</p>
                </CardContent>
              </Card>

              {ad.creative_type === 'video' && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                      <Play className="w-4 h-4" />
                      <span>Dados de Vídeo</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-indigo-600">
                        {ad.video_views.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Visualizações</p>
                      {ad.video_completion_rate > 0 && (
                        <p className="text-xs text-blue-600">
                          {ad.video_completion_rate.toFixed(1)}% completaram
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>Classificação de Qualidade</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-purple-600">
                    {formatRanking(ad.quality_ranking)}
                  </p>
                  <div className="space-y-1 mt-2">
                    {ad.engagement_rate_ranking && ad.engagement_rate_ranking !== 'UNKNOWN' && (
                      <p className="text-xs text-blue-600">
                        📊 Engajamento: {formatRanking(ad.engagement_rate_ranking)}
                      </p>
                    )}
                    {ad.conversion_rate_ranking && ad.conversion_rate_ranking !== 'UNKNOWN' && (
                      <p className="text-xs text-green-600">
                        🎯 Conversão: {formatRanking(ad.conversion_rate_ranking)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600 flex items-center space-x-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Feedback Negativo</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-bold text-red-600">
                    {ad.negative_feedback}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Ocultações e denúncias</p>
                  {ad.negative_feedback < 10 && (
                    <p className="text-xs text-green-600 mt-1">✅ Baixa rejeição</p>
                  )}
                  {ad.negative_feedback >= 10 && ad.negative_feedback < 50 && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ Rejeição moderada</p>
                  )}
                  {ad.negative_feedback >= 50 && (
                    <p className="text-xs text-red-600 mt-1">🚨 Alta rejeição</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detalhes do Criativo */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span>Detalhes do Criativo</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Conteúdo do Anúncio</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ad.creative_title && (
                      <div>
                        <p className="text-xs text-gray-500">Título:</p>
                        <p className="text-sm font-medium">{ad.creative_title}</p>
                      </div>
                    )}
                    {ad.creative_body && (
                      <div>
                        <p className="text-xs text-gray-500">Texto principal:</p>
                        <p className="text-sm">{ad.creative_body.substring(0, 100)}...</p>
                      </div>
                    )}
                    {ad.call_to_action && (
                      <div>
                        <Badge variant="outline" className="text-xs">
                          📢 {ad.call_to_action}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">Indicadores de Alcance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-lg font-bold text-blue-600">
                        {ad.impressions.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Impressões totais</p>
                    </div>
                    {ad.reach && (
                      <div>
                        <p className="text-lg font-bold text-indigo-600">
                          {ad.reach.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Pessoas únicas alcançadas</p>
                      </div>
                    )}
                    {ad.frequency && (
                      <div>
                        <p className="text-lg font-bold text-amber-600">
                          {ad.frequency.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Frequência média</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Resumo Executivo */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Resumo Executivo do Criativo</span>
              </CardTitle>
            </CardHeader>
             <CardContent>
               <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                 <div>
                   <p className="font-medium text-gray-700">Atratividade</p>
                   <p className="text-blue-600">
                     CTR: {ad.ctr.toFixed(2)}% | {ad.clicks.toLocaleString()} cliques
                   </p>
                 </div>
                 <div>
                   <p className="font-medium text-gray-700">Engajamento</p>
                   <p className="text-red-600">
                     {ad.likes + ad.comments + ad.shares} interações totais
                   </p>
                 </div>
                 <div>
                   <p className="font-medium text-gray-700">Conversão</p>
                   <p className="text-green-600">
                     {ad.conversions} conv. | Taxa: {conversionRate.toFixed(1)}%
                   </p>
                 </div>
                 <div>
                   <p className="font-medium text-gray-700">Custos</p>
                   <p className="text-purple-600">
                     CPC: R$ {ad.cpc.toFixed(2)} | CPA: R$ {ad.cpa.toFixed(2)}
                   </p>
                 </div>
                 <div>
                   <p className="font-medium text-gray-700">Qualidade</p>
                   <p className="text-indigo-600">
                     {ad.negative_feedback < 10 ? '✅ Baixa rejeição' : ad.negative_feedback < 50 ? '⚠️ Rejeição moderada' : '🚨 Alta rejeição'}
                   </p>
                 </div>
               </div>
              </CardContent>
           </Card>
           </div>
         </div>
       </DialogContent>
     </Dialog>
  );
};