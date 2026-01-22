import { Card, CardContent } from "@/components/ui/card";
import { 
  Link2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRightLeft,
  HelpCircle,
  Gauge
} from "lucide-react";
import { UrlStats } from "@/hooks/useRadarUrls";

interface UrlsKPIHeaderProps {
  stats: UrlStats;
}

export function UrlsKPIHeader({ stats }: UrlsKPIHeaderProps) {
  const kpis = [
    {
      label: "Total",
      value: stats.total,
      icon: Link2,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "OK",
      value: stats.ok,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Erro",
      value: stats.error,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      label: "Timeout",
      value: stats.timeout,
      icon: Clock,
      color: "text-orange-600 dark:text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      label: "Redirect",
      value: stats.redirect,
      icon: ArrowRightLeft,
      color: "text-blue-600 dark:text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Pendente",
      value: stats.pending,
      icon: HelpCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted"
    },
    {
      label: "Lentas",
      value: stats.slow,
      icon: Gauge,
      color: "text-yellow-600 dark:text-yellow-500",
      bgColor: "bg-yellow-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-2 lg:p-3">
              <div className="flex flex-col items-center text-center lg:flex-row lg:text-left lg:items-center gap-1 lg:gap-2">
                <div className={`p-1.5 rounded-md ${kpi.bgColor}`}>
                  <Icon className={`h-3 w-3 lg:h-4 lg:w-4 ${kpi.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg lg:text-xl font-bold leading-none">{kpi.value}</p>
                  <p className="text-[10px] lg:text-xs text-muted-foreground truncate">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
