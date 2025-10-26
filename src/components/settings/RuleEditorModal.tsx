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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ClientStatusRule, RuleConditions } from "@/hooks/useClientStatusRules";
import { ConditionBuilder } from "./ConditionBuilder";

interface RuleEditorModalProps {
  open: boolean;
  onClose: () => void;
  rule: ClientStatusRule | null;
  onSave: (ruleData: Partial<ClientStatusRule>) => void;
  nextOrder: number;
}

const statusOptions = [
  { value: "excelente", label: "Excelente" },
  { value: "atencao", label: "Atenção" },
  { value: "emergencial", label: "Emergencial" },
  { value: "inativo", label: "Inativo" },
  { value: "sem_fundos", label: "Sem Fundos" },
];

export const RuleEditorModal = ({
  open,
  onClose,
  rule,
  onSave,
  nextOrder,
}: RuleEditorModalProps) => {
  const [ruleName, setRuleName] = useState("");
  const [statusOutput, setStatusOutput] = useState<ClientStatusRule["status_output"]>("atencao");
  const [logic, setLogic] = useState<"AND" | "OR">("AND");
  const [conditions, setConditions] = useState<RuleConditions["conditions"]>([]);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (rule) {
      setRuleName(rule.rule_name);
      setStatusOutput(rule.status_output);
      setLogic(rule.conditions.logic);
      setConditions(rule.conditions.conditions);
      setIsActive(rule.is_active);
    } else {
      setRuleName("");
      setStatusOutput("atencao");
      setLogic("AND");
      setConditions([]);
      setIsActive(true);
    }
  }, [rule, open]);

  const handleSave = () => {
    const ruleData: Partial<ClientStatusRule> = {
      rule_name: ruleName,
      status_output: statusOutput,
      conditions: {
        logic,
        conditions,
      },
      is_active: isActive,
      rule_order: rule?.rule_order || nextOrder,
      is_default: false,
    };

    onSave(ruleData);
  };

  const isValid = ruleName.trim() !== "" && conditions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regra" : "Nova Regra"}</DialogTitle>
          <DialogDescription>
            Configure as condições que determinam o status do cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="rule-name">Nome da Regra</Label>
            <Input
              id="rule-name"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              placeholder="Ex: Clientes com baixo desempenho"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status-output">Status de Saída</Label>
            <Select value={statusOutput} onValueChange={(value: any) => setStatusOutput(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lógica das Condições</Label>
            <RadioGroup value={logic} onValueChange={(value: any) => setLogic(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="AND" id="and" />
                <Label htmlFor="and" className="font-normal cursor-pointer">
                  E (AND) - Todas as condições devem ser verdadeiras
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="OR" id="or" />
                <Label htmlFor="or" className="font-normal cursor-pointer">
                  OU (OR) - Pelo menos uma condição deve ser verdadeira
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Condições</Label>
            <ConditionBuilder conditions={conditions} onChange={setConditions} />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="is-active" className="font-normal cursor-pointer">
              Regra ativa
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {rule ? "Atualizar" : "Criar"} Regra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
