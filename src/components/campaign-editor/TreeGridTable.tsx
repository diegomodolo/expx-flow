import { useState, useCallback } from "react";
import { TreeNode, ClientTargets } from "@/hooks/useCampaignTree";
import { TreeGridRow } from "./TreeGridRow";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeGridTableProps {
  campaign: TreeNode | null;
  targets: ClientTargets;
  clientId: string;
  onSelectNode: (node: TreeNode) => void;
  selectedNodeId: string | null;
  onRefresh: () => void;
}

export function TreeGridTable({
  campaign,
  targets,
  clientId,
  onSelectNode,
  selectedNodeId,
  onRefresh,
}: TreeGridTableProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Campaign expanded by default
    return campaign ? new Set([campaign.id]) : new Set();
  });

  const { loading, currentAction, updateStatus, updateBudget } = useInlineEdit({
    onSuccess: onRefresh,
  });

  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const handleToggleStatus = useCallback(
    (node: TreeNode, newStatus: boolean) => {
      updateStatus(
        node.type,
        node.id,
        clientId,
        node.facebookId,
        newStatus ? "active" : "paused",
        node.platform
      );
    },
    [updateStatus, clientId]
  );

  const handleUpdateBudget = useCallback(
    (node: TreeNode, newBudget: number) => {
      if (!node.budget) return;
      updateBudget(
        node.type,
        node.id,
        clientId,
        node.facebookId,
        newBudget,
        node.budget.type,
        node.platform
      );
    },
    [updateBudget, clientId]
  );

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma campanha encontrada
      </div>
    );
  }

  const renderNode = (node: TreeNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id}>
        <TreeGridRow
          node={node}
          depth={depth}
          isExpanded={isExpanded}
          hasChildren={hasChildren}
          isSelected={isSelected}
          targets={targets}
          isStatusLoading={loading && currentAction === `status-${node.id}`}
          isBudgetLoading={loading && currentAction === `budget-${node.id}`}
          onToggleExpand={() => toggleExpand(node.id)}
          onSelect={() => onSelectNode(node)}
          onToggleStatus={(newStatus) => handleToggleStatus(node, newStatus)}
          onUpdateBudget={(newBudget) => handleUpdateBudget(node, newBudget)}
        />
        {isExpanded && hasChildren && (
          <div className="border-l border-border/50 ml-4">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* Header - matching Campanhas.tsx table header style */}
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[35%]">
              Nome
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[8%]">
              Status
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">
              Orçamento
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[8%]">
              CTR
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[10%]">
              CPA
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[8%]">
              Conv.
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[16%]">
              Investido
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {renderNode(campaign)}
        </tbody>
      </table>
    </div>
  );
}
