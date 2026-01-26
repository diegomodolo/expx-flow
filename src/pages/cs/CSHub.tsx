import React from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  AlertTriangle, 
  Users, 
  Trophy, 
  TrendingUp,
  Phone,
  MessageSquare,
  Star,
  Activity,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { useCSHealthScore360 } from '@/hooks/useCSHealthScore360';
import { CSRiskRadar } from '@/components/cs/CSRiskRadar';
import { CSHealthScore360Card } from '@/components/cs/CSHealthScore360Card';
import { useNavigate } from 'react-router-dom';

export default function CSHub() {
  const { healthData, stats, isLoading } = useCSHealthScore360();
  const navigate = useNavigate();

  const riskClients = healthData.filter(c => c.churnRiskLevel === 'critical' || c.churnRiskLevel === 'high');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Heart className="h-8 w-8 text-red-500" />
              Customer Success
            </h1>
            <p className="text-muted-foreground">
              Retenção, expansão e prova de valor constante
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">Saúde Média</p>
                  <p className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.averageScore}%</p>
                </div>
                <Activity className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">Em Risco</p>
                  <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.critical + stats.high}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">NPS Médio</p>
                  <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.averageNps || '-'}</p>
                </div>
                <Star className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Clientes</p>
                  <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{healthData.length}</p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="radar" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="radar" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Radar de Risco
            </TabsTrigger>
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Saúde 360
            </TabsTrigger>
            <TabsTrigger value="actions" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Ações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="radar" className="space-y-4">
            <CSRiskRadar clients={riskClients} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="health" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="pt-6 h-48 bg-muted/50" />
                  </Card>
                ))
              ) : healthData.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="pt-6 text-center py-12">
                    <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhum cliente configurado</h3>
                    <p className="text-muted-foreground mb-4">
                      Configure o Health Score 360 para seus clientes para começar a monitorar a saúde
                    </p>
                  </CardContent>
                </Card>
              ) : (
                healthData.map((client) => (
                  <CSHealthScore360Card key={client.id} data={client} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contatos Pendentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {healthData
                      .filter(c => {
                        if (!c.lastCsContactAt) return true;
                        const days = Math.floor((Date.now() - new Date(c.lastCsContactAt).getTime()) / (1000 * 60 * 60 * 24));
                        return days > 7;
                      })
                      .slice(0, 5)
                      .map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{client.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.lastCsContactAt 
                                ? `Último contato: ${Math.floor((Date.now() - new Date(client.lastCsContactAt).getTime()) / (1000 * 60 * 60 * 24))} dias atrás`
                                : 'Nunca contactado'
                              }
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3 mr-1" />
                            Ligar
                          </Button>
                        </div>
                      ))}
                    {healthData.filter(c => !c.lastCsContactAt || Math.floor((Date.now() - new Date(c.lastCsContactAt).getTime()) / (1000 * 60 * 60 * 24)) > 7).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Todos os clientes foram contactados recentemente! 🎉
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Oportunidades de Upsell
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {healthData
                      .filter(c => c.churnRiskLevel === 'low' && c.healthScoreTotal >= 80)
                      .slice(0, 5)
                      .map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <div>
                            <p className="font-medium">{client.clientName}</p>
                            <p className="text-xs text-muted-foreground">
                              Score: {client.healthScoreTotal}% | {client.activeCampaigns} campanhas
                            </p>
                          </div>
                          <Button size="sm" variant="outline">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            Expandir
                          </Button>
                        </div>
                      ))}
                    {healthData.filter(c => c.churnRiskLevel === 'low' && c.healthScoreTotal >= 80).length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        Nenhuma oportunidade identificada no momento
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
