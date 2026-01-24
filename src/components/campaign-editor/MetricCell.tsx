import { cn } from "@/lib/utils";
import { ClientTargets, getHealthColor } from "@/hooks/useCampaignTree";

interface MetricCellProps {
  metric: string;
  value: number;
  targets: ClientTargets;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function MetricCell({
  metric,
  value,
  targets,
  prefix = "",
  suffix = "",
  decimals = 2,
}: MetricCellProps) {
  const color = getHealthColor(metric, value, targets);

  const colorClasses = {
    green: "text-green-600 dark:text-green-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    red: "text-red-600 dark:text-red-400",
    neutral: "text-foreground",
  };

  const bgClasses = {
    green: "bg-green-100/50 dark:bg-green-900/20",
    yellow: "bg-yellow-100/50 dark:bg-yellow-900/20",
    red: "bg-red-100/50 dark:bg-red-900/20",
    neutral: "",
  };

  const indicatorClasses = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    neutral: "bg-muted",
  };

  const formattedValue = value ? value.toFixed(decimals) : "0.00";

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-sm font-medium",
        bgClasses[color]
      )}
    >
      <div className={cn("w-2 h-2 rounded-full", indicatorClasses[color])} />
      <span className={colorClasses[color]}>
        {prefix}
        {formattedValue}
        {suffix}
      </span>
    </div>
  );
}
