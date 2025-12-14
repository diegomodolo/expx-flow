import { Card } from "@/components/ui/card";
import { DashboardMetrics } from "@/hooks/useClientDashboard";
import { useEffect, useState } from "react";

interface PerformanceMetricsProps {
  metrics: DashboardMetrics;
}

export const PerformanceMetrics = ({ metrics }: PerformanceMetricsProps) => {
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [metrics]);

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
    <Card className="p-4 bg-card border-0 shadow-google-sm rounded-xl animate-fade-in">
      <h3 className="text-title-md text-foreground mb-3">Métricas de Performance</h3>
      <div className="grid grid-cols-2 gap-2">
        {metricsData.map((metric, index) => (
          <div 
            key={`${index}-${animateKey}`} 
            className="border-l-2 border-primary pl-2 transition-all duration-300 hover:border-l-4 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <p className="text-label-sm text-muted-foreground">{metric.label}</p>
            <p className="text-title-md text-foreground">{metric.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
