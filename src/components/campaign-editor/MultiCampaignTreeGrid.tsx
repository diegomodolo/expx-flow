import { useState, useCallback, useMemo } from "react";
import { TreeNode, ClientTargets } from "@/hooks/useCampaignTree";
import { TreeGridRow } from "./TreeGridRow";
import { BulkActionsBar } from "./BulkActionsBar";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SortColumn = "name" | "status" | "budget" | "ctr" | "cpa" | "cpm" | "cpc" | "conversions" | "spend";
type SortDirection = "asc" | "desc";

interface MultiCampaignTreeGridProps {
  campaigns: TreeNode[];
  targets: ClientTargets;
  clientId: string;
  isLoading: boolean;
  statusFilter: "all" | "active" | "paused" | "finished" | "deleted";
  onSelectNode: (node: TreeNode) => void;
  selectedNodeId: string | null;
  onRefresh: () => void;
}

export function MultiCampaignTreeGrid({
  campaigns,
  targets,
  clientId,
  isLoading,
  statusFilter,
  onSelectNode,
  selectedNodeId,
  onRefresh,
}: MultiCampaignTreeGridProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const { loading, currentAction, updateStatus, updateBudget, bulkUpdateStatus } = useInlineEdit({
    onSuccess: onRefresh,
  });

  const handleSort = useCallback((column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }, [sortColumn, sortDirection]);

  // Filter and sort campaigns
  const filteredCampaigns = useMemo(() => {
    let result = statusFilter === "all" ? [...campaigns] : campaigns.filter((campaign) => campaign.status === statusFilter);
    
    if (sortColumn) {
      result.sort((a, b) => {
        let aValue: number | string;
        let bValue: number | string;
        
        switch (sortColumn) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "status":
            aValue = a.status;
            bValue = b.status;
            break;
          case "budget":
            aValue = a.budget?.amount ?? 0;
            bValue = b.budget?.amount ?? 0;
            break;
          case "ctr":
            aValue = a.metrics.ctr;
            bValue = b.metrics.ctr;
            break;
          case "cpa":
            aValue = a.metrics.cpa;
            bValue = b.metrics.cpa;
            break;
          case "cpm":
            aValue = a.metrics.cpm;
            bValue = b.metrics.cpm;
            break;
          case "cpc":
            aValue = a.metrics.cpc;
            bValue = b.metrics.cpc;
            break;
          case "conversions":
            aValue = a.metrics.conversions;
            bValue = b.metrics.conversions;
            break;
          case "spend":
            aValue = a.metrics.spend;
            bValue = b.metrics.spend;
            break;
          default:
            return 0;
        }
        
        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortDirection === "asc" 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }
        
        return sortDirection === "asc" 
          ? (aValue as number) - (bValue as number) 
          : (bValue as number) - (aValue as number);
      });
    }
    
    return result;
  }, [campaigns, statusFilter, sortColumn, sortDirection]);

  // Collect all node IDs for "select all" functionality
  const allNodeIds = useMemo(() => {
    const ids: string[] = [];
    const collectIds = (node: TreeNode) => {
      ids.push(node.id);
      node.children?.forEach(collectIds);
    };
    filteredCampaigns.forEach(collectIds);
    return ids;
  }, [filteredCampaigns]);

  // Collect all nodes for bulk operations
  const allNodesMap = useMemo(() => {
    const map = new Map<string, TreeNode>();
    const collectNodes = (node: TreeNode) => {
      map.set(node.id, node);
      node.children?.forEach(collectNodes);
    };
    filteredCampaigns.forEach(collectNodes);
    return map;
  }, [filteredCampaigns]);

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

    bulkUpdateStatus(nodes, "paused");
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

    bulkUpdateStatus(nodes, "active");
    clearSelection();
  }, [selectedNodes, allNodesMap, bulkUpdateStatus, clearSelection]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg bg-card">
        <div className="text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p>Carregando campanhas...</p>
        </div>
      </div>
    );
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground border rounded-lg bg-card">
        <div className="text-center">
          <p className="mb-2">Nenhuma campanha encontrada</p>
          <p className="text-sm">Clique em "Sincronizar" para buscar campanhas</p>
        </div>
      </div>
    );
  }

  // Check if all are selected
  const allSelected = allNodeIds.length > 0 && selectedNodes.size === allNodeIds.length;
  const someSelected = selectedNodes.size > 0 && selectedNodes.size < allNodeIds.length;

  // Flatten multiple campaign trees into an array of rows
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
        onToggleExpand={() => toggleExpand(node.id)}
        onSelect={() => onSelectNode(node)}
        onToggleCheck={() => toggleSelection(node.id)}
        onToggleStatus={(newStatus) => handleToggleStatus(node, newStatus)}
        onUpdateBudget={(newBudget) => handleUpdateBudget(node, newBudget)}
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
        <table className="w-full">
          <thead className="bg-card border-b">
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
              <SortableHeader 
                column="name" 
                label="Nome" 
                width="27%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="status" 
                label="Status" 
                width="7%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="budget" 
                label="Orçamento" 
                width="13%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="ctr" 
                label="CTR" 
                width="7%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="cpa" 
                label="CPA" 
                width="8%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="cpm" 
                label="CPM" 
                width="7%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="cpc" 
                label="CPC" 
                width="7%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="conversions" 
                label="Conv." 
                width="7%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader 
                column="spend" 
                label="Investido" 
                width="14%" 
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {filteredCampaigns.flatMap((campaign) => flattenTree(campaign, 0))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper component for sortable headers
interface SortableHeaderProps {
  column: SortColumn;
  label: string;
  width: string;
  sortColumn: SortColumn | null;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}

function SortableHeader({ column, label, width, sortColumn, sortDirection, onSort }: SortableHeaderProps) {
  const isActive = sortColumn === column;
  
  return (
    <th 
      className={cn(
        "px-3 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-muted/50 transition-colors select-none",
        isActive ? "text-foreground" : "text-muted-foreground"
      )}
      style={{ width }}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </div>
    </th>
  );
}
