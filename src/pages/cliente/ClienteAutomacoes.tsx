import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useAutomationLogs } from "@/hooks/useAutomationLogs";
import { useAutomationSchedule } from "@/hooks/useAutomationSchedule";
import { useClientDetails } from "@/hooks/useClientDetails";
import { ImportAutomationTemplateDialog } from "@/components/clients/ImportAutomationTemplateDialog";
import { EditAutomationValuesDialog } from "@/components/clients/EditAutomationValuesDialog";
import { AutomationProgressModal } from "@/components/clients/AutomationProgressModal";
import { translateObjective } from "@/components/automations/CampaignObjectiveSelector";
import { 
  Play, 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  AlertCircle,
  Undo2,
  Zap,
  Pencil,
  ArrowRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

export default function ClienteAutomacoes() {
  const { id: clientId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { client } = useClientDetails(clientId || "");
  const { rules, loading: rulesLoading, updateRule, updateRuleConditions, deleteRule, fetchRules } = useAutomationRules(clientId);
  const { logs, loading: logsLoading, fetchLogs, rollbackAction, clearLogs } = useAutomationLogs(clientId);
  const { schedule, loading: scheduleLoading, createOrUpdateSchedule, toggleSchedule } = useAutomationSchedule(clientId);
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

  // Sync executionsPerDay with schedule
  useEffect(() => {
    if (schedule?.executions_per_day) {
      setExecutionsPerDay(schedule.executions_per_day);
    }
  }, [schedule]);

  const filteredLogs = logs.filter(log => 
    logEntityFilter === 'all' || log.entity_type === logEntityFilter
  );

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      await updateRule(ruleId, { is_active: !currentStatus });
      toast({
        title: !currentStatus ? "Automação ativada" : "Automação desativada",
        description: "O status foi atualizado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    try {
      await deleteRule(ruleToDelete);
      toast({
        title: "Automação removida",
        description: "A automação foi removida com sucesso.",
      });
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
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
      const { data, error } = await supabase.functions.invoke(
        'execute-campaign-automations',
        { 
          body: { 
            client_id: clientId,
            execution_id: newExecutionId 
          }
        }
      );

      if (error) throw error;

      await fetchLogs();
      
      toast({
        title: "Automações concluídas",
        description: `${data?.totalActioned || 0} ações executadas com sucesso.`,
      });
    } catch (error: any) {
      console.error('Error executing automations:', error);
      toast({
        title: "Erro ao executar automações",
        description: error.message,
        variant: "destructive",
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

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause_campaign: "Pausar Campanha",
      activate_campaign: "Ativar Campanha",
      increase_budget: "Aumentar Budget",
      decrease_budget: "Reduzir Budget",
      rename_campaign: "Renomear Campanha",
    };
    return labels[actionType] || actionType;
  };

  const getActionTypeBadge = (actionType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pause_campaign: "destructive",
      activate_campaign: "default",
      increase_budget: "default",
      decrease_budget: "secondary",
      rename_campaign: "outline",
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
        variant: "destructive",
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
      roas: "ROAS",
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
      "!=": "diferente de",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Automações</h2>
          <p className="text-muted-foreground">
            Gerencie automações para {client?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExecuteAll}
            disabled={executing || rules.length === 0}
            variant="outline"
          >
            {executing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Agora
              </>
            )}
          </Button>
          <Button onClick={() => setImportDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Importar Template
          </Button>
        </div>
      </div>

      {/* Active Automations */}
      <Card>
        <CardHeader>
          <CardTitle>Automações Ativas</CardTitle>
          <CardDescription>
            {rules.length} {rules.length === 1 ? "automação importada" : "automações importadas"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Nenhuma automação importada ainda.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Clique em "Importar Template" para começar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule) => (
                <Card key={rule.id} className="border-border/50">
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
                        {rule.campaign_objectives && rule.campaign_objectives.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Aplica-se apenas aos objetivos:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {rule.campaign_objectives.map(obj => (
                                <Badge key={obj} variant="outline" className="text-xs">
                                  {translateObjective(obj)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {rule.conditions?.conditions && rule.conditions.conditions.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                              Condições configuradas:
                            </div>
                            <div className="space-y-1">
                              {rule.conditions.conditions.map((condition: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm">
                                  <Badge variant="secondary" className="text-xs">
                                    {getFieldLabel(condition.field)}
                                  </Badge>
                                  <span className="text-muted-foreground">
                                    {getOperatorLabel(condition.operator)}
                                  </span>
                                  <span className="font-medium">
                                    {formatConditionValue(condition.field, condition.value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Lógica: <strong>{rule.conditions.logic === "AND" ? "Todas" : "Qualquer uma"}</strong> das condições
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRuleToEdit(rule);
                            setEditDialogOpen(true);
                          }}
                          title="Editar valores"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => handleToggleRule(rule.id, rule.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setRuleToDelete(rule.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduling Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Agendamento Automático
          </CardTitle>
          <CardDescription>
            Configure execuções automáticas das automações em horários programados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="schedule-enabled" className="text-base font-medium">
                Ativar execução automática
              </Label>
              <p className="text-sm text-muted-foreground">
                Executar automações automaticamente em background
              </p>
            </div>
            <Switch
              id="schedule-enabled"
              checked={schedule?.is_enabled || false}
              onCheckedChange={(checked) => toggleSchedule(checked)}
              disabled={scheduleLoading || rules.length === 0}
            />
          </div>

          {schedule?.is_enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequência de Execução</Label>
                <Select
                  value={executionsPerDay.toString()}
                  onValueChange={(value) => {
                    const executions = parseInt(value);
                    setExecutionsPerDay(executions);
                    createOrUpdateSchedule({
                      is_enabled: true,
                      executions_per_day: executions
                    });
                  }}
                  disabled={scheduleLoading}
                >
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x por dia (00:00)</SelectItem>
                    <SelectItem value="2">2x por dia (00:00, 12:00)</SelectItem>
                    <SelectItem value="3">3x por dia (00:00, 08:00, 16:00)</SelectItem>
                    <SelectItem value="4">4x por dia (00:00, 06:00, 12:00, 18:00)</SelectItem>
                    <SelectItem value="6">6x por dia (a cada 4h)</SelectItem>
                    <SelectItem value="8">8x por dia (a cada 3h)</SelectItem>
                    <SelectItem value="12">12x por dia (a cada 2h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {schedule.scheduled_times && schedule.scheduled_times.length > 0 && (
                <div className="rounded-lg bg-muted p-4 space-y-2">
                  <p className="text-sm font-medium">Horários programados:</p>
                  <div className="flex flex-wrap gap-2">
                    {schedule.scheduled_times.map((time) => (
                      <Badge key={time} variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {time}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {schedule.last_execution_at && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Última execução:</span>{" "}
                  {formatDistanceToNow(new Date(schedule.last_execution_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              )}

              {schedule.next_execution_at && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Próxima execução:</span>{" "}
                  {formatDistanceToNow(new Date(schedule.next_execution_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              )}

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-4 text-sm text-amber-900 dark:text-amber-200 mt-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-semibold">⚙️ Configuração Manual Necessária</p>
                    <p>
                      Para que as automações executem automaticamente nos horários programados, 
                      você precisa configurar <strong>cron jobs</strong> no Supabase.
                    </p>
                    <p className="text-xs opacity-90">
                      <strong>O que são cron jobs?</strong> São tarefas agendadas que chamam 
                      automaticamente a função de automação nos horários definidos acima.
                    </p>
                    <div className="pt-2">
                      <a 
                        href="https://github.com/seu-repositorio/blob/main/supabase/CONFIGURE_AUTOMATION_CRON.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-md font-medium transition-colors"
                      >
                        📖 Ver Guia de Configuração
                      </a>
                    </div>
                    <p className="text-xs opacity-75 pt-2">
                      ℹ️ Por questões de segurança, o Supabase exige que cron jobs sejam criados manualmente via SQL Editor.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {rules.length === 0 && (
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-4 w-4 inline mr-2" />
              Configure pelo menos uma automação antes de ativar o agendamento
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Execução</CardTitle>
              <CardDescription>
                Histórico das últimas 50 execuções de automações
              </CardDescription>
            </div>
            {logs.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearLogsDialogOpen(true)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Logs
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma execução registrada ainda.
            </div>
          ) : (
            <>
              {/* Filtros por Tipo de Entidade */}
              <div className="flex gap-2 mb-4">
                <Button 
                  variant={logEntityFilter === 'all' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setLogEntityFilter('all')}
                >
                  Todos ({logs.length})
                </Button>
                <Button 
                  variant={logEntityFilter === 'campaign' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setLogEntityFilter('campaign')}
                >
                  📊 Campanhas ({logs.filter(l => l.entity_type === 'campaign').length})
                </Button>
                <Button 
                  variant={logEntityFilter === 'adset' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setLogEntityFilter('adset')}
                >
                  📁 Conjuntos ({logs.filter(l => l.entity_type === 'adset').length})
                </Button>
                <Button 
                  variant={logEntityFilter === 'ad' ? 'default' : 'outline'} 
                  size="sm"
                  onClick={() => setLogEntityFilter('ad')}
                >
                  🎨 Criativos ({logs.filter(l => l.entity_type === 'ad').length})
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead className="max-w-[300px]">Entidade Afetada</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Alterações</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getResultIcon(log.action_result)}
                          <Badge 
                            variant={
                              log.action_result === 'success' ? 'default' : 
                              log.action_result === 'error' ? 'destructive' : 
                              'outline'
                            }
                            className={log.action_result === 'skipped' ? 'text-muted-foreground' : ''}
                          >
                            {log.action_result === 'success' && 'Sucesso'}
                            {log.action_result === 'error' && 'Erro'}
                            {log.action_result === 'skipped' && 'Sem Ação'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.rule?.rule_name || "Regra removida"}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.entity_type === 'campaign' && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📊</span>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{log.campaign?.name}</span>
                              <Badge variant="outline" className="text-xs w-fit mt-1">Campanha</Badge>
                            </div>
                          </div>
                        )}
                        
                        {log.entity_type === 'adset' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">📁</span>
                              <span className="font-medium text-sm">{log.adset?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-6 text-xs text-muted-foreground">
                              <ArrowRight className="h-3 w-3" />
                              <span>{log.campaign?.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs w-fit ml-6 mt-1">Conjunto de Anúncios</Badge>
                          </div>
                        )}
                        
                        {log.entity_type === 'ad' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">🎨</span>
                              <span className="font-medium text-sm truncate max-w-[250px]">{log.ad?.name}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-6 text-xs text-muted-foreground">
                              <ArrowRight className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{log.adset?.name || 'Conjunto não disponível'}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-12 text-xs text-muted-foreground">
                              <ArrowRight className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{log.campaign?.name}</span>
                            </div>
                            <Badge variant="outline" className="text-xs w-fit ml-6 mt-1">Criativo</Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getActionTypeBadge(log.action_type)} className="text-xs">
                          {getActionTypeLabel(log.action_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.old_status && log.new_status && (
                          <span>{log.old_status} → {log.new_status}</span>
                        )}
                        {log.old_budget && log.new_budget && (
                          <span>R$ {log.old_budget} → R$ {log.new_budget}</span>
                        )}
                        {log.old_name && log.new_name && (
                          <span className="truncate max-w-[150px] block">
                            {log.old_name} → {log.new_name}
                          </span>
                        )}
                        {!log.old_status && !log.old_budget && !log.old_name && "-"}
                      </TableCell>
                      <TableCell className="text-xs max-w-[200px]">
                        {log.action_result === 'skipped' && log.metadata?.reason && (
                          <div className="text-muted-foreground">
                            <div className="font-medium">{log.metadata.reason}</div>
                            {log.metadata.conditions_checked && (
                              <div className="text-xs mt-1 text-muted-foreground/70">
                                {log.metadata.conditions_checked}
                              </div>
                            )}
                          </div>
                        )}
                        {log.action_result === 'error' && log.error_message && (
                          <div className="text-destructive text-xs">
                            {log.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDistanceToNow(new Date(log.executed_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        {!log.rolled_back && log.action_result === "success" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRollback(log.id)}
                          >
                            <Undo2 className="h-3 w-3 mr-1" />
                            Reverter
                          </Button>
                        )}
                        {log.rolled_back && (
                          <Badge variant="outline" className="text-xs">
                            Revertido
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ImportAutomationTemplateDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        clientId={clientId || ""}
        onImported={handleImported}
      />

      {/* Edit Values Dialog */}
      <EditAutomationValuesDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        rule={ruleToEdit}
        onSave={handleSaveConditions}
      />

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
            <AlertDialogAction
              onClick={handleClearLogs}
              disabled={clearingLogs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearingLogs ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Limpando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Logs
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Automation Progress Modal */}
      <AutomationProgressModal
        open={progressModalOpen}
        executionId={executionId}
        clientId={clientId || ''}
        onClose={() => setProgressModalOpen(false)}
      />
    </div>
  );
}
