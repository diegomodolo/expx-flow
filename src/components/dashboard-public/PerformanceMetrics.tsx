import { Card } from "@/components/ui/card";
import { DashboardMetrics, PlatformMetrics } from "@/hooks/useClientDashboard";
import { useEffect, useState } from "react";
import { FaFacebook, FaGoogle } from "react-icons/fa";

interface PerformanceMetricsProps {
  metrics: DashboardMetrics;
  metaMetrics?: PlatformMetrics | null;
  googleMetrics?: PlatformMetrics | null;
}

const PlatformCard = ({ 
  title, 
  icon, 
  metrics, 
  borderColor,
  animateKey 
}: { 
  title: string; 
  icon: React.ReactNode; 
  metrics: PlatformMetrics; 
  borderColor: string;
  animateKey: number;
}) => {
  const totalLeads = metrics.leads + metrics.messages;
  const cpl = totalLeads > 0 ? metrics.spend / totalLeads : 0;
  const leadsPerK = metrics.spend > 0 ? (totalLeads / metrics.spend) * 1000 : 0;

  const metricsData = [
    { label: "Investimento", value: `R$ ${metrics.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: "Leads", value: metrics.leads.toLocaleString('pt-BR') },
    { label: "CPL", value: `R$ ${cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
    { label: "Mensagens", value: metrics.messages.toLocaleString('pt-BR') },
    { label: "Conv / 1k", value: leadsPerK.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { label: "CPM", value: `R$ ${metrics.cpm.toFixed(2)}` },
    { label: "CPC", value: `R$ ${metrics.cpc.toFixed(2)}` },
    { label: "CTR", value: `${metrics.ctr.toFixed(2)}%` },
  ];

  return (
    <Card className="p-4 bg-card border-0 shadow-google-sm rounded-xl animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-title-md text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {metricsData.map((metric, index) => (
          <div 
            key={`${index}-${animateKey}`} 
            className={`border-l-2 ${borderColor} pl-2 transition-all duration-300 hover:border-l-4 animate-fade-in`}
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

export const PerformanceMetrics = ({ metrics, metaMetrics, googleMetrics }: PerformanceMetricsProps) => {
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [metrics]);

  const hasBothPlatforms = !!metaMetrics && !!googleMetrics;

  // If we have per-platform data, show separate cards
  if (metaMetrics || googleMetrics) {
    return (
      <div className={`grid gap-3 ${hasBothPlatforms ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {metaMetrics && (
          <PlatformCard
            title="Meta Ads"
            icon={<FaFacebook className="w-5 h-5 text-[#1877F2]" />}
            metrics={metaMetrics}
            borderColor="border-[#1877F2]"
            animateKey={animateKey}
          />
        )}
        {googleMetrics && (
          <PlatformCard
            title="Google Ads"
            icon={<FaGoogle className="w-5 h-5 text-[#34A853]" />}
            metrics={googleMetrics}
            borderColor="border-[#34A853]"
            animateKey={animateKey}
          />
        )}
      </div>
    );
  }

  // Fallback: single combined card (legacy behavior)
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