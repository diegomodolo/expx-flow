import { useState, useEffect } from "react";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Pause, Edit, Trash2, TrendingDown, Image } from "lucide-react";
import { useAds } from "@/hooks/useAds";
import { useCampaigns } from "@/hooks/useCampaigns";

interface LowPerformingCreative {
  id: string;
  name: string;
  campaign_name: string;
  client_name: string;
  ctr: number;
  cpc: number;
  cpl: number;
  conversions: number;
  spend: number;
  days_active: number;
  status: 'critical' | 'warning' | 'underperforming';
  recommendation: 'pause' | 'adjust' | 'replace';
  recommendation_reason: string;
  performance_score: number;
}

export default function RelatorioCriativosBaixoDesempenho() {
  const { ads, loading: adsLoading } = useAds();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const [lowPerformingCreatives, setLowPerformingCreatives] = useState<LowPerformingCreative[]>([]);

  useEffect(() => {
    if (!adsLoading && !campaignsLoading && ads && campaigns) {
      analyzeLowPerformingCreatives();
    }
  }, [ads, campaigns, adsLoading, campaignsLoading]);

  const analyzeLowPerformingCreatives = () => {
    const lowPerforming: LowPerformingCreative[] = [];

    // Calcular benchmarks globais
    const totalImpressions = ads?.reduce((sum, ad) => sum + (ad.impressions || 0), 0) || 0;
    const totalClicks = ads?.reduce((sum, ad) => sum + (ad.clicks || 0), 0) || 0;
    const totalSpend = ads?.reduce((sum, ad) => sum + (ad.spend || 0), 0) || 0;
    const totalConversions = ads?.reduce((sum, ad) => sum + (ad.conversions || 0), 0) || 0;

    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCPL = totalConversions > 0 ? totalSpend / totalConversions : 0;

    // Definir thresholds (50% abaixo da média)
    const ctrThreshold = avgCTR * 0.5;
    const cpcThreshold = avgCPC * 1.5; // 50% acima da média
    const cplThreshold = avgCPL * 1.5; // 50% acima da média

    ads?.forEach(ad => {
      const campaign = campaigns?.find(c => c.id === ad.campaign_id);
      if (!campaign) return;

      const adCTR = ad.impressions > 0 ? (ad.clicks / ad.impressions) * 100 : 0;
      const adCPC = ad.clicks > 0 ? ad.spend / ad.clicks : 0;
      const adCPL = ad.conversions > 0 ? ad.spend / ad.conversions : 0;
      
      // Calcular dias ativos (simulado)
      const daysActive = Math.floor(Math.random() * 30) + 1;
      
      // Avaliar performance
      let issues = 0;
      let status: 'critical' | 'warning' | 'underperforming' = 'underperforming';
      let recommendation: 'pause' | 'adjust' | 'replace' = 'adjust';
      let recommendationReason = '';

      // Verificar problemas
      const problems: string[] = [];
      
      if (adCTR < ctrThreshold) {
        issues++;
        problems.push('CTR baixo');
      }
      
      if (adCPC > cpcThreshold) {
        issues++;
        problems.push('CPC alto');
      }
      
      if (adCPL > cplThreshold && ad.conversions > 0) {
        issues++;
        problems.push('CPL alto');
      }

      if (ad.conversions === 0 && daysActive > 7) {
        issues++;
        problems.push('Sem conversões');
      }

      // Só incluir se tiver problemas
      if (issues === 0) return;

      // Definir status baseado na severidade
      if (issues >= 3 || (ad.conversions === 0 && daysActive > 14)) {
        status = 'critical';
        recommendation = 'pause';
        recommendationReason = 'Performance muito baixa, pausar imediatamente';
      } else if (issues >= 2 || daysActive > 21) {
        status = 'warning';
        recommendation = 'replace';
        recommendationReason = 'Substituir por novos criativos';
      } else {
        recommendation = 'adjust';
        recommendationReason = 'Ajustar segmentação ou lances';
      }

      // Calcular score de performance (0-100)
      let performanceScore = 100;
      if (adCTR < ctrThreshold) performanceScore -= 25;
      if (adCPC > cpcThreshold) performanceScore -= 25;
      if (adCPL > cplThreshold) performanceScore -= 25;
      if (ad.conversions === 0 && daysActive > 7) performanceScore -= 25;

      lowPerforming.push({
        id: ad.id,
        name: ad.name,
        campaign_name: campaign.name,
        client_name: campaign.client?.name || 'Cliente não identificado',
        ctr: adCTR,
        cpc: adCPC,
        cpl: adCPL,
        conversions: ad.conversions,
        spend: ad.spend,
        days_active: daysActive,
        status,
        recommendation,
        recommendation_reason: recommendationReason,
        performance_score: Math.max(0, performanceScore)
      });
    });

    // Ordenar por performance score (pior primeiro)
    setLowPerformingCreatives(
      lowPerforming.sort((a, b) => a.performance_score - b.performance_score)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'pause': return 'text-destructive';
      case 'replace': return 'text-warning';
      default: return 'text-primary';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'pause': return Pause;
      case 'replace': return Trash2;
      default: return Edit;
    }
  };

  if (adsLoading || campaignsLoading) {
    return (
      <ReportLayout
        title="Relatório de Criativos de Baixo Desempenho"
        description="Identificação de anúncios que estão queimando verba sem retorno"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </ReportLayout>
    );
  }

  const criticalCount = lowPerformingCreatives.filter(c => c.status === 'critical').length;
  const warningCount = lowPerformingCreatives.filter(c => c.status === 'warning').length;
  const totalWaste = lowPerformingCreatives.reduce((sum, c) => sum + c.spend, 0);
  const avgPerformanceScore = lowPerformingCreatives.length > 0 
    ? lowPerformingCreatives.reduce((sum, c) => sum + c.performance_score, 0) / lowPerformingCreatives.length 
    : 0;

  return (
    <ReportLayout
      title="Relatório de Criativos de Baixo Desempenho"
      description="Identificação de anúncios que estão queimando verba sem retorno"
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Criativos Críticos"
            value={criticalCount}
            trend={criticalCount > 0 ? "down" : "neutral"}
            subtitle="Para pausar imediatamente"
          />
          <MetricCard
            title="Criativos em Alerta"
            value={warningCount}
            trend={warningCount > 0 ? "down" : "neutral"}
            subtitle="Para substituir"
          />
          <MetricCard
            title="Verba Desperdiçada"
            value={`R$ ${totalWaste.toLocaleString()}`}
            trend="down"
            subtitle="Total gasto sem retorno"
          />
          <MetricCard
            title="Score Médio"
            value={`${avgPerformanceScore.toFixed(0)}/100`}
            trend={avgPerformanceScore < 50 ? "down" : avgPerformanceScore > 70 ? "up" : "neutral"}
            subtitle="Performance geral"
          />
        </div>

        {/* Lista de Criativos */}
        <div className="grid gap-4">
          {lowPerformingCreatives.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Image className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum criativo com baixo desempenho</h3>
                <p className="text-muted-foreground">
                  Todos os criativos estão com performance dentro dos parâmetros esperados.
                </p>
              </CardContent>
            </Card>
          ) : (
            lowPerformingCreatives.map((creative) => {
              const RecommendationIcon = getRecommendationIcon(creative.recommendation);
              
              return (
                <Card key={creative.id} className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-destructive" />
                          <div>
                            <CardTitle className="text-lg">{creative.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {creative.campaign_name} • {creative.client_name}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(creative.status)}>
                            {creative.status === 'critical' ? 'CRÍTICO' : 
                             creative.status === 'warning' ? 'ALERTA' : 'BAIXA PERFORMANCE'}
                          </Badge>
                          <Badge variant="outline">
                            Score: {creative.performance_score}/100
                          </Badge>
                          <Badge variant="outline">
                            {creative.days_active} dias ativo{creative.days_active !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-2 ${getRecommendationColor(creative.recommendation)}`}>
                          <RecommendationIcon className="w-4 h-4" />
                          <span className="font-semibold">
                            {creative.recommendation === 'pause' ? 'PAUSAR' :
                             creative.recommendation === 'replace' ? 'SUBSTITUIR' : 'AJUSTAR'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {creative.recommendation_reason}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Métricas de Performance */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          {creative.ctr.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">CTR</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          R$ {creative.cpc.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">CPC</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          {creative.cpl > 0 ? `R$ ${creative.cpl.toFixed(0)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">CPL</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {creative.conversions}
                        </div>
                        <div className="text-xs text-muted-foreground">Conversões</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          R$ {creative.spend.toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Gasto</div>
                      </div>
                    </div>

                    {/* Ações Recomendadas */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant={creative.recommendation === 'pause' ? 'destructive' : 'outline'}
                        size="sm"
                        className="flex-1"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pausar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Substituir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </ReportLayout>
  );
}