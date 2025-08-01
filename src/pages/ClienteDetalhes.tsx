import React, { useState } from "react";
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
  Loader2
} from "lucide-react";
import { useClientDetails } from "@/hooks/useClientDetails";
import { useFacebookCampaignSync } from "@/hooks/useFacebookCampaignSync";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const ClienteDetalhes = () => {
  const { id } = useParams<{ id: string }>();
  const { client, loading, error, refetch } = useClientDetails(id || "");
  const { syncCampaigns, syncing: syncLoading } = useFacebookCampaignSync();
  const [activeTab, setActiveTab] = useState("campaigns");

  const handleSync = async () => {
    if (!id) return;
    
    try {
      await syncCampaigns(id);
      // Aguarda um pouco e recarrega os dados
      setTimeout(() => {
        refetch();
      }, 1000);
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
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

  // Mock data for chart - in real implementation, this would come from API
  const chartData = [
    { date: '01/11', cpl: 45.20 },
    { date: '05/11', cpl: 38.90 },
    { date: '10/11', cpl: 42.10 },
    { date: '15/11', cpl: 35.50 },
    { date: '20/11', cpl: 32.80 },
    { date: '25/11', cpl: 29.40 },
    { date: '30/11', cpl: client.avg_cpl },
  ];

  // Calculate real metrics from campaign data
  const totalCampaigns = client.campaigns?.length || 0;
  const activeCampaigns = client.campaigns?.filter(c => c.status === 'active' && c.is_active === true).length || 0;
  const pausedCampaigns = client.campaigns?.filter(c => c.status === 'paused' || c.is_active === false).length || 0;
  const finishedCampaigns = client.campaigns?.filter(c => c.status === 'finished').length || 0;

  const statusConfig = {
    green: { label: "Excelente", color: "bg-green-100 text-green-800" },
    yellow: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
    red: { label: "Emergencial", color: "bg-red-100 text-red-800" }
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
            onClick={handleSync}
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
                  <p className="text-sm font-medium text-gray-600">Total de Campanhas</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCampaigns}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-xs text-green-500">vs mês anterior</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Megaphone className="w-6 h-6 text-blue-600" />
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
                  <p className="text-sm font-medium text-gray-600">Campanhas Pausadas</p>
                  <p className="text-2xl font-bold text-gray-900">{pausedCampaigns}</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <TrendingDown className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-500">esta semana</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Pause className="w-6 h-6 text-yellow-600" />
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

        {/* CPL Performance Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Performance de CPL ao Longo do Tempo</CardTitle>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">7 dias</Button>
                <Button size="sm">30 dias</Button>
                <Button variant="outline" size="sm">90 dias</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value) => [`R$ ${value}`, 'CPL']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cpl" 
                    stroke="#2563EB" 
                    fill="#2563EB" 
                    fillOpacity={0.1}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
                  <Button variant="outline" size="sm">
                    Ativas ({activeCampaigns})
                  </Button>
                  <Button variant="outline" size="sm">
                    Pausadas ({pausedCampaigns})
                  </Button>
                  <Button variant="outline" size="sm">
                    Finalizadas ({finishedCampaigns})
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plataformas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CPC</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conversões</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {client.campaigns.map((campaign) => (
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
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          R$ {campaign.cpc.toFixed(2)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {campaign.conversions}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
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
      </div>
    </DashboardLayout>
  );
};

export default ClienteDetalhes;