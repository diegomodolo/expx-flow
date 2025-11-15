import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon, TrendingUp, DollarSign, MousePointerClick, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface UnifiedMetricsCardsProps {
  metrics: {
    total_spend: number;
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    average_ctr: number;
    average_cpc: number;
    average_cpa: number;
    active_campaigns: number;
    meta: {
      spend: number;
      conversions: number;
    };
    google: {
      spend: number;
      conversions: number;
    };
  };
  isLoading?: boolean;
}

export function UnifiedMetricsCards({ metrics, isLoading }: UnifiedMetricsCardsProps) {
  const cards = [
    {
      title: "Investimento Total",
      value: `R$ ${metrics.total_spend.toFixed(2)}`,
      icon: DollarSign,
      breakdown: [
        { label: "Meta", value: metrics.meta.spend, color: "text-[#1877F2]" },
        { label: "Google", value: metrics.google.spend, color: "text-[#4285F4]" },
      ],
    },
    {
      title: "Conversões Totais",
      value: metrics.total_conversions.toLocaleString(),
      icon: Target,
      breakdown: [
        { label: "Meta", value: metrics.meta.conversions, color: "text-[#1877F2]" },
        { label: "Google", value: metrics.google.conversions, color: "text-[#4285F4]" },
      ],
    },
    {
      title: "CPA Médio",
      value: `R$ ${metrics.average_cpa.toFixed(2)}`,
      icon: TrendingUp,
      description: "Custo por aquisição médio",
    },
    {
      title: "CTR Médio",
      value: `${metrics.average_ctr.toFixed(2)}%`,
      icon: MousePointerClick,
      description: "Taxa de cliques média",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.breakdown ? (
                <div className="mt-2 flex items-center gap-4 text-xs">
                  {card.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <span className={cn("font-medium", item.color)}>{item.label}:</span>
                      <span className="text-muted-foreground">
                        {typeof item.value === 'number' && item.label === "Meta" || item.label === "Google"
                          ? `R$ ${item.value.toFixed(2)}`
                          : item.value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : card.description ? (
                <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
