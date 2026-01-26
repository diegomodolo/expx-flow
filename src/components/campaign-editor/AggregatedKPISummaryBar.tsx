import { DollarSign, Eye, MousePointer, Target, Percent, TrendingUp } from "lucide-react";
import { TreeNodeMetrics, ClientTargets } from "@/hooks/useCampaignTree";
import { MetricCell } from "./MetricCell";

interface AggregatedKPISummaryBarProps {
  metrics: TreeNodeMetrics;
  targets: ClientTargets;
}

export function AggregatedKPISummaryBar({ metrics, targets }: AggregatedKPISummaryBarProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-card rounded-lg border shadow-sm">
      {/* Spend */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-primary/10">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Investido</p>
          <p className="font-semibold text-sm">R$ {metrics.spend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Impressions */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-blue-500/10">
          <Eye className="h-4 w-4 text-blue-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Impressões</p>
          <p className="font-semibold text-sm">{metrics.impressions.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Clicks */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-green-500/10">
          <MousePointer className="h-4 w-4 text-green-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Cliques</p>
          <p className="font-semibold text-sm">{metrics.clicks.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* Conversions */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-purple-500/10">
          <Target className="h-4 w-4 text-purple-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Conversões</p>
          <p className="font-semibold text-sm">{metrics.conversions.toLocaleString('pt-BR')}</p>
        </div>
      </div>

      {/* CTR */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-orange-500/10">
          <Percent className="h-4 w-4 text-orange-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CTR</p>
          <MetricCell metric="ctr" value={metrics.ctr} targets={targets} suffix="%" />
        </div>
      </div>

      {/* CPA */}
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-md bg-red-500/10">
          <TrendingUp className="h-4 w-4 text-red-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">CPA</p>
          <MetricCell metric="cpa" value={metrics.cpa} targets={targets} prefix="R$ " />
        </div>
      </div>
    </div>
  );
}
