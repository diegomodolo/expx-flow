import React, { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Edit, 
  MessageSquare, 
  MoreHorizontal,
  Phone,
  Mail,
  Building,
  User,
  MapPin,
  Globe,
  Plus,
  Eye,
  TrendingUp,
  TrendingDown,
  Megaphone,
  Play,
  Pause,
  DollarSign,
  Loader2,
  ChevronDown,
  Users
} from "lucide-react";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { SyncPeriodDialog } from "@/components/facebook/SyncPeriodDialog";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

const ClienteDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { client, loading, error, refetch } = useClientDetails(id || "");
  const { syncCampaigns, syncing: syncLoading } = useFacebookCampaignSync();
  const [activeTab, setActiveTab] = useState("campaigns");
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'active' | 'paused' | 'finished'>('all');
  const [sortField, setSortField] = useState<'name' | 'cpc' | 'cpa' | 'spend' | 'conversions' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);

  // Calculate campaign metrics (with safe access) - MOVED TO TOP
  const totalCampaigns = client?.campaigns?.length || 0;
  const activeCampaigns = client?.campaigns?.filter(c => c.status === 'active' || c.is_active === true).length || 0;
  const pausedCampaigns = client?.campaigns?.filter(c => c.status === 'paused' || c.is_active === false).length || 0;
  const finishedCampaigns = client?.campaigns?.filter(c => c.status === 'finished').length || 0;
  const totalLeadsGenerated = client?.leads_generated || 0;
  const totalInvested = client?.campaigns?.reduce((total, campaign) => total + (campaign.spend || 0), 0) || 0;

  // Data for CPL by Campaign chart (horizontal bar chart)
  const cplByCampaignData = React.useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) {
      return [];
    }

    return client.campaigns
      .filter(campaign => (campaign.spend || 0) > 0 && (campaign.conversions || 0) > 0)
      .map(campaign => ({
        name: campaign.name.length > 25 ? campaign.name.substring(0, 25) + '...' : campaign.name,
        fullName: campaign.name,
        cpl: campaign.conversions > 0 ? (campaign.spend / campaign.conversions) : 0,
        spend: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        status: campaign.status
      }))
      .sort((a, b) => a.cpl - b.cpl) // Sort by CPL ascending (cheapest first)
      .slice(0, 8); // Show top 8 campaigns
  }, [client?.campaigns]);

  // Data for Investment Distribution chart (pie chart)
  const investmentDistributionData = React.useMemo(() => {
    if (!client?.campaigns || client.campaigns.length === 0) {
      return [];
    }

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#0088fe', '#ff0088', '#8800ff'];
    
    return client.campaigns
      .filter(campaign => (campaign.spend || 0) > 0)
      .map((campaign, index) => ({
        name: campaign.name.length > 20 ? campaign.name.substring(0, 20) + '...' : campaign.name,
        fullName: campaign.name,
        value: campaign.spend || 0,
        conversions: campaign.conversions || 0,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value) // Sort by spend descending
      .slice(0, 6); // Show top 6 campaigns
  }, [client?.campaigns]);

  // Filter and sort campaigns
  const filteredAndSortedCampaigns = useMemo(() => {
    if (!client?.campaigns) return [];
    
    let campaigns = [...client.campaigns];
    
    // Filter campaigns
    if (campaignFilter === 'active') {
      campaigns = campaigns.filter(c => c.status === 'active');
    } else if (campaignFilter === 'paused') {
      campaigns = campaigns.filter(c => c.status === 'paused');
    } else if (campaignFilter === 'finished') {
      campaigns = campaigns.filter(c => c.status === 'finished');
    }

    // Sort campaigns
    if (sortField) {
      campaigns = campaigns.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortField) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'cpc':
            aValue = a.cpc;
            bValue = b.cpc;
            break;
          case 'cpa':
            aValue = a.cpa;
            bValue = b.cpa;
            break;
          case 'spend':
            aValue = a.spend;
            bValue = b.spend;
            break;
          case 'conversions':
            aValue = a.conversions;
            bValue = b.conversions;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return campaigns;
  }, [client?.campaigns, campaignFilter, sortField, sortDirection]);

  const handleSort = (field: 'name' | 'cpc' | 'cpa' | 'spend' | 'conversions') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSyncConfirm = async (period: string) => {
    if (!id) return;
    
    try {
      await syncCampaigns(id, period);
      setSyncDialogOpen(false);
      // Aguarda um pouco e recarrega os dados
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      setSyncDialogOpen(false);
    }
  };
  
  
  if (!id) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">ID do cliente não fornecido</h2>
            <Link to="/clientes">
              <Button variant="outline">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>Carregando detalhes do cliente...</p>
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
            <h2 className="text-xl font-semibold mb-2 text-red-600">Erro</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Link to="/clientes">
              <Button variant="outline">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!client) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Cliente não encontrado</h2>
            <Link to="/clientes">
              <Button variant="outline">Voltar para Clientes</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }


  console.log('Campaign metrics calculation:', {
    totalCampaigns,
    activeCampaigns,
    pausedCampaigns,
    finishedCampaigns,
    campaigns: client?.campaigns || []
  });

  const statusConfig = {
    green: { label: "Excelente", color: "bg-green-100 text-green-800" },
    yellow: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
    red: { label: "Crítico", color: "bg-red-100 text-red-800" },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link to="/clientes">
              <Button variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Detalhes do Cliente</h1>
          </div>
          <Button 
            onClick={() => setSyncDialogOpen(true)}
            disabled={syncLoading}
            className="flex items-center space-x-2"
          >
            {syncLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TrendingUp className="w-4 h-4" />
            )}
            <span>{syncLoading ? 'Sincronizando...' : 'Sincronizar Dados'}</span>
          </Button>
        </div>

        {/* Client Overview Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-6">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={client.avatar} />
                  <AvatarFallback className="text-lg">
                    {client.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{client.name}</h2>
                  <p className="text-lg text-gray-600">{client.company}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <Badge className={statusConfig[client.status]?.color}>
                      {statusConfig[client.status]?.label}
                    </Badge>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span>{client.email}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button variant="outline">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Mensagem
                </Button>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Leads Gerados</p>
                  <p className="text-2xl font-bold text-gray-900">{totalLeadsGenerated}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">este período</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Campanhas Ativas</p>
                  <p className="text-2xl font-bold text-gray-900">{activeCampaigns}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">esta semana</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Total Investido</p>
                  <p className="text-2xl font-bold text-gray-900">
                    R$ {totalInvested.toFixed(2)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-blue-500" />
                    <span className="text-xs text-blue-500">este período</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">CPL Médio</p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {client.avg_cpl.toFixed(2)}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingDown className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">vs mês anterior</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPL by Campaign Chart */}
          <Card>
            <CardHeader>
              <CardTitle>CPL por Campanha</CardTitle>
              <p className="text-sm text-gray-600">Custo por Lead de cada campanha ativa</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {cplByCampaignData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={cplByCampaignData}
                      layout="horizontal"
                      margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        type="number" 
                        domain={[0, 'dataMax']}
                        tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={90}
                        fontSize={11}
                      />
                      <Tooltip 
                        formatter={(value, name) => [`R$ ${Number(value).toFixed(2)}`, 'CPL']}
                        labelFormatter={(label) => cplByCampaignData.find(d => d.name === label)?.fullName || label}
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{data.fullName}</p>
                                <p className="text-blue-600">CPL: R$ {data.cpl.toFixed(2)}</p>
                                <p className="text-gray-600">Investido: R$ {data.spend.toFixed(2)}</p>
                                <p className="text-gray-600">Conversões: {data.conversions}</p>
                                <p className="text-gray-600">Status: {data.status === 'active' ? 'Ativa' : 'Pausada'}</p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="cpl" 
                        fill="#3B82F6"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p>Nenhum dado disponível</p>
                      <p className="text-sm">Sincronize as campanhas para ver os dados</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Investment Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Investimento</CardTitle>
              <p className="text-sm text-gray-600">Proporção do orçamento por campanha</p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {investmentDistributionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={investmentDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {investmentDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`R$ ${Number(value).toFixed(2)}`, 'Investido']}
                        labelFormatter={(label) => investmentDistributionData.find(d => d.name === label)?.fullName || label}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percentage = ((data.value / totalInvested) * 100).toFixed(1);
                            return (
                              <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                                <p className="font-medium text-gray-900">{data.fullName}</p>
                                <p className="text-blue-600">Investido: R$ {data.value.toFixed(2)} ({percentage}%)</p>
                                <p className="text-gray-600">Conversões: {data.conversions}</p>
                                {data.conversions > 0 && (
                                  <p className="text-gray-600">CPL: R$ {(data.value / data.conversions).toFixed(2)}</p>
                                )}
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p>Nenhum dado disponível</p>
                      <p className="text-sm">Sincronize as campanhas para ver os dados</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Legend */}
              {investmentDistributionData.length > 0 && (
                <div className="mt-4 grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                  {investmentDistributionData.map((entry, index) => {
                    const percentage = ((entry.value / totalInvested) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="flex-1 text-gray-700 truncate" title={entry.fullName}>
                          {entry.name}
                        </span>
                        <span className="text-gray-600">
                          {percentage}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-gray-200">
              <TabsList className="px-6">
                <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
                <TabsTrigger value="contact">Contato & Dados</TabsTrigger>
                <TabsTrigger value="notes">Anotações</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="campaigns" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Campanhas do Cliente</h4>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant={campaignFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('all')}
                  >
                    Todas ({totalCampaigns})
                  </Button>
                  <Button 
                    variant={campaignFilter === 'active' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('active')}
                  >
                    Ativas ({activeCampaigns})
                  </Button>
                  <Button 
                    variant={campaignFilter === 'paused' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('paused')}
                  >
                    Pausadas ({pausedCampaigns})
                  </Button>
                  <Button 
                    variant={campaignFilter === 'finished' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setCampaignFilter('finished')}
                  >
                    Finalizadas ({finishedCampaigns})
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Campanha</span>
                            {sortField === 'name' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataformas</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CTR (%)</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('cpc')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>CPC</span>
                            {sortField === 'cpc' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPA</th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('conversions')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Conversões</span>
                            {sortField === 'conversions' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none"
                          onClick={() => handleSort('spend')}
                        >
                          <div className="flex items-center space-x-1">
                            <span>Custo Total</span>
                            {sortField === 'spend' && (
                              <ChevronDown className={`w-3 h-3 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedCampaigns.map((campaign) => (
                      <tr key={campaign.id}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge className={
                            campaign.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }>
                            {campaign.status === 'active' ? 'Ativa' : 'Pausada'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {campaign.platforms}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {campaign.ctr.toFixed(2)}%
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          R$ {campaign.cpc.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-purple-600">
                          R$ {campaign.cpa.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaign.conversions}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-orange-600">
                          R$ {campaign.spend.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Informações de Contato</h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Mail className="w-5 h-5 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Email Principal</p>
                        <p className="text-sm text-gray-600">{client.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Building className="w-5 h-5 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Empresa</p>
                        <p className="text-sm text-gray-600">{client.company}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <User className="w-5 h-5 mt-0.5 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Setor</p>
                        <p className="text-sm text-gray-600">{client.sector}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Informações do Produto</h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div>
                        <p className="text-sm font-medium">Produto</p>
                        <p className="text-sm text-gray-600">{client.product_name || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div>
                        <p className="text-sm font-medium">Tom de Voz</p>
                        <p className="text-sm text-gray-600">{client.voice_tone || 'Não informado'}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div>
                        <p className="text-sm font-medium">Orçamento Mensal</p>
                        <p className="text-sm text-gray-600">
                          {client.monthly_budget ? `R$ ${client.monthly_budget.toFixed(2)}` : 'Não informado'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notes" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold">Anotações</h4>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Anotação
                </Button>
              </div>
              <div className="space-y-4">
                {client.notes ? (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-900 mb-2">{client.notes}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Sistema</span>
                      <span>•</span>
                      <span>Criado com o cliente</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>Nenhuma anotação encontrada</p>
                    <p className="text-sm">Clique em "Nova Anotação" para adicionar</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="p-6">
              <h4 className="text-lg font-semibold mb-4">Histórico de Interações</h4>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="text-sm font-medium">Cliente criado</h5>
                      <span className="text-xs text-gray-500">
                        Criado no sistema
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Cliente {client.name} foi adicionado ao sistema.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Sync Period Dialog */}
        <SyncPeriodDialog
          open={syncDialogOpen}
          onOpenChange={setSyncDialogOpen}
          onConfirm={handleSyncConfirm}
          syncing={syncLoading}
          title="Sincronizar Campanhas do Cliente"
        />
      </div>
    </DashboardLayout>
  );
};

export default ClienteDetalhes;