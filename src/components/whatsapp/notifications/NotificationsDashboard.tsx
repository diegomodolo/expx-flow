import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Bell, Users, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { NotificationTrigger, ExecutionLog, TRIGGER_TYPES } from "@/hooks/useWhatsAppNotifications";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationsDashboardProps {
  stats: {
    totalTriggers: number;
    activeTriggers: number;
    totalContacts: number;
    messagesToday: number;
    messagesThisWeek: number;
    messagesThisMonth: number;
  };
  triggers: NotificationTrigger[];
  executionLogs: ExecutionLog[];
}

export function NotificationsDashboard({ stats, triggers, executionLogs }: NotificationsDashboardProps) {
  const recentLogs = executionLogs.slice(0, 5);
  const nextExecutions = triggers
    .filter(t => t.is_active && t.schedule?.next_execution_at)
    .sort((a, b) => 
      new Date(a.schedule!.next_execution_at!).getTime() - 
      new Date(b.schedule!.next_execution_at!).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Hoje</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesToday}</div>
            <p className="text-xs text-muted-foreground">
              {stats.messagesThisWeek} esta semana
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              mensagens enviadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gatilhos Ativos</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTriggers}</div>
            <p className="text-xs text-muted-foreground">
              de {stats.totalTriggers} configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contatos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalContacts}</div>
            <p className="text-xs text-muted-foreground">
              cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Próximas Execuções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              Próximas Execuções
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextExecutions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma execução agendada</p>
            ) : (
              <div className="space-y-3">
                {nextExecutions.map((trigger) => {
                  const triggerType = TRIGGER_TYPES.find(t => t.value === trigger.trigger_type);
                  return (
                    <div key={trigger.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span>{triggerType?.icon || '📌'}</span>
                        <span className="text-sm font-medium">{trigger.trigger_name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(new Date(trigger.schedule!.next_execution_at!), "dd/MM HH:mm", { locale: ptBR })}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimos Envios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Últimos Envios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum envio registrado</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.status === 'completed' ? (
                        <span className="text-green-500">✅</span>
                      ) : log.status === 'failed' ? (
                        <span className="text-red-500">❌</span>
                      ) : (
                        <span className="text-yellow-500">⏳</span>
                      )}
                      <div>
                        <span className="text-sm font-medium">
                          {(log.trigger as any)?.trigger_name || 'Gatilho removido'}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {log.messages_sent} enviadas, {log.messages_failed} falhas
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {stats.totalContacts === 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-700 dark:text-yellow-400">
                Nenhum contato cadastrado
              </p>
              <p className="text-sm text-muted-foreground">
                Adicione contatos na aba "Contatos" para receber notificações
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
