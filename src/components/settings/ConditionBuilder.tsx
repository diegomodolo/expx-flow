import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";
import { RuleCondition } from "@/hooks/useClientStatusRules";
import { FieldSelector, getFieldType } from "./FieldSelector";

interface ConditionBuilderProps {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
}

const operatorOptions = [
  { value: "<", label: "menor que (<)" },
  { value: ">", label: "maior que (>)" },
  { value: "=", label: "igual a (=)" },
  { value: "!=", label: "diferente de (≠)" },
  { value: ">=", label: "maior ou igual (≥)" },
  { value: "<=", label: "menor ou igual (≤)" },
];

export const ConditionBuilder = ({ conditions, onChange }: ConditionBuilderProps) => {
  const addCondition = () => {
    const newCondition: RuleCondition = {
      field: "leads_last_7_days",
      operator: "<",
      value: 0,
      type: "number",
    };
    onChange([...conditions, newCondition]);
  };

  const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
    const newConditions = [...conditions];
    
    // If field changed, update type and reset value
    if (updates.field && updates.field !== newConditions[index].field) {
      const fieldType = getFieldType(updates.field);
      newConditions[index] = {
        ...newConditions[index],
        field: updates.field,
        type: fieldType,
        value: fieldType === "boolean" ? false : 0,
      };
    } else {
      newConditions[index] = { ...newConditions[index], ...updates };
    }
    
    onChange(newConditions);
  };

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {conditions.map((condition, index) => (
        <div key={index} className="flex gap-2 items-end p-4 border rounded-lg">
          <div className="flex-1 space-y-2">
            <Label>Campo</Label>
            <FieldSelector
              value={condition.field}
              onValueChange={(field) => updateCondition(index, { field })}
            />
          </div>

          <div className="w-32 space-y-2">
            <Label>Operador</Label>
            <Select
              value={condition.operator}
              onValueChange={(operator: any) => updateCondition(index, { operator })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {operatorOptions.map((op) => (
                  <SelectItem key={op.value} value={op.value}>
                    {op.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-32 space-y-2">
            <Label>Valor</Label>
            {condition.type === "boolean" ? (
              <Select
                value={condition.value.toString()}
                onValueChange={(value) => updateCondition(index, { value: value === "true" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="number"
                value={condition.value as number}
                onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) || 0 })}
              />
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeCondition(index)}
            className="mb-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button variant="outline" onClick={addCondition} className="w-full">
        + Adicionar Condição
      </Button>
    </div>
  );
};
