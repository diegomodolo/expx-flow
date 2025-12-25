import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
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
import { AccountBalanceCard } from "@/components/clients/AccountBalanceCard";
import { ClientSocialAccounts } from "@/components/clients/ClientSocialAccounts";
import { ClientDialog } from "@/components/clients/ClientDialog";
import { useClients, Client } from "@/hooks/useClients";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ClientDetailsData } from "@/hooks/useClientDetails";

interface PlatformMetrics {
  spend: number;
  conversions: number;
  campaigns: number;
}

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
  metaMetrics?: PlatformMetrics;
  googleMetrics?: PlatformMetrics;
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
  metaMetrics,
  googleMetrics,
}: ClienteDashboardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { clients, updateClient } = useClients();
  
  // Find the current client from the clients list for the dialog
  const currentClient = clients.find(c => c.id === client.id);

  const handleEditClient = async (clientData: Omit<Client, "id" | "active_campaigns" | "avg_cpl" | "leads_generated">) => {
    await updateClient(client.id, clientData);
    setEditDialogOpen(false);
    // Dispatch event to refresh client details across the page
    window.dispatchEvent(new CustomEvent('refreshClientDetails'));
  };

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
              <Button size="sm" className="flex-1 lg:flex-none" onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
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

      {/* Account Balance & Social Accounts - Compact Row */}
      {(client.facebook_ad_accounts || client.facebook_page || client.instagram_account) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Account Balance - Compact */}
          {client.facebook_ad_accounts && (
            <Card className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    client.payment_type === 'postpaid' ? 'bg-blue-100' :
                    client.facebook_ad_accounts.balance <= 0 ? 'bg-red-100' :
                    client.facebook_ad_accounts.balance < 100 ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <DollarSign className={`w-4 h-4 ${
                      client.payment_type === 'postpaid' ? 'text-blue-600' :
                      client.facebook_ad_accounts.balance <= 0 ? 'text-red-600' :
                      client.facebook_ad_accounts.balance < 100 ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Saldo Meta</p>
                    <p className="font-semibold">
                      {client.payment_type === 'postpaid' 
                        ? 'Pós-pago' 
                        : `R$ ${client.facebook_ad_accounts.balance.toFixed(2)}`}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Instagram - Compact */}
          {client.instagram_account && (
            <Card className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-[2px] flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                      {client.instagram_account.profile_picture_url ? (
                        <img 
                          src={client.instagram_account.profile_picture_url} 
                          alt="" 
                          className="w-6 h-6 rounded-full"
                        />
                      ) : (
                        <Users className="w-3 h-3 text-pink-500" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Instagram</p>
                    <p className="font-semibold truncate text-sm">@{client.instagram_account.username}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-pink-600">
                    {client.instagram_account.followers_count >= 1000 
                      ? `${(client.instagram_account.followers_count / 1000).toFixed(1)}k`
                      : client.instagram_account.followers_count}
                  </p>
                  <p className="text-xs text-muted-foreground">seguidores</p>
                </div>
              </div>
            </Card>
          )}

          {/* Facebook - Compact */}
          {client.facebook_page && (
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Building className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Facebook</p>
                  <p className="font-semibold truncate text-sm">{client.facebook_page.page_name}</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Performance Metrics - First Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Valor Total Investido Card - DESTAQUE */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Investido</p>
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

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Conversões</p>
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

        {/* CPL Médio Card - DESTAQUE */}
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
      </div>

      {/* Financial Metrics - Second Row - Total + Platform Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Completude do Funil Card - menor */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Completude Funil</p>
                <p className={`text-xl font-bold ${
                  funnelCompletenessScore >= 80 ? 'text-green-600' :
                  funnelCompletenessScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {funnelCompletenessScore}%
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                funnelCompletenessScore >= 80 ? 'bg-green-100' :
                funnelCompletenessScore >= 50 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <BarChart3 className={`w-5 h-5 ${
                  funnelCompletenessScore >= 80 ? 'text-green-600' :
                  funnelCompletenessScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campanhas Ativas Card - menor */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Campanhas Ativas</p>
                <p className="text-xl font-bold text-card-foreground">{activeCampaigns}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta Ads Card */}
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Meta Ads
              </p>
              <p className="text-xl font-bold text-blue-600">
                R$ {(metaMetrics?.spend || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {metaMetrics?.conversions || 0} conversões
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Google Ads Card */}
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Google Ads
              </p>
              <p className="text-xl font-bold text-red-600">
                R$ {(googleMetrics?.spend || 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {googleMetrics?.conversions || 0} conversões
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Total de Vendas Realizadas Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Vendas</p>
                <p className="text-xl font-bold text-card-foreground">
                  R$ {totalSales.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">{conversionsInPeriod.length} conv.</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ROI Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">ROI</p>
                <p className={`text-xl font-bold ${
                  roi >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                </p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                roi >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <TrendingUp className={`w-5 h-5 ${
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

      {/* Edit Client Dialog */}
      <ClientDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleEditClient}
        client={currentClient}
        title="Editar Cliente"
      />
    </div>
  );
}
