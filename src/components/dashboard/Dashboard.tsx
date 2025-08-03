import { PieChart } from "lucide-react";
import { MetricsCard } from "./MetricsCard";
import { StatusCard } from "./StatusCard";
import { TopCampaignsCard } from "./TopCampaignsCard";
import { AlertsCard } from "./AlertsCard";
import { DailyFocusCard } from "./DailyFocusCard";

const metricsData = [
  {
    label: "Total de Leads",
    value: "2.847",
    change: "+12% vs mês anterior",
    changeType: "positive" as const
  },
  {
    label: "CPL Médio", 
    value: "R$ 45,30",
    change: "+8% vs mês anterior",
    changeType: "negative" as const
  },
  {
    label: "Investimento Total",
    value: "R$ 128.950", 
    change: "-3% vs mês anterior",
    changeType: "positive" as const
  }
];

export function Dashboard() {
  return (
    <div className="space-y-6 bg-red-100 border border-red-500">
      <h1 className="text-2xl font-bold">Dashboard Test - Conteúdo Visível</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        <MetricsCard
          title="Resumo Geral"
          icon={PieChart}
          metrics={metricsData}
          className="xl:col-span-2"
        />
        <StatusCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <TopCampaignsCard />
        <AlertsCard />
        <DailyFocusCard />
      </div>
    </div>
  );
}