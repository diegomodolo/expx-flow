import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCompetitors } from "@/hooks/useCompetitors";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { Eye, TrendingUp, AlertTriangle, Target, Plus, Users } from "lucide-react";

interface CompetitorAnalysis {
  id: string;
  name: string;
  industry: string;
  activeAds: number;
  totalAds: number;
  adTypes: string[];
  analysisStatus: 'excellent' | 'good' | 'needs_attention' | 'critical';
  threats: string[];
  opportunities: string[];
  marketShare: number;
}

const RelatorioAnaliseCompetitiva = () => {
  const { competitors, competitorAds } = useCompetitors("all");
  const { convertAlertToTask } = useTaskAutomation();
  
  const [competitorsAnalysis, setCompetitorsAnalysis] = useState<CompetitorAnalysis[]>([]);
  const [filteredData, setFilteredData] = useState<CompetitorAnalysis[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const primaryFilters: FilterConfig[] = [
    {
      id: 'status-ameaca',
      label: 'Nível de Ameaça',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os níveis' },
        { value: 'critical', label: 'Ameaça Alta' },
        { value: 'needs_attention', label: 'Ameaça Média' },
        { value: 'good', label: 'Ameaça Baixa' }
      ],
      placeholder: 'Todos os níveis'
    },
    {
      id: 'setor',
      label: 'Setor',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os setores' },
        { value: 'ecommerce', label: 'E-commerce' },
        { value: 'servicos', label: 'Serviços' },
        { value: 'educacao', label: 'Educação' },
        { value: 'saude', label: 'Saúde' }
      ],
      placeholder: 'Todos os setores'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'atividade-minima',
      label: 'Atividade Mínima',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as atividades' },
        { value: '10', label: '10+ anúncios ativos' },
        { value: '20', label: '20+ anúncios ativos' },
        { value: '50', label: '50+ anúncios ativos' }
      ],
      placeholder: 'Todas as atividades'
    }
  ];

  const analyzeCompetitors = () => {
    const analysis: CompetitorAnalysis[] = competitors.map(competitor => {
      const ads = competitorAds.filter(ad => ad.competitor_id === competitor.id);
      const activeAds = ads.filter(ad => ad.is_active).length;
      const adTypes = [...new Set(ads.map(ad => ad.ad_type))];
      
      // Avaliar ameaças
      const threats: string[] = [];
      if (activeAds > 50) threats.push('Alta atividade publicitária');
      if (adTypes.length > 3) threats.push('Diversidade de formatos criativos');
      if (ads.some(ad => ad.call_to_action?.includes('Desconto'))) threats.push('Estratégia agressiva de preços');
      
      // Determinar status de ameaça
      const analysisStatus: CompetitorAnalysis['analysisStatus'] = 
        activeAds > 50 && threats.length >= 2 ? 'critical' :
        activeAds > 20 || threats.length >= 2 ? 'needs_attention' : 'good';

      // Identificar oportunidades
      const opportunities: string[] = [];
      if (adTypes.length < 2) opportunities.push('Explorar formatos criativos não utilizados');
      if (!ads.some(ad => ad.ad_type === 'Video')) opportunities.push('Investir em vídeo marketing');
      if (activeAds < 10) opportunities.push('Aproveitar baixa atividade para ganhar mercado');

      return {
        id: competitor.id,
        name: competitor.name,
        industry: competitor.industry,
        activeAds,
        totalAds: ads.length,
        adTypes,
        analysisStatus,
        threats,
        opportunities,
        marketShare: Math.round((activeAds / Math.max(competitorAds.filter(ad => ad.is_active).length, 1)) * 100)
      };
    });

    setCompetitorsAnalysis(analysis);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);

    let filtered = competitorsAnalysis;

    if (newFilters['status-ameaca'] && newFilters['status-ameaca'] !== 'todos') {
      filtered = filtered.filter(comp => comp.analysisStatus === newFilters['status-ameaca']);
    }

    if (newFilters['setor'] && newFilters['setor'] !== 'todos') {
      filtered = filtered.filter(comp => comp.industry.toLowerCase().includes(newFilters['setor']));
    }

    if (newFilters['atividade-minima'] && newFilters['atividade-minima'] !== 'todas') {
      const minActivity = parseInt(newFilters['atividade-minima']);
      filtered = filtered.filter(comp => comp.activeAds >= minActivity);
    }

    setFilteredData(filtered);
  };

  const handleCreateTask = async (competitor: CompetitorAnalysis) => {
    await convertAlertToTask({
      title: `Analisar estratégias do concorrente ${competitor.name}`,
      description: `Ameaças: ${competitor.threats.join(', ')}. Oportunidades: ${competitor.opportunities.join(', ')}`,
      priority: competitor.analysisStatus === 'critical' ? 'high' : 'medium',
      type: 'analysis'
    });
  };

  const getStatusBadge = (status: CompetitorAnalysis['analysisStatus']) => {
    const variants = { excellent: 'default', good: 'secondary', needs_attention: 'outline', critical: 'destructive' } as const;
    const labels = { excellent: 'Baixa Ameaça', good: 'Baixa Ameaça', needs_attention: 'Ameaça Média', critical: 'Ameaça Alta' };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  useEffect(() => {
    if (competitors.length > 0) {
      analyzeCompetitors();
    }
  }, [competitors, competitorAds]);

  useEffect(() => {
    setFilteredData(competitorsAnalysis);
  }, [competitorsAnalysis]);

  const filteredMetrics = {
    totalCompetitors: filteredData.length,
    highThreatCompetitors: filteredData.filter(c => c.analysisStatus === 'critical').length,
    totalActiveAds: filteredData.reduce((acc, c) => acc + c.activeAds, 0),
    avgMarketShare: filteredData.length > 0 ? Math.round(filteredData.reduce((acc, c) => acc + c.marketShare, 0) / filteredData.length) : 0
  };

  return (
    <ReportLayout
      title="Relatório de Análise Competitiva"
      description="Monitoramento e análise estratégica da concorrência"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Concorrentes Monitorados"
          value={filteredMetrics.totalCompetitors}
          subtitle="Total analisados"
        />
        <MetricCard
          title="Ameaças Críticas"
          value={filteredMetrics.highThreatCompetitors}
          trend={filteredMetrics.highThreatCompetitors > 0 ? "down" : "up"}
          subtitle="Requerem atenção"
        />
        <MetricCard
          title="Anúncios Ativos"
          value={filteredMetrics.totalActiveAds}
          subtitle="Total no mercado"
        />
        <MetricCard
          title="Share Médio"
          value={`${filteredMetrics.avgMarketShare}%`}
          subtitle="Participação de mercado"
        />
      </div>

      <div className="space-y-4">
        {filteredData.map((competitor) => (
          <Card key={competitor.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-lg">{competitor.name}</CardTitle>
                    <Badge variant="outline">{competitor.industry}</Badge>
                  </div>
                  <CardDescription>
                    {competitor.activeAds} anúncios ativos • {competitor.marketShare}% share de mercado
                  </CardDescription>
                </div>
                {getStatusBadge(competitor.analysisStatus)}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {competitor.threats.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Ameaças Identificadas
                  </h4>
                  <ul className="space-y-1">
                    {competitor.threats.map((threat, index) => (
                      <li key={index} className="text-sm text-destructive flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-destructive" />
                        {threat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {competitor.opportunities.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Oportunidades
                  </h4>
                  <ul className="space-y-1">
                    {competitor.opportunities.map((opp, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        {opp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{competitor.activeAds}</div>
                  <div className="text-xs text-muted-foreground">Anúncios Ativos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{competitor.totalAds}</div>
                  <div className="text-xs text-muted-foreground">Total Anúncios</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{competitor.adTypes.length}</div>
                  <div className="text-xs text-muted-foreground">Formatos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">{competitor.marketShare}%</div>
                  <div className="text-xs text-muted-foreground">Market Share</div>
                </div>
              </div>

              {(competitor.analysisStatus === 'critical' || competitor.analysisStatus === 'needs_attention') && (
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateTask(competitor)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Criar Análise
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </ReportLayout>
  );
};

export default RelatorioAnaliseCompetitiva;