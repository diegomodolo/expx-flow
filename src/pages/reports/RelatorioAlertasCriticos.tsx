import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";
import { AlertTriangle, TrendingDown, Clock, DollarSign, Target } from "lucide-react";

const RelatorioAlertasCriticos = () => {
  const { alerts } = useDashboardAlerts();
  const { clients } = useClients();
  const { campaigns } = useCampaigns();

  const criticalAlerts = alerts.filter(alert => alert.type === 'danger');
  const warningAlerts = alerts.filter(alert => alert.type === 'opportunity');
  const infoAlerts = alerts.filter(alert => alert.type === 'opportunity');

  const getCriticalClients = () => {
    return clients.filter(client => {
      const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
      const avgCPA = clientCampaigns.length > 0 
        ? clientCampaigns.reduce((acc, c) => acc + c.cpa, 0) / clientCampaigns.length 
        : 0;
      
      return avgCPA > 150 || client.avg_cpl > 100 || client.status === 'red';
    });
  };

  const getHighSpendLowConversion = () => {
    return campaigns.filter(campaign => 
      campaign.spend > 5000 && campaign.conversions < 10
    );
  };

  const getStagnantCampaigns = () => {
    return campaigns.filter(campaign => 
      campaign.ctr < 1.0 && campaign.spend > 1000
    );
  };

  const criticalClients = getCriticalClients();
  const highSpendLowConversion = getHighSpendLowConversion();
  const stagnantCampaigns = getStagnantCampaigns();

  const getSeverityIcon = (type: string) => {
    switch (type) {
      case 'danger': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'opportunity': return <Clock className="w-4 h-4 text-yellow-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getSeverityBadge = (type: string) => {
    const variants = {
      danger: 'bg-red-100 text-red-800 border-red-200',
      opportunity: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return variants[type as keyof typeof variants] || variants.danger;
  };

  const getRecommendedAction = (alertType: string) => {
    const actions = {
      'high_cpa': 'Revisar segmentação e otimizar criativos',
      'low_ctr': 'Testar novos criativos e ajustar público-alvo',
      'budget_overspend': 'Reduzir orçamento ou pausar campanhas',
      'low_conversion': 'Analisar landing page e otimizar funil',
      'funding_issue': 'Verificar método de pagamento',
      'campaign_stagnant': 'Renovar criativos e testar novos públicos'
    };
    
    return actions[alertType as keyof typeof actions] || 'Análise detalhada necessária';
  };

  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.name
  }));

  const primaryFilters: FilterConfig[] = [
    {
      id: 'tipo-alerta',
      label: 'Tipo de Alerta',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os tipos' },
        { value: 'danger', label: 'Crítico' },
        { value: 'opportunity', label: 'Oportunidade' },
        { value: 'warning', label: 'Atenção' }
      ],
      placeholder: 'Todos os tipos'
    },
    {
      id: 'severidade',
      label: 'Severidade',
      type: 'select',
      options: [
        { value: 'todas', label: 'Todas as severidades' },
        { value: 'alta', label: 'Alta' },
        { value: 'media', label: 'Média' },
        { value: 'baixa', label: 'Baixa' }
      ],
      placeholder: 'Todas as severidades'
    },
    {
      id: 'cliente',
      label: 'Cliente',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os clientes' },
        ...clientOptions
      ],
      placeholder: 'Todos os clientes'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'periodo',
      label: 'Período',
      type: 'select',
      options: [
        { value: '7d', label: 'Últimos 7 dias' },
        { value: '30d', label: 'Últimos 30 dias' },
        { value: '90d', label: 'Últimos 90 dias' }
      ],
      placeholder: 'Últimos 30 dias'
    }
  ];

  return (
    <ReportLayout
      title="Relatório de Alertas Críticos"
      description="Clientes em situação crítica com ações recomendadas"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      filterDescription="Configure os filtros para análise de alertas críticos"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Alertas Críticos"
          value={criticalAlerts.length}
          trend={criticalAlerts.length > 0 ? "down" : "up"}
        />
        <MetricCard
          title="Clientes em Risco"
          value={criticalClients.length}
          trend="down"
        />
        <MetricCard
          title="Campanhas Estagnadas"
          value={stagnantCampaigns.length}
          trend="down"
        />
        <MetricCard
          title="Alto Gasto/Baixa Conv."
          value={highSpendLowConversion.length}
          trend="down"
        />
      </div>

      {criticalAlerts.length > 0 && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Alertas Críticos - Ação Imediata Necessária
            </CardTitle>
            <CardDescription>Situações que requerem intervenção urgente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalAlerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <div>
                      <h4 className="font-semibold text-red-800">{alert.title}</h4>
                      <p className="text-sm text-red-600">{alert.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ação recomendada: {getRecommendedAction(alert.type)}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="destructive">
                    Resolver Agora
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Clientes em Situação Crítica</CardTitle>
            <CardDescription>Requerem atenção imediata</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalClients.slice(0, 5).map((client) => {
                const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
                const totalSpend = clientCampaigns.reduce((acc, c) => acc + c.spend, 0);
                const avgCPA = clientCampaigns.length > 0 
                  ? clientCampaigns.reduce((acc, c) => acc + c.cpa, 0) / clientCampaigns.length 
                  : 0;
                
                return (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg border-red-200">
                    <div>
                      <h4 className="font-medium">{client.name}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>CPA médio: R$ {avgCPA.toFixed(2)}</p>
                        <p>Gasto total: R$ {totalSpend.toLocaleString()}</p>
                        <p>Leads: {client.leads_generated}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-red-100 text-red-800 border-red-200 mb-2">
                        Crítico
                      </Badge>
                      <Button size="sm" variant="outline">
                        Analisar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campanhas com Alto Gasto e Baixa Conversão</CardTitle>
            <CardDescription>Necessitam otimização urgente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highSpendLowConversion.slice(0, 5).map((campaign) => (
                <div key={campaign.id} className="flex items-center justify-between p-3 border rounded-lg border-yellow-200">
                  <div>
                    <h4 className="font-medium">{campaign.name}</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Gasto: R$ {campaign.spend.toLocaleString()}</p>
                      <p>Conversões: {campaign.conversions}</p>
                      <p>CPA: R$ {campaign.cpa.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 mb-2">
                      Atenção
                    </Badge>
                    <Button size="sm" variant="outline">
                      Otimizar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Plano de Ação Prioritário</CardTitle>
          <CardDescription>Próximos passos para resolver situações críticas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium">Pausar campanhas com CPA maior que R$ 200</h4>
                  <p className="text-sm text-muted-foreground">
                    {campaigns.filter(c => c.cpa > 200).length} campanhas identificadas
                  </p>
                </div>
              </div>
              <Button size="sm">Executar</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600 font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium">Revisar orçamentos de clientes críticos</h4>
                  <p className="text-sm text-muted-foreground">
                    {criticalClients.length} clientes necessitam revisão
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline">Agendar</Button>
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium">Testar novos criativos para campanhas estagnadas</h4>
                  <p className="text-sm text-muted-foreground">
                    {stagnantCampaigns.length} campanhas com CTR baixo
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline">Planejar</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Todos os Alertas</CardTitle>
          <CardDescription>Histórico completo de alertas do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getSeverityIcon(alert.type)}
                  <div>
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getSeverityBadge(alert.type)}>
                    {alert.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ReportLayout>
  );
};

export default RelatorioAlertasCriticos;