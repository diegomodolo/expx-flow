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
  RefreshCw,
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

  // Criar dados do funil baseados nas métricas
  const funnelData = [
    { name: 'Alcance', value: metrics?.totalInvestment || 0, color: '#8b5cf6' },
    { name: 'Leads', value: metrics?.totalLeads || 0, color: '#10b981' },
    { name: 'Conversões', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.15) : 0, color: '#f59e0b' },
    { name: 'Recompras', value: metrics?.totalLeads ? Math.floor(metrics.totalLeads * 0.05) : 0, color: '#f97316' }
  ];

  // Usar dados existentes
  const topClientsByROI = clientsPerformance || [];
  const topCampaignsByCPA = campaignRankings || [];

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
  const syncAllClients = async (period: string) => {
    if (!clients || clients.length === 0) {
      console.log('No clients to sync');
      return;
    }

    for (const client of clients) {
      if (client.ad_account_id) {
        await syncCampaigns(client.id, period);
      }
    }
    
    // Recarregar dados após sincronização
    await refetch();
  };

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

  // Separar alertas por tipo
  const dangerAlerts = alerts.filter(alert => alert.type === 'danger');
  const opportunityAlerts = alerts.filter(alert => alert.type === 'opportunity');

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard - Controle de Tráfego</h1>
          <p className="text-gray-600 mt-1">Visão completa da performance dos seus projetos</p>
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

      {/* Conteúdo do Dashboard */}
      <div className="space-y-8">
        {/* Resumo Executivo */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Resumo Executivo</h2>
          </div>
          
          <div className="grid grid-cols-4 gap-6">
            {/* Investimento Total */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-white w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  metrics && calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment) >= 0 
                    ? 'text-green-600 bg-green-100' 
                    : 'text-red-600 bg-red-100'
                }`}>
                  {metrics && calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment) >= 0 ? '+' : ''}
                  {metrics ? calculateChange(metrics.totalInvestment, metrics.previousPeriodInvestment).toFixed(1) : 0}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics?.totalInvestment || 0)}
                </p>
                <p className="text-sm text-gray-600">Receita Total</p>
              </div>
            </div>

            {/* Leads Gerados */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <Users className="text-white w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  metrics && calculateChange(metrics.totalLeads, metrics.previousPeriodLeads) >= 0 
                    ? 'text-green-600 bg-green-100' 
                    : 'text-red-600 bg-red-100'
                }`}>
                  {metrics && calculateChange(metrics.totalLeads, metrics.previousPeriodLeads) >= 0 ? '+' : ''}
                  {metrics ? calculateChange(metrics.totalLeads, metrics.previousPeriodLeads).toFixed(1) : 0}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">{metrics?.totalLeads || 0}</p>
                <p className="text-sm text-gray-600">Leads Gerados</p>
              </div>
            </div>

            {/* CPA Médio */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <Target className="text-white w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  metrics && calculateChange(metrics.averageCPA, metrics.previousPeriodCPA) <= 0 
                    ? 'text-green-600 bg-green-100' 
                    : 'text-red-600 bg-red-100'
                }`}>
                  {metrics && calculateChange(metrics.averageCPA, metrics.previousPeriodCPA) <= 0 ? '' : '+'}
                  {metrics ? calculateChange(metrics.averageCPA, metrics.previousPeriodCPA).toFixed(1) : 0}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(metrics?.averageCPA || 0)}
                </p>
                <p className="text-sm text-gray-600">CPA Médio</p>
              </div>
            </div>

            {/* ROI Médio */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-white w-5 h-5" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  metrics && calculateChange(metrics.averageROI, metrics.previousPeriodROI) >= 0 
                    ? 'text-green-600 bg-green-100' 
                    : 'text-red-600 bg-red-100'
                }`}>
                  {metrics && calculateChange(metrics.averageROI, metrics.previousPeriodROI) >= 0 ? '+' : ''}
                  {metrics ? calculateChange(metrics.averageROI, metrics.previousPeriodROI).toFixed(1) : 0}%
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold text-gray-900">
                  {metrics?.averageROI ? (metrics.averageROI * 100).toFixed(1) + '%' : '0%'}
                </p>
                <p className="text-sm text-gray-600">Itens das Campanhas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top 10 Clientes por Investimento */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Top 10 Clientes por Investimento</h2>
          </div>

          <div className="space-y-3">
            {topClientsByROI.slice(0, 5).map((client, index) => (
              <div key={client.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                index === 0 ? 'bg-gradient-to-r from-green-50 to-transparent border-green-200' :
                index === 1 ? 'bg-gradient-to-r from-blue-50 to-transparent border-blue-200' :
                index === 2 ? 'bg-gradient-to-r from-purple-50 to-transparent border-purple-200' :
                index === 3 ? 'bg-gradient-to-r from-orange-50 to-transparent border-orange-200' :
                'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-green-500' :
                    index === 1 ? 'bg-blue-500' :
                    index === 2 ? 'bg-purple-500' :
                    index === 3 ? 'bg-orange-500' :
                    'bg-yellow-500'
                  }`}>
                    <span className="text-sm font-bold text-white">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{client.name}</p>
                    <p className="text-xs text-gray-500">
                      Campanhas: {client.active_campaigns} • Leads: {client.leads_generated}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(client.investment)}
                  </p>
                  <p className="text-xs text-gray-500">CPA: {formatCurrency(client.avg_cpl)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance por Etapas do Funil */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Performance por Etapas do Funil</h2>
          </div>

          <div className="grid grid-cols-4 gap-6">
            {funnelData.map((stage, index) => (
              <div key={stage.name} className={`text-center p-6 rounded-lg border ${
                stage.name === 'Alcance' ? 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200' :
                stage.name === 'Leads' ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' :
                stage.name === 'Conversões' ? 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200' :
                'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'
              }`}>
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  stage.name === 'Alcance' ? 'bg-purple-500' :
                  stage.name === 'Leads' ? 'bg-green-500' :
                  stage.name === 'Conversões' ? 'bg-yellow-500' :
                  'bg-orange-500'
                }`}>
                  {stage.name === 'Alcance' && <Eye className="text-white w-8 h-8" />}
                  {stage.name === 'Leads' && <Users className="text-white w-8 h-8" />}
                  {stage.name === 'Conversões' && <ShoppingCart className="text-white w-8 h-8" />}
                  {stage.name === 'Recompras' && <Repeat className="text-white w-8 h-8" />}
                </div>
                <p className="text-2xl font-bold text-gray-900 mb-1">
                  {stage.value.toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 mb-2">{stage.name}</p>
                <p className={`text-xs font-medium ${
                  stage.name === 'Alcance' ? 'text-purple-600' :
                  stage.name === 'Leads' ? 'text-green-600' :
                  stage.name === 'Conversões' ? 'text-yellow-600' :
                  'text-orange-600'
                }`}>
                  +15.2% vs mês anterior
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas & Oportunidades */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Alertas & Oportunidades</h2>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* Problemas */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h3 className="text-base font-medium text-gray-900">Problemas ({dangerAlerts.length})</h3>
              </div>
              <div className="space-y-3">
                {alertsLoading ? (
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
                  dangerAlerts.filter(alert => !convertedActions.has(alert.id)).slice(0, 3).map((alert) => (
                    <div key={alert.id} className="p-4 bg-white border-l-4 border-red-500 rounded-lg shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
                              R$ {alert.value || '0,00'}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {alert.client || 'Cliente não informado'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            Campanha "{alert.campaign}" com CPA de R$ {alert.value || '0,00'}
                          </p>
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
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
                <h3 className="text-base font-medium text-gray-900">Oportunidades ({opportunityAlerts.length})</h3>
              </div>
              <div className="space-y-3">
                {alertsLoading ? (
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
                  opportunityAlerts.filter(alert => !convertedActions.has(alert.id)).slice(0, 3).map((alert) => (
                    <div key={alert.id} className="p-4 bg-white border-l-4 border-green-500 rounded-lg shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <TrendingUp className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">{alert.title}</h4>
                            <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                              +{alert.value || '0'}%
                            </span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                              {alert.client || 'Cliente não informado'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">
                            Campanha "{alert.campaign}" com ROI de +{alert.value || '0'}%
                          </p>
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-500" />
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
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Ranking de Campanhas</h2>
          </div>

          <div className="space-y-3">
            {topCampaignsByCPA.map((campaign, index) => (
              <div key={campaign.id} className={`flex items-center justify-between p-4 rounded-lg border ${
                index === 0 ? 'bg-gradient-to-r from-green-50 to-transparent border-green-200' :
                index === 1 ? 'bg-gradient-to-r from-blue-50 to-transparent border-blue-200' :
                index === 2 ? 'bg-gradient-to-r from-purple-50 to-transparent border-purple-200' :
                index === 3 ? 'bg-gradient-to-r from-orange-50 to-transparent border-orange-200' :
                'bg-gradient-to-r from-yellow-50 to-transparent border-yellow-200'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-green-500' :
                    index === 1 ? 'bg-blue-500' :
                    index === 2 ? 'bg-purple-500' :
                    index === 3 ? 'bg-orange-500' :
                    'bg-yellow-500'
                  }`}>
                    <span className="text-sm font-bold text-white">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{campaign.name}</p>
                    <p className="text-xs text-gray-500">
                      Performance: {campaign.cpa <= 30 ? 'Excelente' : campaign.cpa <= 50 ? 'Bom' : 'Regular'} • 
                      CTR: {campaign.ctr.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">{formatCurrency(campaign.spend)}</p>
                  <p className="text-xs text-gray-500">CPA: {formatCurrency(campaign.cpa)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ações Recomendadas do Dia */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-gray-900">Ações Recomendadas do Dia</h2>
          </div>

          {(opportunityAlerts.filter(a => !convertedActions.has(a.id)).length === 0 && 
            dangerAlerts.filter(a => !convertedActions.has(a.id)).length === 0) ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-500 w-8 h-8" />
              </div>
              <p className="text-gray-600">Todas as ações foram executadas</p>
              <p className="text-sm text-gray-500 mt-1">Próxima verificação em 2 horas</p>
            </div>
          ) : (
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