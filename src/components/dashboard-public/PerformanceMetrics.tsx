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
    <Card className="p-3 bg-card border-border animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-2 transition-colors duration-300">Métricas de Performance</h3>
      <div className="grid grid-cols-2 gap-2">
        {metricsData.map((metric, index) => (
          <div 
            key={`${index}-${animateKey}`} 
            className="border-l-2 border-primary pl-2 transition-all duration-300 hover:border-l-4 animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <p className="text-xs text-muted-foreground transition-colors duration-300">{metric.label}</p>
            <p className="text-lg font-bold text-foreground transition-all duration-500">{metric.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
