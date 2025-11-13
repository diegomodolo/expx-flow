import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, GripVertical, Plus } from "lucide-react";
import { useAutomationRules } from "@/hooks/useAutomationRules";
import { AutomationRuleTemplate } from "@/hooks/useAutomationTemplates";

interface TemplateGroupEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AutomationRuleTemplate | null;
  onSave: (data: {
    name: string;
    description: string | null;
    category: string | null;
    ruleIds: string[];
  }) => Promise<void>;
}

export function TemplateGroupEditorDialog({
  open,
  onOpenChange,
  template,
  onSave,
}: TemplateGroupEditorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [selectedRuleIds, setSelectedRuleIds] = useState<string[]>([]);
  
  const { templates: baseRules, loading: rulesLoading } = useAutomationRules();

  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || "");
      setCategory(template.category || "");
      setSelectedRuleIds(template.rules?.map(r => r.rule_id) || []);
    } else {
      setName("");
      setDescription("");
      setCategory("");
      setSelectedRuleIds([]);
    }
  }, [template, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    if (selectedRuleIds.length === 0) {
      return;
    }

    setLoading(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        category: category.trim() || null,
        ruleIds: selectedRuleIds,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving template:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleSelection = (ruleId: string) => {
    setSelectedRuleIds(prev =>
      prev.includes(ruleId)
        ? prev.filter(id => id !== ruleId)
        : [...prev, ruleId]
    );
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause_campaign: "Pausar Campanha",
      activate_campaign: "Ativar Campanha",
      increase_budget: "Aumentar Orçamento",
      decrease_budget: "Reduzir Orçamento",
      duplicate_campaign: "Duplicar Campanha",
      pause_adset: "Pausar Ad Set",
      activate_adset: "Ativar Ad Set",
      increase_adset_budget: "Aumentar Orçamento Ad Set",
      decrease_adset_budget: "Reduzir Orçamento Ad Set",
      duplicate_adset: "Duplicar Ad Set",
      pause_ad: "Pausar Criativo",
      activate_ad: "Ativar Criativo",
      duplicate_ad: "Duplicar Criativo",
    };
    return labels[actionType] || actionType;
  };

  const getEntityTypeLabel = (entityType: string) => {
    const labels: Record<string, string> = {
      campaign: "Campanha",
      adset: "Conjunto de Anúncios",
      ad: "Anúncio",
    };
    return labels[entityType] || entityType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {template ? "Editar Template" : "Novo Template"}
          </DialogTitle>
          <DialogDescription>
            Agrupe várias regras em um template para importar todas de uma vez
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Template *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Otimização E-commerce Completa"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o objetivo deste template..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: E-commerce, Leadgen, Branding"
                />
              </div>

              <div className="space-y-2">
                <Label>Selecionar Regras *</Label>
                {rulesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : baseRules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma regra base disponível.</p>
                    <p className="text-sm mt-2">
                      Crie regras na aba "Regras" primeiro.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 border rounded-lg p-4">
                    {baseRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <Checkbox
                          id={`rule-${rule.id}`}
                          checked={selectedRuleIds.includes(rule.id)}
                          onCheckedChange={() => toggleRuleSelection(rule.id)}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <label
                              htmlFor={`rule-${rule.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {rule.rule_name}
                            </label>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                {getEntityTypeLabel(rule.entity_type || "campaign")}
                              </Badge>
                              <Badge variant="secondary">
                                {getActionTypeLabel(rule.action_type)}
                              </Badge>
                            </div>
                          </div>
                          {rule.rule_description && (
                            <p className="text-sm text-muted-foreground">
                              {rule.rule_description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedRuleIds.length > 0 && (
                <div className="bg-accent/50 p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    {selectedRuleIds.length} {selectedRuleIds.length === 1 ? "regra selecionada" : "regras selecionadas"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ao importar este template, todas as regras selecionadas serão criadas no cliente.
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || selectedRuleIds.length === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {template ? "Salvar Alterações" : "Criar Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
