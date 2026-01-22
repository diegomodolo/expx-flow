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
      label: "Total URLs",
      value: stats.total,
      icon: Link2,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "OK",
      value: stats.ok,
      icon: CheckCircle2,
      color: "text-green-600",
      bgColor: "bg-green-500/10"
    },
    {
      label: "Com Erro",
      value: stats.error,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    {
      label: "Timeout",
      value: stats.timeout,
      icon: Clock,
      color: "text-orange-600",
      bgColor: "bg-orange-500/10"
    },
    {
      label: "Redirect",
      value: stats.redirect,
      icon: ArrowRightLeft,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Pendentes",
      value: stats.pending,
      icon: HelpCircle,
      color: "text-muted-foreground",
      bgColor: "bg-muted"
    },
    {
      label: "Lentas (>3s)",
      value: stats.slow,
      icon: Gauge,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
