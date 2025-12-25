import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSystemAlerts, SystemAlert } from "@/hooks/useSystemAlerts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Bell, 
  BellOff, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  Eye,
  ExternalLink,
  RefreshCw,
  Filter,
} from "lucide-react";
import { Link } from "react-router-dom";

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    badgeVariant: "destructive" as const,
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    badgeVariant: "secondary" as const,
  },
  info: {
    icon: Info,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    badgeVariant: "outline" as const,
  },
};

const alertTypeLabels: Record<string, string> = {
  post_failed: "Falha na Publicação",
  account_restricted: "Conta Restrita",
  token_expired: "Token Expirado",
  low_balance: "Saldo Baixo",
  high_cpa: "CPA Alto",
};

function AlertCard({ alert, onMarkAsRead, onMarkAsResolved }: { 
  alert: SystemAlert;
  onMarkAsRead: (id: string) => void;
  onMarkAsResolved: (id: string) => void;
}) {
  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  const getEntityLink = () => {
    if (alert.related_entity_type === 'instagram_auto_post' && alert.client_id) {
      return `/clientes/${alert.client_id}/instagram-posts`;
    }
    if (alert.related_entity_type === 'scheduled_post') {
      return '/agendamento';
    }
    if (alert.client_id) {
      return `/clientes/${alert.client_id}`;
    }
    return null;
  };

  const entityLink = getEntityLink();

  return (
    <Card className={`${!alert.is_read ? 'border-l-4 border-l-primary' : ''} ${alert.is_resolved ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`p-2 rounded-full ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-foreground">{alert.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={config.badgeVariant}>
                  {alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Atenção' : 'Info'}
                </Badge>
                {alert.is_resolved && (
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Resolvido
                  </Badge>
                )}
              </div>
            </div>

            {/* Details */}
            {alert.details && Object.keys(alert.details).length > 0 && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                {alert.details.error_message && (
                  <p className="text-destructive">{alert.details.error_message}</p>
                )}
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>
                {format(new Date(alert.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </span>
              {alert.clients && (
                <span>Cliente: {alert.clients.name}</span>
              )}
              <Badge variant="outline" className="text-xs">
                {alertTypeLabels[alert.alert_type] || alert.alert_type}
              </Badge>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {!alert.is_read && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onMarkAsRead(alert.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Marcar como lido
                </Button>
              )}
              {!alert.is_resolved && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onMarkAsResolved(alert.id)}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Resolver
                </Button>
              )}
              {entityLink && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to={entityLink}>
                    <ExternalLink className="w-4 h-4 mr-1" />
                    Ver detalhes
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AlertasDoSistema() {
  const { 
    alerts, 
    isLoading, 
    unreadCount, 
    unresolvedCriticalCount,
    refetch,
    markAsRead, 
    markAsResolved,
    markAllAsRead,
  } = useSystemAlerts();

  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tab, setTab] = useState("pending");

  const filteredAlerts = alerts.filter(alert => {
    // Tab filter
    if (tab === "pending" && alert.is_resolved) return false;
    if (tab === "resolved" && !alert.is_resolved) return false;

    // Severity filter
    if (severityFilter !== "all" && alert.severity !== severityFilter) return false;

    // Type filter
    if (typeFilter !== "all" && alert.alert_type !== typeFilter) return false;

    return true;
  });

  const uniqueTypes = [...new Set(alerts.map(a => a.alert_type))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Central de Alertas</h1>
            <p className="text-muted-foreground">
              Monitore e gerencie todos os alertas do sistema
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
                <BellOff className="w-4 h-4 mr-2" />
                Marcar todos como lidos
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alerts.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Alertas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Info className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unreadCount}</p>
                  <p className="text-sm text-muted-foreground">Não Lidos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{unresolvedCriticalCount}</p>
                  <p className="text-sm text-muted-foreground">Críticos Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-green-500/10">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{alerts.filter(a => a.is_resolved).length}</p>
                  <p className="text-sm text-muted-foreground">Resolvidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Tabs */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Alertas</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Severidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                    <SelectItem value="warning">Atenção</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {uniqueTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {alertTypeLabels[type] || type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pendentes
                  {alerts.filter(a => !a.is_resolved).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {alerts.filter(a => !a.is_resolved).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
                <TabsTrigger value="all">Todos</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-4">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando alertas...
                  </div>
                ) : filteredAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum alerta encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredAlerts.map(alert => (
                      <AlertCard 
                        key={alert.id}
                        alert={alert}
                        onMarkAsRead={markAsRead}
                        onMarkAsResolved={markAsResolved}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
