import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Activity, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useAutomationExecutionLogs } from "@/hooks/useAutomationExecutionLogs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface CronMasterMonitorProps {
  clientId?: string;
  showClientColumn?: boolean;
}

export const CronMasterMonitor = ({ clientId, showClientColumn = false }: CronMasterMonitorProps) => {
  const { logs, loading, latestExecution, isRunning, stats, refetch } = useAutomationExecutionLogs(clientId, 20);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'running':
        return "default";
      case 'completed':
        return "secondary";
      case 'failed':
        return "destructive";
      case 'partial':
        return "outline";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return "Executando";
      case 'completed':
        return "Concluído";
      case 'failed':
        return "Falhou";
      case 'partial':
        return "Parcial";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
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
      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Status Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isRunning ? (
              <Badge variant="default" className="flex items-center gap-2 w-fit">
                <Loader2 className="h-3 w-3 animate-spin" />
                Executando
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center gap-2 w-fit">
                <CheckCircle className="h-3 w-3" />
                Aguardando
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.completed} de {stats.total} execuções
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgDuration > 0 ? `${(stats.avgDuration / 1000).toFixed(1)}s` : '0s'}
            </div>
            <p className="text-xs text-muted-foreground">por execução</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ações Totais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActions}</div>
            <p className="text-xs text-muted-foreground">automações executadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
          <CardDescription>
            Últimas {logs.length} execuções do sistema de automação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Nenhuma execução registrada ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {getStatusIcon(log.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getStatusVariant(log.status)}>
                        {getStatusLabel(log.status)}
                      </Badge>
                      {showClientColumn && log.clients && (
                        <span className="text-sm font-medium">{log.clients.name}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.started_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{log.actions_taken} ações executadas</span>
                      <span>{log.total_rules_evaluated} regras avaliadas</span>
                      {log.duration_ms && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {(log.duration_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    
                    {log.error_message && (
                      <div className="mt-2 text-sm text-destructive">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
