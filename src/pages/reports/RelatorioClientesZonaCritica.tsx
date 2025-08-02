import { useState, useEffect } from "react";
import { ReportLayout } from "@/components/reports/ReportLayout";
import { MetricCard } from "@/components/reports/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Target, Users } from "lucide-react";
import { useClients } from "@/hooks/useClients";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useTaskAutomation } from "@/hooks/useTaskAutomation";

interface CriticalClient {
  id: string;
  name: string;
  status: 'critical' | 'warning';
  issues: string[];
  cpl_current: number;
  cpl_target: number;
  cpa_current: number;
  cpa_target: number;
  ctr: number;
  frequency: number;
  problematic_campaigns: string[];
  ai_recommendations: string[];
}

export default function RelatorioClientesZonaCritica() {
  const { clients, loading: clientsLoading } = useClients();
  const { campaigns, loading: campaignsLoading } = useCampaigns();
  const { convertAlertToTask } = useTaskAutomation();
  const [criticalClients, setCriticalClients] = useState<CriticalClient[]>([]);

  useEffect(() => {
    if (!clientsLoading && !campaignsLoading && clients && campaigns) {
      analyzeCriticalClients();
    }
  }, [clients, campaigns, clientsLoading, campaignsLoading]);

  const analyzeCriticalClients = () => {
    const critical: CriticalClient[] = [];

    clients?.forEach(client => {
      const clientCampaigns = campaigns?.filter(c => c.client_id === client.id) || [];
      const issues: string[] = [];
      const problematicCampaigns: string[] = [];
      
      // Calcular métricas agregadas do cliente
      const totalSpend = clientCampaigns.reduce((sum, c) => sum + (c.spend || 0), 0);
      const totalConversions = clientCampaigns.reduce((sum, c) => sum + (c.conversions || 0), 0);
      const totalClicks = clientCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
      const totalImpressions = clientCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
      
      const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
      const avgCPL = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgFrequency = totalClicks > 0 ? totalImpressions / totalClicks : 0;

      // Definir targets (valores exemplo - podem ser configuráveis)
      const cplTarget = 50; // R$ 50 por lead
      const cpaTarget = 150; // R$ 150 por conversão
      const ctrTarget = 1; // 1% CTR mínimo
      const frequencyMax = 5; // Frequência máxima 5

      // Verificar problemas
      if (avgCPL > cplTarget) {
        issues.push(`CPL acima da meta (R$ ${avgCPL.toFixed(2)} vs R$ ${cplTarget})`);
      }
      
      if (avgCPA > cpaTarget) {
        issues.push(`CPA acima da meta (R$ ${avgCPA.toFixed(2)} vs R$ ${cpaTarget})`);
      }
      
      if (avgCTR < ctrTarget) {
        issues.push(`CTR abaixo do mínimo (${avgCTR.toFixed(2)}% vs ${ctrTarget}%)`);
      }
      
      if (avgFrequency > frequencyMax) {
        issues.push(`Frequência muito alta (${avgFrequency.toFixed(1)} vs ${frequencyMax})`);
      }

      // Identificar campanhas problemáticas
      clientCampaigns.forEach(campaign => {
        const campaignCPA = campaign.conversions > 0 ? campaign.spend / campaign.conversions : 0;
        const campaignCTR = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
        
        if (campaignCPA > cpaTarget || campaignCTR < ctrTarget) {
          problematicCampaigns.push(campaign.name);
        }
      });

      if (issues.length > 0) {
        const status = issues.length >= 3 ? 'critical' : 'warning';
        
        critical.push({
          id: client.id,
          name: client.name,
          status,
          issues,
          cpl_current: avgCPL,
          cpl_target: cplTarget,
          cpa_current: avgCPA,
          cpa_target: cpaTarget,
          ctr: avgCTR,
          frequency: avgFrequency,
          problematic_campaigns: problematicCampaigns,
          ai_recommendations: generateRecommendations(issues, avgCPA, avgCTR, avgFrequency)
        });
      }
    });

    setCriticalClients(critical.sort((a, b) => {
      if (a.status === 'critical' && b.status !== 'critical') return -1;
      if (b.status === 'critical' && a.status !== 'critical') return 1;
      return b.issues.length - a.issues.length;
    }));
  };

  const generateRecommendations = (issues: string[], cpa: number, ctr: number, frequency: number): string[] => {
    const recommendations: string[] = [];

    if (issues.some(i => i.includes('CPA'))) {
      recommendations.push('Revisar segmentação de audiência para reduzir CPA');
      recommendations.push('Testar novos criativos com maior apelo');
    }

    if (issues.some(i => i.includes('CTR'))) {
      recommendations.push('Atualizar criativos para melhorar engajamento');
      recommendations.push('Refinar targeting para audiência mais qualificada');
    }

    if (issues.some(i => i.includes('Frequência'))) {
      recommendations.push('Expandir audiência para reduzir frequência');
      recommendations.push('Implementar rotação de criativos');
    }

    if (issues.some(i => i.includes('CPL'))) {
      recommendations.push('Otimizar landing pages para melhor conversão');
      recommendations.push('Revisar estratégia de lances');
    }

    return recommendations;
  };

  const handleCreateTask = (client: CriticalClient) => {
    const alertData = {
      type: client.status === 'critical' ? 'danger' : 'warning',
      description: `Cliente em zona ${client.status}: ${client.issues.join(', ')}`,
      client_id: client.id,
      id: `critical_client_${client.id}`
    };

    convertAlertToTask(alertData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'warning': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    return status === 'critical' ? AlertTriangle : TrendingDown;
  };

  if (clientsLoading || campaignsLoading) {
    return (
      <ReportLayout
        title="Relatório de Clientes em Zona Crítica"
        description="Identificação de clientes com campanhas problemáticas"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </div>
      </ReportLayout>
    );
  }

  const criticalCount = criticalClients.filter(c => c.status === 'critical').length;
  const warningCount = criticalClients.filter(c => c.status === 'warning').length;
  const totalIssues = criticalClients.reduce((sum, c) => sum + c.issues.length, 0);

  return (
    <ReportLayout
      title="Relatório de Clientes em Zona Crítica"
      description="Identificação de clientes com campanhas problemáticas"
    >
      <div className="space-y-6">
        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            title="Clientes Críticos"
            value={criticalCount}
            trend={criticalCount > 0 ? "down" : "neutral"}
            subtitle="Status vermelho"
          />
          <MetricCard
            title="Clientes em Alerta"
            value={warningCount}
            trend={warningCount > 0 ? "down" : "neutral"}
            subtitle="Status amarelo"
          />
          <MetricCard
            title="Total de Problemas"
            value={totalIssues}
            subtitle="Identificados"
          />
          <MetricCard
            title="Taxa de Criticidade"
            value={`${((criticalCount + warningCount) / (clients?.length || 1) * 100).toFixed(1)}%`}
            trend={(criticalCount + warningCount) > 0 ? "down" : "up"}
            subtitle="Do total de clientes"
          />
        </div>

        {/* Lista de Clientes Críticos */}
        <div className="grid gap-4">
          {criticalClients.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhum cliente em zona crítica</h3>
                <p className="text-muted-foreground">
                  Todos os clientes estão com performance dentro dos parâmetros esperados.
                </p>
              </CardContent>
            </Card>
          ) : (
            criticalClients.map((client) => {
              const StatusIcon = getStatusIcon(client.status);
              
              return (
                <Card key={client.id} className="border-l-4 border-l-destructive">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className="w-5 h-5 text-destructive" />
                        <div>
                          <CardTitle className="text-lg">{client.name}</CardTitle>
                          <Badge className={getStatusColor(client.status)}>
                            {client.status === 'critical' ? 'CRÍTICO' : 'ALERTA'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTask(client)}
                      >
                        <Target className="w-4 h-4 mr-2" />
                        Criar Tarefa
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Problemas Identificados */}
                    <div>
                      <h4 className="font-semibold mb-2 text-destructive">Problemas Identificados:</h4>
                      <ul className="space-y-1">
                        {client.issues.map((issue, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-destructive" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Campanhas Problemáticas */}
                    {client.problematic_campaigns.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-2">Campanhas Responsáveis:</h4>
                        <div className="flex flex-wrap gap-2">
                          {client.problematic_campaigns.map((campaign, index) => (
                            <Badge key={index} variant="secondary">
                              {campaign}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendações da IA */}
                    <div>
                      <h4 className="font-semibold mb-2 text-primary">Recomendações da IA:</h4>
                      <ul className="space-y-1">
                        {client.ai_recommendations.map((recommendation, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            {recommendation}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Métricas Detalhadas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          R$ {client.cpa_current.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CPA (Meta: R$ {client.cpa_target})
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          R$ {client.cpl_current.toFixed(0)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CPL (Meta: R$ {client.cpl_target})
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          {client.ctr.toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          CTR (Min: 1%)
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-destructive">
                          {client.frequency.toFixed(1)}x
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Frequência (Max: 5x)
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </ReportLayout>
  );
}