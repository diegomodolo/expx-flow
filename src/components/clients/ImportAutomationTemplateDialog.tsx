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
import { useToast } from "@/hooks/use-toast";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { Loader2, Search, CheckCircle2, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const { templates, rules, loading, importTemplateToClient } = useAutomationRules();
  const [importing, setImporting] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const importedTemplateIds = rules.map((rule) => rule.template_id).filter(Boolean);

  const filteredTemplates = templates.filter((template) =>
    template.rule_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleImport = async (templateId: string) => {
    setImporting(templateId);
    try {
      await importTemplateToClient(templateId, clientId);
      toast({
        title: "Template importado",
        description: "A automação foi importada e ativada com sucesso.",
      });
      onImported?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao importar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(null);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Importar Template de Automação</DialogTitle>
          <DialogDescription>
            Selecione um template para importar e ativar neste cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {/* Templates List */}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
