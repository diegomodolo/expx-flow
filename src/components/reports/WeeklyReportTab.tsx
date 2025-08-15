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
  BarChart3,
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
            .company-header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px; }
            .company-logo { height: 50px; width: auto; max-width: 200px; }
            .company-name { font-size: 24px; font-weight: bold; color: #3b82f6; }
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
            <div class="company-header">
              ${data.companyInfo.logo ? 
                `<img src="${data.companyInfo.logo}" alt="${data.companyInfo.name}" class="company-logo" />` : 
                ''
              }
              <div class="company-name">${data.companyInfo.name}</div>
            </div>
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
            <div class="section-title">📊 Análise das Campanhas</div>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${data.campaignAnalytics.totalCampaigns}</div>
                <div class="metric-label">Total de Campanhas</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.campaignAnalytics.activeCampaigns}</div>
                <div class="metric-label">Campanhas Ativas</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.campaignAnalytics.budgetUtilization.toFixed(1)}%</div>
                <div class="metric-label">Utilização Budget</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${data.campaignAnalytics.averageQualityRanking}</div>
                <div class="metric-label">Ranking de Qualidade</div>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🎯 Distribuição por Objetivo</div>
            ${Object.entries(data.campaignAnalytics.campaignsByObjective).map(([objective, count]) => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; margin: 5px 0; border: 1px solid #e5e7eb; border-radius: 6px;">
                <span>${translateObjective(objective)}</span>
                <span style="background: #f3f4f6; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${count}</span>
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
    return null;
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
      default: return <Target className="w-5 h-5 text-blue-500" />;
    }
  };

  const translateObjective = (objective: string): string => {
    const translations: { [key: string]: string } = {
      'OUTCOME_LEADS': 'Leads',
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_ENGAGEMENT': 'Engajamento', 
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_APP_PROMOTION': 'Promoção de App',
      'OUTCOME_AWARENESS': 'Conscientização',
      'OUTCOME_LOCAL_AWARENESS': 'Conscientização Local',
      'OUTCOME_VIDEO_VIEWS': 'Visualizações de Vídeo',
      'OUTCOME_MESSAGES': 'Mensagens',
      'LEADS': 'Leads',
      'TRAFFIC': 'Tráfego',
      'ENGAGEMENT': 'Engajamento',
      'SALES': 'Vendas',
      'APP_PROMOTION': 'Promoção de App',
      'AWARENESS': 'Conscientização',
      'LOCAL_AWARENESS': 'Conscientização Local',
      'VIDEO_VIEWS': 'Visualizações de Vídeo',
      'MESSAGES': 'Mensagens',
      'LINK_CLICKS': 'Cliques no Link',
      'UNKNOWN': 'Desconhecido'
    };
    
    // Remove prefixos comuns e underscore
    const cleanObjective = objective.replace('OUTCOME_', '').replace(/_/g, ' ');
    return translations[objective] || translations[cleanObjective] || cleanObjective;
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
    <div className="p-6 space-y-6">
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
                 {reportData.clientInfo.monthlyBudget ? 
                   `${((reportData.currentWeekMetrics.totalSpend / reportData.clientInfo.monthlyBudget) * 100).toFixed(1)}% do orçamento mensal` :
                   'Orçamento não definido'
                 }
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
                 Número de Leads Gerados
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
                 {reportData.currentWeekMetrics.totalSpend > 0 ? 
                   Math.round((reportData.currentWeekMetrics.totalConversions / reportData.currentWeekMetrics.totalSpend) * 1000) : 0
                 }
               </div>
               <div className="text-sm text-muted-foreground">Leads por R$ 1000</div>
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

        {/* Análise Detalhada das Campanhas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Análise Detalhada das Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status das Campanhas */}
            <div>
              <h4 className="font-medium mb-3">Status das Campanhas</h4>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{reportData.campaignAnalytics.totalCampaigns}</div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{reportData.campaignAnalytics.activeCampaigns}</div>
                  <div className="text-sm text-muted-foreground">Ativas</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{reportData.campaignAnalytics.pausedCampaigns}</div>
                  <div className="text-sm text-muted-foreground">Pausadas</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{reportData.campaignAnalytics.budgetUtilization.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">Utilização Budget</div>
                </div>
              </div>
            </div>

            {/* Campanhas por Objetivo */}
            <div>
              <h4 className="font-medium mb-3">Distribuição por Objetivo</h4>
              <div className="space-y-2">
                {Object.entries(reportData.campaignAnalytics.campaignsByObjective).map(([objective, count]) => (
                  <div key={objective} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                    <span className="text-sm">{translateObjective(objective)}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div>
              <h4 className="font-medium mb-3">Top Campanhas Performers</h4>
              <div className="space-y-3">
                {reportData.campaignAnalytics.topPerformers.slice(0, 3).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-grow">
                      <h5 className="font-medium">{campaign.name}</h5>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Status: {campaign.status}</span>
                        <span>Conversões: {campaign.weeklyConversions}</span>
                        <span>CPA: R$ {campaign.weeklyMetrics.averageCPA.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">R$ {campaign.weeklySpend.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">Investido</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPIs Adicionais */}
            <div>
              <h4 className="font-medium mb-3">Indicadores de Qualidade</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold">{reportData.campaignAnalytics.averageQualityRanking}</div>
                  <div className="text-sm text-muted-foreground">Ranking de Qualidade Médio</div>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="text-lg font-bold">{reportData.currentWeekMetrics.averageFrequency.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">Frequência Média</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}