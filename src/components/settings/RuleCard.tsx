import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import { ClientStatusRule } from "@/hooks/useClientStatusRules";

interface RuleCardProps {
  rule: ClientStatusRule;
  index: number;
  totalRules: number;
  onEdit: (rule: ClientStatusRule) => void;
  onDelete: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}

const statusColors = {
  excelente: "bg-green-500",
  atencao: "bg-yellow-500",
  emergencial: "bg-red-500",
  inativo: "bg-gray-500",
  sem_fundos: "bg-orange-500",
};

const statusLabels = {
  excelente: "Excelente",
  atencao: "Atenção",
  emergencial: "Emergencial",
  inativo: "Inativo",
  sem_fundos: "Sem Fundos",
};

const fieldLabels: Record<string, string> = {
  leads_last_7_days: "Leads (7 dias)",
  leads_last_30_days: "Leads (30 dias)",
  average_cpl: "CPL médio",
  average_ctr: "CTR médio",
  average_cpa: "CPA médio",
  active_campaigns_count: "Campanhas ativas",
  days_since_last_optimization: "Dias desde otimização",
  lead_drop_percentage: "Queda de leads (%)",
  has_funding_issues: "Problemas de financiamento",
  account_balance: "Saldo da conta",
  days_without_changes: "Dias sem alterações",
};

const operatorLabels = {
  "<": "menor que",
  ">": "maior que",
  "=": "igual a",
  "!=": "diferente de",
  ">=": "maior ou igual a",
  "<=": "menor ou igual a",
};

export const RuleCard = ({
  rule,
  index,
  totalRules,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: RuleCardProps) => {
  const renderConditionText = () => {
    const { logic, conditions } = rule.conditions;
    
    if (conditions.length === 0) return "Nenhuma condição definida";
    
    return conditions.map((condition, idx) => {
      const fieldLabel = fieldLabels[condition.field] || condition.field;
      const operatorLabel = operatorLabels[condition.operator];
      const connector = idx < conditions.length - 1 ? ` ${logic} ` : "";
      
      let valueText = condition.value.toString();
      if (condition.type === "boolean") {
        valueText = condition.value ? "sim" : "não";
      }
      
      return `${fieldLabel} ${operatorLabel} ${valueText}${connector}`;
    }).join("");
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => onMoveDown(index)}
              disabled={index === totalRules - 1}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-muted-foreground">
                #{rule.rule_order}
              </span>
              <h3 className="font-semibold">{rule.rule_name}</h3>
              <Badge className={statusColors[rule.status_output]}>
                {statusLabels[rule.status_output]}
              </Badge>
              {rule.is_default && (
                <Badge variant="outline">Padrão</Badge>
              )}
              {!rule.is_active && (
                <Badge variant="secondary">Inativa</Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground">
              SE {renderConditionText()}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(rule)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {!rule.is_default && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
