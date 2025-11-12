import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useAutomationLogs } from "@/hooks/useAutomationLogs";
import { useClientDetails } from "@/hooks/useClientDetails";
import { ImportAutomationTemplateDialog } from "@/components/clients/ImportAutomationTemplateDialog";
import { EditAutomationValuesDialog } from "@/components/clients/EditAutomationValuesDialog";
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
  Pencil
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  const { logs, loading: logsLoading, fetchLogs, rollbackAction } = useAutomationLogs(clientId);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [ruleToEdit, setRuleToEdit] = useState<any>(null);

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
    
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('execute-campaign-automations', {
        body: { client_id: clientId }
      });

      if (error) throw error;

      toast({
        title: "Automações executadas",
        description: `${data?.processed || 0} automações processadas com sucesso.`,
      });
      
      // Refresh logs after execution
      await fetchLogs();
    } catch (error: any) {
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

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Execução</CardTitle>
          <CardDescription>
            Histórico das últimas 50 execuções de automações
          </CardDescription>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Regra</TableHead>
                    <TableHead>Campanha</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Alterações</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
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
                      <TableCell className="text-sm">
                        {log.campaign?.name || "-"}
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
    </div>
  );
}
