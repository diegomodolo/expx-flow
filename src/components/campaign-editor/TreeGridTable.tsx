import { useState, useCallback, useMemo } from "react";
import { TreeNode, ClientTargets } from "@/hooks/useCampaignTree";
import { TreeGridRow } from "./TreeGridRow";
import { BulkActionsBar } from "./BulkActionsBar";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { Checkbox } from "@/components/ui/checkbox";

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

  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  const { loading, currentAction, updateStatus, updateBudget, bulkUpdateStatus } = useInlineEdit({
    onSuccess: onRefresh,
  });

  // Collect all node IDs for "select all" functionality
  const allNodeIds = useMemo(() => {
    if (!campaign) return [];
    const ids: string[] = [];
    const collectIds = (node: TreeNode) => {
      ids.push(node.id);
      node.children?.forEach(collectIds);
    };
    collectIds(campaign);
    return ids;
  }, [campaign]);

  // Collect all nodes for bulk operations
  const allNodesMap = useMemo(() => {
    const map = new Map<string, TreeNode>();
    if (!campaign) return map;
    const collectNodes = (node: TreeNode) => {
      map.set(node.id, node);
      node.children?.forEach(collectNodes);
    };
    collectNodes(campaign);
    return map;
  }, [campaign]);

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

  const toggleSelection = useCallback((nodeId: string) => {
    setSelectedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedNodes(new Set(allNodeIds));
  }, [allNodeIds]);

  const clearSelection = useCallback(() => {
    setSelectedNodes(new Set());
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

  const handleBulkPause = useCallback(() => {
    const nodes = Array.from(selectedNodes)
      .map((id) => allNodesMap.get(id))
      .filter((node): node is TreeNode => node !== undefined)
      .map((node) => ({
        type: node.type,
        id: node.id,
        facebookId: node.facebookId,
        platform: node.platform,
      }));

    bulkUpdateStatus(nodes, "paused", clientId);
    clearSelection();
  }, [selectedNodes, allNodesMap, bulkUpdateStatus, clearSelection]);

  const handleBulkActivate = useCallback(() => {
    const nodes = Array.from(selectedNodes)
      .map((id) => allNodesMap.get(id))
      .filter((node): node is TreeNode => node !== undefined)
      .map((node) => ({
        type: node.type,
        id: node.id,
        facebookId: node.facebookId,
        platform: node.platform,
      }));

    bulkUpdateStatus(nodes, "active", clientId);
    clearSelection();
  }, [selectedNodes, allNodesMap, bulkUpdateStatus, clearSelection]);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhuma campanha encontrada
      </div>
    );
  }

  // Check if all are selected
  const allSelected = allNodeIds.length > 0 && selectedNodes.size === allNodeIds.length;
  const someSelected = selectedNodes.size > 0 && selectedNodes.size < allNodeIds.length;

  // Flatten the tree into an array of rows for proper table alignment
  const flattenTree = (node: TreeNode, depth: number = 0): React.ReactNode[] => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNodeId === node.id;
    const isChecked = selectedNodes.has(node.id);

    const rows: React.ReactNode[] = [
      <TreeGridRow
        key={node.id}
        node={node}
        depth={depth}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        isSelected={isSelected}
        isChecked={isChecked}
        targets={targets}
        isStatusLoading={loading && currentAction === `status-${node.id}`}
        isBudgetLoading={loading && currentAction === `budget-${node.id}`}
        clientId={clientId}
        onToggleExpand={() => toggleExpand(node.id)}
        onSelect={() => onSelectNode(node)}
        onToggleCheck={() => toggleSelection(node.id)}
        onToggleStatus={(newStatus) => handleToggleStatus(node, newStatus)}
        onUpdateBudget={(newBudget) => handleUpdateBudget(node, newBudget)}
        onRefresh={onRefresh}
      />,
    ];

    if (isExpanded && hasChildren) {
      node.children!.forEach((child) => {
        rows.push(...flattenTree(child, depth + 1));
      });
    }

    return rows;
  };

  return (
    <div className="space-y-2">
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedNodes.size}
        isLoading={loading && currentAction === "bulk-status"}
        onPause={handleBulkPause}
        onActivate={handleBulkActivate}
        onClear={clearSelection}
      />

      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Header - matching Campanhas.tsx table header style */}
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {/* Checkbox column */}
              <th className="px-3 py-3 w-[3%]">
                <Checkbox
                  checked={allSelected}
                  ref={(ref) => {
                    if (ref) {
                      (ref as any).indeterminate = someSelected;
                    }
                  }}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      selectAll();
                    } else {
                      clearSelection();
                    }
                  }}
                />
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[27%]">
                Nome
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[7%]">
                Status
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[13%]">
                Orçamento
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[7%]">
                CTR
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[8%]">
                CPA
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[7%]">
                CPM
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[7%]">
                CPC
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[7%]">
                Conv.
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[12%]">
                Investido
              </th>
              <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[4%]">
                
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {flattenTree(campaign)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
