import { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaignTree, TreeNode } from "@/hooks/useCampaignTree";
import { useClientContext } from "./ClienteContext";
import { TreeGridTable } from "@/components/campaign-editor/TreeGridTable";
import { InspectorPanel } from "@/components/campaign-editor/InspectorPanel";
import { KPISummaryBar } from "@/components/campaign-editor/KPISummaryBar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function CampaignEditorPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { client } = useClientContext();

  const { treeData, isLoading, targets, campaign, platform } = useCampaignTree({
    campaignId,
    clientId: client?.id,
    companyId: (client as any)?.company_id,
  });

  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const handleSelectNode = useCallback((node: TreeNode) => {
    setSelectedNode(node);
    setInspectorOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-meta-campaign", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-google-campaign", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-meta-adsets", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-meta-ads", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-google-adgroups", campaignId] });
    queryClient.invalidateQueries({ queryKey: ["campaign-tree-google-ads", campaignId] });
  }, [queryClient, campaignId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold truncate max-w-lg">
              {campaign?.name || "Campanha"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Plataforma: {platform === "meta" ? "Meta Ads" : "Google Ads"} •{" "}
              {treeData?.children?.length || 0} conjuntos de anúncios
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <KPISummaryBar campaign={treeData} targets={targets} />

      {/* Tree Grid */}
      <TreeGridTable
        campaign={treeData}
        targets={targets}
        clientId={client?.id || ""}
        onSelectNode={handleSelectNode}
        selectedNodeId={selectedNode?.id || null}
        onRefresh={handleRefresh}
      />

      {/* Inspector Panel */}
      <InspectorPanel
        node={selectedNode}
        isOpen={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
      />
    </div>
  );
}
