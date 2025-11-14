import { Card } from "@/components/ui/card";
import { DashboardMetrics } from "@/hooks/useClientDashboard";

interface PerformanceMetricsProps {
  metrics: DashboardMetrics;
}

export const PerformanceMetrics = ({ metrics }: PerformanceMetricsProps) => {
  const metricsData = [
    { label: "CPM", value: `R$ ${metrics.cpm.toFixed(2)}` },
    { label: "CPC", value: `R$ ${metrics.cpc.toFixed(2)}` },
    { label: "Taxa Cliques", value: `${metrics.ctr.toFixed(2)}%` },
    { label: "Frequência", value: metrics.frequency.toFixed(2) },
    { label: "Connect Rate", value: `${metrics.connect_rate.toFixed(2)}%` },
    { label: "CTR", value: `${metrics.ctr.toFixed(2)}%` },
    { label: "Lead Rate", value: `${metrics.lead_rate.toFixed(2)}%` },
    { label: "CPM", value: `R$ ${metrics.cpm.toFixed(2)}` },
  ];

  return (
    <Card className="p-4 bg-card border-border">
      <h3 className="text-xl font-semibold text-foreground mb-4">Métricas de Performance</h3>
      <div className="grid grid-cols-2 gap-4">
        {metricsData.map((metric, index) => (
          <div key={index} className="border-l-2 border-primary pl-3">
            <p className="text-sm text-muted-foreground">{metric.label}</p>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
