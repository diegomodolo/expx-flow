import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw, TrendingUp, Timer, Zap, Search, FileText, Activity } from "lucide-react";
import { useAutomationExecutionLogs } from "@/hooks/useAutomationExecutionLogs";
import { useState, useEffect } from "react";
import { useClients } from "@/hooks/useClients";
import { ExecutionDetailsModal } from "./ExecutionDetailsModal";
import type { PeriodFilter } from "@/hooks/useAutomationExecutionLogs";

interface CronMasterMonitorProps {
  clientId?: string;
  showClientColumn?: boolean;
}

export const CronMasterMonitor = ({
  clientId,
  showClientColumn = false
}: CronMasterMonitorProps) => {
  const [period, setPeriod] = useState<PeriodFilter>('day');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'partial' | 'running'>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  const { logs, loading, latestExecution, isRunning, stats, refetch } = useAutomationExecutionLogs(
    clientId,
    50,
    period
  );
  const { clients } = useClients();

  useEffect(() => {
    refetch();
  }, [refetch]);

  const getClientName = (clientId: string | null) => {
    if (!clientId) return 'N/A';
    const client = clients?.find(c => c.id === clientId);
    return client?.name || `Cliente ${clientId.substring(0, 8)}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'partial':
        return 'secondary';
      case 'running':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Erro';
      case 'partial':
        return 'Parcial';
      case 'running':
        return 'Executando';
      default:
        return status;
    }
  };

  const getStatusMessage = (log: any) => {
    const actionsTaken = log.actions_taken || 0;
    const details = log.execution_details || {};
    
    if (log.status === 'completed') {
      if (actionsTaken > 0) {
        return `${actionsTaken} ${actionsTaken === 1 ? 'ação executada' : 'ações executadas'}`;
      }
      return 'Nenhuma ação necessária - campanhas dentro dos critérios';
    }
    
    if (log.status === 'partial') {
      const errors = details.totalErrors || 0;
      return `${actionsTaken} ${actionsTaken === 1 ? 'ação executada' : 'ações executadas'}, ${errors} ${errors === 1 ? 'erro' : 'erros'}`;
    }
    
    if (log.status === 'failed') {
      return log.error_message || 'Execução falhou completamente';
    }
    
    return 'Executando...';
  };

  const filteredLogs = logs.filter(log => {
    if (statusFilter !== 'all' && log.status !== statusFilter) {
      return false;
    }
    
    if (clientSearch.trim() && showClientColumn && log.client_id) {
      const clientName = getClientName(log.client_id).toLowerCase();
      const searchTerm = clientSearch.toLowerCase();
      if (!clientName.includes(searchTerm)) {
        return false;
      }
    }
    
    return true;
  });

  const statusCounts = {
    all: logs.length,
    completed: logs.filter(l => l.status === 'completed').length,
    failed: logs.filter(l => l.status === 'failed').length,
    partial: logs.filter(l => l.status === 'partial').length,
    running: logs.filter(l => l.status === 'running').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center p-8 gap-3">
          <Clock className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg">Carregando logs de execução...</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Monitor de Execuções
              </CardTitle>
              <CardDescription>
                {filteredLogs.length === logs.length 
                  ? `${logs.length} ${logs.length === 1 ? 'execução encontrada' : 'execuções encontradas'}`
                  : `${filteredLogs.length} de ${logs.length} execuções`
                }
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
                <TabsList>
                  <TabsTrigger value="hour">Hora</TabsTrigger>
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="all">Todos</TabsTrigger>
                </TabsList>
              </Tabs>

              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Status Atual
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isRunning ? (
                  <Badge variant="default" className="flex items-center gap-2 w-fit">
                    <Clock className="h-3 w-3 animate-spin" />
                    Executando
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-2 w-fit">
                    <CheckCircle2 className="h-3 w-3" />
                    Aguardando
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Taxa de Sucesso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.completed} de {stats.total}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  Tempo Médio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.avgDuration ? `${(stats.avgDuration / 1000).toFixed(1)}s` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">por execução</p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Total de Ações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalActions}</div>
                <p className="text-xs text-muted-foreground">executadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
              >
                Todos ({statusCounts.all})
              </Button>
              <Button
                variant={statusFilter === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('completed')}
                className={statusFilter !== 'completed' ? 'border-emerald-500 text-emerald-500 hover:bg-emerald-500/10' : ''}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Sucesso ({statusCounts.completed})
              </Button>
              <Button
                variant={statusFilter === 'failed' ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('failed')}
                className={statusFilter !== 'failed' ? 'border-destructive text-destructive hover:bg-destructive/10' : ''}
              >
                <XCircle className="h-3 w-3 mr-1" />
                Erro ({statusCounts.failed})
              </Button>
              <Button
                variant={statusFilter === 'partial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('partial')}
                className={statusFilter !== 'partial' ? 'border-amber-500 text-amber-500 hover:bg-amber-500/10' : ''}
              >
                <AlertCircle className="h-3 w-3 mr-1" />
                Parcial ({statusCounts.partial})
              </Button>
              <Button
                variant={statusFilter === 'running' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('running')}
              >
                <Clock className="h-3 w-3 mr-1" />
                Executando ({statusCounts.running})
              </Button>
            </div>

            {showClientColumn && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            )}
          </div>

          {/* Execution History */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Histórico de Execuções</h4>

            {logs.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhum log de execução encontrado para o período selecionado.
                </AlertDescription>
              </Alert>
            ) : filteredLogs.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Nenhuma execução encontrada com os filtros aplicados.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div key={log.execution_id} className="border-l-4 border-primary pl-4 py-3 hover:bg-muted/50 transition-colors rounded-r-lg">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getStatusIcon(log.status)}
                          <Badge variant={getStatusVariant(log.status)}>
                            {getStatusLabel(log.status)}
                          </Badge>
                          {showClientColumn && (
                            <span className="text-sm font-medium text-foreground">
                              {getClientName(log.client_id)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(log.started_at).toLocaleString('pt-BR')}
                          </span>
                        </div>

                        <div className="text-sm space-y-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="text-muted-foreground">
                              {log.total_rules_evaluated || 0} regras avaliadas
                            </span>
                            <span className={log.actions_taken > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                              {log.actions_taken || 0} {log.actions_taken === 1 ? 'ação' : 'ações'}
                            </span>
                            {log.duration_ms && (
                              <span className="text-muted-foreground">
                                {(log.duration_ms / 1000).toFixed(1)}s
                              </span>
                            )}
                          </div>

                          <div className="text-muted-foreground">
                            {getStatusMessage(log)}
                          </div>

                          {log.error_message && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>{log.error_message}</AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedExecutionId(log.execution_id);
                          setDetailsModalOpen(true);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ExecutionDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        executionId={selectedExecutionId}
        clientName={selectedExecutionId ? getClientName(
          logs.find(l => l.execution_id === selectedExecutionId)?.client_id || null
        ) : undefined}
      />
    </div>
  );
};
