import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface EditAutomationValuesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: any;
  onSave: (ruleId: string, updatedConditions: any) => Promise<void>;
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

export function EditAutomationValuesDialog({
  open,
  onOpenChange,
  rule,
  onSave,
}: EditAutomationValuesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [editedConditions, setEditedConditions] = useState<any[]>([]);

  useEffect(() => {
    if (rule?.conditions?.conditions) {
      setEditedConditions([...rule.conditions.conditions]);
    }
  }, [rule]);

  const handleConditionChange = (index: number, field: string, value: any) => {
    const newConditions = [...editedConditions];
    newConditions[index] = {
      ...newConditions[index],
      [field]: value,
    };
    setEditedConditions(newConditions);
  };

  const isValid = editedConditions.every(
    (c) => c.operator && c.value !== null && c.value !== undefined
  );

  const handleSave = async () => {
    if (!isValid || !rule) return;

    setLoading(true);
    try {
      await onSave(rule.id, {
        logic: rule.conditions.logic,
        conditions: editedConditions,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving values:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!rule) return null;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Valores da Automação</DialogTitle>
          <DialogDescription>
            Modifique os valores das condições para "{rule.rule_name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Você pode ajustar os operadores e valores das condições. As mudanças serão aplicadas nas próximas execuções.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <Label className="text-base font-semibold">📊 Condições</Label>
            {editedConditions.map((condition, index) => (
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
                          value={condition.operator || ""}
                          onValueChange={(value) =>
                            handleConditionChange(index, "operator", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
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

                    {condition.operator && (
                      <p className="text-xs text-muted-foreground">
                        Se {FIELD_LABELS[condition.field]?.toLowerCase()} for{" "}
                        {OPERATOR_LABELS[condition.operator]} {condition.value}
                      </p>
                    )}
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
                  Resumo da Regra Atualizada
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <strong>SE</strong>{" "}
                    {rule.conditions.logic === "AND" ? "todas" : "qualquer uma"} das condições:
                  </p>
                  <ul className="list-disc list-inside pl-2 space-y-1">
                    {editedConditions.map((condition, index) => (
                      <li key={index}>
                        {FIELD_LABELS[condition.field]} {OPERATOR_LABELS[condition.operator] || "..."}{" "}
                        {condition.value ?? "..."}
                      </li>
                    ))}
                  </ul>
                  <p className="pt-2">
                    <strong>ENTÃO:</strong> {getActionTypeLabel(rule.action_type)}
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
          <Button onClick={handleSave} disabled={!isValid || loading}>
            {loading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
