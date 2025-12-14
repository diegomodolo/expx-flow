import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useTaskAutomation } from '@/hooks/useTaskAutomation';
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useClients } from "@/hooks/useClients";
import { useLeadQuality } from "@/hooks/useLeadQuality";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);
import { SyncPeriodDialog, SyncOptions } from "@/components/facebook/SyncPeriodDialog";
import { SyncProgressModal } from "@/components/clients/SyncProgressModal";
import { SyncStatusIndicator } from "@/components/clients/SyncStatusIndicator";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Target, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  MousePointer,
  ShoppingCart,
  Repeat,
  Calendar,
  RefreshCw,
  Award,
} from "lucide-react";

export default function NewDashboard() {
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [rankingTab, setRankingTab] = useState("cpa");

  const {
    metrics,
    clientsPerformance,
    campaignRankings,
    funnelMetrics,
    loading,
    refetch
  } = useDashboardData();

  const { clients } = useClients();
  const { syncCampaigns, syncing, progress } = useFacebookCampaignSync();
  const { data: leadQualityData, loading: leadQualityLoading } = useLeadQuality();

  // Dados do funil com informações reais
  const funnelData = [
    { name: 'Alcance', value: funnelMetrics?.reach || 0, color: '#8b5cf6' },
    { name: 'Clicks', value: funnelMetrics?.clicks || 0, color: '#6366f1' },
    { name: 'Leads', value: funnelMetrics?.leads || 0, color: '#10b981' }
  ];

  // Usar dados existentes
  const topClientsByROI = clientsPerformance || [];
  const topCampaignsByCPA = campaignRankings || [];

  // Hook para alertas automáticos
  const { alerts, loading: alertsLoading, isReady: alertsReady, generateAlerts } = useDashboardAlerts();
  const { convertAlertToTask } = useTaskAutomation();
  
  // Estado para controlar ações convertidas em tarefas
  const [convertedActions, setConvertedActions] = useState<Set<string>>(new Set());
  const [alertsGenerated, setAlertsGenerated] = useState(false);

  // Buscar alertas automaticamente quando os dados necessários estão disponíveis (apenas uma vez)
  useEffect(() => {
    if (!loading && metrics && campaignRankings && clientsPerformance && !alertsGenerated) {
      setAlertsGenerated(true);
      generateAlerts();
    }
  }, [loading, metrics, campaignRankings, clientsPerformance, alertsGenerated, generateAlerts]);

  // Calcular informações da última sincronização
  const getLastSyncInfo = () => {
    if (!clients || clients.length === 0) return null;
    
    const clientsWithSync = clients.filter(client => client.last_sync_at);
    if (clientsWithSync.length === 0) return null;

    // Encontrar a sincronização mais recente
    const mostRecentSync = clientsWithSync.reduce((latest, client) => {
      return new Date(client.last_sync_at!) > new Date(latest.last_sync_at!) ? client : latest;
    });

    return {
      lastSyncAt: mostRecentSync.last_sync_at,
      lastSyncPeriod: mostRecentSync.last_sync_period || 'unknown'
    };
  };

  const lastSyncInfo = getLastSyncInfo();

  // Função auxiliar para calcular mudança percentual
  const calculateChange = (current: number, previous: number) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Função auxiliar para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Sincronizar todos os clientes
  const syncAllClientsLocal = async (options: SyncOptions) => {
    if (!clients || clients.length === 0) {
      return;
    }

    for (const client of clients) {
      if (client.ad_account_id) {
        await syncCampaigns(client.id, options.period, {
          campaigns: options.campaigns,
          adsets: options.adsets,
          ads: options.ads
        });
      }
    }
    
    // Recarregar dados após sincronização
    await refetch();
  };

  const handleSyncConfirm = async (options: SyncOptions): Promise<string | null> => {
    setSyncDialogOpen(false);
    await syncAllClientsLocal(options);
    return null; // TODO: Implement job tracking for bulk sync
  };

  // Função para converter ação em tarefa
  const handleConvertActionToTask = (alert: any) => {
    // Adicionar ação à lista de convertidas imediatamente para remover da UI
    setConvertedActions(prev => new Set([...prev, alert.id]));
    
    // Converter ação em tarefa
    convertAlertToTask(alert);
  };

  // Separar alertas por tipo
  const dangerAlerts = alerts.filter(alert => alert.type === 'danger');
  const opportunityAlerts = alerts.filter(alert => alert.type === 'opportunity');

  return (
    <DashboardLayout>
      {/* Header - Google Style */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-headline-lg text-foreground">Dashboard</h1>
          <p className="text-body-md text-muted-foreground mt-1">Visão geral de performance</p>
        </div>
        
        <div className="flex items-center gap-3 mt-4 lg:mt-0">
          <SyncStatusIndicator 
            lastSyncAt={lastSyncInfo?.lastSyncAt} 
            lastSyncPeriod={lastSyncInfo?.lastSyncPeriod}
          />
          <Button 
            variant="outline" 
            className="flex items-center gap-2 rounded-full px-4 h-9 text-body-md font-medium border-border hover:bg-secondary" 
            onClick={() => setSyncDialogOpen(true)}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </Button>
        </div>
      </div>

      {/* Conteúdo do Dashboard */}
      <div className="space-y-6">
        {/* KPI Cards - Google Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Investimento Total */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className={`text-label-md px-2 py-0.5 rounded-full ${
                metrics && calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment) >= 0 
                  ? 'text-google-green-600 bg-google-green-50' 
                  : 'text-google-red-600 bg-google-red-50'
              }`}>
                {metrics && calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment) >= 0 ? '+' : ''}
                {metrics ? calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-body-sm text-muted-foreground mb-1">Investimento Total</p>
            <p className="text-headline-md text-foreground">
              {formatCurrency(metrics?.totalInvestment || 0)}
            </p>
          </div>

          {/* Leads Gerados */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <Users className="w-5 h-5 text-google-green-500" />
              <span className={`text-label-md px-2 py-0.5 rounded-full ${
                metrics && calculateChange(metrics.totalLeads, metrics.previousPeriodLeads) >= 0 
                  ? 'text-google-green-600 bg-google-green-50' 
                  : 'text-google-red-600 bg-google-red-50'
              }`}>
                {metrics && calculateChange(metrics.totalLeads, metrics.previousPeriodLeads) >= 0 ? '+' : ''}
                {metrics ? calculateChange(metrics.totalLeads, metrics.previousPeriodLeads).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-body-sm text-muted-foreground mb-1">Leads Gerados</p>
            <p className="text-headline-md text-foreground">{metrics?.totalLeads || 0}</p>
          </div>

          {/* CPA Médio */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <Target className="w-5 h-5 text-google-yellow-500" />
              <span className={`text-label-md px-2 py-0.5 rounded-full ${
                metrics && calculateChange(metrics.averageCPA, metrics.previousPeriodCPA) <= 0 
                  ? 'text-google-green-600 bg-google-green-50' 
                  : 'text-google-red-600 bg-google-red-50'
              }`}>
                {metrics && calculateChange(metrics.averageCPA, metrics.previousPeriodCPA) <= 0 ? '' : '+'}
                {metrics ? calculateChange(metrics.averageCPA, metrics.previousPeriodCPA).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-body-sm text-muted-foreground mb-1">CPA Médio</p>
            <p className="text-headline-md text-foreground">
              {formatCurrency(metrics?.averageCPA || 0)}
            </p>
          </div>

          {/* CTR Médio */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <MousePointer className="w-5 h-5 text-google-blue-500" />
              <span className={`text-label-md px-2 py-0.5 rounded-full ${
                metrics && calculateChange(metrics.averageCTR, metrics.previousPeriodCTR) >= 0 
                  ? 'text-google-green-600 bg-google-green-50' 
                  : 'text-google-red-600 bg-google-red-50'
              }`}>
                {metrics && calculateChange(metrics.averageCTR, metrics.previousPeriodCTR) >= 0 ? '+' : ''}
                {metrics ? calculateChange(metrics.averageCTR, metrics.previousPeriodCTR).toFixed(1) : 0}%
              </span>
            </div>
            <p className="text-body-sm text-muted-foreground mb-1">Taxa de Cliques</p>
            <p className="text-headline-md text-foreground">
              {metrics?.averageCTR ? `${metrics.averageCTR.toFixed(2)}%` : '0%'}
            </p>
          </div>

          {/* MQL Rate */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <Award className="w-5 h-5 text-google-green-500" />
              <span className={`text-label-md px-2 py-0.5 rounded-full ${
                leadQualityData.mqlPercentage >= 70 
                  ? 'text-google-green-600 bg-google-green-50' 
                  : leadQualityData.mqlPercentage >= 50
                  ? 'text-google-yellow-600 bg-google-yellow-50'
                  : 'text-google-red-600 bg-google-red-50'
              }`}>
                {leadQualityData.disqualifiedLeads > 0 ? 'Com Filtro' : 'Sem Dados'}
              </span>
            </div>
            <p className="text-body-sm text-muted-foreground mb-1">MQL Rate</p>
            <p className="text-headline-md text-foreground">
              {leadQualityLoading ? '...' : `${leadQualityData.mqlPercentage.toFixed(1)}%`}
            </p>
            {leadQualityData.totalLeads > 0 && (
              <p className="text-body-sm text-muted-foreground mt-1">
                {leadQualityData.totalLeads - leadQualityData.disqualifiedLeads} de {leadQualityData.totalLeads} leads
              </p>
            )}
          </div>
        </div>

        {/* Gráficos de Performance - Google Style */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico 1: Top Clientes por Investimento vs Leads */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="text-title-lg text-foreground">Top Clientes - Investimento vs Leads</h2>
            </div>
            
            <div className="h-[350px] w-full">
              <Bar
                data={{
                  labels: topClientsByROI.slice(0, 8).map(client => 
                    client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name
                  ),
                  datasets: [
                    {
                      label: 'Investimento',
                      data: topClientsByROI.slice(0, 8).map(client => client.investment),
                      backgroundColor: 'hsl(217, 91%, 60%)',
                      borderColor: 'hsl(217, 91%, 60%)',
                      borderWidth: 0,
                      borderRadius: 4,
                      yAxisID: 'y',
                    },
                    {
                      label: 'Leads',
                      data: topClientsByROI.slice(0, 8).map(client => client.leads_generated),
                      backgroundColor: 'hsl(142, 71%, 45%)',
                      borderColor: 'hsl(142, 71%, 45%)',
                      borderWidth: 0,
                      borderRadius: 4,
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: {
                    padding: 0,
                  },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: {
                          family: 'Google Sans, Inter, sans-serif',
                          size: 12,
                        },
                      },
                    },
                    tooltip: {
                      backgroundColor: 'hsl(213, 5%, 16%)',
                      titleFont: { family: 'Google Sans, Inter, sans-serif' },
                      bodyFont: { family: 'Google Sans, Inter, sans-serif' },
                      cornerRadius: 8,
                      padding: 12,
                      callbacks: {
                        label: (context) => {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y;
                          return `${label}: ${label === 'Investimento' ? formatCurrency(value) : value}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      display: true,
                      grid: { display: false },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { family: 'Google Sans, Inter, sans-serif', size: 11 },
                      },
                    },
                    y: {
                      type: 'linear' as const,
                      display: false,
                      position: 'left' as const,
                    },
                    y1: {
                      type: 'linear' as const,
                      display: false,
                      position: 'right' as const,
                      grid: { drawOnChartArea: false },
                    },
                  },
                }}
              />
            </div>
          </div>

          {/* Gráfico 2: CPL vs Investimento por Cliente */}
          <div className="bg-card rounded-xl p-5 shadow-google-sm hover:shadow-google-md transition-shadow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-title-lg text-foreground">CPL vs Investimento por Cliente</h2>
            </div>
            
            <div className="h-[350px] w-full">
              <Line
                data={{
                  labels: (() => {
                    const sortedClients = [...topClientsByROI]
                      .filter(client => client.investment > 0 && client.avg_cpl > 0)
                      .sort((a, b) => a.investment - b.investment);
                    return sortedClients.slice(0, 8).map(client => 
                      client.name.length > 15 ? client.name.substring(0, 15) + '...' : client.name
                    );
                  })(),
                  datasets: [
                    {
                      label: 'Investimento',
                       data: (() => {
                         const sortedClients = [...topClientsByROI]
                           .filter(client => client.investment > 0 && client.avg_cpl > 0)
                           .sort((a, b) => a.investment - b.investment);
                         return sortedClients.slice(0, 8).map(client => client.investment);
                       })(),
                      borderColor: 'hsl(217, 91%, 60%)',
                      backgroundColor: 'hsl(217, 91%, 60%)',
                      borderWidth: 2,
                      pointBackgroundColor: 'hsl(217, 91%, 60%)',
                      pointBorderColor: 'white',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      tension: 0.3,
                      yAxisID: 'y',
                    },
                    {
                      label: 'CPL',
                       data: (() => {
                         const sortedClients = [...topClientsByROI]
                           .filter(client => client.investment > 0 && client.avg_cpl > 0)
                           .sort((a, b) => a.investment - b.investment);
                         return sortedClients.slice(0, 8).map(client => client.avg_cpl);
                       })(),
                      borderColor: 'hsl(36, 100%, 50%)',
                      backgroundColor: 'hsl(36, 100%, 50%)',
                      borderWidth: 2,
                      pointBackgroundColor: 'hsl(36, 100%, 50%)',
                      pointBorderColor: 'white',
                      pointBorderWidth: 2,
                      pointRadius: 5,
                      tension: 0.3,
                      yAxisID: 'y1',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  layout: { padding: 0 },
                  plugins: {
                    legend: {
                      position: 'top' as const,
                      labels: {
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { family: 'Google Sans, Inter, sans-serif', size: 12 },
                      },
                    },
                    tooltip: {
                      backgroundColor: 'hsl(213, 5%, 16%)',
                      titleFont: { family: 'Google Sans, Inter, sans-serif' },
                      bodyFont: { family: 'Google Sans, Inter, sans-serif' },
                      cornerRadius: 8,
                      padding: 12,
                      callbacks: {
                        label: (context) => {
                          const label = context.dataset.label || '';
                          const value = context.parsed.y;
                          return `${label}: ${formatCurrency(value)}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      display: true,
                      grid: { display: false },
                      ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: { family: 'Google Sans, Inter, sans-serif', size: 11 },
                      },
                    },
                    y: { type: 'linear' as const, display: false, position: 'left' as const },
                    y1: {
                      type: 'linear' as const,
                      display: false,
                      position: 'right' as const,
                      grid: { drawOnChartArea: false },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        {/* Top 5 Clientes - Google Style */}
        <div className="bg-card rounded-xl p-5 shadow-google-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Clientes por Investimento */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-title-lg text-foreground">Top 5 por Investimento</h2>
              </div>

              <div className="space-y-2">
                {topClientsByROI.slice(0, 5).map((client, index) => (
                  <div key={client.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-label-lg ${
                      index === 0 ? 'bg-google-blue-100 text-google-blue-600' :
                      index === 1 ? 'bg-google-green-100 text-google-green-600' :
                      index === 2 ? 'bg-google-yellow-100 text-google-yellow-600' :
                      'bg-secondary text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body-md font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-body-sm text-muted-foreground">
                        {client.leads_generated} leads • CPA: {formatCurrency(client.avg_cpl)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-md font-medium text-foreground">{formatCurrency(client.investment)}</p>
                      <p className="text-body-sm text-muted-foreground">
                        {((client.investment / (topClientsByROI.reduce((sum, c) => sum + c.investment, 0))) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Clientes por Resultado de Leads */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">Top 5 Clientes por Resultado de Leads</h2>
              </div>

              <div className="space-y-3">
                {[...topClientsByROI]
                  .sort((a, b) => b.leads_generated - a.leads_generated)
                  .slice(0, 5)
                  .map((client, index) => (
                  <div key={`leads-${client.id}`} className={`p-4 bg-card/50 dark:bg-card rounded-lg shadow-sm ${
                    index === 0 ? 'border-l-4 border-green-500' :
                    index === 1 ? 'border-l-4 border-blue-500' :
                    index === 2 ? 'border-l-4 border-purple-500' :
                    index === 3 ? 'border-l-4 border-orange-500' :
                    'border-l-4 border-yellow-500'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        index === 0 ? 'bg-green-500' :
                        index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}>
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-card-foreground">{client.name}</h4>
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                            {client.leads_generated} leads
                          </span>
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                            {client.company}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Campanhas: {client.active_campaigns} • Investimento: {formatCurrency(client.investment)} • CPA: {formatCurrency(client.avg_cpl)} • {((client.leads_generated / (topClientsByROI.reduce((sum, c) => sum + c.leads_generated, 0))) * 100).toFixed(1)}% dos leads
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Performance por Etapas do Funil */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Performance por Etapas do Funil</h2>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-sm font-medium">Alcance</CardTitle>
                <div className="text-2xl font-bold text-blue-600">
                  {funnelMetrics?.reach?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pessoas alcançadas
                </p>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-sm font-medium">Clicks</CardTitle>
                <div className="text-2xl font-bold text-purple-600">
                  {funnelMetrics?.clicks?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cliques nos anúncios
                </p>
              </CardHeader>
            </Card>
            
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-sm font-medium">Leads</CardTitle>
                <div className="text-2xl font-bold text-green-600">
                  {funnelMetrics?.leads?.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  CPL: {formatCurrency(funnelMetrics?.cpl || 0)}
                </p>
              </CardHeader>
            </Card>
          </div>
        </div>


        {/* Alertas & Oportunidades */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Alertas & Oportunidades</h2>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Problemas */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-base font-medium text-card-foreground">Problemas ({dangerAlerts.length})</h3>
              </div>
          <div className="space-y-3">
                {alertsLoading && !alertsReady ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2 text-red-500" />
                      <span className="text-sm text-red-600">Analisando campanhas...</span>
                    </div>
                  </div>
                ) : dangerAlerts.length === 0 ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600 text-center">Nenhum problema detectado! 🎉</p>
                  </div>
                ) : (
                  dangerAlerts.filter(alert => !convertedActions.has(alert.id)).map((alert) => (
                    <div key={alert.id} className="p-4 bg-card/50 dark:bg-card border-l-4 border-red-500 rounded-lg shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-card-foreground">{alert.title}</h4>
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                              R$ {alert.value || '0,00'}
                            </span>
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                              {alert.client || 'Cliente não informado'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Campanha "{alert.campaign}" com CPA de R$ {alert.value || '0,00'}
                          </p>
                           <div className="flex items-center gap-2">
                             {alert.recommendation === 'Carregando recomendação...' ? (
                               <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                             ) : (
                               <AlertTriangle className="w-3 h-3 text-red-500" />
                             )}
                             <p className="text-xs text-gray-600">{alert.recommendation}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Oportunidades */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <h3 className="text-base font-medium text-card-foreground">Oportunidades ({opportunityAlerts.length})</h3>
              </div>
              <div className="space-y-3">
                {alertsLoading && !alertsReady ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2 text-green-500" />
                      <span className="text-sm text-green-600">Buscando oportunidades...</span>
                    </div>
                  </div>
                ) : opportunityAlerts.length === 0 ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-600 text-center">Nenhuma oportunidade detectada no momento.</p>
                  </div>
                ) : (
                  opportunityAlerts.filter(alert => !convertedActions.has(alert.id)).map((alert) => (
                    <div key={alert.id} className="p-4 bg-card/50 dark:bg-card border-l-4 border-green-500 rounded-lg shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-card-foreground">{alert.title}</h4>
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                              +{alert.value || '0'}%
                            </span>
                            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                              {alert.client || 'Cliente não informado'}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Campanha "{alert.campaign}" com ROI de +{alert.value || '0'}%
                          </p>
                           <div className="flex items-center gap-2">
                             {alert.recommendation === 'Carregando recomendação...' ? (
                               <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
                             ) : (
                               <CheckCircle className="w-3 h-3 text-green-500" />
                             )}
                             <p className="text-xs text-gray-600">{alert.recommendation}</p>
                           </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ranking de Campanhas */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Ranking de Campanhas</h2>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Top 5 Campanhas por CPA */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">Top 5 Campanhas por CPA</h2>
              </div>

              <div className="space-y-3">
                {topCampaignsByCPA.slice(0, 5).map((campaign, index) => (
                  <div key={campaign.id} className={`p-4 bg-card/50 dark:bg-card rounded-lg shadow-sm ${
                    index === 0 ? 'border-l-4 border-green-500' :
                    index === 1 ? 'border-l-4 border-blue-500' :
                    index === 2 ? 'border-l-4 border-purple-500' :
                    index === 3 ? 'border-l-4 border-orange-500' :
                    'border-l-4 border-yellow-500'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        index === 0 ? 'bg-green-500' :
                        index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}>
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-card-foreground truncate">{campaign.name}</h4>
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                            {formatCurrency(campaign.cpa)}
                          </span>
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                            {campaign.client_name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Investimento: {formatCurrency(campaign.spend)} • CTR: {campaign.ctr.toFixed(1)}% • Performance: {campaign.cpa <= 30 ? 'Excelente' : campaign.cpa <= 50 ? 'Bom' : 'Regular'} • Leads: {campaign.conversions}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Campanhas por Leads */}
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-card-foreground">Top 5 Campanhas por Leads</h2>
              </div>

              <div className="space-y-3">
                {[...topCampaignsByCPA]
                  .sort((a, b) => b.conversions - a.conversions)
                  .slice(0, 5)
                  .map((campaign, index) => (
                  <div key={`leads-${campaign.id}`} className={`p-4 bg-card/50 dark:bg-card rounded-lg shadow-sm ${
                    index === 0 ? 'border-l-4 border-green-500' :
                    index === 1 ? 'border-l-4 border-blue-500' :
                    index === 2 ? 'border-l-4 border-purple-500' :
                    index === 3 ? 'border-l-4 border-orange-500' :
                    'border-l-4 border-yellow-500'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        index === 0 ? 'bg-green-500' :
                        index === 1 ? 'bg-blue-500' :
                        index === 2 ? 'bg-purple-500' :
                        index === 3 ? 'bg-orange-500' :
                        'bg-yellow-500'
                      }`}>
                        <span className="text-sm font-bold text-white">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold text-card-foreground truncate">{campaign.name}</h4>
                          <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                            {campaign.conversions} leads
                          </span>
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                            {campaign.client_name}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Investimento: {formatCurrency(campaign.spend)} • CTR: {campaign.ctr.toFixed(1)}% • CPA: {formatCurrency(campaign.cpa)} • Performance: {campaign.cpa <= 30 ? 'Excelente' : campaign.cpa <= 50 ? 'Bom' : 'Regular'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Ações Recomendadas do Dia */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-card-foreground">Ações Recomendadas do Dia</h2>
          </div>

          {(opportunityAlerts.filter(a => !convertedActions.has(a.id)).length === 0 && 
            dangerAlerts.filter(a => !convertedActions.has(a.id)).length === 0) ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-500 w-8 h-8" />
              </div>
              <p className="text-muted-foreground">Todas as ações foram executadas</p>
              <p className="text-sm text-muted-foreground/80 mt-1">Próxima verificação em 2 horas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Oportunidades */}
              {opportunityAlerts
                .filter(alert => !convertedActions.has(alert.id))
                .slice(0, 3)
                .map((alert) => (
                <div key={alert.id} className="p-4 bg-card/50 dark:bg-card border-l-4 border-green-500 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-card-foreground">{alert.title}</h4>
                        <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                          +{alert.value || '0'}%
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                          {alert.client || 'Cliente não informado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Campanha "{alert.campaign}" com ROI de +{alert.value || '0'}% • {alert.recommendation}
                        </p>
                        <Button 
                          size="sm"
                          onClick={() => handleConvertActionToTask(alert)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Criar Tarefa
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Problemas */}
              {dangerAlerts
                .filter(alert => !convertedActions.has(alert.id))
                .slice(0, 2)
                .map((alert) => (
                <div key={alert.id} className="p-4 bg-card/50 dark:bg-card border-l-4 border-red-500 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-card-foreground">{alert.title}</h4>
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                          R$ {alert.value || '0,00'}
                        </span>
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                          {alert.client || 'Cliente não informado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Campanha "{alert.campaign}" com CPA de R$ {alert.value || '0,00'} • {alert.recommendation}
                        </p>
                        <Button 
                          size="sm"
                          onClick={() => handleConvertActionToTask(alert)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Criar Tarefa
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sync Dialog */}
      <SyncPeriodDialog
        open={syncDialogOpen}
        onOpenChange={setSyncDialogOpen}
        onConfirm={handleSyncConfirm}
        syncing={syncing}
        title="Sincronizar Todos os Clientes"
      />

      {/* Sync Progress Modal */}
      <SyncProgressModal
        open={syncing}
        progress={progress}
      />
    </DashboardLayout>
  );
}