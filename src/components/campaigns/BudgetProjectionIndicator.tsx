import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Campaign {
  status: string;
  is_active?: boolean;
  daily_budget?: number | null;
  lifetime_budget?: number | null;
  platform?: 'meta' | 'google';
}

interface BudgetProjectionIndicatorProps {
  campaigns: Campaign[];
  monthlyBudget: number | null | undefined;
  metaMonthlyBudget?: number | null;
  googleMonthlyBudget?: number | null;
  platformFilter?: 'all' | 'meta' | 'google';
}

export function BudgetProjectionIndicator({ 
  campaigns, 
  monthlyBudget,
  metaMonthlyBudget,
  googleMonthlyBudget,
  platformFilter = 'all'
}: BudgetProjectionIndicatorProps) {
  const projection = useMemo(() => {
    // Calculate the effective monthly budget based on platform filter
    let effectiveMonthlyBudget = 0;
    
    if (platformFilter === 'all') {
      // Sum both platform budgets, fallback to general monthly_budget if specific ones not set
      const metaBudget = metaMonthlyBudget ?? 0;
      const googleBudget = googleMonthlyBudget ?? 0;
      effectiveMonthlyBudget = metaBudget + googleBudget;
      
      // If no platform-specific budgets, use general monthly budget
      if (effectiveMonthlyBudget === 0 && monthlyBudget) {
        effectiveMonthlyBudget = monthlyBudget;
      }
    } else if (platformFilter === 'meta') {
      effectiveMonthlyBudget = metaMonthlyBudget ?? monthlyBudget ?? 0;
    } else if (platformFilter === 'google') {
      effectiveMonthlyBudget = googleMonthlyBudget ?? 0;
    }

    if (!effectiveMonthlyBudget || effectiveMonthlyBudget <= 0) {
      return null;
    }

    // Filter campaigns by platform if needed
    let filteredCampaigns = campaigns;
    if (platformFilter !== 'all') {
      filteredCampaigns = campaigns.filter(c => c.platform === platformFilter);
    }

    // Get current month's remaining days
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Sum daily budgets from active campaigns only
    const activeCampaigns = filteredCampaigns.filter(c => 
      c.status === 'active' || c.is_active === true
    );

    const totalDailyBudget = activeCampaigns.reduce((sum, campaign) => {
      return sum + (Number(campaign.daily_budget) || 0);
    }, 0);

    // Project monthly spend
    const projectedMonthlySpend = totalDailyBudget * daysInMonth;
    const percentage = (projectedMonthlySpend / effectiveMonthlyBudget) * 100;

    return {
      totalDailyBudget,
      projectedMonthlySpend,
      percentage: Math.min(percentage, 150), // Cap at 150% for display
      actualPercentage: percentage,
      activeCampaignsCount: activeCampaigns.length,
      daysInMonth,
      monthlyBudget: effectiveMonthlyBudget,
      platformFilter
    };
  }, [campaigns, monthlyBudget, metaMonthlyBudget, googleMonthlyBudget, platformFilter]);

  if (!projection) {
    return (
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Defina o orçamento mensal do cliente para ver a projeção</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = () => {
    if (projection.actualPercentage > 100) return "text-destructive";
    if (projection.actualPercentage > 90) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getProgressColor = () => {
    if (projection.actualPercentage > 100) return "bg-destructive";
    if (projection.actualPercentage > 90) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getIcon = () => {
    if (projection.actualPercentage > 100) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (projection.actualPercentage > 90) return <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    {getIcon()}
                    <span className="text-sm font-medium">Projeção de Consumo</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Baseado em {projection.activeCampaignsCount} campanha(s) ativa(s) com orçamento diário total de {formatCurrency(projection.totalDailyBudget)} × {projection.daysInMonth} dias</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="flex-1">
              <div className="relative">
                <Progress 
                  value={Math.min(projection.percentage, 100)} 
                  className="h-2"
                />
                {projection.actualPercentage > 100 && (
                  <div 
                    className="absolute top-0 left-0 h-2 rounded-full bg-destructive/30"
                    style={{ width: '100%' }}
                  />
                )}
                <div 
                  className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
                  style={{ width: `${Math.min(projection.percentage, 100)}%` }}
                />
              </div>
            </div>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className={`text-sm font-bold tabular-nums cursor-help ${getStatusColor()}`}>
                    {projection.actualPercentage.toFixed(0)}%
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p>Projeção: {formatCurrency(projection.projectedMonthlySpend)}</p>
                    <p>Orçamento: {formatCurrency(projection.monthlyBudget)}</p>
                    {projection.actualPercentage > 100 && (
                      <p className="text-destructive font-medium">
                        Excedente: {formatCurrency(projection.projectedMonthlySpend - projection.monthlyBudget)}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="text-right text-xs text-muted-foreground hidden sm:block">
            <div>{formatCurrency(projection.projectedMonthlySpend)} / {formatCurrency(projection.monthlyBudget)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
