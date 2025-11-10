import { Card } from "@/components/ui/card";
import { GoalsConfigModal } from "@/components/crm/GoalsConfigModal";
import { useCRMDashboardData } from "@/hooks/useCRMDashboardData";
import { useCRMWorkspaceGoals } from "@/hooks/useCRMWorkspaceGoals";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, DollarSign, Users, Award } from "lucide-react";
import { useState } from "react";

interface GoalsSettingsProps {
  workspaceId: string;
}

export function GoalsSettings({ workspaceId }: GoalsSettingsProps) {
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const dashboardData = useCRMDashboardData(workspaceId, new Date());
  const { goal } = useCRMWorkspaceGoals(workspaceId);
  
  const metrics = dashboardData.data?.metrics || {
    totalLeads: 0,
    revenue: 0,
    conversionRate: 0,
    closedDeals: 0,
  };

  const goalCards = [
    {
      icon: Users,
      label: "Leads",
      current: metrics.totalLeads,
      target: goal?.target_leads || 0,
      color: "text-blue-500",
    },
    {
      icon: DollarSign,
      label: "Receita",
      current: metrics.revenue,
      target: goal?.target_revenue || 0,
      color: "text-green-500",
      isCurrency: true,
    },
    {
      icon: TrendingUp,
      label: "Taxa de Conversão",
      current: metrics.conversionRate,
      target: goal?.target_conversion_rate || 0,
      color: "text-purple-500",
      isPercentage: true,
    },
    {
      icon: Award,
      label: "Negócios Fechados",
      current: metrics.closedDeals,
      target: goal?.target_closed_deals || 0,
      color: "text-orange-500",
    },
  ];

  const formatValue = (value: number, isCurrency?: boolean, isPercentage?: boolean) => {
    if (isCurrency) {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    }
    if (isPercentage) {
      return `${value.toFixed(1)}%`;
    }
    return value.toString();
  };

  const calculateProgress = (current: number, target: number) => {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Metas Mensais</h2>
            <p className="text-muted-foreground">
              Defina e acompanhe as metas do seu time de vendas.
            </p>
          </div>
          <Button onClick={() => setGoalsModalOpen(true)}>
            <Target className="w-4 h-4 mr-2" />
            Configurar Metas
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalCards.map((card) => {
            const Icon = card.icon;
            const progress = calculateProgress(card.current, card.target);
            const hasGoal = card.target > 0;

            return (
              <Card key={card.label} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg bg-muted ${card.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold">
                        {formatValue(card.current, card.isCurrency, card.isPercentage)}
                      </p>
                    </div>
                  </div>
                </div>

                {hasGoal ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Meta:</span>
                      <span className="font-medium">
                        {formatValue(card.target, card.isCurrency, card.isPercentage)}
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">
                      {progress.toFixed(0)}% concluído
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma meta definida</p>
                )}
              </Card>
            );
          })}
        </div>
      </Card>

      <GoalsConfigModal
        open={goalsModalOpen}
        onOpenChange={setGoalsModalOpen}
        workspaceId={workspaceId}
        currentMetrics={{
          totalLeads: metrics.totalLeads,
          revenue: metrics.revenue,
          conversionRate: metrics.conversionRate,
          closedDeals: metrics.closedDeals,
        }}
      />
    </div>
  );
}
