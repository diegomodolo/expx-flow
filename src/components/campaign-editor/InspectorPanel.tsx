import { TreeNode } from "@/hooks/useCampaignTree";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Layers,
  Image,
  DollarSign,
  Eye,
  MousePointer,
  TrendingUp,
  Users,
  Link,
  MessageSquare,
} from "lucide-react";

interface InspectorPanelProps {
  node: TreeNode | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InspectorPanel({ node, isOpen, onClose }: InspectorPanelProps) {
  if (!node) return null;

  const getTypeIcon = () => {
    switch (node.type) {
      case "campaign":
        return <Target className="w-5 h-5" />;
      case "adset":
        return <Layers className="w-5 h-5" />;
      case "ad":
        return <Image className="w-5 h-5" />;
    }
  };

  const getTypeName = () => {
    switch (node.type) {
      case "campaign":
        return "Campanha";
      case "adset":
        return "Conjunto de Anúncios";
      case "ad":
        return "Anúncio";
    }
  };

  const formatCurrency = (value: number) => `R$ ${value.toFixed(2)}`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0">
        <SheetHeader className="p-6 pb-4">
          <div className="flex items-center gap-3">
            {getTypeIcon()}
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{node.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant={node.status === "active" ? "default" : "secondary"}>
                  {node.status === "active" ? "Ativo" : "Pausado"}
                </Badge>
                <Badge variant="outline">{node.platform.toUpperCase()}</Badge>
                <span className="text-xs">{getTypeName()}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Separator />

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Metrics Section */}
            <section>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Métricas de Performance
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="Investimento"
                  value={formatCurrency(node.metrics.spend)}
                />
                <MetricCard
                  icon={<Eye className="w-4 h-4" />}
                  label="Impressões"
                  value={formatNumber(node.metrics.impressions)}
                />
                <MetricCard
                  icon={<MousePointer className="w-4 h-4" />}
                  label="Cliques"
                  value={formatNumber(node.metrics.clicks)}
                />
                <MetricCard
                  icon={<Target className="w-4 h-4" />}
                  label="Conversões"
                  value={formatNumber(node.metrics.conversions)}
                />
                <MetricCard
                  icon={<TrendingUp className="w-4 h-4" />}
                  label="CTR"
                  value={formatPercent(node.metrics.ctr)}
                />
                <MetricCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="CPA"
                  value={formatCurrency(node.metrics.cpa)}
                />
                <MetricCard
                  icon={<DollarSign className="w-4 h-4" />}
                  label="CPC"
                  value={formatCurrency(node.metrics.cpc)}
                />
                {node.metrics.reach !== undefined && (
                  <MetricCard
                    icon={<Users className="w-4 h-4" />}
                    label="Alcance"
                    value={formatNumber(node.metrics.reach)}
                  />
                )}
              </div>
            </section>

            {/* Budget Section */}
            {node.budget && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Orçamento
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tipo</span>
                      <Badge variant="outline">
                        {node.budget.type === "daily" ? "Diário" : "Vitalício"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Valor</span>
                      <span className="font-medium">{formatCurrency(node.budget.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Gasto</span>
                      <span className="font-medium">{formatCurrency(node.budget.spent)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Utilizado</span>
                      <span className="font-medium">
                        {((node.budget.spent / node.budget.amount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Creative Section (for ads) */}
            {node.type === "ad" && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    Criativo
                  </h3>
                  <div className="space-y-4">
                    {node.creativeUrl && (
                      <div className="rounded-lg overflow-hidden bg-muted">
                        <img
                          src={node.creativeUrl}
                          alt="Creative"
                          className="w-full h-48 object-contain"
                        />
                      </div>
                    )}
                    {node.creativeTitle && (
                      <div>
                        <label className="text-xs text-muted-foreground">Título</label>
                        <p className="text-sm font-medium">{node.creativeTitle}</p>
                      </div>
                    )}
                    {node.creativeBody && (
                      <div>
                        <label className="text-xs text-muted-foreground">Texto</label>
                        <p className="text-sm">{node.creativeBody}</p>
                      </div>
                    )}
                    {node.linkUrl && (
                      <div>
                        <label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Link className="w-3 h-3" />
                          URL de Destino
                        </label>
                        <a
                          href={node.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate block"
                        >
                          {node.linkUrl}
                        </a>
                      </div>
                    )}
                    {node.callToAction && (
                      <div>
                        <label className="text-xs text-muted-foreground">CTA</label>
                        <Badge variant="secondary">{node.callToAction}</Badge>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Targeting Section (for ad sets) */}
            {node.type === "adset" && node.targeting && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Segmentação
                  </h3>
                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <pre className="whitespace-pre-wrap text-xs">
                      {JSON.stringify(node.targeting, null, 2)}
                    </pre>
                  </div>
                </section>
              </>
            )}

            {/* Children Summary */}
            {node.children && node.children.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    {node.type === "campaign" ? "Conjuntos de Anúncios" : "Anúncios"}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total</span>
                      <span className="font-medium">{node.children.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Ativos</span>
                      <span className="font-medium text-green-600">
                        {node.children.filter((c) => c.status === "active").length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Pausados</span>
                      <span className="font-medium text-yellow-600">
                        {node.children.filter((c) => c.status === "paused").length}
                      </span>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
