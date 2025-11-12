import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AutomationRule } from "@/hooks/useAutomationRules";
import { CheckCircle2, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ConfigureAutomationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AutomationRule;
  onConfirm: (configuredConditions: any) => Promise<void>;
}

const FIELD_LABELS: Record<string, string> = {
  cpa: "CPA (Custo por Aquisição)",
  ctr: "CTR (%)",
  conversions: "Conversões",
  spend: "Gasto (R$)",
  impressions: "Impressões",
  clicks: "Cliques",
  frequency: "Frequência",
  reach: "Alcance",
  cost_per_click: "CPC (Custo por Clique)",
  roas: "ROAS",
};

const OPERATOR_LABELS: Record<string, string> = {
  "<": "menor que",
  ">": "maior que",
  "=": "igual a",
  "!=": "diferente de",
  ">=": "maior ou igual a",
  "<=": "menor ou igual a",
};

export function ConfigureAutomationDialog({
  open,
  onOpenChange,
  template,
  onConfirm,
}: ConfigureAutomationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [configuredConditions, setConfiguredConditions] = useState(() => {
    return template.conditions.conditions.map((condition: any) => ({
      ...condition,
      operator: condition.operator || ">",
      value: condition.value ?? 100,
    }));
  });

  const handleConditionChange = (index: number, field: string, value: any) => {
    const newConditions = [...configuredConditions];
    newConditions[index] = {
      ...newConditions[index],
      [field]: value,
    };
    setConfiguredConditions(newConditions);
  };

  const isValid = configuredConditions.every(
    (c) => c.operator && c.value !== null && c.value !== undefined
  );

  const handleConfirm = async () => {
    if (!isValid) return;

    setLoading(true);
    try {
      await onConfirm({
        logic: template.conditions.logic,
        conditions: configuredConditions,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error confirming configuration:", error);
    } finally {
      setLoading(false);
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      pause_campaign: "⏸️ Pausar Campanha",
      activate_campaign: "▶️ Ativar Campanha",
      increase_budget: "📈 Aumentar Orçamento",
      decrease_budget: "📉 Reduzir Orçamento",
      notify_only: "🔔 Apenas Notificar",
      duplicate_for_ab_test: "🔬 Teste A/B",
    };
    return labels[actionType] || actionType;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Automação</DialogTitle>
          <DialogDescription>
            Configure os valores das condições para esta automação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{template.rule_name}</h3>
                {template.rule_description && (
                  <p className="text-sm text-muted-foreground">{template.rule_description}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="outline">{getActionTypeLabel(template.action_type)}</Badge>
                  <Badge variant="secondary">
                    Lógica: {template.conditions.logic === "AND" ? "Todas" : "Qualquer uma"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Configure os valores para cada condição. Os valores podem ser ajustados depois.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-base font-semibold">📊 Configure as Condições</Label>
            {configuredConditions.map((condition, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Condição {index + 1}
                      </Badge>
                      <span className="text-sm font-medium">
                        {FIELD_LABELS[condition.field] || condition.field}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Operador</Label>
                        <Select
                          value={condition.operator}
                          onValueChange={(value) =>
                            handleConditionChange(index, "operator", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OPERATOR_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Valor</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={condition.value ?? 0}
                          onChange={(e) =>
                            handleConditionChange(
                              index,
                              "value",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Se {FIELD_LABELS[condition.field]?.toLowerCase()} for{" "}
                      {OPERATOR_LABELS[condition.operator]} {condition.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Resumo da Regra
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>SE</strong>{" "}
                    {template.conditions.logic === "AND" ? "todas" : "qualquer uma"} das condições:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    {configuredConditions.map((condition, index) => (
                      <li key={index}>
                        {FIELD_LABELS[condition.field]} {OPERATOR_LABELS[condition.operator]}{" "}
                        {condition.value}
                      </li>
                    ))}
                  </ul>
                  <p className="pt-2">
                    <strong>ENTÃO:</strong> {getActionTypeLabel(template.action_type)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || loading}>
            {loading ? "Importando..." : "Importar e Ativar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
