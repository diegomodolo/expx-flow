import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Settings } from "lucide-react";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useAutomationRecommendations } from "@/hooks/useAutomationRecommendations";
import { useAutomationLogs } from "@/hooks/useAutomationLogs";
import { useAutomationSettings } from "@/hooks/useAutomationSettings";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Download, Edit, Trash, Check, X, RotateCcw } from "lucide-react";
import { TemplateEditorDialog } from "@/components/automations/TemplateEditorDialog";
import { translateObjective } from "@/components/automations/CampaignObjectiveSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Automacoes = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [prefixInput, setPrefixInput] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>('all');
  const { templates, loading: templatesLoading, createTemplate, updateRule, deleteRule } = useAutomationRules();
  const { recommendations, approveRecommendation, rejectRecommendation } = useAutomationRecommendations();
  const { logs, rollbackAction, fetchLogs } = useAutomationLogs(null, 50);
  const { settings, loading: settingsLoading, updateSettings } = useAutomationSettings();
  const { toast } = useToast();

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause_campaign: 'Pausar Campanha',
      activate_campaign: 'Ativar Campanha',
      increase_budget: 'Aumentar Orçamento',
      decrease_budget: 'Reduzir Orçamento',
      duplicate_campaign: 'Duplicar Campanha',
      pause_adset: 'Pausar Ad Set',
      activate_adset: 'Ativar Ad Set',
      increase_adset_budget: 'Aumentar Orçamento Ad Set',
      decrease_adset_budget: 'Reduzir Orçamento Ad Set',
      duplicate_adset: 'Duplicar Ad Set',
      pause_ad: 'Pausar Criativo',
      activate_ad: 'Ativar Criativo',
      duplicate_ad: 'Duplicar Criativo',
      notify_only: 'Apenas Notificar',
      duplicate_for_ab_test: 'Teste A/B',
    };
    return labels[actionType] || actionType;
  };

  const filteredTemplates = templates.filter(t => 
    entityTypeFilter === 'all' || t.entity_type === entityTypeFilter || (!t.entity_type && entityTypeFilter === 'campaign')
  );

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleSaveTemplate = async (data: any) => {
    if (editingTemplate) {
      await updateRule(editingTemplate.id, data);
    } else {
      await createTemplate(data);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm("Tem certeza que deseja deletar este template?")) {
      await deleteRule(templateId);
    }
  };

  const handleSaveSettings = async () => {
    const trimmedPrefix = prefixInput.trim();
    if (!trimmedPrefix) return;
    await updateSettings({ campaign_name_prefix: trimmedPrefix });
  };

  // Initialize prefix input when settings load
  useEffect(() => {
    if (settings?.campaign_name_prefix) {
      setPrefixInput(settings.campaign_name_prefix);
    }
  }, [settings]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automações de Campanhas</h1>
          <p className="text-muted-foreground">
            Sistema de automação inteligente com templates e aprovação humana
          </p>
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates">
              📋 Templates ({templates.length})
            </TabsTrigger>
            <TabsTrigger value="recommendations">
              🔔 Recomendações 
              {recommendations.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {recommendations.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs">
              📊 Histórico ({logs.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          {/* ABA TEMPLATES */}
          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Templates Globais</CardTitle>
                    <CardDescription>
                      Crie templates de automação para aplicar em vários clientes
                    </CardDescription>
                  </div>
                  <Button onClick={() => {
                    setEditingTemplate(null);
                    setEditorOpen(true);
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Template
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Tabs value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                    <TabsList>
                      <TabsTrigger value="all">Todas ({templates.length})</TabsTrigger>
                      <TabsTrigger value="campaign">
                        📊 Campanhas ({templates.filter(t => t.entity_type === 'campaign' || !t.entity_type).length})
                      </TabsTrigger>
                      <TabsTrigger value="adset">
                        🎯 Ad Sets ({templates.filter(t => t.entity_type === 'adset').length})
                      </TabsTrigger>
                      <TabsTrigger value="ad">
                        🎨 Criativos ({templates.filter(t => t.entity_type === 'ad').length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {templatesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando templates...
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nenhum template encontrado</AlertTitle>
                    <AlertDescription>
                      {entityTypeFilter === 'all' 
                        ? 'Crie seu primeiro template de automação para começar.'
                        : `Nenhum template para ${entityTypeFilter === 'campaign' ? 'campanhas' : entityTypeFilter === 'adset' ? 'ad sets' : 'criativos'}.`
                      }
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {filteredTemplates.map((template) => (
                      <Card key={template.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {template.rule_name}
                                <Badge variant="outline">
                                  {template.entity_type === 'adset' && '🎯 Ad Set'}
                                  {template.entity_type === 'ad' && '🎨 Criativo'}
                                  {(!template.entity_type || template.entity_type === 'campaign') && '📊 Campanha'}
                                </Badge>
                                <Badge variant={template.is_active ? "default" : "secondary"}>
                                  {template.is_active ? "Ativo" : "Inativo"}
                                </Badge>
                              </CardTitle>
                              {template.rule_description && (
                                <CardDescription>{template.rule_description}</CardDescription>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Importar para Cliente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar Template
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                >
                                  <Trash className="mr-2 h-4 w-4" />
                                  Deletar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="font-medium">Ação:</span> {getActionLabel(template.action_type)}
                            </div>
                            <div>
                              <span className="font-medium">Janela:</span> {template.time_window_days} dia(s)
                            </div>
                            <div>
                              <span className="font-medium">Execuções:</span> {template.execution_count}x
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <Badge variant="secondary" className="gap-1">
                              ⚙️ Valores configuráveis na importação
                            </Badge>
                          </div>
                          {template.campaign_objectives && template.campaign_objectives.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                Aplica-se apenas aos objetivos:
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {template.campaign_objectives.map((obj: string) => (
                                  <Badge key={obj} variant="outline" className="text-xs">
                                    {translateObjective(obj)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA RECOMENDAÇÕES */}
          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>Recomendações Pendentes</CardTitle>
                <CardDescription>
                  Aprove ou rejeite ações sugeridas pela automação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nenhuma recomendação pendente</AlertTitle>
                    <AlertDescription>
                      Quando regras com modo "Apenas Notificar" forem acionadas, aparecerão aqui.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((rec: any) => (
                      <Card key={rec.id} className="border-l-4 border-l-yellow-500">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">
                                {rec.campaign?.name || 'Campanha'}
                              </CardTitle>
                              <CardDescription>
                                {rec.client?.name} • {getActionLabel(rec.recommended_action)}
                              </CardDescription>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => approveRecommendation(rec.id)}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Aprovar
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => rejectRecommendation(rec.id)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Rejeitar
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Motivo:</strong> {rec.reason}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Sugerido há {new Date(rec.created_at).toLocaleString('pt-BR')}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA LOGS */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Execuções</CardTitle>
                <CardDescription>
                  Últimas 50 ações executadas pela automação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Regra</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Campanha</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Renomeação</TableHead>
                      <TableHead>Recovery</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detalhes</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.executed_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-sm">{log.rule?.rule_name}</TableCell>
                        <TableCell className="text-sm">{log.client?.name}</TableCell>
                        <TableCell className="text-sm">{log.campaign?.name}</TableCell>
                        <TableCell className="text-sm">{getActionLabel(log.action_type)}</TableCell>
                        <TableCell className="text-xs">
                          {log.old_name && log.new_name && (
                            <div className="space-y-1">
                              <div className="text-muted-foreground line-through">
                                {log.old_name.substring(0, 30)}...
                              </div>
                              <div className="font-medium text-green-600">
                                {log.new_name.substring(0, 30)}...
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.recovery_trigger_enabled && (
                            <Badge variant={log.recovery_executed ? "outline" : "secondary"} className="text-xs">
                              {log.recovery_executed ? (
                                <>
                                  🔄 {log.recovery_executed_at && format(new Date(log.recovery_executed_at), 'dd/MM HH:mm')}
                                </>
                              ) : (
                                <>
                                  ⏱️ {log.recovery_scheduled_for && format(new Date(log.recovery_scheduled_for), 'dd/MM HH:mm')}
                                </>
                              )}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              log.action_result === 'success' ? 'default' : 
                              log.action_result === 'error' ? 'destructive' : 
                              'outline'
                            }
                            className={log.action_result === 'skipped' ? 'text-muted-foreground' : ''}
                          >
                            {log.action_result === 'success' && '✅ Sucesso'}
                            {log.action_result === 'error' && '❌ Erro'}
                            {log.action_result === 'skipped' && '⏭️ Sem Ação'}
                          </Badge>
                          {log.rolled_back && (
                            <Badge variant="secondary" className="ml-2">Revertido</Badge>
                          )}
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
                        <TableCell>
                          {log.action_result === 'success' && !log.rolled_back && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => rollbackAction(log.id)}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA CONFIGURAÇÕES */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Configurações de Automação</CardTitle>
                <CardDescription>
                  Configure o comportamento global das automações
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando configurações...
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                      <div>
                        <h4 className="font-medium mb-1">Recovery Triggers</h4>
                        <p className="text-sm text-muted-foreground">
                          Processar gatilhos de reativação pendentes manualmente
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const { error } = await supabase.functions.invoke('process-recovery-triggers');
                            if (error) throw error;
                            toast({
                              title: "Recovery triggers processados!",
                              description: "As reativações pendentes foram processadas com sucesso.",
                            });
                            fetchLogs();
                          } catch (error: any) {
                            toast({
                              title: "Erro ao processar recovery triggers",
                              description: error.message,
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        🔄 Processar Recoveries
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="prefix">Prefixo do Nome da Campanha</Label>
                      <Input 
                        id="prefix"
                        value={prefixInput}
                        onChange={(e) => setPrefixInput(e.target.value)}
                        placeholder="SHEGrowth"
                        maxLength={50}
                      />
                      <p className="text-sm text-muted-foreground">
                        Este prefixo será adicionado ao nome das campanhas quando as automações fizerem alterações.
                      </p>
                      <div className="mt-2 p-3 bg-muted rounded-md">
                        <p className="text-xs font-medium mb-1">Preview:</p>
                        <code className="text-xs bg-background px-2 py-1 rounded">
                          [{prefixInput || 'SHEGrowth'}] Campanha Teste - Pausada (CPA Alto)
                        </code>
                      </div>
                    </div>
                    <Button onClick={handleSaveSettings} disabled={!prefixInput.trim()}>
                      Salvar Configurações
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TemplateEditorDialog
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setEditingTemplate(null);
          }}
          template={editingTemplate}
          onSave={handleSaveTemplate}
        />
      </div>
    </DashboardLayout>
  );
};

export default Automacoes;
