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
    <Card className="p-3 bg-card border-border animate-fade-in">
      <h3 className="text-base font-semibold text-foreground mb-2 transition-colors duration-300">Funil de Conversão</h3>
      <div className="space-y-1.5">
        {stages.map((stage, index) => (
          <div 
            key={`${index}-${animateKey}`} 
            className="relative animate-scale-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div
              className="mx-auto rounded-md bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center py-2 transition-all duration-500 hover:shadow-lg hover:scale-[1.02]"
              style={{ width: `${stage.width}%` }}
            >
              <div className="text-center">
                <p className="text-white text-xs font-medium transition-all duration-300">{stage.label}</p>
                <p className="text-white text-sm font-bold transition-all duration-500">
                  {stage.value.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            {index < stages.length - 1 && (
              <div className="flex justify-center transition-opacity duration-300">
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-purple-500/50"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
