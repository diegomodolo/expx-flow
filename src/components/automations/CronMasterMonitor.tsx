import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Activity, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useAutomationExecutionLogs, PeriodFilter } from "@/hooks/useAutomationExecutionLogs";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface CronMasterMonitorProps {
  clientId?: string;
  showClientColumn?: boolean;
}

export const CronMasterMonitor = ({ clientId, showClientColumn = false }: CronMasterMonitorProps) => {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const { logs, loading, latestExecution, isRunning, stats, refetch } = useAutomationExecutionLogs(clientId, 50, periodFilter);

  // Force refresh on mount
  useEffect(() => {
    console.log('🔄 CronMasterMonitor mounted, forcing refresh...');
    refetch();
  }, [refetch]);

  // Manual debug button handler
  const handleDebugQuery = async () => {
    console.log('=== MANUAL DEBUG QUERY ===');
    try {
      const { data: directData, error: directError } = await supabase
        .from('automation_execution_logs' as any)
        .select('*')
        .limit(10);
      
      console.log('✅ Direct Query Result:', directData);
      console.log('❌ Direct Query Error:', directError);
      console.log('📊 Total rows returned:', directData?.length || 0);
      
      if (directData && directData.length > 0) {
        console.log('📋 First log sample:', directData[0]);
      }
    } catch (error) {
      console.error('💥 Exception in debug query:', error);
    }
    console.log('=== END MANUAL DEBUG ===');
  };

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
        <div className="flex items-center justify-center p-8 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      {/* Header with Filters and Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Status de Execuções</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <Tabs value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
            <TabsList>
              <TabsTrigger value="hour" className="text-xs">Última Hora</TabsTrigger>
              <TabsTrigger value="day" className="text-xs">Últimas 24h</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">Última Semana</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">Todos</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button 
            variant="secondary" 
            size="sm" 
            onClick={handleDebugQuery}
          >
            <Activity className="h-4 w-4 mr-2" />
            Debug
          </Button>
        </div>
      </div>

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Nenhum Log Encontrado</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>Ainda não há execuções registradas para este {clientId ? 'cliente' : 'sistema'}.</p>
            <p className="text-xs">
              ℹ️ Verifique o console do navegador (F12) para informações detalhadas sobre possíveis erros.
            </p>
            <p className="text-xs">
              🔍 Use o botão "Debug" acima para executar uma consulta manual e verificar a conexão com o banco de dados.
            </p>
          </AlertDescription>
        </Alert>
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
