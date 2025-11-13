import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAutomationRules, AutomationRule } from "@/hooks/useAutomationRules";
import { useAutomationTemplates } from "@/hooks/useAutomationTemplates";
import { Loader2, Search, CheckCircle2, Zap, Package } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfigureAutomationDialog } from "./ConfigureAutomationDialog";

interface ImportAutomationTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onImported?: () => void;
}

export function ImportAutomationTemplateDialog({
  open,
  onOpenChange,
  clientId,
  onImported,
}: ImportAutomationTemplateDialogProps) {
  const { toast } = useToast();
  const { templates, rules, loading, importTemplateToClient, importConfiguredTemplate } = useAutomationRules(clientId);
  const { templates: templateGroups, loading: templateGroupsLoading, importTemplateToClient: importTemplateGroup } = useAutomationTemplates();
  const [importing, setImporting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationRule | null>(null);

  const importedTemplateIds = rules.map((rule) => rule.template_id).filter(Boolean);

  const filteredTemplates = templates.filter((template) =>
    template.rule_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTemplateGroups = templateGroups.filter((template) =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImport = async (templateId: string) => {
    setImporting(templateId);
    try {
      const template = await importTemplateToClient(templateId, clientId);
      if (template) {
        setSelectedTemplate(template as unknown as AutomationRule);
        setConfigureDialogOpen(true);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

  const handleImportTemplateGroup = async (templateId: string) => {
    setImporting(templateId);
    try {
      await importTemplateGroup(templateId, clientId);
      toast({
        title: "Template importado",
        description: "Todas as regras foram importadas com sucesso.",
      });
      onImported?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao importar template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(null);
    }
  };

  const handleConfirmConfiguration = async (configuredConditions: any) => {
    if (!selectedTemplate) return;

    try {
      await importConfiguredTemplate(selectedTemplate.id, clientId, configuredConditions);
      toast({
        title: "Template importado",
        description: "A automação foi importada e ativada com sucesso.",
      });
      onImported?.();
      onOpenChange(false);
      setConfigureDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
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

  const getConditionsSummary = (conditions: any) => {
    if (!conditions?.conditions) return "Sem condições";
    const count = conditions.conditions.length;
    const logic = conditions.logic === "AND" ? "todas" : "qualquer";
    return `Quando ${logic} de ${count} ${count === 1 ? "condição" : "condições"}`;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Importar Automações</DialogTitle>
            <DialogDescription>
              Escolha entre importar uma regra individual ou um template completo
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="rules" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rules">
                <Zap className="w-4 h-4 mr-2" />
                Regras Individuais
              </TabsTrigger>
              <TabsTrigger value="templates">
                <Package className="w-4 h-4 mr-2" />
                Templates
              </TabsTrigger>
            </TabsList>

            {/* Tab: Regras Individuais */}
            <TabsContent value="rules" className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar regras..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Rules List */}
              <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhum template encontrado com este termo."
                    : "Nenhum template disponível para importar."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((template) => {
                  const isImported = importedTemplateIds.includes(template.id);
                  const isImporting = importing === template.id;

                  return (
                    <Card
                      key={template.id}
                      className={`border-border/50 ${
                        isImported ? "opacity-50" : "hover:border-primary/50"
                      } transition-colors`}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{template.rule_name}</h4>
                              <Badge variant={getActionTypeBadge(template.action_type)}>
                                {getActionTypeLabel(template.action_type)}
                              </Badge>
                              {isImported && (
                                <Badge variant="outline" className="gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                Importado
                              </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getConditionsSummary(template.conditions)}
                            </p>
                          </div>
                          <Button
                            onClick={() => handleImport(template.id)}
                            disabled={isImported || isImporting}
                            size="sm"
                          >
                            {isImporting ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importando...
                              </>
                            ) : isImported ? (
                              "Já importado"
                            ) : (
                              "Importar"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        {/* Tab: Templates */}
        <TabsContent value="templates" className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Template Groups List */}
          <ScrollArea className="h-[400px] pr-4">
            {templateGroupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTemplateGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Nenhum template encontrado com este termo."
                    : "Nenhum template disponível para importar."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplateGroups.map((template) => {
                  const isImporting = importing === template.id;

                  return (
                    <Card
                      key={template.id}
                      className="border-border/50 hover:border-primary/50 transition-colors"
                    >
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold">{template.name}</h4>
                                {template.category && (
                                  <Badge variant="outline">{template.category}</Badge>
                                )}
                                <Badge variant="secondary">
                                  {template.rules?.length || 0} {template.rules?.length === 1 ? 'regra' : 'regras'}
                                </Badge>
                              </div>
                              {template.description && (
                                <p className="text-xs text-muted-foreground">
                                  {template.description}
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleImportTemplateGroup(template.id)}
                              disabled={isImporting}
                              size="sm"
                            >
                              {isImporting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Importando...
                                </>
                              ) : (
                                "Importar Todas"
                              )}
                            </Button>
                          </div>

                          {/* Preview of rules */}
                          {template.rules && template.rules.length > 0 && (
                            <div className="space-y-2 pt-3 border-t">
                              <div className="text-xs font-medium text-muted-foreground">
                                Regras incluídas:
                              </div>
                              <div className="space-y-1">
                                {template.rules.slice(0, 3).map((templateRule: any) => (
                                  <div 
                                    key={templateRule.id}
                                    className="flex items-center gap-2 text-xs"
                                  >
                                    <Badge variant="outline" className="text-xs">
                                      {getActionTypeLabel(templateRule.rule?.action_type)}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {templateRule.rule?.rule_name}
                                    </span>
                                  </div>
                                ))}
                                {template.rules.length > 3 && (
                                  <div className="text-xs text-muted-foreground italic">
                                    + {template.rules.length - 3} mais {template.rules.length - 3 === 1 ? 'regra' : 'regras'}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </DialogContent>
  </Dialog>

    {selectedTemplate && (
      <ConfigureAutomationDialog
        open={configureDialogOpen}
        onOpenChange={setConfigureDialogOpen}
        template={selectedTemplate}
        onConfirm={handleConfirmConfiguration}
      />
    )}
    </>
  );
}
