import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useTaskAutomation } from '@/hooks/useTaskAutomation';
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { SyncPeriodDialog } from "@/components/facebook/SyncPeriodDialog";
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
  Activity,
  RefreshCw
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const NewDashboard = () => {
  const { 
    metrics, 
    clientsPerformance, 
    campaignRankings, 
    funnelMetrics, 
    trends, 
    loading, 
    error 
  } = useDashboardData();

  const { clients } = useClients();
  const { syncAllClients, syncing, progress } = useFacebookCampaignSync();
  const [rankingTab, setRankingTab] = useState('cpa');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  // Hook para alertas automáticos
  const { alerts, loading: alertsLoading, generateAlerts } = useDashboardAlerts();
  const { convertAlertToTask } = useTaskAutomation();
  
  // Estado para controlar ações convertidas em tarefas
  const [convertedActions, setConvertedActions] = useState<Set<string>>(new Set());

  // Buscar alertas automaticamente quando o dashboard carrega (apenas uma vez)
  useEffect(() => {
    let isMounted = true;
    
    const fetchAlertsWithDelay = async () => {
      // Aguardar um delay para garantir que outros dados carregaram
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (isMounted) {
        generateAlerts();
      }
    };

    fetchAlertsWithDelay();

    return () => {
      isMounted = false;
    };
  }, []); // Array vazio para executar apenas uma vez

  // Calcular informações da última sincronização
  const getLastSyncInfo = () => {
    if (!clients || clients.length === 0) return null;
    
    const clientsWithSync = clients.filter(c => c.last_sync_at);
    if (clientsWithSync.length === 0) return null;
    
    // Pegar a sincronização mais recente
    const mostRecentSync = clientsWithSync.reduce((latest, current) => {
      const currentDate = new Date(current.last_sync_at!);
      const latestDate = new Date(latest.last_sync_at!);
      return currentDate > latestDate ? current : latest;
    });
    
    return {
      lastSyncAt: mostRecentSync.last_sync_at,
      lastSyncPeriod: mostRecentSync.last_sync_period
    };
  };

  const lastSyncInfo = getLastSyncInfo();

  const handleSyncConfirm = async (period: string) => {
    setSyncDialogOpen(false);
    await syncAllClients(period);
  };

  // Função para converter ação em tarefa
  const handleConvertActionToTask = (alert: any) => {
    // Adicionar ação à lista de convertidas imediatamente para remover da UI
    setConvertedActions(prev => new Set([...prev, alert.id]));
    
    // Converter ação em tarefa
    convertAlertToTask(alert);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Carregando dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Função para calcular variação percentual
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Cores para o gráfico de pizza
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

  // Preparar dados do funil
  const funnelData = funnelMetrics ? [
    { name: 'Alcance', value: funnelMetrics.reach, color: '#8884d8' },
    { name: 'Leads', value: funnelMetrics.leads, color: '#00C49F' },
    { name: 'Conversões', value: funnelMetrics.conversions, color: '#FFBB28' },
    { name: 'Recompras', value: funnelMetrics.recompras, color: '#FF8042' },
  ] : [];

  // Separar alertas por tipo e limitar a 5 de cada
  const dangerAlerts = alerts.filter(alert => alert.type === 'danger').slice(0, 5);
  const opportunityAlerts = alerts.filter(alert => alert.type === 'opportunity').slice(0, 5);

  // Ordenar campanhas para ranking
  const topCampaignsByCPA = [...campaignRankings]
    .filter(c => c.cpa > 0)
    .sort((a, b) => a.cpa - b.cpa)
    .slice(0, 5);

  const topCampaignsByConversions = [...campaignRankings]
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 5);

  return (
    <DashboardLayout>
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard - Controle de Tráfego</h1>
            <p className="text-gray-600 mt-2">Visão consolidada de performance dos últimos 30 dias</p>
          </div>
          
          <div className="flex items-center space-x-4 mt-4 lg:mt-0">
            <SyncStatusIndicator 
              lastSyncAt={lastSyncInfo?.lastSyncAt} 
              lastSyncPeriod={lastSyncInfo?.lastSyncPeriod}
            />
            <Button 
              variant="outline" 
              className="flex items-center space-x-2" 
              onClick={() => setSyncDialogOpen(true)}
              disabled={syncing}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </Button>
          </div>
        </div>

        {/* Seção 1 - Resumo Executivo */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Resumo Executivo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Investimento Total */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Investimento Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(metrics?.totalInvestment || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      {metrics && calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        metrics && calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment) >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {metrics ? Math.abs(calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment)).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leads Gerados */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Leads Gerados</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.totalLeads || 0}</p>
                    <div className="flex items-center mt-1">
                      {metrics && calculateChange(metrics.totalLeads, metrics.previousPeriodLeads) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        metrics && calculateChange(metrics.totalLeads, metrics.previousPeriodLeads) >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {metrics ? Math.abs(calculateChange(metrics.totalLeads, metrics.previousPeriodLeads)).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CPA Médio */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">CPA Médio</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(metrics?.averageCPA || 0)}
                    </p>
                    <div className="flex items-center mt-1">
                      {metrics && calculateChange(metrics.averageCPA, metrics.previousPeriodCPA) <= 0 ? (
                        <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        metrics && calculateChange(metrics.averageCPA, metrics.previousPeriodCPA) <= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {metrics ? Math.abs(calculateChange(metrics.averageCPA, metrics.previousPeriodCPA)).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status das Campanhas */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status das Campanhas</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">{metrics?.activeClients || 0}</p>
                        <p className="text-xs text-gray-500">Ativos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">{metrics?.pausedClients || 0}</p>
                        <p className="text-xs text-gray-500">Pausados</p>
                      </div>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Seção 2 - Visão Consolidada das Contas */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Top 10 Clientes por Investimento
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição do Investimento</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={clientsPerformance.slice(0, 10)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalInvestment"
                    >
                      {clientsPerformance.slice(0, 10).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ranking de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {clientsPerformance.slice(0, 10).map((client, index) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(client.totalInvestment)}</p>
                        <p className="text-sm text-gray-600">{client.totalLeads} leads</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Seção 3 - Performance por Etapas do Funil */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5" />
            Performance por Etapas do Funil
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {funnelData.map((stage, index) => (
              <Card key={stage.name} className="shadow-lg border-0 bg-white">
                <CardContent className="p-8 text-center">
                  {/* Ícone circular com fundo colorido */}
                  <div 
                    className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${stage.color}20` }}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: stage.color }}>
                      {stage.name === 'Alcance' && <Eye className="w-6 h-6 text-white" />}
                      {stage.name === 'Leads' && <MousePointer className="w-6 h-6 text-white" />}
                      {stage.name === 'Conversões' && <ShoppingCart className="w-6 h-6 text-white" />}
                      {stage.name === 'Recompras' && <Repeat className="w-6 h-6 text-white" />}
                    </div>
                  </div>
                  
                  {/* Título */}
                  <h3 className="text-lg font-medium text-gray-600 mb-3">{stage.name}</h3>
                  
                  {/* Valor principal */}
                  <p className="text-4xl font-bold text-gray-900 mb-2">
                    {stage.value.toLocaleString()}
                  </p>
                  
                  {/* Métricas adicionais */}
                  {stage.name === 'Leads' && funnelMetrics && (
                    <p className="text-sm text-gray-500">CPL: {formatCurrency(funnelMetrics.cpl)}</p>
                  )}
                  {stage.name === 'Conversões' && funnelMetrics && (
                    <p className="text-sm text-gray-500">CPA: {formatCurrency(funnelMetrics.cpa)}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Seção 4 - Alertas & Oportunidades */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas & Oportunidades
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Problemas */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-red-600">
                  Problemas ({dangerAlerts.length})
                </h3>
                {alertsLoading && <RefreshCw className="w-4 h-4 animate-spin text-red-500" />}
              </div>
              
              <div className="space-y-4">
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8 bg-red-50 rounded-lg border-l-4 border-red-400">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2 text-red-500" />
                    <span className="text-red-600">Analisando campanhas...</span>
                  </div>
                ) : dangerAlerts.length === 0 ? (
                  <div className="text-center py-8 bg-red-50 rounded-lg border-l-4 border-red-400">
                    <p className="text-red-600">Nenhum problema detectado! 🎉</p>
                  </div>
                ) : (
                  dangerAlerts.map((alert) => (
                    <div key={alert.id} className="bg-red-50 rounded-lg border-l-4 border-red-400 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">
                              {alert.value}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-gray-600">
                              {alert.client}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">
                            Campanha "{alert.campaign}" com {alert.metric.toLowerCase()} de {alert.value}
                          </p>
                          {alert.recommendation && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-xs">💡</span>
                              </div>
                              <span>{alert.recommendation}</span>
                            </div>
                          )}
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
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-green-600">
                  Oportunidades ({opportunityAlerts.length})
                </h3>
                {alertsLoading && <RefreshCw className="w-4 h-4 animate-spin text-green-500" />}
              </div>
              
              <div className="space-y-4">
                {alertsLoading ? (
                  <div className="flex items-center justify-center py-8 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <RefreshCw className="w-6 h-6 animate-spin mr-2 text-green-500" />
                    <span className="text-green-600">Buscando oportunidades...</span>
                  </div>
                ) : opportunityAlerts.length === 0 ? (
                  <div className="text-center py-8 bg-green-50 rounded-lg border-l-4 border-green-400">
                    <p className="text-green-600">Nenhuma oportunidade detectada no momento.</p>
                  </div>
                ) : (
                  opportunityAlerts.map((alert) => (
                    <div key={alert.id} className="bg-green-50 rounded-lg border-l-4 border-green-400 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
                              CPA: {alert.value.includes('CPA') ? alert.value.split(' | ')[0].replace('CPA: ', '') : 'R$ 25,32'}
                            </Badge>
                            <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
                              CTR: {alert.value.includes('CTR') ? alert.value.split(' | ')[1]?.replace('CTR: ', '') || '5,32%' : '5,32%'}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-gray-600">
                              {alert.client}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-3">
                            Campanha "{alert.campaign}" tem potencial para aumentar orçamento
                          </p>
                          {alert.recommendation && (
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-4 h-4 bg-gray-300 rounded-full flex items-center justify-center">
                                <span className="text-xs">🚀</span>
                              </div>
                              <span>{alert.recommendation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Seção 5 - Ranking de Campanhas */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Ranking de Campanhas
          </h2>
          <Card>
            <CardHeader>
              <Tabs value={rankingTab} onValueChange={setRankingTab}>
                <TabsList>
                  <TabsTrigger value="cpa">Melhor CPA</TabsTrigger>
                  <TabsTrigger value="conversions">Maior Volume</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <Tabs value={rankingTab}>
                <TabsContent value="cpa">
                  <div className="space-y-3">
                    {topCampaignsByCPA.map((campaign, index) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-bold text-purple-600">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-gray-600">{campaign.client_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(campaign.cpa)}</p>
                          <p className="text-sm text-gray-600">{campaign.conversions} conversões</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="conversions">
                  <div className="space-y-3">
                    {topCampaignsByConversions.map((campaign, index) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{campaign.name}</p>
                            <p className="text-sm text-gray-600">{campaign.client_name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-600">{campaign.conversions} conversões</p>
                          <p className="text-sm text-gray-600">CPA: {formatCurrency(campaign.cpa)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* Seção 6 - Ações do Dia */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Ações Recomendadas do Dia
          </h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {opportunityAlerts
                  .filter(alert => !convertedActions.has(alert.id))
                  .slice(0, 3)
                  .map((alert, index) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">Escalar {alert.campaign}</p>
                        <p className="text-sm text-gray-600">
                          Cliente: {alert.client} - {alert.recommendation}
                        </p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => handleConvertActionToTask(alert)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Criar Tarefa
                    </Button>
                  </div>
                ))}
                
                {dangerAlerts
                  .filter(alert => !convertedActions.has(alert.id))
                  .slice(0, 2)
                  .map((alert, index) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
                        {index + opportunityAlerts.filter(a => !convertedActions.has(a.id)).slice(0, 3).length + 1}
                      </div>
                      <div>
                        <p className="font-medium">Revisar {alert.client}</p>
                        <p className="text-sm text-gray-600">{alert.recommendation}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleConvertActionToTask(alert)}
                      className="border-red-300 text-red-600 hover:bg-red-50"
                    >
                      Criar Tarefa
                    </Button>
                  </div>
                ))}

                {(opportunityAlerts.filter(a => !convertedActions.has(a.id)).length === 0 && 
                  dangerAlerts.filter(a => !convertedActions.has(a.id)).length === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">Todas as ações foram executadas! 🎯</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

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
};

export default NewDashboard;