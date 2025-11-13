import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { z } from "zod";

const conditionSchema = z.object({
  field: z.string().min(1, "Campo obrigatório"),
  operator: z.enum(["<", ">", "=", "!=", ">=", "<="]).nullable(),
  value: z.number().nullable(),
  type: z.enum(["number", "boolean"]),
});

const conditionsGroupSchema = z.object({
  logic: z.enum(["AND", "OR"]),
  conditions: z.array(conditionSchema).min(1, "Adicione pelo menos uma condição"),
});

export type ConditionType = z.infer<typeof conditionSchema>;
export type ConditionsGroup = z.infer<typeof conditionsGroupSchema>;

interface ConditionEditorProps {
  value: ConditionsGroup;
  onChange: (value: ConditionsGroup) => void;
  isTemplate?: boolean;
}

const FIELD_OPTIONS = [
  { value: "cpa", label: "CPA (Custo por Aquisição)", type: "number" },
  { value: "ctr", label: "CTR (%)", type: "number" },
  { value: "conversions", label: "Conversões", type: "number" },
  { value: "spend", label: "Gasto (R$)", type: "number" },
  { value: "impressions", label: "Impressões", type: "number" },
  { value: "clicks", label: "Cliques", type: "number" },
  { value: "frequency", label: "Frequência", type: "number" },
  { value: "reach", label: "Alcance", type: "number" },
  { value: "cost_per_click", label: "CPC (Custo por Clique)", type: "number" },
  { value: "roas", label: "ROAS", type: "number" },
] as const;

const OPERATOR_LABELS = {
  "<": "menor que",
  ">": "maior que",
  "=": "igual a",
  "!=": "diferente de",
  ">=": "maior ou igual a",
  "<=": "menor ou igual a",
} as const;

export const ConditionEditor = ({ value, onChange, isTemplate = false }: ConditionEditorProps) => {
  const [errors, setErrors] = useState<Record<number, string>>({});

  const validateCondition = (condition: ConditionType, index: number): boolean => {
    try {
      conditionSchema.parse(condition);
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors({ ...errors, [index]: error.errors[0].message });
      }
      return false;
    }
  };

  const addCondition = () => {
    const newCondition: ConditionType = {
      field: "cpa",
      operator: ">",
      value: 100,
      type: "number",
    };
    
    onChange({
      ...value,
      conditions: [...value.conditions, newCondition],
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = value.conditions.filter((_, i) => i !== index);
    onChange({
      ...value,
      conditions: newConditions,
    });
    
    const newErrors = { ...errors };
    delete newErrors[index];
    setErrors(newErrors);
  };

  const updateCondition = (index: number, updates: Partial<ConditionType>) => {
    const newConditions = [...value.conditions];
    const updatedCondition = { ...newConditions[index], ...updates };
    
    // Auto-detect type based on field
    if (updates.field) {
      const fieldOption = FIELD_OPTIONS.find(opt => opt.value === updates.field);
      if (fieldOption) {
        updatedCondition.type = fieldOption.type;
      }
    }
    
    newConditions[index] = updatedCondition;
    onChange({
      ...value,
      conditions: newConditions,
    });
    
    validateCondition(updatedCondition, index);
  };

  const updateLogic = (logic: "AND" | "OR") => {
    onChange({
      ...value,
      logic,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Operador Lógico</Label>
        <RadioGroup value={value.logic} onValueChange={updateLogic} className="flex gap-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="AND" id="and" />
            <Label htmlFor="and" className="font-normal cursor-pointer">
              AND (todas as condições devem ser verdadeiras)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="OR" id="or" />
            <Label htmlFor="or" className="font-normal cursor-pointer">
              OR (pelo menos uma condição deve ser verdadeira)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Condições</Label>
          <Button type="button" size="sm" variant="outline" onClick={addCondition}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Condição
          </Button>
        </div>

        {value.conditions.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              Nenhuma condição definida. Clique em "Adicionar Condição" para começar.
            </CardContent>
          </Card>
        )}

        {value.conditions.map((condition, index) => (
          <Card key={index} className={errors[index] ? "border-destructive" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Campo</Label>
                    <Select
                      value={condition.field}
                      onValueChange={(field) => updateCondition(index, { field })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Operador{isTemplate && " (Padrão)"}</Label>
                    <Select
                      value={condition.operator || undefined}
                      onValueChange={(operator) => 
                        updateCondition(index, { operator: operator as ConditionType["operator"] })
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

                  <div className="space-y-1">
                    <Label className="text-xs">Valor{isTemplate && " (Padrão)"}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={condition.value ?? 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        updateCondition(index, { value });
                      }}
                      onBlur={() => validateCondition(condition, index)}
                    />
                    {isTemplate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        💡 Este valor será usado como padrão quando a regra for importada
                      </div>
                    )}
                  </div>
                 </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="mt-5"
                  onClick={() => removeCondition(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              
              {errors[index] && (
                <p className="text-xs text-destructive mt-2">{errors[index]}</p>
              )}
              
              {!isTemplate && condition.operator && condition.value !== null && (
                <p className="text-xs text-muted-foreground mt-2">
                  Se {FIELD_OPTIONS.find(f => f.value === condition.field)?.label.toLowerCase()} for{" "}
                  {OPERATOR_LABELS[condition.operator]} {condition.value}
                </p>
              )}
              {isTemplate && (
                <p className="text-xs text-warning mt-2">
                  ⚙️ Operador e valor serão configurados na importação
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
