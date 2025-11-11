import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AutomationRule } from "@/hooks/useAutomationRules";

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AutomationRule | null;
  onSave: (data: any) => Promise<any>;
}

export const TemplateEditorDialog = ({ open, onOpenChange, template, onSave }: TemplateEditorDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rule_name: template?.rule_name || "",
    rule_description: template?.rule_description || "",
    rule_order: template?.rule_order || 1,
    time_window_days: template?.time_window_days || 7,
    action_type: template?.action_type || "notify_only",
    is_active: template?.is_active ?? true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const templateData = {
      ...formData,
      conditions: {
        logic: "AND" as const,
        conditions: [
          {
            field: "cpa",
            operator: ">" as const,
            value: 100,
            type: "number" as const,
          }
        ]
      },
      action_config: {},
      budget_safety_limits: {
        max_daily_budget_increase_percent: 20,
        max_daily_budget_decrease_percent: 30,
      },
      execution_limits: {
        max_executions_per_day: 3,
        cooldown_hours: 4,
      },
      scope_filters: {},
      campaign_objectives: null,
    };

    await onSave(templateData);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template de Automação"}</DialogTitle>
          <DialogDescription>
            Configure as regras de automação que serão aplicadas às campanhas
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule_name">Nome da Regra *</Label>
            <Input
              id="rule_name"
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              placeholder="Ex: Pausar campanhas com CPA alto"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule_description">Descrição</Label>
            <Textarea
              id="rule_description"
              value={formData.rule_description}
              onChange={(e) => setFormData({ ...formData, rule_description: e.target.value })}
              placeholder="Descreva quando esta regra deve ser aplicada"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time_window_days">Janela de Tempo (dias)</Label>
              <Input
                id="time_window_days"
                type="number"
                min="1"
                value={formData.time_window_days}
                onChange={(e) => setFormData({ ...formData, time_window_days: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rule_order">Prioridade</Label>
              <Input
                id="rule_order"
                type="number"
                min="1"
                value={formData.rule_order}
                onChange={(e) => setFormData({ ...formData, rule_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action_type">Tipo de Ação</Label>
            <Select
              value={formData.action_type}
              onValueChange={(value) => setFormData({ ...formData, action_type: value })}
            >
              <SelectTrigger id="action_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notify_only">🔔 Apenas Notificar</SelectItem>
                <SelectItem value="pause_campaign">⏸️ Pausar Campanha</SelectItem>
                <SelectItem value="activate_campaign">▶️ Ativar Campanha</SelectItem>
                <SelectItem value="increase_budget">📈 Aumentar Orçamento</SelectItem>
                <SelectItem value="decrease_budget">📉 Reduzir Orçamento</SelectItem>
                <SelectItem value="duplicate_for_ab_test">🔬 Teste A/B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Template Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Desative para pausar temporariamente esta regra
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : template ? "Atualizar" : "Criar Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
