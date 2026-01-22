import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, PlayCircle, Loader2, ChevronDown, ChevronUp, User, Timer } from 'lucide-react';
import { useGoogleAdsSyncSchedule, GoogleSyncOptions, GoogleExecutionLog } from '@/hooks/useGoogleAdsSyncSchedule';
import { useGoogleAdsCampaignSync } from '@/hooks/useGoogleAdsCampaignSync';
import { useCompany } from '@/contexts/CompanyContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const periodOptions = [
  { value: 'last_7_days', label: '7 dias', description: 'Última semana' },
  { value: 'last_14_days', label: '14 dias', description: 'Últimas 2 semanas' },
  { value: 'last_30_days', label: '30 dias', description: 'Último mês' },
  { value: 'last_90_days', label: '90 dias', description: 'Últimos 3 meses' },
];

const executionOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}x por dia${i + 1 === 24 ? ' (1x/hora)' : ''}`,
}));

export function GoogleAdsSyncSettings() {
  const { activeCompany } = useCompany();
  const {
    schedule,
    executionLogs,
    loading,
    logsLoading,
    saveSchedule,
    toggleSchedule,
  } = useGoogleAdsSyncSchedule();
  
  const { syncing, progress, syncAllClients } = useGoogleAdsCampaignSync();

  const [isEnabled, setIsEnabled] = useState(false);
  const [syncOptions, setSyncOptions] = useState<GoogleSyncOptions>({
    period: 'last_30_days',
    campaigns: true,
    adGroups: false,
    ads: false,
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

  const updateSyncOption = (key: keyof GoogleSyncOptions, value: any) => {
    setSyncOptions(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSyncNow = async () => {
    const companyId = activeCompany?.company_id;
    if (!companyId) {
      toast.error("Nenhuma empresa ativa");
      return;
    }

    await syncAllClients(companyId, {
      period: syncOptions.period,
      syncCampaigns: syncOptions.campaigns,
      syncAdGroups: syncOptions.adGroups,
      syncAds: syncOptions.ads,
      includeInactive: syncOptions.includeInactive,
      excludeInactiveClients: !syncOptions.includeInactive,
    });
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
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sincronização Automática do Google Ads</CardTitle>
          <CardDescription>
            Configure a sincronização automática de dados do Google Ads para todos os seus clientes
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
                disabled={loading}
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
                disabled={loading}
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
                    disabled={loading}
                  />
                  <label htmlFor="sync-campaigns" className="text-sm cursor-pointer">
                    Campanhas
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-adgroups"
                    checked={syncOptions.adGroups}
                    onCheckedChange={(checked) => updateSyncOption('adGroups', checked)}
                    disabled={loading}
                  />
                  <label htmlFor="sync-adgroups" className="text-sm cursor-pointer">
                    Grupos de Anúncios
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-ads"
                    checked={syncOptions.ads}
                    onCheckedChange={(checked) => updateSyncOption('ads', checked)}
                    disabled={loading}
                  />
                  <label htmlFor="sync-ads" className="text-sm cursor-pointer">
                    Anúncios
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="sync-inactive"
                    checked={syncOptions.includeInactive}
                    onCheckedChange={(checked) => updateSyncOption('includeInactive', checked)}
                    disabled={loading}
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

          {/* Botão de sincronização manual */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleSyncNow}
              disabled={syncing}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {syncing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sincronizando... {progress.current}/{progress.total}
                  {progress.clientName && ` - ${progress.clientName}`}
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4" />
                  Sincronizar Agora (Manual)
                </>
              )}
            </Button>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              Executar sincronização imediata com as configurações acima
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de execuções */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Execuções</CardTitle>
          <CardDescription>Últimas 10 sincronizações automáticas executadas</CardDescription>
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
                <ExecutionLogItem key={log.id} log={log} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente para exibir cada item do histórico com detalhes expandíveis
function ExecutionLogItem({ log }: { log: GoogleExecutionLog }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const executionDetails = log.execution_details as {
    trigger?: 'manual' | 'scheduled';
    clients?: Array<{
      client_id: string;
      client_name: string;
      status: 'success' | 'error';
      error_code?: string;
      error_message?: string;
      action_required?: 'internal' | 'client' | 'none';
      campaigns_synced?: number;
      ad_groups_synced?: number;
      ads_synced?: number;
    }>;
  } | null;

  const clients = executionDetails?.clients || [];
  const trigger = executionDetails?.trigger || 'scheduled';
  const hasDetails = clients.length > 0;
  
  const successClients = clients.filter(c => c.status === 'success');
  const errorClients = clients.filter(c => c.status === 'error');
  const clientActionRequired = errorClients.filter(c => c.action_required === 'client');
  const internalActionRequired = errorClients.filter(c => c.action_required === 'internal');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">Concluído</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      case 'partial':
        return <Badge variant="default" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Parcial</Badge>;
      case 'running':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Executando</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (actionRequired: string) => {
    switch (actionRequired) {
      case 'client':
        return <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50 text-xs">Ação do cliente</Badge>;
      case 'internal':
        return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 text-xs">Ação interna</Badge>;
      default:
        return null;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-card overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-3">
              {getStatusIcon(log.status)}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(log.status)}
                  <Badge variant="outline" className="text-xs">
                    {trigger === 'manual' ? (
                      <>
                        <User className="h-3 w-3 mr-1" />
                        Manual
                      </>
                    ) : (
                      <>
                        <Timer className="h-3 w-3 mr-1" />
                        Agendado
                      </>
                    )}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(log.started_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="text-sm mt-1">
                  {log.clients_processed} de {log.clients_total} clientes sincronizados
                  {errorClients.length > 0 && (
                    <span className="text-destructive ml-2">
                      ({errorClients.length} com erro)
                    </span>
                  )}
                </p>
                {log.error_message && !hasDetails && (
                  <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                )}
              </div>
            </div>
            {hasDetails && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </CollapsibleTrigger>
        
        {hasDetails && (
          <CollapsibleContent>
            <div className="border-t px-4 py-3 bg-muted/30 space-y-2">
              <div className="flex gap-4 text-xs text-muted-foreground mb-3">
                <span>Início: {format(new Date(log.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                {log.completed_at && (
                  <span>Fim: {format(new Date(log.completed_at), "HH:mm", { locale: ptBR })}</span>
                )}
              </div>
              
              {/* Resumo de erros por tipo */}
              {(clientActionRequired.length > 0 || internalActionRequired.length > 0) && (
                <div className="flex gap-2 mb-3">
                  {clientActionRequired.length > 0 && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                      {clientActionRequired.length} requerem ação do cliente
                    </Badge>
                  )}
                  {internalActionRequired.length > 0 && (
                    <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">
                      {internalActionRequired.length} requerem ação interna
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Lista de clientes */}
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {clients.map((client, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm py-1.5 px-2 rounded bg-background">
                    {client.status === 'success' ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{client.client_name}</span>
                        {client.action_required && client.action_required !== 'none' && getActionBadge(client.action_required)}
                      </div>
                      {client.status === 'success' && (client.campaigns_synced || 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {client.campaigns_synced} campanhas
                          {(client.ad_groups_synced || 0) > 0 && `, ${client.ad_groups_synced} grupos`}
                          {(client.ads_synced || 0) > 0 && `, ${client.ads_synced} anúncios`}
                        </p>
                      )}
                      {client.status === 'error' && client.error_message && (
                        <p className="text-xs text-destructive">{client.error_message}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}
