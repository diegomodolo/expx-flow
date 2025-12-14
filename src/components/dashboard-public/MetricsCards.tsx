import { Card } from "@/components/ui/card";
import { TrendingUp, MessageSquare, Users, DollarSign, Target } from "lucide-react";
import { DashboardMetrics } from "@/hooks/useClientDashboard";
import { useEffect, useState } from "react";

interface MetricsCardsProps {
  metrics: DashboardMetrics;
}

export const MetricsCards = ({ metrics }: MetricsCardsProps) => {
  const [animateKey, setAnimateKey] = useState(0);

  useEffect(() => {
    setAnimateKey(prev => prev + 1);
  }, [metrics]);

  const cards = [
    {
      label: "Investimento",
      value: `R$ ${metrics.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Mensagens",
      value: metrics.messages.toLocaleString('pt-BR'),
      icon: MessageSquare,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Leads",
      value: metrics.leads.toLocaleString('pt-BR'),
      icon: Users,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "CPL",
      value: `R$ ${metrics.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Target,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      label: "Conversões / 1k",
      value: metrics.leads_per_1k.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      icon: TrendingUp,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={`${index}-${animateKey}`}
            className="p-4 bg-card border-border animate-fade-in hover-scale transition-all duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1 transition-colors duration-300">{card.label}</p>
                <p className="text-3xl font-bold text-foreground transition-all duration-500">{card.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${card.bg} transition-all duration-300`}>
                <Icon className={`w-5 h-5 ${card.color} transition-transform duration-300`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
