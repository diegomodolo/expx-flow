import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, Eye } from "lucide-react";
import { ExecutionLog, NotificationTrigger, TRIGGER_TYPES } from "@/hooks/useWhatsAppNotifications";
import { NotificationDetailsModal } from "./NotificationDetailsModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationHistoryProps {
  logs: ExecutionLog[];
  triggers: NotificationTrigger[];
}

const STATUS_CONFIG = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  processing: { label: 'Processando', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  completed: { label: 'Concluído', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  failed: { label: 'Falhou', icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
};

export function NotificationHistory({ logs, triggers }: NotificationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [triggerFilter, setTriggerFilter] = useState<string>("all");
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ExecutionLog | null>(null);

  // Apply filters
  const filteredLogs = logs.filter((log) => {
    // Status filter
    if (statusFilter !== "all" && log.status !== statusFilter) {
      return false;
    }

    // Trigger filter
    if (triggerFilter !== "all" && log.trigger_id !== triggerFilter) {
      return false;
    }

    // Search filter
    if (searchTerm) {
      const triggerName = (log.trigger as any)?.trigger_name?.toLowerCase() || '';
      return triggerName.includes(searchTerm.toLowerCase());
    }

    return true;
  });

  const handleViewDetails = (log: ExecutionLog) => {
    setSelectedLog(log);
    setDetailsModalOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Envios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="failed">Falharam</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
              </SelectContent>
            </Select>
            <Select value={triggerFilter} onValueChange={setTriggerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Gatilho" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Gatilhos</SelectItem>
                {triggers.map((trigger) => (
                  <SelectItem key={trigger.id} value={trigger.id}>
                    {trigger.trigger_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum envio registrado</p>
              <p className="text-sm text-muted-foreground">
                Os envios aparecerão aqui quando os gatilhos forem executados
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Nenhum resultado encontrado</p>
              <Button variant="link" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setTriggerFilter("all");
              }}>
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Gatilho</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Enviadas</TableHead>
                    <TableHead className="text-right">Falhas</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const status = STATUS_CONFIG[log.status];
                    const StatusIcon = status.icon;
                    const triggerInfo = log.trigger as any;
                    const triggerType = TRIGGER_TYPES.find(t => t.value === triggerInfo?.trigger_type);
                    
                    // Calculate duration
                    let duration = '-';
                    if (log.started_at && log.completed_at) {
                      const durationMs = new Date(log.completed_at).getTime() - new Date(log.started_at).getTime();
                      if (durationMs < 1000) {
                        duration = `${durationMs}ms`;
                      } else if (durationMs < 60000) {
                        duration = `${Math.round(durationMs / 1000)}s`;
                      } else {
                        duration = `${Math.round(durationMs / 60000)}min`;
                      }
                    }

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          <br />
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{triggerType?.icon || '📌'}</span>
                            <span>{triggerInfo?.trigger_name || 'Gatilho removido'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${status.bg} ${status.color}`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-green-500 font-medium">{log.messages_sent}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={log.messages_failed > 0 ? "text-red-500 font-medium" : "text-muted-foreground"}>
                            {log.messages_failed}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {duration}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                            className="h-8 w-8 p-0"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Summary */}
          {filteredLogs.length > 0 && (
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <span>Exibindo {filteredLogs.length} de {logs.length} registros</span>
              <div className="flex gap-4">
                <span>
                  Total enviadas: <strong className="text-green-500">{filteredLogs.reduce((acc, l) => acc + l.messages_sent, 0)}</strong>
                </span>
                <span>
                  Total falhas: <strong className="text-red-500">{filteredLogs.reduce((acc, l) => acc + l.messages_failed, 0)}</strong>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NotificationDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        executionLogId={selectedLog?.id || null}
        triggerName={(selectedLog?.trigger as any)?.trigger_name || 'Execução'}
      />
    </>
  );
}
