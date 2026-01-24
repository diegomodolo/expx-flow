import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BudgetProgressCellProps {
  spent: number;
  budget: number;
  budgetType: "daily" | "lifetime";
}

export function BudgetProgressCell({ spent, budget, budgetType }: BudgetProgressCellProps) {
  const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const getProgressColor = () => {
    if (percentage < 70) return "bg-green-500";
    if (percentage < 90) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getTextColor = () => {
    if (percentage < 70) return "text-green-600 dark:text-green-400";
    if (percentage < 90) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full min-w-[100px] space-y-1">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", getProgressColor())}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className={getTextColor()}>{percentage.toFixed(0)}%</span>
              <span className="text-muted-foreground">
                R$ {spent.toFixed(0)} / {budget.toFixed(0)}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">Orçamento {budgetType === "daily" ? "Diário" : "Total"}</p>
            <p>Gasto: R$ {spent.toFixed(2)}</p>
            <p>Limite: R$ {budget.toFixed(2)}</p>
            <p>Utilizado: {percentage.toFixed(1)}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
