import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
  MoreHorizontal,
  Mail,
  Building,
  User,
  Users,
  Play,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { SyncStatusIndicator } from "@/components/clients/SyncStatusIndicator";
import { FundingAlert } from "@/components/alerts/FundingAlert";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ClientDetailsData } from "@/hooks/useClientDetails";

interface ClienteDashboardProps {
  client: ClientDetailsData;
  syncButton: React.ReactNode;
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeadsGenerated: number;
  totalInvested: number;
  totalSales: number;
  roi: number;
  syncPeriodDays: number;
  conversionsInPeriod: any[];
  funnelCompletenessScore: number;
  cplByCampaignData: any[];
  investmentDistributionData: any[];
}

export function ClienteDashboard({
  client,
  syncButton,
  totalCampaigns,
  activeCampaigns,
  totalLeadsGenerated,
  totalInvested,
  totalSales,
  roi,
  syncPeriodDays,
  conversionsInPeriod,
  funnelCompletenessScore,
  cplByCampaignData,
  investmentDistributionData,
}: ClienteDashboardProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    em_dia: { label: "Em Dia", color: "bg-green-100 text-green-800" },
    atencao: { label: "Atenção", color: "bg-yellow-100 text-yellow-800" },
    emergencial: { label: "Crítico", color: "bg-red-100 text-red-800" },
    sem_fundos: { label: "Sem Fundos", color: "bg-orange-100 text-orange-800" },
    inativo: { label: "Inativo", color: "bg-gray-100 text-gray-800" },
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link to="/clientes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="text-xl lg:text-2xl font-bold">Visão Geral do Cliente</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <SyncStatusIndicator 
            lastSyncAt={client.last_sync_at} 
            lastSyncPeriod={client.last_sync_period}
          />
          {syncButton}
        </div>
      </div>

      {/* Inactive Client Alert */}
      {client?.status === 'inativo' && client?.inactive_reason && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-destructive mb-1">Cliente Inativo</h3>
              <p className="text-destructive/80 text-sm whitespace-pre-wrap">
                {client.inactive_reason}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Overview Card */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col lg:flex-row items-start justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6 w-full lg:w-auto">
              <Avatar className="w-16 h-16 lg:w-20 lg:h-20 mx-auto sm:mx-0">
                <AvatarImage src={client.avatar} />
                <AvatarFallback className="text-lg">
                  {client.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <h2 className="text-xl lg:text-2xl font-bold text-card-foreground">{client.name}</h2>
                <p className="text-base lg:text-lg text-muted-foreground">{client.company}</p>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-2">
                  <Badge className={statusConfig[client.status]?.color}>
                    {statusConfig[client.status]?.label}
                  </Badge>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate max-w-[200px]">{client.email}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full lg:w-auto">
              <Button size="sm" className="flex-1 lg:flex-none">
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Alert */}
      {client.facebook_ad_accounts && client.facebook_ad_accounts.has_funding_issues && (
        <FundingAlert
          accountStatus={client.facebook_ad_accounts.account_status}
          balance={client.facebook_ad_accounts.balance}
          disableReason={client.facebook_ad_accounts.disable_reason}
          hasFundingIssues={client.facebook_ad_accounts.has_funding_issues}
          accountName={client.facebook_ad_accounts.account_name}
          className="mb-6"
        />
      )}

      {/* Performance Metrics - First Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Funnel Completeness Score Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completude do Funil</p>
                <p className="text-2xl font-bold text-card-foreground">{funnelCompletenessScore}%</p>
                <div className="flex items-center space-x-1 mt-1">
                  {funnelCompletenessScore >= 80 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">excelente</span>
                    </>
                  ) : funnelCompletenessScore >= 50 ? (
                    <>
                      <BarChart3 className="w-3 h-3 text-yellow-500" />
                      <span className="text-xs text-yellow-500">boa</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-500">precisa melhorar</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                funnelCompletenessScore >= 80 ? 'bg-green-100 dark:bg-green-900/30' :
                funnelCompletenessScore >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'
              }`}>
                <BarChart3 className={`w-6 h-6 ${
                  funnelCompletenessScore >= 80 ? 'text-green-600' :
                  funnelCompletenessScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Leads Gerados</p>
                <p className="text-2xl font-bold text-card-foreground">{totalLeadsGenerated}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Campanhas Ativas</p>
                <p className="text-2xl font-bold text-card-foreground">{activeCampaigns}</p>
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
      </div>

      {/* Financial Metrics - Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* CPL Médio Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">CPL Médio</p>
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

        {/* Valor Total Investido Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Valor Total Investido</p>
                <p className="text-2xl font-bold text-card-foreground">
                  R$ {totalInvested.toFixed(2)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-500">{syncPeriodDays} dias</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Realizadas Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total em Vendas Realizadas</p>
                <p className="text-2xl font-bold text-card-foreground">
                  R$ {totalSales.toFixed(2)}
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">{conversionsInPeriod.length} conversões</span>
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ROI</p>
                <p className={`text-2xl font-bold ${
                  roi >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  {roi >= 0 ? (
                    <>
                      <TrendingUp className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500">positivo</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-500">negativo</span>
                    </>
                  )}
                </div>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                roi >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <TrendingUp className={`w-6 h-6 ${
                  roi >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
        {/* CPL by Campaign Chart */}
        <Card>
          <CardHeader>
            <CardTitle>CPL por Campanha</CardTitle>
            <p className="text-sm text-muted-foreground">Custo por Lead de cada campanha ativa</p>
          </CardHeader>
          <CardContent className="p-4 pb-2">
            <div className="h-[28rem]">
              {cplByCampaignData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cplByCampaignData}
                    margin={{ top: 10, right: 20, left: 30, bottom: -10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover p-3 border border-border rounded-lg shadow-lg">
                              <p className="font-medium text-card-foreground">{data.fullName}</p>
                              <p className="text-blue-600 dark:text-blue-400">CPL: R$ {data.cpl.toFixed(2)}</p>
                              <p className="text-muted-foreground">Investido: R$ {data.spend.toFixed(2)}</p>
                              <p className="text-muted-foreground">Conversões: {data.conversions}</p>
                              <p className="text-muted-foreground">Status: {data.status === 'active' ? 'Ativa' : 'Pausada'}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="cpl" 
                      fill="#3B82F6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
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
            <p className="text-sm text-muted-foreground">Proporção do orçamento por campanha</p>
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
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <p>Nenhum dado disponível</p>
                    <p className="text-sm">Sincronize as campanhas para ver os dados</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
