import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FieldOption {
  value: string;
  label: string;
  type: "number" | "boolean" | "string";
  description?: string;
}

const fieldOptions: FieldOption[] = [
  {
    value: "leads_last_7_days",
    label: "Leads (últimos 7 dias)",
    type: "number",
    description: "Total de leads gerados nos últimos 7 dias",
  },
  {
    value: "leads_last_30_days",
    label: "Leads (últimos 30 dias)",
    type: "number",
    description: "Total de leads gerados nos últimos 30 dias",
  },
  {
    value: "current_week_leads",
    label: "Leads semana atual",
    type: "number",
    description: "Leads gerados na semana atual (últimos 7 dias)",
  },
  {
    value: "previous_week_leads",
    label: "Leads semana anterior",
    type: "number",
    description: "Leads gerados na semana anterior (7-14 dias atrás)",
  },
  {
    value: "average_cpl",
    label: "CPL médio",
    type: "number",
    description: "Custo por lead médio",
  },
  {
    value: "average_ctr",
    label: "CTR médio (%)",
    type: "number",
    description: "Taxa de cliques média",
  },
  {
    value: "average_cpa",
    label: "CPA médio",
    type: "number",
    description: "Custo por aquisição médio",
  },
  {
    value: "current_week_cpa",
    label: "CPA semana atual",
    type: "number",
    description: "CPA da semana atual",
  },
  {
    value: "current_week_spend",
    label: "Gasto semana atual",
    type: "number",
    description: "Valor gasto na semana atual",
  },
  {
    value: "active_campaigns_count",
    label: "Campanhas ativas",
    type: "number",
    description: "Quantidade de campanhas ativas",
  },
  {
    value: "recent_campaigns_count",
    label: "Campanhas recentes (30 dias)",
    type: "number",
    description: "Campanhas ativas nos últimos 30 dias",
  },
  {
    value: "days_since_last_optimization",
    label: "Dias desde última otimização",
    type: "number",
    description: "Dias desde a última otimização registrada",
  },
  {
    value: "lead_drop_percentage",
    label: "Queda de leads (%)",
    type: "number",
    description: "Percentual de queda nos leads (semana atual vs anterior)",
  },
  {
    value: "has_funding_issues",
    label: "Tem problemas de financiamento",
    type: "boolean",
    description: "Se a conta tem problemas de financiamento",
  },
  {
    value: "has_quality_issues",
    label: "Tem problemas de qualidade",
    type: "boolean",
    description: "Se há problemas de qualidade nos anúncios",
  },
  {
    value: "has_reproved_ads",
    label: "Tem anúncios reprovados",
    type: "boolean",
    description: "Se há anúncios com status reprovado",
  },
  {
    value: "account_balance",
    label: "Saldo da conta",
    type: "number",
    description: "Saldo atual da conta de anúncios",
  },
  {
    value: "account_status",
    label: "Status da conta",
    type: "number",
    description: "Status da conta (1 = ativa, 0 = inativa)",
  },
  {
    value: "days_without_changes",
    label: "Dias sem alterações",
    type: "number",
    description: "Dias desde a última alteração em campanhas",
  },
  {
    value: "manual_inactive_status",
    label: "Inativo Manual",
    type: "boolean",
    description: "Cliente marcado como inativo manualmente",
  },
];

interface FieldSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export const FieldSelector = ({ value, onValueChange, disabled }: FieldSelectorProps) => {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Selecione um campo" />
      </SelectTrigger>
      <SelectContent>
        {fieldOptions.map((field) => (
          <SelectItem key={field.value} value={field.value}>
            <div>
              <div className="font-medium">{field.label}</div>
              {field.description && (
                <div className="text-xs text-muted-foreground">{field.description}</div>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export const getFieldType = (fieldValue: string): "number" | "boolean" | "string" => {
  const field = fieldOptions.find(f => f.value === fieldValue);
  return field?.type || "string";
};

export { fieldOptions };
