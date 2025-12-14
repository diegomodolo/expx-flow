import { Card } from "@/components/ui/card";
import { DashboardMetrics } from "@/hooks/useClientDashboard";
import { useEffect, useState } from "react";

interface FunnelVisualizationProps {
  metrics: DashboardMetrics;
}

export const FunnelVisualization = ({ metrics }: FunnelVisualizationProps) => {
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [metrics]);

  const stages = [
    { label: "Impressões", value: metrics.impressions, width: 100 },
    { label: "Cliques", value: metrics.clicks, width: 75 },
    { label: "Page View", value: metrics.page_views, width: 50 },
    { label: "Conversões", value: metrics.total_conversions, width: 25 },
  ];

  return (
    <Card className="p-4 bg-card border-0 shadow-google-sm rounded-xl animate-fade-in">
      <h3 className="text-title-md text-foreground mb-3">Funil de Conversão</h3>
      <div className="space-y-1">
        {stages.map((stage, index) => (
          <div 
            key={`${index}-${animateKey}`} 
            className="relative animate-scale-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className="mx-auto rounded-lg bg-primary flex items-center justify-center py-2 transition-all duration-300 hover:shadow-google-md"
              style={{ 
                width: `${stage.width}%`,
                opacity: 1 - (index * 0.15)
              }}
            >
              <div className="text-center">
                <p className="text-primary-foreground text-label-sm">{stage.label}</p>
                <p className="text-primary-foreground text-title-sm">
                  {stage.value.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            {index < stages.length - 1 && (
              <div className="flex justify-center">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-primary/30"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
