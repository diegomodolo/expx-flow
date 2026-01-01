import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useFacebookSyncSchedule, SyncOptions } from '@/hooks/useFacebookSyncSchedule';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const periodOptions = [
  { value: '7', label: '7 dias', description: 'Última semana' },
  { value: '15', label: '15 dias', description: 'Últimas 2 semanas' },
  { value: '30', label: '30 dias', description: 'Último mês' },
  { value: '90', label: '90 dias', description: 'Últimos 3 meses' },
  { value: 'lifetime', label: 'Máximo', description: 'Todo o histórico' },
];

const executionOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}x por dia${i + 1 === 24 ? ' (1x/hora)' : ''}`,
}));

export const FacebookSyncSettings = () => {
  const {
    schedule,
    executionLogs,
    loading,
    logsLoading,
    saveSchedule,
    toggleSchedule,
  } = useFacebookSyncSchedule();

  const [isEnabled, setIsEnabled] = useState(false);
  const [syncOptions, setSyncOptions] = useState<SyncOptions>({
    period: '30',
    campaigns: true,
    adsets: true,
    ads: true,
    includeInactive: false,
  });
  const [executionsPerDay, setExecutionsPerDay] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (schedule) {
      setIsEnabled(schedule.is_enabled);
      setSyncOptions(schedule.sync_options);
      setExecutionsPerDay(schedule.executions_per_day);
      setHasChanges(false);
    }
  }, [schedule]);

  const handleSave = async () => {
    await saveSchedule(isEnabled, syncOptions, executionsPerDay);
    setHasChanges(false);
  };

  const handleToggle = async (checked: boolean) => {
    setIsEnabled(checked);
    await toggleSchedule(checked);
  };

  const updateSyncOption = (key: keyof SyncOptions, value: any) => {
    setSyncOptions(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      completed: 'default',
      failed: 'destructive',
      partial: 'secondary',
      running: 'outline',
    };

    const labels: any = {
      completed: 'Concluído',
      failed: 'Falhou',
      partial: 'Parcial',
      running: 'Em execução',
    };

    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  if (loading && !schedule) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sincronização Automática do Facebook</CardTitle>
          <CardDescription>
            Configure a sincronização automática de dados do Facebook para todos os seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Toggle principal */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sync-enabled">Sincronização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Ativar sincronização automática em horários programados
              </p>
            </div>
            <Switch
              id="sync-enabled"
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={loading}
            />
          </div>

          {/* Configurações */}
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Período de Dados</Label>
              <Select
                value={syncOptions.period}
                onValueChange={(value) => updateSyncOption('period', value)}
                disabled={!isEnabled || loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência de Execução</Label>
              <Select
                value={executionsPerDay.toString()}
                onValueChange={(value) => {
                  setExecutionsPerDay(parseInt(value));
                  setHasChanges(true);
                }}
                disabled={!isEnabled || loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {executionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {schedule?.scheduled_times && (
                <p className="text-sm text-muted-foreground">
                  Horários: {schedule.scheduled_times.join(', ')}
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Label>O que sincronizar</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-campaigns"
                    checked={syncOptions.campaigns}
                    onCheckedChange={(checked) => updateSyncOption('campaigns', checked)}
                    disabled={!isEnabled || loading}
                  />
                  <label htmlFor="sync-campaigns" className="text-sm cursor-pointer">
                    Campanhas
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-adsets"
                    checked={syncOptions.adsets}
                    onCheckedChange={(checked) => updateSyncOption('adsets', checked)}
                    disabled={!isEnabled || loading}
                  />
                  <label htmlFor="sync-adsets" className="text-sm cursor-pointer">
                    Conjuntos de Anúncios
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-ads"
                    checked={syncOptions.ads}
                    onCheckedChange={(checked) => updateSyncOption('ads', checked)}
                    disabled={!isEnabled || loading}
                  />
                  <label htmlFor="sync-ads" className="text-sm cursor-pointer">
                    Criativos
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-inactive"
                    checked={syncOptions.includeInactive}
                    onCheckedChange={(checked) => updateSyncOption('includeInactive', checked)}
                    disabled={!isEnabled || loading}
                  />
                  <label htmlFor="sync-inactive" className="text-sm cursor-pointer">
                    Incluir clientes inativos
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Informações de execução */}
          {schedule && (
            <div className="space-y-2 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última execução:</span>
                <span className="font-medium">
                  {schedule.last_execution_at
                    ? formatDistanceToNow(new Date(schedule.last_execution_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : 'Nunca'}
                </span>
              </div>
              {schedule.next_execution_at && isEnabled && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Próxima execução:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(schedule.next_execution_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {hasChanges && (
            <Button onClick={handleSave} disabled={loading} className="w-full">
              {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Configurações
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Histórico de execuções */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
          <CardDescription>Últimas 10 sincronizações executadas</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : executionLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma execução registrada ainda
            </p>
          ) : (
            <div className="space-y-3">
              {executionLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(log.started_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        {log.clients_processed} de {log.clients_total} clientes sincronizados
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                      )}
                    </div>
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
