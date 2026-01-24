import { TreeNode, ClientTargets } from "@/hooks/useCampaignTree";
import { MetricCell } from "./MetricCell";
import { DollarSign, Eye, MousePointer, Target, TrendingUp } from "lucide-react";

interface KPISummaryBarProps {
  campaign: TreeNode | null;
  targets: ClientTargets;
}

export function KPISummaryBar({ campaign, targets }: KPISummaryBarProps) {
  if (!campaign) return null;

  const { metrics } = campaign;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg border">
      {/* Spend */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>Investimento</span>
        </div>
        <p className="text-xl font-bold">R$ {metrics.spend.toFixed(2)}</p>
      </div>

      {/* Impressions */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye className="w-3 h-3" />
          <span>Impressões</span>
        </div>
        <p className="text-xl font-bold">{metrics.impressions.toLocaleString()}</p>
      </div>

      {/* Clicks */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MousePointer className="w-3 h-3" />
          <span>Cliques</span>
        </div>
        <p className="text-xl font-bold">{metrics.clicks.toLocaleString()}</p>
      </div>

      {/* Conversions */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Target className="w-3 h-3" />
          <span>Conversões</span>
        </div>
        <p className="text-xl font-bold">{metrics.conversions}</p>
      </div>

      {/* CTR */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TrendingUp className="w-3 h-3" />
          <span>CTR</span>
        </div>
        <MetricCell metric="ctr" value={metrics.ctr} targets={targets} suffix="%" />
      </div>

      {/* CPA */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>CPA</span>
        </div>
        <MetricCell metric="cpa" value={metrics.cpa} targets={targets} prefix="R$ " />
      </div>
    </div>
  );
}
