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

  const groupedLogs = progressLogs?.reduce((acc, log) => {
    const key = `${log.entity_type}-${log.entity_id}`;
    if (!acc[key]) {
      acc[key] = {
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        entity_name: log.entity_name,
        logs: [],
      };
    }
    acc[key].logs.push(log);
    return acc;
  }, {} as Record<string, any>);

  const summary = {
    total: progressLogs?.length || 0,
    actioned: progressLogs?.filter(l => l.action_taken).length || 0,
    errors: progressLogs?.filter(l => l.error_message).length || 0,
    skipped: progressLogs?.filter(l => !l.action_taken && !l.error_message).length || 0,
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

              {/* Histórico Detalhado */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground">Histórico Detalhado</h3>
                
                {!groupedLogs || Object.keys(groupedLogs).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhum detalhe de execução disponível</p>
                  </div>
                ) : (
                  Object.values(groupedLogs).map((group: any) => (
                    <div key={`${group.entity_type}-${group.entity_id}`} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getEntityIcon(group.entity_type)}</span>
                        <div>
                          <div className="font-medium text-foreground">{group.entity_name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{group.entity_type}</div>
                        </div>
                      </div>

                      <div className="space-y-2 ml-8">
                        {group.logs.map((log: any) => (
                          <div key={log.id} className="border-l-2 border-border pl-4 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              {getActionIcon(log.action_taken, log.error_message)}
                              <span className="font-medium text-sm text-foreground">{log.rule_name}</span>
                              {getActionBadge(log.action_taken, log.error_message)}
                            </div>

                            {log.action_taken && (
                              <div className="text-sm text-foreground ml-6">
                                <div className="font-medium">🎬 Ação: {getActionLabel(log.action_taken)}</div>
                                {log.action_details && (
                                  <div className="text-muted-foreground mt-1 space-y-1">
                                    {Object.entries(log.action_details).map(([key, value]) => (
                                      <div key={key} className="text-xs">
                                        • {key}: {String(value)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {!log.action_taken && !log.error_message && (
                              <div className="text-sm text-muted-foreground ml-6">
                                ⏭️ Condições não atendidas
                              </div>
                            )}

                            {log.error_message && (
                              <div className="text-sm text-destructive ml-6 mt-1">
                                ❌ Erro: {log.error_message}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
