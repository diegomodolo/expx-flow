import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { z } from "zod";

export const safetyLimitsSchema = z.object({
  budget_safety_limits: z.object({
    max_daily_budget_increase_percent: z.number().int().min(1, "Mínimo 1%").max(100, "Máximo 100%"),
    max_daily_budget_decrease_percent: z.number().int().min(1, "Mínimo 1%").max(100, "Máximo 100%"),
  }),
  execution_limits: z.object({
    max_executions_per_day: z.number().int().min(1, "Mínimo 1 execução").max(50, "Máximo 50 execuções"),
    cooldown_hours: z.number().int().min(1, "Mínimo 1 hora").max(72, "Máximo 72 horas"),
    entity_cooldown_days: z.number().int().min(0, "Mínimo 0 dias").max(30, "Máximo 30 dias").optional(),
  }),
});

export type SafetyLimits = z.infer<typeof safetyLimitsSchema>;

interface SafetyLimitsEditorProps {
  value: SafetyLimits;
  onChange: (value: SafetyLimits) => void;
  actionType: string;
}

export const SafetyLimitsEditor = ({ value, onChange, actionType }: SafetyLimitsEditorProps) => {
  const showBudgetLimits = ["increase_budget", "decrease_budget"].includes(actionType);
  const showEntityCooldown = ["duplicate_campaign", "duplicate_adset", "duplicate_ad"].includes(actionType);

  const updateBudgetLimit = (field: keyof SafetyLimits["budget_safety_limits"], newValue: number) => {
    onChange({
      ...value,
      budget_safety_limits: {
        ...value.budget_safety_limits,
        [field]: newValue,
      },
    });
  };

  const updateExecutionLimit = (field: keyof SafetyLimits["execution_limits"], newValue: number) => {
    onChange({
      ...value,
      execution_limits: {
        ...value.execution_limits,
        [field]: newValue,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          Limites de Segurança
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Limites de proteção para evitar mudanças abruptas e execuções excessivas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </h3>
        <p className="text-sm text-muted-foreground">
          Configure os limites de proteção para esta automação
        </p>
      </div>

      {showBudgetLimits && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Limites de Orçamento</CardTitle>
            <CardDescription>
              Percentuais máximos permitidos para alterações de orçamento
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_increase">
                Aumento Máximo (%)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Máximo que o orçamento pode aumentar por execução</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max_increase"
                  type="number"
                  min="1"
                  max="100"
                  value={value.budget_safety_limits.max_daily_budget_increase_percent}
                  onChange={(e) => updateBudgetLimit("max_daily_budget_increase_percent", parseInt(e.target.value) || 1)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Exemplo: 20% permite aumentar de R$100 para R$120
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_decrease">
                Redução Máxima (%)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Máximo que o orçamento pode diminuir por execução</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="max_decrease"
                  type="number"
                  min="1"
                  max="100"
                  value={value.budget_safety_limits.max_daily_budget_decrease_percent}
                  onChange={(e) => updateBudgetLimit("max_daily_budget_decrease_percent", parseInt(e.target.value) || 1)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Exemplo: 30% permite reduzir de R$100 para R$70
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Limites de Execução</CardTitle>
          <CardDescription>
            Controle a frequência de execução da automação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_executions">
                Execuções Máximas por Dia
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Quantidade máxima de vezes que a regra pode executar por campanha em 24h</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="max_executions"
                type="number"
                min="1"
                max="50"
                value={value.execution_limits.max_executions_per_day}
                onChange={(e) => updateExecutionLimit("max_executions_per_day", parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-muted-foreground">
                Previne execuções excessivas na mesma campanha
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cooldown">
                Cooldown (horas)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tempo mínimo entre execuções consecutivas na mesma campanha</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="cooldown"
                  type="number"
                  min="1"
                  max="72"
                  value={value.execution_limits.cooldown_hours}
                  onChange={(e) => updateExecutionLimit("cooldown_hours", parseInt(e.target.value) || 1)}
                />
                <span className="text-sm text-muted-foreground">h</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Evita ações muito frequentes (anti flip-flop)
              </p>
            </div>
          </div>

          {showEntityCooldown && (
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="entity_cooldown_days">
                Cooldown por Entidade (dias)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 inline ml-1 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>Tempo mínimo entre duplicações da mesma entidade. Use 0 para desabilitar.</p>
                      <p className="text-xs mt-1 text-muted-foreground">
                        Exemplo: Se configurar 7 dias, uma campanha só pode ser duplicada novamente após 7 dias da última duplicação.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="entity_cooldown_days"
                type="number"
                min="0"
                max="30"
                value={value.execution_limits.entity_cooldown_days || 0}
                onChange={(e) => updateExecutionLimit("entity_cooldown_days", parseInt(e.target.value) || 0)}
                placeholder="0 = sem cooldown"
              />
              <p className="text-xs text-muted-foreground">
                Previne duplicações repetidas da mesma entidade. Cópias também nunca são duplicadas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
