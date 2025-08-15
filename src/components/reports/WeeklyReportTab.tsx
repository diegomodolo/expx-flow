import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Users, 
  MousePointer, 
  Eye, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Building,
  Calendar,
  FileText
} from "lucide-react";
import { useWeeklyReport, WeeklyReportData } from "@/hooks/useWeeklyReport";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WeeklyReportTabProps {
  clientId: string;
}

export function WeeklyReportTab({ clientId }: WeeklyReportTabProps) {
  const { reportData, loading, error, regenerateReport } = useWeeklyReport(clientId);
  const { toast } = useToast();

  const handleExportPDF = async () => {
    if (!reportData) return;

    try {
      toast({
        title: "Exportando relatório...",
        description: "O PDF será gerado em alguns instantes.",
      });

      // For now, we'll create a simple HTML print version
      // In a real implementation, you would use a library like react-pdf or puppeteer
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(generatePrintableHTML(reportData));
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const generatePrintableHTML = (data: WeeklyReportData): string => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório Semanal - ${data.clientInfo.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
            .section { margin: 20px 0; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 15px 0; }
            .metric-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; text-align: center; }
            .metric-value { font-size: 24px; font-weight: bold; color: #059669; }
            .metric-label { font-size: 12px; color: #6b7280; margin-top: 5px; }
            .campaign-item, .insight-item { border: 1px solid #e5e7eb; padding: 15px; margin: 10px 0; border-radius: 8px; }
            .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            .status-active { background: #dcfce7; color: #166534; }
            .status-paused { background: #fef3c7; color: #92400e; }
            .insight-warning { border-left: 4px solid #f59e0b; }
            .insight-opportunity { border-left: 4px solid #10b981; }
            .insight-action { border-left: 4px solid #ef4444; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Sistema de Gestão</div>
            <h1>Relatório Semanal</h1>
            <h2>${data.clientInfo.name}</h2>
            <p>Período: ${formatDate(data.dateRange.startDate)} a ${formatDate(data.dateRange.endDate)}</p>
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>

          <div class="section">
            <div class="section-title">📊 Performance Geral</div>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">R$ ${data.currentWeekMetrics.totalSpend.toLocaleString()}</div>
                <div class="metric-label">Investimento Total</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.currentWeekMetrics.totalConversions}</div>
                <div class="metric-label">Conversões</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">R$ ${data.currentWeekMetrics.averageCPA.toFixed(2)}</div>
                <div class="metric-label">CPA Médio</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.currentWeekMetrics.averageCTR.toFixed(2)}%</div>
                <div class="metric-label">CTR Médio</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🎯 Campanhas em Destaque</div>
            ${data.campaignHighlights.map(campaign => `
              <div class="campaign-item">
                <h4>${campaign.name}</h4>
                <span class="status-badge status-${campaign.status}">${campaign.status.toUpperCase()}</span>
                <p>Gasto: R$ ${campaign.weeklySpend.toLocaleString()} | Conversões: ${campaign.weeklyConversions}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <div class="section-title">🎨 Criativos em Destaque</div>
            ${data.creativeHighlights.map(creative => `
              <div class="campaign-item">
                <h4>${creative.name} (${creative.type === 'best' ? 'Melhor' : 'Pior'} Performance)</h4>
                <p><strong>Título:</strong> ${creative.creative_title}</p>
                <p><strong>Conversões:</strong> ${creative.weeklyConversions} | <strong>Gasto:</strong> R$ ${creative.weeklySpend.toLocaleString()}</p>
              </div>
            `).join('')}
          </div>

          <div class="section">
            <div class="section-title">💡 Insights e Recomendações</div>
            ${data.insights.map(insight => `
              <div class="insight-item insight-${insight.type}">
                <h4>${insight.title}</h4>
                <p><strong>Descrição:</strong> ${insight.description}</p>
                <p><strong>Recomendação:</strong> ${insight.recommendation}</p>
                <p><strong>Métrica:</strong> ${insight.metric} - ${insight.value}</p>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change > 0 ? 
      <TrendingUp className="w-4 h-4 text-green-600" /> : 
      <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  const getChangePercentage = (current: number, previous: number): string => {
    if (previous === 0) return "N/A";
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'opportunity': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'action_required': return <Clock className="w-5 h-5 text-red-500" />;
      default: return <Zap className="w-5 h-5 text-blue-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-center text-muted-foreground mb-4">{error}</p>
          <Button onClick={regenerateReport} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <FileText className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground mb-4">
            Nenhum dado encontrado para gerar o relatório semanal.
          </p>
          <Button onClick={regenerateReport} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Gerar Relatório
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório Semanal</h2>
          <p className="text-muted-foreground">
            Período: {formatDate(reportData.dateRange.startDate)} a {formatDate(reportData.dateRange.endDate)}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={regenerateReport} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={handleExportPDF} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Client Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Resumo Geral da Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">{reportData.clientInfo.name}</p>
              <p className="text-sm text-muted-foreground">{reportData.clientInfo.company}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Responsável</p>
              <p className="text-sm text-muted-foreground">{reportData.clientInfo.responsibleUser || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Último Acesso</p>
              <p className="text-sm text-muted-foreground">
                {reportData.clientInfo.lastAccess ? formatDate(reportData.clientInfo.lastAccess) : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Briefing</p>
              <p className="text-sm text-muted-foreground">
                {reportData.clientInfo.briefing ? 'Ativo' : 'Não definido'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Performance Geral das Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                {getChangeIcon(reportData.currentWeekMetrics.totalSpend, reportData.previousWeekMetrics.totalSpend)}
              </div>
              <div className="text-2xl font-bold">
                R$ {reportData.currentWeekMetrics.totalSpend.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Gasto</div>
              <div className="text-xs text-muted-foreground">
                {getChangePercentage(reportData.currentWeekMetrics.totalSpend, reportData.previousWeekMetrics.totalSpend)} vs semana anterior
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                {getChangeIcon(reportData.currentWeekMetrics.totalConversions, reportData.previousWeekMetrics.totalConversions)}
              </div>
              <div className="text-2xl font-bold">
                {reportData.currentWeekMetrics.totalConversions}
              </div>
              <div className="text-sm text-muted-foreground">Conversões</div>
              <div className="text-xs text-muted-foreground">
                {getChangePercentage(reportData.currentWeekMetrics.totalConversions, reportData.previousWeekMetrics.totalConversions)} vs semana anterior
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                {getChangeIcon(reportData.previousWeekMetrics.averageCPA, reportData.currentWeekMetrics.averageCPA)}
              </div>
              <div className="text-2xl font-bold">
                R$ {reportData.currentWeekMetrics.averageCPA.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">CPA Médio</div>
              <div className="text-xs text-muted-foreground">
                Meta: &lt; R$ 120
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <MousePointer className="w-4 h-4 text-muted-foreground" />
                {getChangeIcon(reportData.currentWeekMetrics.averageCTR, reportData.previousWeekMetrics.averageCTR)}
              </div>
              <div className="text-2xl font-bold">
                {reportData.currentWeekMetrics.averageCTR.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">CTR Médio</div>
              <div className="text-xs text-muted-foreground">
                Meta: &gt; 1.0%
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {reportData.currentWeekMetrics.roas.toFixed(2)}%
              </div>
              <div className="text-sm text-muted-foreground">ROAS</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {reportData.currentWeekMetrics.engagements.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Engajamentos</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {reportData.currentWeekMetrics.totalImpressions.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Impressões</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {reportData.currentWeekMetrics.totalReach.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Alcance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Highlights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Campanhas em Destaque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.campaignHighlights.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhuma campanha ativa encontrada para o período.
              </p>
            ) : (
              reportData.campaignHighlights.map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">R$ {campaign.weeklySpend.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{campaign.weeklyConversions} conversões</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Creative Highlights */}
      {reportData.creativeHighlights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Criativos em Destaque
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reportData.creativeHighlights.map((creative) => (
                <div key={creative.id} className={`p-4 border rounded-lg ${creative.type === 'best' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {creative.type === 'best' ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <Badge variant={creative.type === 'best' ? 'default' : 'destructive'}>
                      {creative.type === 'best' ? 'Melhor Performance' : 'Pior Performance'}
                    </Badge>
                  </div>
                  <h4 className="font-medium mb-2">{creative.name}</h4>
                  {creative.creative_title && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>Título:</strong> {creative.creative_title}
                    </p>
                  )}
                  {creative.image_url && (
                    <div className="mb-2">
                      <img src={creative.image_url} alt="Creative" className="w-16 h-16 object-cover rounded" />
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>{creative.weeklyConversions} conversões</span>
                    <span>R$ {creative.weeklySpend.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Insights e Sugestões da IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.insights.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">Tudo em ordem!</p>
                <p className="text-muted-foreground">Não foram identificados problemas que requerem atenção imediata.</p>
              </div>
            ) : (
              reportData.insights.map((insight) => (
                <div key={insight.id} className={`p-4 border rounded-lg ${
                  insight.type === 'warning' ? 'border-yellow-200 bg-yellow-50/50' :
                  insight.type === 'opportunity' ? 'border-green-200 bg-green-50/50' :
                  'border-red-200 bg-red-50/50'
                }`}>
                  <div className="flex items-start gap-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{insight.title}</h4>
                        <Badge variant={insight.priority === 'high' ? 'destructive' : insight.priority === 'medium' ? 'outline' : 'secondary'}>
                          {insight.priority === 'high' ? 'Alta' : insight.priority === 'medium' ? 'Média' : 'Baixa'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                      <div className="bg-white/50 p-3 rounded border">
                        <p className="text-sm"><strong>Recomendação:</strong> {insight.recommendation}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span><strong>Métrica:</strong> {insight.metric}</span>
                        <span><strong>Valor:</strong> {insight.value}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}