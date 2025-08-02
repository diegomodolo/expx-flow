import React, { useState } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  Activity
} from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const NewDashboard = () => {
  const { 
    metrics, 
    clientsPerformance, 
    campaignRankings, 
    funnelMetrics, 
    alerts, 
    trends, 
    loading, 
    error 
  } = useDashboardData();

  const [rankingTab, setRankingTab] = useState('cpa');

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

  // Filtrar alertas por tipo
  const dangerAlerts = alerts.filter(a => a.type === 'danger');
  const opportunityAlerts = alerts.filter(a => a.type === 'opportunity');

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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard - Controle de Tráfego</h1>
          <p className="text-gray-600 mt-2">Visão consolidada de performance dos últimos 30 dias</p>
        </div>

        {/* Seção 1 - Resumo Executivo */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Resumo Executivo
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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

            {/* ROI Global */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">ROI Global</p>
                    <p className="text-2xl font-bold text-gray-900">{metrics?.roi.toFixed(1) || 0}%</p>
                    <div className="flex items-center mt-1">
                      {metrics && calculateChange(metrics.roi, metrics.previousPeriodROI) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                      )}
                      <span className={`text-sm ${
                        metrics && calculateChange(metrics.roi, metrics.previousPeriodROI) >= 0 
                          ? 'text-green-500' 
                          : 'text-red-500'
                      }`}>
                        {metrics ? Math.abs(calculateChange(metrics.roi, metrics.previousPeriodROI)).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <ArrowUpRight className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clientes Ativos vs Pausados */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status dos Clientes</p>
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
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {funnelData.map((stage, index) => (
                  <div key={stage.name} className="text-center">
                    <div className="relative">
                      <div 
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: stage.color }}
                      >
                        {stage.name === 'Alcance' && <Eye className="w-8 h-8" />}
                        {stage.name === 'Leads' && <MousePointer className="w-8 h-8" />}
                        {stage.name === 'Conversões' && <ShoppingCart className="w-8 h-8" />}
                        {stage.name === 'Recompras' && <Repeat className="w-8 h-8" />}
                      </div>
                      {index < funnelData.length - 1 && (
                        <ArrowDownRight className="absolute top-1/2 -right-8 w-6 h-6 text-gray-400 hidden md:block" />
                      )}
                    </div>
                    <h3 className="font-semibold mt-4">{stage.name}</h3>
                    <p className="text-2xl font-bold text-gray-900">{stage.value.toLocaleString()}</p>
                    {stage.name === 'Leads' && funnelMetrics && (
                      <p className="text-sm text-gray-600">CPL: {formatCurrency(funnelMetrics.cpl)}</p>
                    )}
                    {stage.name === 'Conversões' && funnelMetrics && (
                      <p className="text-sm text-gray-600">CPA: {formatCurrency(funnelMetrics.cpa)}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Seção 4 - Alertas & Oportunidades */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Alertas & Oportunidades
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alertas Vermelhos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Problemas ({dangerAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {dangerAlerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhum problema detectado! 🎉</p>
                  ) : (
                    dangerAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-3 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                        <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-red-800">{alert.title}</h4>
                          <p className="text-sm text-red-600">{alert.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="destructive">{alert.value}</Badge>
                            {alert.client && (
                              <Badge variant="outline" className="text-xs">{alert.client}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Oportunidades Verdes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  Oportunidades ({opportunityAlerts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {opportunityAlerts.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Nenhuma oportunidade detectada no momento.</p>
                  ) : (
                    opportunityAlerts.map((alert) => (
                      <div key={alert.id} className="flex items-start space-x-3 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-green-800">{alert.title}</h4>
                          <p className="text-sm text-green-600">{alert.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary">{alert.value}</Badge>
                            {alert.client && (
                              <Badge variant="outline" className="text-xs">{alert.client}</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
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
                {opportunityAlerts.slice(0, 3).map((alert, index) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-sm font-bold text-green-600">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">Escalar {alert.campaign}</p>
                        <p className="text-sm text-gray-600">Aumentar orçamento em 15% - CPA abaixo da meta</p>
                      </div>
                    </div>
                    <Button size="sm">Executar</Button>
                  </div>
                ))}
                
                {dangerAlerts.slice(0, 2).map((alert, index) => (
                  <div key={alert.id} className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center text-sm font-bold text-red-600">
                        {index + opportunityAlerts.slice(0, 3).length + 1}
                      </div>
                      <div>
                        <p className="font-medium">Revisar {alert.client}</p>
                        <p className="text-sm text-gray-600">CPA acima da meta - necessário otimização</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Analisar</Button>
                  </div>
                ))}

                {(opportunityAlerts.length === 0 && dangerAlerts.length === 0) && (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600">Todas as contas estão performando bem! 🎯</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Seção 7 - Tendências */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Tendências (Últimos 30 dias)
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CPL Médio */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução do CPL Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="cpl" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Volume de Leads */}
            <Card>
              <CardHeader>
                <CardTitle>Volume de Leads</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="leads" stroke="#00C49F" fill="#00C49F" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Investimento Total */}
            <Card>
              <CardHeader>
                <CardTitle>Investimento Total</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Bar dataKey="investment" fill="#FFBB28" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default NewDashboard;