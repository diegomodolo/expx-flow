import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAutomationExecutionProgress } from "@/hooks/useAutomationExecutionProgress";
import { AlertCircle, CheckCircle2, XCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface ExecutionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionId: string | null;
  clientName?: string;
}

export function ExecutionDetailsModal({
  open,
  onOpenChange,
  executionId,
  clientName,
}: ExecutionDetailsModalProps) {
  const { data: progressLogs, isLoading } = useAutomationExecutionProgress(executionId);

  const getActionIcon = (actionTaken: string | null, errorMessage: string | null) => {
    if (errorMessage) return <XCircle className="h-4 w-4 text-destructive" />;
    if (actionTaken) return <Activity className="h-4 w-4 text-primary" />;
    return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
  };

  const getActionBadge = (actionTaken: string | null, errorMessage: string | null) => {
    if (errorMessage) return <Badge variant="destructive">Erro</Badge>;
    if (actionTaken) return <Badge variant="default">Ação Executada</Badge>;
    return <Badge variant="outline">Nenhuma Ação</Badge>;
  };

  // Filtrar logs internos
  const internalLogTypes = ['Consulta', 'Análise', 'Validação', 'Conclusão'];
  const actualLogs = progressLogs?.filter(l => !internalLogTypes.includes(l.rule_name || '')) || [];

  // Separar logs por categoria
  const actionLogs = actualLogs.filter(l => l.status === 'actioned');
  const skippedLogs = actualLogs.filter(l => l.status === 'skipped');
  const errorLogs = actualLogs.filter(l => l.error_message);

  const summary = {
    total: actualLogs.length,
    actioned: actionLogs.length,
    errors: errorLogs.length,
    skipped: skippedLogs.length,
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'campaign': return '🎯';
      case 'adset': return '📊';
      case 'ad': return '📱';
      default: return '📋';
    }
  };

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause: 'Pausar',
      activate: 'Ativar',
      increase_budget: 'Aumentar Orçamento',
      decrease_budget: 'Reduzir Orçamento',
      adjust_bid: 'Ajustar Lance',
      duplicate: 'Duplicar',
      send_alert: 'Enviar Alerta',
    };
    return labels[actionType] || actionType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Execução
            {clientName && <Badge variant="outline">{clientName}</Badge>}
          </DialogTitle>
          <DialogDescription>
            Histórico completo de todas as regras avaliadas e ações executadas
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(85vh-150px)]">
            <div className="space-y-6">
              {/* Resumo */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-foreground">{summary.total}</div>
                  <div className="text-sm text-muted-foreground">Regras Avaliadas</div>
                </div>
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{summary.actioned}</div>
                  <div className="text-sm text-muted-foreground">Ações Executadas</div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-muted-foreground">{summary.skipped}</div>
                  <div className="text-sm text-muted-foreground">Ignorados</div>
                </div>
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">{summary.errors}</div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                </div>
              </div>

              {/* Ações Executadas */}
              {actionLogs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Ações Executadas</h3>
                  <div className="space-y-3">
                    {actionLogs.map((log: any) => (
                      <div key={log.id} className="border rounded-lg p-4 space-y-3 bg-green-50/50 dark:bg-green-950/20">
                        {/* Hierarquia */}
                        {log.metadata && (
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            {log.metadata.campaign_name && (
                              <div className="flex items-center gap-2">
                                <span className="text-lg">🎯</span>
                                <span className="font-medium">{log.metadata.campaign_name}</span>
                              </div>
                            )}
                            {log.metadata.adset_name && (
                              <div className="flex items-center gap-2 ml-6">
                                <span className="text-lg">📊</span>
                                <span className="font-medium">{log.metadata.adset_name}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Ação Executada */}
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getEntityIcon(log.entity_type)}</span>
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{log.entity_name}</div>
                            <div className="text-sm text-muted-foreground mt-1">{log.message}</div>
                          </div>
                          <Badge variant="default" className="bg-green-600">✓ Executado</Badge>
                        </div>
                        
                        {/* Métricas */}
                        {log.metadata?.metrics && (
                          <div className="ml-8 grid grid-cols-4 gap-3 p-3 bg-background rounded-md text-xs">
                            <div>
                              <div className="text-muted-foreground">CPA</div>
                              <div className="font-semibold">R$ {log.metadata.metrics.cpa.toFixed(2)}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">CTR</div>
                              <div className="font-semibold">{log.metadata.metrics.ctr.toFixed(2)}%</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Conversões</div>
                              <div className="font-semibold">{log.metadata.metrics.conversions}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Gasto</div>
                              <div className="font-semibold">R$ {log.metadata.metrics.spend.toFixed(2)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regras Avaliadas Sem Ação */}
              {skippedLogs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Regras Avaliadas (Sem Ação)</h3>
                  <div className="space-y-2">
                    {skippedLogs.map((log: any) => (
                      <div key={log.id} className="border rounded-lg p-3 flex items-center gap-3 bg-muted/30">
                        <span className="text-lg">{getEntityIcon(log.entity_type)}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">{log.entity_name}</div>
                          <div className="text-xs text-muted-foreground">{log.message}</div>
                        </div>
                        <Badge variant="outline">Nenhuma Ação</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Erros */}
              {errorLogs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Erros</h3>
                  <div className="space-y-2">
                    {errorLogs.map((log: any) => (
                      <div key={log.id} className="border border-destructive/50 rounded-lg p-3 bg-destructive/5">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-foreground">{log.entity_name}</div>
                            <div className="text-sm text-destructive mt-1">{log.error_message}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Caso não tenha nenhum log */}
              {actualLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhum detalhe de execução disponível</p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
