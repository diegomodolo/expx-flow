import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { GoalStatus } from "@/hooks/useCRMWorkspaceGoals";

interface StatCardWithGoalProps {
  title: string;
  value: string | number;
  target?: number | null;
  change: string;
  isPositive: boolean;
  goalStatus?: GoalStatus;
  percentage?: number;
  formatValue?: (val: number) => string;
}

const getProgressColor = (status?: GoalStatus) => {
  switch (status) {
    case 'danger':
      return 'bg-destructive';
    case 'warning':
      return 'bg-yellow-500';
    case 'success':
      return 'bg-green-500';
    case 'exceeded':
      return 'bg-primary';
    default:
      return 'bg-muted';
  }
};

const getProgressTextColor = (status?: GoalStatus) => {
  switch (status) {
    case 'danger':
      return 'text-destructive';
    case 'warning':
      return 'text-yellow-600';
    case 'success':
      return 'text-green-600';
    case 'exceeded':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
};

export const StatCardWithGoal = ({
  title,
  value,
  target,
  change,
  isPositive,
  goalStatus = 'no-goal',
  percentage = 0,
  formatValue
}: StatCardWithGoalProps) => {
  const hasGoal = target !== null && target !== undefined && goalStatus !== 'no-goal';
  
  const formatTargetValue = (val: number) => {
    if (formatValue) return formatValue(val);
    return val.toLocaleString('pt-BR');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Valor e Meta */}
          <div>
            <div className="text-2xl font-bold">
              {typeof value === 'number' && formatValue ? formatValue(value) : value}
              {hasGoal && (
                <span className="text-base font-normal text-muted-foreground ml-1">
                  / {formatTargetValue(target)}
                </span>
              )}
            </div>
          </div>

          {/* Barra de Progresso */}
          {hasGoal && (
            <div className="space-y-2">
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    getProgressColor(goalStatus),
                    goalStatus === 'exceeded' && "animate-pulse"
                  )}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", getProgressTextColor(goalStatus))}>
                  {percentage >= 100 ? '✓ Meta atingida!' : `${percentage.toFixed(0)}% da meta`}
                </span>
                {percentage > 100 && (
                  <span className="text-primary font-medium">
                    +{(percentage - 100).toFixed(0)}% acima 🎉
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mudança vs. mês anterior */}
          <div className={cn(
            "flex items-center text-sm",
            isPositive ? "text-green-600" : "text-red-600"
          )}>
            {isPositive ? (
              <ArrowUp className="w-4 h-4 mr-1" />
            ) : (
              <ArrowDown className="w-4 h-4 mr-1" />
            )}
            <span>{change}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
