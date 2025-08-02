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
      <DialogContent className="max-w-[70vw] max-h-[90vh] overflow-y-auto">
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

        <div className="flex gap-6 mt-4">
          {/* Coluna Esquerda - Prévia do Criativo */}
          <div className="flex-shrink-0 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center space-x-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <span>Prévia do Criativo</span>
              </h3>
              <Card className="p-0 max-w-md mx-auto bg-white border border-gray-200 rounded-lg overflow-hidden">
                {/* Header do Instagram */}
                <div className="flex items-center p-3 border-b border-gray-100">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-0.5">
                    <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                      <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                    </div>
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="font-semibold text-sm text-gray-900">Cliente</p>
                    <p className="text-xs text-gray-500">Patrocinado</p>
                  </div>
                  <button className="p-1">
                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                    </svg>
                  </button>
                </div>

                {/* Conteúdo Visual */}
                <div className="relative bg-black aspect-square">
                  {ad.creative_type === 'video' && ad.video_url ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                      <div className="text-center">
                        <div className="w-12 h-12 bg-white bg-opacity-80 rounded-full flex items-center justify-center mx-auto mb-2">
                          <Play className="w-6 h-6 text-gray-800 ml-1" />
                        </div>
                        <p className="text-white text-sm">Vídeo</p>
                        <p className="text-white text-xs opacity-75">
                          {ad.video_views.toLocaleString()} visualizações
                        </p>
                      </div>
                    </div>
                  ) : ad.creative_type === 'image' && ad.image_url ? (
                    <img 
                      src={ad.image_url} 
                      alt={ad.creative_title || ad.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=400&fit=crop';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-100 to-gray-200">
                      <div className="text-center p-8">
                        <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 font-medium">Anúncio de Texto</p>
                        <p className="text-xs text-gray-500">Conteúdo textual</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ações do Instagram */}
                <div className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-4">
                      <button className="flex items-center space-x-1">
                        <Heart className="w-6 h-6 text-gray-700" />
                      </button>
                      <button className="flex items-center space-x-1">
                        <MessageCircle className="w-6 h-6 text-gray-700" />
                      </button>
                      <button className="flex items-center space-x-1">
                        <Share2 className="w-6 h-6 text-gray-700" />
                      </button>
                    </div>
                    <button>
                      <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>

                  {/* Estatísticas */}
                  <div className="mb-2">
                    <p className="font-semibold text-sm text-gray-900">
                      {ad.likes.toLocaleString()} curtidas
                    </p>
                  </div>

                  {/* Conteúdo do Post */}
                  <div className="space-y-1">
                    {ad.creative_title && (
                      <p className="text-sm text-gray-900">
                        <span className="font-semibold">Cliente</span> {ad.creative_title}
                      </p>
                    )}
                    
                    {ad.creative_body && (
                      <p className="text-sm text-gray-900 leading-relaxed">
                        {ad.creative_body}
                      </p>
                    )}
                    
                    {ad.creative_description && (
                      <p className="text-sm text-gray-600">
                        {ad.creative_description}
                      </p>
                    )}
                  </div>

                  {/* Call to Action */}
                  {ad.call_to_action && ad.call_to_action !== '{}' && (
                    <div className="mt-3">
                      <button className="w-full bg-blue-500 text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-blue-600 transition-colors">
                        {ad.call_to_action}
                      </button>
                    </div>
                  )}

                  {/* Link */}
                  {ad.link_url && (
                    <div className="mt-2 p-2 bg-gray-50 rounded border">
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Link</p>
                      <a 
                        href={ad.link_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline break-all"
                      >
                        {ad.link_url.length > 40 ? ad.link_url.substring(0, 40) + '...' : ad.link_url}
                      </a>
                    </div>
                  )}

                  {/* Comentários simulados */}
                  {ad.comments > 0 && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <p className="text-sm text-gray-500">
                        Ver todos os {ad.comments.toLocaleString()} comentários
                      </p>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 uppercase">
                      {new Date(ad.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          {/* Coluna Direita - Indicadores */}
          <div className="flex-1 space-y-6">

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
            <div className="grid grid-cols-3 gap-4 w-full">
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