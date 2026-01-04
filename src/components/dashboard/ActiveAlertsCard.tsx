import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, AlertCircle, CheckCircle2, Bell } from 'lucide-react';
import { useDashboardAlerts, Alert } from '@/hooks/useDashboardAlerts';

const typeConfig = {
  danger: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    badgeVariant: 'destructive' as const
  },
  opportunity: {
    icon: AlertCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    badgeVariant: 'secondary' as const
  }
};

export const ActiveAlertsCard = () => {
  const { alerts, loading } = useDashboardAlerts();

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const dangerAlerts = alerts.filter(a => a.type === 'danger');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alertas Ativos
          </CardTitle>
          {dangerAlerts.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {dangerAlerts.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm">Nenhum alerta ativo</p>
          </div>
        ) : (
          <ScrollArea className="h-[180px]">
            <div className="space-y-3 pr-3">
              {alerts.slice(0, 5).map(alert => {
                const config = typeConfig[alert.type] || typeConfig.danger;
                const Icon = config.icon;

                return (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg ${config.bgColor} border border-border/50`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium truncate">
                            {alert.title}
                          </span>
                          <Badge variant={config.badgeVariant} className="text-xs shrink-0">
                            {alert.type === 'danger' ? 'Crítico' : 'Oportunidade'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {alert.description}
                        </p>
                        {alert.client && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Cliente: {alert.client}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
