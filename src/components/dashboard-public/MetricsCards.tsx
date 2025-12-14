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
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Mensagens",
      value: metrics.messages.toLocaleString('pt-BR'),
      icon: MessageSquare,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      label: "Leads",
      value: metrics.leads.toLocaleString('pt-BR'),
      icon: Users,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "CPL",
      value: `R$ ${metrics.cpl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Target,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Conversões / 1k",
      value: metrics.leads_per_1k.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      icon: TrendingUp,
      color: "text-cyan-600 dark:text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card 
            key={`${index}-${animateKey}`}
            className="p-4 bg-card border-0 shadow-google-sm hover:shadow-google-md transition-shadow duration-200 rounded-xl animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-label-md text-muted-foreground mb-1">{card.label}</p>
                <p className="text-headline-sm text-foreground">{card.value}</p>
              </div>
              <div className={`p-2 rounded-full ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
