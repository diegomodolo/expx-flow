import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useAutomationLogs } from "@/hooks/useAutomationLogs";
import { useAutomationSchedule } from "@/hooks/useAutomationSchedule";
import { CronMasterMonitor } from "@/components/automations/CronMasterMonitor";
import { useClientDetails } from "@/hooks/useClientDetails";
import { ImportAutomationTemplateDialog } from "@/components/clients/ImportAutomationTemplateDialog";
import { EditAutomationValuesDialog } from "@/components/clients/EditAutomationValuesDialog";
import { AutomationProgressModal } from "@/components/clients/AutomationProgressModal";
import { translateObjective } from "@/components/automations/CampaignObjectiveSelector";
import { Play, Plus, Trash2, Clock, CheckCircle2, XCircle, Loader2, AlertCircle, Undo2, Zap, Pencil, ArrowRight, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
export default function ClienteAutomacoes() {
  const {
    id: clientId
  } = useParams<{
    id: string;
  }>();
  const {
    toast
  } = useToast();
  const {
    client
  } = useClientDetails(clientId || "");
  const {
    rules,
    loading: rulesLoading,
    updateRule,
    updateRuleConditions,
    deleteRule,
    fetchRules
  } = useAutomationRules(clientId);
  const {
    logs,
    loading: logsLoading,
    fetchLogs,
    rollbackAction,
    clearLogs
  } = useAutomationLogs(clientId);
  const {
    schedule,
    loading: scheduleLoading,
    createOrUpdateSchedule,
    toggleSchedule
  } = useAutomationSchedule(clientId);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<any>(null);
  const [logEntityFilter, setLogEntityFilter] = useState<'all' | 'campaign' | 'adset' | 'ad'>('all');
  const [clearLogsDialogOpen, setClearLogsDialogOpen] = useState(false);
  const [clearingLogs, setClearingLogs] = useState(false);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [executionId, setExecutionId] = useState<string>('');
  const [executionsPerDay, setExecutionsPerDay] = useState<number>(schedule?.executions_per_day || 2);
  const [activeTab, setActiveTab] = useState<string>("automations");

  // Função para converter horário UTC para timezone local (BRT = UTC-3)
  const convertUTCToLocal = (utcTime: string): string => {
    const [hours, minutes] = utcTime.split(':').map(Number);
    const utcDate = new Date();
    utcDate.setUTCHours(hours, minutes, 0, 0);

    // Formatar para timezone local (BRT)
    return utcDate.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  // Função para gerar preview de horários no timezone local
  const getLocalTimePreview = (executions: number): string[] => {
    const intervalMinutes = 24 * 60 / executions;
    const times: string[] = [];
    for (let i = 0; i < executions; i++) {
      const utcMinutes = i * intervalMinutes;
      const hours = Math.floor(utcMinutes / 60);
      const minutes = utcMinutes % 60;
      const utcTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      times.push(convertUTCToLocal(utcTime));
    }
    return times;
  };

  // Sync executionsPerDay with schedule
  useEffect(() => {
    if (schedule?.executions_per_day) {
      setExecutionsPerDay(schedule.executions_per_day);
    }
  }, [schedule]);
  const filteredLogs = logs.filter(log => logEntityFilter === 'all' || log.entity_type === logEntityFilter);
  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await updateRule(ruleId, {
        is_active: !currentStatus
      });
      toast({
        title: !currentStatus ? "Automação ativada" : "Automação desativada",
        description: "O status foi atualizado com sucesso."
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    try {
      await deleteRule(ruleToDelete);
      toast({
        title: "Automação removida",
        description: "A automação foi removida com sucesso."
      });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleExecuteAll = async () => {
    if (!clientId) return;
    const newExecutionId = crypto.randomUUID();
    setExecutionId(newExecutionId);
    setProgressModalOpen(true);
    setExecuting(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('execute-campaign-automations', {
        body: {
          client_id: clientId,
          execution_id: newExecutionId
        }
      });
      if (error) throw error;
      await fetchLogs();
      toast({
        title: "Automações concluídas",
        description: `${data?.totalActioned || 0} ações executadas com sucesso.`
      });
    } catch (error: any) {
      console.error('Error executing automations:', error);
      toast({
        title: "Erro ao executar automações",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setExecuting(false);
    }
  };
  const handleRollback = async (logId: string) => {
    try {
      await rollbackAction(logId);
    } catch (error) {
      // Error handled in hook
    }
  };
  const handleClearLogs = async () => {
    setClearingLogs(true);
    try {
      const success = await clearLogs();
      if (success) {
        setClearLogsDialogOpen(false);
      }
    } finally {
      setClearingLogs(false);
    }
  };
  const formatTimeWindow = (days: number): string => {
    if (days === 1) return "Último 1 dia";
    if (days === 7) return "Últimos 7 dias";
    if (days === 14) return "Últimos 14 dias";
    if (days === 30) return "Últimos 30 dias";
    if (days === 60) return "Últimos 60 dias";
    if (days === 90) return "Últimos 90 dias";
    return `Últimos ${days} dias`;
  };
  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause_campaign: "Pausar Campanha",
      activate_campaign: "Ativar Campanha",
      increase_budget: "Aumentar Budget",
      decrease_budget: "Reduzir Budget",
      rename_campaign: "Renomear Campanha"
    };
    return labels[actionType] || actionType;
  };
  const getActionTypeBadge = (actionType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pause_campaign: "destructive",
      activate_campaign: "default",
      increase_budget: "default",
      decrease_budget: "secondary",
      rename_campaign: "outline"
    };
    return variants[actionType] || "outline";
  };
  const getResultIcon = (result: string) => {
    switch (result) {
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "skipped":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };
  const handleImported = async () => {
    await fetchRules();
    await fetchLogs();
  };
  const handleSaveConditions = async (ruleId: string, updatedConditions: any) => {
    try {
      await updateRuleConditions(ruleId, updatedConditions);
      setEditDialogOpen(false);
      setRuleToEdit(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      cpa: "CPA",
      ctr: "CTR",
      conversions: "Conversões",
      spend: "Gasto",
      impressions: "Impressões",
      clicks: "Cliques",
      frequency: "Frequência",
      reach: "Alcance",
      cost_per_click: "CPC",
      roas: "ROAS"
    };
    return labels[field] || field;
  };
  const getOperatorLabel = (operator: string): string => {
    const labels: Record<string, string> = {
      ">": "maior que",
      "<": "menor que",
      ">=": "maior ou igual a",
      "<=": "menor ou igual a",
      "=": "igual a",
      "!=": "diferente de"
    };
    return labels[operator] || operator;
  };
  const formatConditionValue = (field: string, value: number | boolean): string => {
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    if (["cpa", "spend", "cost_per_click"].includes(field)) {
      return `R$ ${value.toFixed(2)}`;
    }
    if (["ctr"].includes(field)) {
      return `${value}%`;
    }
    return value.toString();
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automações</h2>
          <p className="text-muted-foreground">
            Gerencie automações para {client?.name}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="automations">
            <Zap className="w-4 h-4 mr-2" />
            Automações
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <Calendar className="w-4 h-4 mr-2" />
            Agendamento
          </TabsTrigger>
          <TabsTrigger value="monitor">
            <Clock className="w-4 h-4 mr-2" />
            Monitor
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Automações */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleExecuteAll} disabled={executing || rules.length === 0} variant="outline">
              {executing ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executando...
                </> : <>
                  <Play className="mr-2 h-4 w-4" />
                  Executar Agora
                </>}
            </Button>
            <Button onClick={() => setImportDialogOpen(true)}>Importar Automação<Plus className="mr-2 h-4 w-4" />
              Importar Template
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Automações Ativas</CardTitle>
              <CardDescription>
                {rules.length} {rules.length === 1 ? "automação importada" : "automações importadas"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div> : rules.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma automação importada ainda.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clique em "Importar Template" para começar.
                  </p>
                </div> : <div className="space-y-4">
                  {rules.map(rule => <Card key={rule.id} className="border-border/50">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{rule.rule_name}</h4>
                              <Badge variant={getActionTypeBadge(rule.action_type)}>
                                {getActionTypeLabel(rule.action_type)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Importada {formatDistanceToNow(new Date(rule.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                              </span>
                            </div>
                            {rule.campaign_objectives && rule.campaign_objectives.length > 0 && <div className="mt-3 pt-3 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  Aplica-se apenas aos objetivos:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {rule.campaign_objectives.map(obj => <Badge key={obj} variant="outline" className="text-xs">
                                      {translateObjective(obj)}
                                    </Badge>)}
                                </div>
                              </div>}
                            {rule.conditions?.conditions && rule.conditions.conditions.length > 0 && <div className="mt-3 pt-3 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  Condições configuradas:
                                </div>
                                <div className="space-y-1">
                                  {rule.conditions.conditions.map((condition: any, idx: number) => <div key={idx} className="flex items-center gap-2 text-xs">
                                      <Badge variant="secondary" className="font-mono">
                                        {getFieldLabel(condition.field)}
                                      </Badge>
                                      <span className="text-muted-foreground">
                                        {getOperatorLabel(condition.operator)}
                                      </span>
                                      <span className="font-semibold">
                                        {formatConditionValue(condition.field, condition.value)}
                                      </span>
                                    </div>)}
                                </div>
                              </div>}
                            {rule.action_config && <div className="mt-3 pt-3 border-t">
                                <div className="text-xs font-medium text-muted-foreground mb-2">
                                  Configuração da ação:
                                </div>
                                <div className="space-y-1 text-xs">
                                  {rule.action_config.percentage && <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Percentual:</span>
                                      <span className="font-semibold">{rule.action_config.percentage}%</span>
                                    </div>}
                                  {rule.action_config.name_pattern && <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">Padrão do nome:</span>
                                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                                        {rule.action_config.name_pattern}
                                      </code>
                                    </div>}
                                </div>
                              </div>}
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button variant="ghost" size="icon" onClick={() => {
                        setRuleToEdit(rule);
                        setEditDialogOpen(true);
                      }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Switch checked={rule.is_active} onCheckedChange={() => handleToggleRule(rule.id, rule.is_active)} />
                            <Button variant="ghost" size="icon" onClick={() => {
                        setRuleToDelete(rule.id);
                        setDeleteDialogOpen(true);
                      }}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Agendamento */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>Agendamento Automático</CardTitle>
                  {schedule?.is_enabled && <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sistema Ativo
                    </Badge>}
                </div>
              </div>
              <CardDescription>
                Configure execuções automáticas gerenciadas pelo Cron Master
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {schedule?.is_enabled}

              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <Label htmlFor="schedule-enabled" className="text-base font-medium">
                    Ativar Execução Programada
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Configure e ative a execução automática das suas regras de automação
                  </p>
                </div>
                <Switch id="schedule-enabled" checked={schedule?.is_enabled || false} onCheckedChange={checked => toggleSchedule(checked)} disabled={scheduleLoading || rules.length === 0} />
              </div>

              {schedule?.is_enabled && <>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequência de Execução</Label>
                    <Select value={executionsPerDay.toString()} onValueChange={value => {
                  const executions = parseInt(value);
                  setExecutionsPerDay(executions);
                  createOrUpdateSchedule({
                    is_enabled: true,
                    executions_per_day: executions
                  });
                }} disabled={scheduleLoading}>
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">
                          1x por dia ({getLocalTimePreview(1)[0]})
                        </SelectItem>
                        <SelectItem value="2">
                          2x por dia ({getLocalTimePreview(2).join(', ')})
                        </SelectItem>
                        <SelectItem value="3">
                          3x por dia ({getLocalTimePreview(3).join(', ')})
                        </SelectItem>
                        <SelectItem value="4">
                          4x por dia ({getLocalTimePreview(4).join(', ')})
                        </SelectItem>
                        <SelectItem value="6">6x por dia (a cada 4h)</SelectItem>
                        <SelectItem value="8">8x por dia (a cada 3h)</SelectItem>
                        <SelectItem value="12">12x por dia (a cada 2h)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {schedule.scheduled_times && schedule.scheduled_times.length > 0 && <div className="rounded-lg bg-muted p-4 space-y-2">
                      <p className="text-sm font-medium">
                        Horários programados (horário local - BRT):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {schedule.scheduled_times.map((time: string, idx: number) => <Badge key={idx} variant="secondary" className="font-mono">
                            {convertUTCToLocal(time)}
                          </Badge>)}
                      </div>
                    </div>}

                  {schedule.last_execution_at && <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Última execução:</span>{" "}
                      {formatDistanceToNow(new Date(schedule.last_execution_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
                    </div>}

                  {schedule.next_execution_at && <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Próxima execução:</span>{" "}
                      {formatDistanceToNow(new Date(schedule.next_execution_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
                    </div>}

                  
                </>}

              {rules.length === 0 && <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Configure pelo menos uma automação antes de ativar o agendamento
                </div>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Monitor */}
        <TabsContent value="monitor">
          <CronMasterMonitor clientId={clientId} showClientColumn={false} />
        </TabsContent>
      </Tabs>

      {/* Import Dialog */}
      <ImportAutomationTemplateDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} clientId={clientId || ""} onImported={handleImported} />

      {/* Edit Values Dialog */}
      <EditAutomationValuesDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} rule={ruleToEdit} onSave={handleSaveConditions} />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover automação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A automação será removida permanentemente
              deste cliente, mas o template original será preservado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRule}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Logs Confirmation Dialog */}
      <AlertDialog open={clearLogsDialogOpen} onOpenChange={setClearLogsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os logs?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover permanentemente todos os {logs.length} logs de execução de automações deste cliente.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearingLogs}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearLogs} disabled={clearingLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {clearingLogs ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Limpando...
                </> : <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Logs
                </>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Automation Progress Modal */}
      <AutomationProgressModal open={progressModalOpen} executionId={executionId} clientId={clientId || ''} onClose={() => setProgressModalOpen(false)} />
    </div>;
}