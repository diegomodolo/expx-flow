import { Card } from "@/components/ui/card";
import { DashboardMetrics } from "@/hooks/useClientDashboard";

interface FunnelVisualizationProps {
  metrics: DashboardMetrics;
}

export const FunnelVisualization = ({ metrics }: FunnelVisualizationProps) => {
  const stages = [
    { label: "Impressões", value: metrics.impressions, width: 100 },
    { label: "Cliques", value: metrics.clicks, width: 75 },
    { label: "Page View", value: metrics.page_views, width: 50 },
    { label: "Leads", value: metrics.leads, width: 25 },
  ];

  return (
    <Card className="p-6 bg-card border-border">
      <h3 className="text-lg font-semibold text-foreground mb-6">Funil de Conversão</h3>
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={index} className="relative">
            <div
              className="mx-auto rounded-md bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center py-4 transition-all duration-300 hover:shadow-lg"
              style={{ width: `${stage.width}%` }}
            >
              <div className="text-center">
                <p className="text-white font-semibold">{stage.label}</p>
                <p className="text-white text-lg font-bold">
                  {stage.value.toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
            {index < stages.length - 1 && (
              <div className="flex justify-center mt-1">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-purple-500/50"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
