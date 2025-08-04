import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportLayout, FilterConfig } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";
import { AlertTriangle, TrendingDown, Clock, DollarSign, Target, Eye, Users } from "lucide-react";

interface CriticalAlert {
  id: string;
  title: string;
  description: string;
  type: 'critical' | 'warning' | 'info';
  severity: 'alta' | 'media' | 'baixa';
  client_id?: string;
  client_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  impact: string;
  recommended_action: string;
  created_at: string;
  metrics?: {
    current_value: number;
    target_value: number;
    unit: string;
  };
}

const RelatorioAlertasCriticos = () => {
  const { alerts } = useDashboardAlerts();
  const { clients } = useClients();
  const { campaigns } = useCampaigns();
  const { convertAlertToTask } = useTaskAutomation();
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);
  const [filteredData, setFilteredData] = useState<CriticalAlert[]>([]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    if (clients && campaigns) {
      generateCriticalAlerts();
    }
  }, [clients, campaigns, alerts]);

  useEffect(() => {
    setFilteredData(criticalAlerts);
  }, [criticalAlerts]);

  const handleFilterChange = (filterId: string, value: string) => {
    const newFilters = { ...activeFilters, [filterId]: value };
    setActiveFilters(newFilters);
    
    let filtered = [...criticalAlerts];

    // Filtro por tipo de alerta
    if (newFilters['tipo-alerta'] && newFilters['tipo-alerta'] !== 'todos') {
      filtered = filtered.filter(alert => alert.type === newFilters['tipo-alerta']);
    }

    // Filtro por severidade
    if (newFilters.severidade && newFilters.severidade !== 'todas') {
      filtered = filtered.filter(alert => alert.severity === newFilters.severidade);
    }

    // Filtro por cliente
    if (newFilters.cliente && newFilters.cliente !== 'todos') {
      filtered = filtered.filter(alert => alert.client_id === newFilters.cliente);
    }

    // Filtro por impacto
    if (newFilters.impacto && newFilters.impacto !== 'todos') {
      const impactType = newFilters.impacto;
      filtered = filtered.filter(alert => {
        switch (impactType) {
          case 'financeiro':
            return alert.impact.includes('orçamento') || alert.impact.includes('custo');
          case 'performance':
            return alert.impact.includes('CTR') || alert.impact.includes('conversão');
          case 'estrategico':
            return alert.impact.includes('campanha') || alert.impact.includes('cliente');
          default:
            return true;
        }
      });
    }

    setFilteredData(filtered);
  };

  const generateCriticalAlerts = () => {
    const generated: CriticalAlert[] = [];

    // 1. Clientes sem campanhas ativas
    clients?.forEach(client => {
      const activeCampaigns = campaigns?.filter(c => 
        c.client_id === client.id && c.status === 'active' && c.is_active
      ) || [];

      if (activeCampaigns.length === 0) {
        generated.push({
          id: `no_campaigns_${client.id}`,
          title: `Cliente sem campanhas ativas`,
          description: `${client.name} não possui campanhas ativas rodando`,
          type: 'critical',
          severity: 'alta',
          client_id: client.id,
          client_name: client.name,
          impact: 'Perda de faturamento e desconexão com cliente',
          recommended_action: 'Ativar campanhas imediatamente ou agendar reunião',
          created_at: new Date().toISOString()
        });
      }
    });

    // 2. Campanhas com CPA crítico
    campaigns?.forEach(campaign => {
      const client = clients?.find(c => c.id === campaign.client_id);
      if (campaign.cpa > 200 && campaign.conversions > 0) {
        generated.push({
          id: `high_cpa_${campaign.id}`,
          title: `CPA crítico detectado`,
          description: `${campaign.name} com CPA de R$ ${campaign.cpa.toFixed(0)}`,
          type: 'critical',
          severity: 'alta',
          client_id: campaign.client_id,
          client_name: client?.name || 'Cliente não identificado',
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          impact: 'Alto desperdício de orçamento',
          recommended_action: 'Revisar segmentação e otimizar criativos',
          created_at: new Date().toISOString(),
          metrics: {
            current_value: campaign.cpa,
            target_value: 150,
            unit: 'R$'
          }
        });
      }
    });

    // 3. Campanhas com CTR muito baixo
    campaigns?.forEach(campaign => {
      const client = clients?.find(c => c.id === campaign.client_id);
      if (campaign.ctr < 0.5 && campaign.spend > 1000) {
        generated.push({
          id: `low_ctr_${campaign.id}`,
          title: `CTR extremamente baixo`,
          description: `${campaign.name} com CTR de ${campaign.ctr.toFixed(2)}%`,
          type: 'warning',
          severity: 'media',
          client_id: campaign.client_id,
          client_name: client?.name || 'Cliente não identificado',
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          impact: 'Baixo engajamento e desperdício de impressões',
          recommended_action: 'Testar novos criativos e refinar audiência',
          created_at: new Date().toISOString(),
          metrics: {
            current_value: campaign.ctr,
            target_value: 1.0,
            unit: '%'
          }
        });
      }
    });

    // 4. Campanhas sem conversões há muito tempo
    campaigns?.forEach(campaign => {
      const client = clients?.find(c => c.id === campaign.client_id);
      if (campaign.conversions === 0 && campaign.spend > 500) {
        generated.push({
          id: `no_conversions_${campaign.id}`,
          title: `Campanha sem conversões`,
          description: `${campaign.name} gastou R$ ${campaign.spend.toFixed(0)} sem conversões`,
          type: 'critical',
          severity: 'alta',
          client_id: campaign.client_id,
          client_name: client?.name || 'Cliente não identificado',
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          impact: 'Desperdício total de orçamento',
          recommended_action: 'Pausar campanha e revisar estratégia completamente',
          created_at: new Date().toISOString()
        });
      }
    });

    // Ordenar por severidade e tipo
    setCriticalAlerts(generated.sort((a, b) => {
      if (a.type === 'critical' && b.type !== 'critical') return -1;
      if (b.type === 'critical' && a.type !== 'critical') return 1;
      if (a.severity === 'alta' && b.severity !== 'alta') return -1;
      if (b.severity === 'alta' && a.severity !== 'alta') return 1;
      return 0;
    }));
  };

  const handleCreateTask = (alert: CriticalAlert) => {
    const alertData = {
      type: alert.type === 'critical' ? 'danger' : 'warning',
      description: `${alert.title}: ${alert.description} - ${alert.recommended_action}`,
      campaign_id: alert.campaign_id,
      client_id: alert.client_id,
      id: alert.id
    };

    convertAlertToTask(alertData);
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'alta': return 'bg-destructive text-destructive-foreground';
      case 'media': return 'bg-warning text-warning-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical': return AlertTriangle;
      case 'warning': return TrendingDown;
      default: return Clock;
    }
  };

  // Usar dados filtrados para métricas quando há filtros ativos
  const dataToUse = Object.keys(activeFilters).length > 0 ? filteredData : criticalAlerts;
  
  const criticalCount = dataToUse.filter(alert => alert.type === 'critical').length;
  const warningCount = dataToUse.filter(alert => alert.type === 'warning').length;
  const highSeverityCount = dataToUse.filter(alert => alert.severity === 'alta').length;
  const uniqueClientsAffected = new Set(dataToUse.map(alert => alert.client_id)).size;

  // Preparar dados únicos para filtros
  const uniqueClients = Array.from(new Set(criticalAlerts
    .filter(alert => alert.client_name)
    .map(alert => ({ id: alert.client_id!, name: alert.client_name! }))))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(client => ({ value: client.id, label: client.name }));

  const primaryFilters: FilterConfig[] = [
    {
      id: 'tipo-alerta',
      label: 'Tipo de Alerta',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os tipos' },
        { value: 'critical', label: 'Crítico' },
        { value: 'warning', label: 'Alerta' },
        { value: 'info', label: 'Informativo' }
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
        ...uniqueClients
      ],
      placeholder: 'Todos os clientes'
    }
  ];

  const secondaryFilters: FilterConfig[] = [
    {
      id: 'impacto',
      label: 'Tipo de Impacto',
      type: 'select',
      options: [
        { value: 'todos', label: 'Todos os impactos' },
        { value: 'financeiro', label: 'Financeiro' },
        { value: 'performance', label: 'Performance' },
        { value: 'estrategico', label: 'Estratégico' }
      ],
      placeholder: 'Todos os impactos'
    }
  ];

  return (
    <ReportLayout
      title="Relatório de Alertas Críticos"
      description="Situações críticas que requerem ação imediata"
      primaryFilters={primaryFilters}
      secondaryFilters={secondaryFilters}
      onFilterChange={handleFilterChange}
      filterDescription="Configure os parâmetros para análise de alertas críticos"
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Alertas Críticos"
            value={criticalCount}
            trend={criticalCount > 0 ? "down" : "neutral"}
            subtitle="Requerem ação imediata"
          />
          <MetricCard
            title="Alertas de Atenção"
            value={warningCount}
            trend={warningCount > 0 ? "down" : "neutral"}
            subtitle="Monitoramento necessário"
          />
          <MetricCard
            title="Severidade Alta"
            value={highSeverityCount}
            trend={highSeverityCount > 0 ? "down" : "neutral"}
            subtitle="Máxima prioridade"
          />
          <MetricCard
            title="Clientes Afetados"
            value={uniqueClientsAffected}
            subtitle="Total de clientes"
          />
        </div>

        {/* Lista de Alertas */}
        <div className="grid gap-4">
          {filteredData.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum alerta encontrado</h3>
                <p className="text-muted-foreground">
                  {Object.keys(activeFilters).length > 0 
                    ? 'Nenhum alerta corresponde aos filtros selecionados.'
                    : 'Não há alertas críticos no momento.'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredData.map((alert) => {
              const AlertIcon = getAlertIcon(alert.type);
              
              return (
                <Card key={alert.id} className={`border-l-4 ${alert.type === 'critical' ? 'border-l-destructive' : 'border-l-warning'}`}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertIcon className={`w-5 h-5 ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`} />
                        <div>
                          <CardTitle className="text-lg">{alert.title}</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {alert.client_name} {alert.campaign_name && `• ${alert.campaign_name}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(alert.type)}>
                          {alert.type === 'critical' ? 'CRÍTICO' : 'ALERTA'}
                        </Badge>
                        <Badge className={getSeverityBadge(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateTask(alert)}
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Criar Tarefa
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Descrição do Problema */}
                    <div>
                      <h4 className={`font-semibold mb-2 ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`}>
                        Problema Identificado:
                      </h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                        {alert.description}
                      </p>
                    </div>

                    {/* Impacto */}
                    <div>
                      <h4 className="font-semibold mb-2">Impacto:</h4>
                      <p className="text-sm text-muted-foreground">
                        {alert.impact}
                      </p>
                    </div>

                    {/* Ação Recomendada */}
                    <div>
                      <h4 className="font-semibold mb-2 text-primary">Ação Recomendada:</h4>
                      <p className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg">
                        {alert.recommended_action}
                      </p>
                    </div>

                    {/* Métricas (se disponíveis) */}
                    {alert.metrics && (
                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`}>
                            {alert.metrics.current_value.toFixed(alert.metrics.unit === '%' ? 2 : 0)}{alert.metrics.unit}
                          </div>
                          <div className="text-xs text-muted-foreground">Valor Atual</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-success">
                            {alert.metrics.target_value.toFixed(alert.metrics.unit === '%' ? 2 : 0)}{alert.metrics.unit}
                          </div>
                          <div className="text-xs text-muted-foreground">Meta</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${alert.type === 'critical' ? 'text-destructive' : 'text-warning'}`}>
                            {((alert.metrics.current_value / alert.metrics.target_value - 1) * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">Desvio da Meta</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </ReportLayout>
  );
};

export default RelatorioAlertasCriticos;