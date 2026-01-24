import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInlineEdit } from "@/hooks/useInlineEdit";
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
  Settings,
  Save,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface InspectorPanelProps {
  node: TreeNode | null;
  isOpen: boolean;
  onClose: () => void;
  clientId?: string;
  onUpdate?: () => void;
}

export function InspectorPanel({ node, isOpen, onClose, clientId, onUpdate }: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState("metrics");
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "paused">("active");
  const [editBudget, setEditBudget] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { loading, updateStatus, updateBudget, updateName } = useInlineEdit({
    onSuccess: () => {
      onUpdate?.();
      setHasChanges(false);
    },
  });

  // Reset form when node changes
  useEffect(() => {
    if (node) {
      setEditName(node.name);
      // Handle "finished" status as "paused" for editing purposes
      setEditStatus(node.status === "active" ? "active" : "paused");
      setEditBudget(node.budget?.amount?.toString() || "");
      setHasChanges(false);
      setActiveTab("metrics");
    }
  }, [node?.id]);

  // Track changes
  useEffect(() => {
    if (!node) return;
    const nameChanged = editName !== node.name;
    const currentNodeStatus = node.status === "active" ? "active" : "paused";
    const statusChanged = editStatus !== currentNodeStatus;
    const budgetChanged = node.budget && editBudget !== node.budget.amount.toString();
    setHasChanges(nameChanged || statusChanged || !!budgetChanged);
  }, [editName, editStatus, editBudget, node]);

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

  const handleSave = async () => {
    if (!clientId || !node) return;

    const platform = node.platform as "meta" | "google";
    const facebookId = (node as any).facebookId;

    try {
      // Update name if changed
      if (editName !== node.name) {
        await updateName(node.type, node.id, clientId, facebookId, editName, platform);
      }

      // Update status if changed
      if (editStatus !== node.status) {
        await updateStatus(node.type, node.id, clientId, facebookId, editStatus, platform);
      }

      // Update budget if changed (only for campaigns and adsets)
      if (node.budget && editBudget !== node.budget.amount.toString() && node.type !== "ad") {
        const newBudgetValue = parseFloat(editBudget);
        if (!isNaN(newBudgetValue) && newBudgetValue >= 1) {
          await updateBudget(
            node.type,
            node.id,
            clientId,
            facebookId,
            newBudgetValue,
            node.budget.type,
            platform
          );
        }
      }
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };

  const isGoogle = node.platform === "google";
  const canEditBudget = node.type !== "ad" && node.budget;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] p-0 flex flex-col">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="metrics" className="gap-2">
                <TrendingUp className="w-4 h-4" />
                Métricas
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2">
                <Settings className="w-4 h-4" />
                Configurações
                {hasChanges && <span className="w-2 h-2 rounded-full bg-primary" />}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            {/* Metrics Tab */}
            <TabsContent value="metrics" className="m-0 p-6 space-y-6">
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
                        <span className="font-medium text-primary">
                          {node.children.filter((c) => c.status === "active").length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Pausados</span>
                        <span className="font-medium text-muted-foreground">
                          {node.children.filter((c) => c.status === "paused").length}
                        </span>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="m-0 p-6 space-y-6">
              {/* Google Alert */}
              {isGoogle && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Campanhas Google Ads: alterações serão salvas apenas localmente (sem API).
                  </AlertDescription>
                </Alert>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={`Nome do ${getTypeName()?.toLowerCase()}`}
                />
                {editName.trim() === "" && (
                  <p className="text-xs text-destructive">O nome não pode estar vazio</p>
                )}
              </div>

              {/* Status Field */}
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {editStatus === "active" ? "Ativo" : "Pausado"}
                    </span>
                    <Badge variant={editStatus === "active" ? "default" : "secondary"}>
                      {editStatus === "active" ? "ON" : "OFF"}
                    </Badge>
                  </div>
                  <Switch
                    checked={editStatus === "active"}
                    onCheckedChange={(checked) => setEditStatus(checked ? "active" : "paused")}
                  />
                </div>
              </div>

              {/* Budget Field (only for campaigns and adsets) */}
              {canEditBudget && (
                <div className="space-y-2">
                  <Label htmlFor="edit-budget">
                    Orçamento {node.budget?.type === "daily" ? "Diário" : "Vitalício"}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="edit-budget"
                      type="number"
                      min="1"
                      step="0.01"
                      value={editBudget}
                      onChange={(e) => setEditBudget(e.target.value)}
                      className="pl-10"
                      placeholder="0.00"
                    />
                  </div>
                  {parseFloat(editBudget) < 1 && editBudget !== "" && (
                    <p className="text-xs text-destructive">O orçamento mínimo é R$ 1,00</p>
                  )}
                </div>
              )}

              {/* Platform Info */}
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <div className="p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                  <Badge variant="outline" className="uppercase">
                    {node.platform}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {node.platform === "meta" ? "Meta Ads (Facebook/Instagram)" : "Google Ads"}
                  </span>
                </div>
              </div>

              {/* Entity ID */}
              <div className="space-y-2">
                <Label>ID</Label>
                <p className="text-xs font-mono text-muted-foreground bg-muted/50 p-2 rounded">
                  {node.id}
                </p>
              </div>
            </TabsContent>
          </ScrollArea>

          {/* Footer with Save Button (only shows on settings tab) */}
          {activeTab === "settings" && (
            <>
              <Separator />
              <div className="p-4">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || loading || editName.trim() === "" || (canEditBudget && parseFloat(editBudget) < 1)}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </Tabs>
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
