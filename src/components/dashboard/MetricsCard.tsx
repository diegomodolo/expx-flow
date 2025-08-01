import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricProps {
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative" | "neutral";
}

interface MetricsCardProps {
  title: string;
  icon: LucideIcon;
  metrics: MetricProps[];
  className?: string;
}

export function MetricsCard({ title, icon: Icon, metrics, className }: MetricsCardProps) {
  return (
    <Card className={cn("shadow-sm border border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Icon className="text-primary text-xl w-5 h-5" />
          </div>
          <CardTitle className="text-lg font-semibold text-foreground">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
          Ver Detalhes
        </Button>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-3 gap-6">
          {metrics.map((metric, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl font-bold text-foreground mb-2">{metric.value}</div>
              <div className="text-sm text-muted-foreground">{metric.label}</div>
              <div className={cn(
                "text-xs mt-1",
                metric.changeType === "positive" && "text-metric-positive",
                metric.changeType === "negative" && "text-metric-negative",
                metric.changeType === "neutral" && "text-metric-neutral"
              )}>
                {metric.change}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}