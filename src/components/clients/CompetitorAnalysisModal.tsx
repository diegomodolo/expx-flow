import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, BarChart3, TrendingUp, Target, Lightbulb } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Competitor, CompetitorAd } from '@/hooks/useCompetitors';
import { toast } from 'sonner';

interface CompetitorAnalysisModalProps {
  competitor: Competitor;
  competitorAds: CompetitorAd[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnalysisResult {
  competitor_overview: string;
  messaging_strategy: string;
  creative_patterns: string;
  performance_indicators: string;
  strategic_opportunities: string;
  key_insights: string[];
  recommendations: string[];
}

export const CompetitorAnalysisModal = ({ 
  competitor, 
  competitorAds, 
  open, 
  onOpenChange 
}: CompetitorAnalysisModalProps) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const generateAnalysis = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-competitor-insights', {
        body: {
          competitorData: [competitor],
          competitorAds: competitorAds,
          analysisType: 'single_competitor'
        }
      });

      if (error) throw error;

      setAnalysis(data.analysis);
      toast.success('Análise gerada com sucesso!');
    } catch (error) {
      console.error('Error generating analysis:', error);
      toast.error('Erro ao gerar análise do concorrente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Análise Competitiva - {competitor.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header com info do concorrente */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{competitor.company_name}</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                {competitor.website_url && (
                  <span>🌐 {competitor.website_url}</span>
                )}
                {competitor.facebook_page_name && (
                  <span>📘 Facebook</span>
                )}
                {competitor.instagram_handle && (
                  <span>📷 Instagram</span>
                )}
                <span>📊 {competitorAds.length} anúncios</span>
              </div>
            </CardHeader>
            {competitor.description && (
              <CardContent>
                <p className="text-sm">{competitor.description}</p>
              </CardContent>
            )}
          </Card>

          {/* Botão para gerar análise */}
          {!analysis && (
            <div className="text-center py-8">
              <Button 
                onClick={generateAnalysis}
                disabled={loading}
                size="lg"
                className="min-w-48"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando Análise...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Gerar Análise Competitiva
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Resultados da análise */}
          {analysis && (
            <div className="space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Visão Geral do Concorrente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed">{analysis.competitor_overview}</p>
                </CardContent>
              </Card>

              {/* Grid com análises */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Estratégia de Messaging</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.messaging_strategy}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Padrões Criativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.creative_patterns}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Indicadores de Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.performance_indicators}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Oportunidades Estratégicas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{analysis.strategic_opportunities}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Key Insights */}
              {analysis.key_insights && analysis.key_insights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="w-5 h-5" />
                      Insights Principais
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {analysis.key_insights.map((insight, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {insight}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Recomendações Estratégicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {analysis.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Botão para nova análise */}
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setAnalysis(null)}
                  size="sm"
                >
                  Gerar Nova Análise
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};