import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, Package, Image, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CampaignHierarchy, AdSetHierarchy, AdHierarchy, MetricsData } from "./types";

interface AutomationHierarchyTreeProps {
  hierarchy: CampaignHierarchy[];
  isLoading?: boolean;
  loadingMessage?: string;
}

function formatMetric(value: number | undefined, prefix: string = "", suffix: string = ""): string {
  if (value === undefined || value === null) return "-";
  if (prefix === "R$") {
    return `R$ ${value.toFixed(2)}`;
  }
  if (suffix === "%") {
    return `${value.toFixed(2)}%`;
  }
  return `${value.toFixed(0)}`;
}

function MetricsBadges({ metrics }: { metrics?: MetricsData }) {
  if (!metrics) return null;
  
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      <Badge variant="outline" className="text-xs font-mono">
        CPA: {formatMetric(metrics.cpa, "R$")}
      </Badge>
      <Badge variant="outline" className="text-xs font-mono">
        CTR: {formatMetric(metrics.ctr, "", "%")}
      </Badge>
      <Badge variant="outline" className="text-xs font-mono">
        Gastos: {formatMetric(metrics.spend, "R$")}
      </Badge>
      <Badge variant="outline" className="text-xs font-mono">
        Conv: {formatMetric(metrics.conversions)}
      </Badge>
      <Badge variant="outline" className="text-xs font-mono">
        Cliques: {formatMetric(metrics.clicks)}
      </Badge>
    </div>
  );
}

function AdItem({ ad }: { ad: AdHierarchy }) {
  return (
    <div className="ml-12 py-2 px-3 border-l-2 border-muted hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-2">
        <Image className="h-4 w-4 text-purple-500 flex-shrink-0" />
        <span className="font-medium text-sm truncate">{ad.name}</span>
      </div>
      <MetricsBadges metrics={ad.metrics} />
    </div>
  );
}

function AdSetItem({ adset, defaultExpanded = false }: { adset: AdSetHierarchy; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="ml-6">
      <div 
        className="py-2 px-3 border-l-2 border-muted hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {adset.ads.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          <Package className="h-4 w-4 text-blue-500 flex-shrink-0" />
          <span className="font-medium text-sm truncate">{adset.name}</span>
          <Badge variant="secondary" className="text-xs ml-auto">
            {adset.ads.length} criativos
          </Badge>
        </div>
        <MetricsBadges metrics={adset.metrics} />
      </div>
      
      {expanded && adset.ads.length > 0 && (
        <div className="space-y-0">
          {adset.ads.map(ad => (
            <AdItem key={ad.id} ad={ad} />
          ))}
        </div>
      )}
    </div>
  );
}

function CampaignItem({ campaign, defaultExpanded = true }: { campaign: CampaignHierarchy; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const totalAds = campaign.adsets.reduce((acc, adset) => acc + adset.ads.length, 0);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div 
        className="py-3 px-4 bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {campaign.adsets.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )
          ) : (
            <div className="w-4" />
          )}
          <TrendingUp className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{campaign.name}</span>
          <Badge variant="outline" className="text-xs ml-2">
            {campaign.objective}
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {campaign.adsets.length} conjuntos
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {totalAds} criativos
            </Badge>
          </div>
        </div>
        <MetricsBadges metrics={campaign.metrics} />
      </div>
      
      {expanded && campaign.adsets.length > 0 && (
        <div className="space-y-0 bg-background">
          {campaign.adsets.map(adset => (
            <AdSetItem key={adset.id} adset={adset} defaultExpanded={false} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AutomationHierarchyTree({ hierarchy, isLoading, loadingMessage }: AutomationHierarchyTreeProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-2" />
        <p className="text-sm">{loadingMessage || "Carregando estrutura..."}</p>
      </div>
    );
  }
  
  if (!hierarchy || hierarchy.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhuma campanha ativa encontrada</p>
      </div>
    );
  }
  
  const totalAdsets = hierarchy.reduce((acc, c) => acc + c.adsets.length, 0);
  const totalAds = hierarchy.reduce((acc, c) => 
    acc + c.adsets.reduce((acc2, a) => acc2 + a.ads.length, 0), 0
  );
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="font-medium">📊 Estrutura da Conta</span>
        <div className="flex gap-2">
          <Badge variant="outline">{hierarchy.length} campanhas</Badge>
          <Badge variant="outline">{totalAdsets} conjuntos</Badge>
          <Badge variant="outline">{totalAds} criativos</Badge>
        </div>
      </div>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {hierarchy.map(campaign => (
          <CampaignItem 
            key={campaign.id} 
            campaign={campaign} 
            defaultExpanded={hierarchy.length <= 3}
          />
        ))}
      </div>
    </div>
  );
}
