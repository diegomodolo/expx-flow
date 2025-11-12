import { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { useAutomationRecommendations } from "@/hooks/useAutomationRecommendations";
import { useAutomationLogs } from "@/hooks/useAutomationLogs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Download, Edit, Trash, Check, X, RotateCcw } from "lucide-react";
import { TemplateEditorDialog } from "@/components/automations/TemplateEditorDialog";
import { translateObjective } from "@/components/automations/CampaignObjectiveSelector";

const Automacoes = () => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const { templates, loading: templatesLoading, createTemplate, updateRule, deleteRule } = useAutomationRules();
  const { recommendations, approveRecommendation, rejectRecommendation } = useAutomationRecommendations();
  const { logs, rollbackAction } = useAutomationLogs(null, 50);

  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause_campaign: 'Pausar Campanha',
      activate_campaign: 'Ativar Campanha',
      increase_budget: 'Aumentar Orçamento',
      decrease_budget: 'Reduzir Orçamento',
      notify_only: 'Apenas Notificar',
      duplicate_for_ab_test: 'Teste A/B',
    };
    return labels[actionType] || actionType;
  };

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
                {templatesLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando templates...
                  </div>
                ) : templates.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Nenhum template criado</AlertTitle>
                    <AlertDescription>
                      Crie seu primeiro template de automação para começar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {templates.map((template) => (
                      <Card key={template.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg flex items-center gap-2">
                                {template.rule_name}
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
                      <TableHead>Status</TableHead>
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
                          <Badge variant={log.action_result === 'success' ? 'default' : 'destructive'}>
                            {log.action_result === 'success' ? 'Sucesso' : 'Erro'}
                          </Badge>
                          {log.rolled_back && (
                            <Badge variant="secondary" className="ml-2">Revertido</Badge>
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
