import { TreeNode, ClientTargets } from "@/hooks/useCampaignTree";
import { MetricCell } from "./MetricCell";
import { InlineStatusToggle } from "./InlineStatusToggle";
import { InlineBudgetInput } from "./InlineBudgetInput";
import { BudgetProgressCell } from "./BudgetProgressCell";
import { CreativeThumbnail } from "./CreativeThumbnail";
import { ChevronRight, Layers, Target, Image } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeGridRowProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  isSelected: boolean;
  targets: ClientTargets;
  isStatusLoading: boolean;
  isBudgetLoading: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onToggleStatus: (newStatus: boolean) => void;
  onUpdateBudget: (newBudget: number) => void;
}

export function TreeGridRow({
  node,
  depth,
  isExpanded,
  hasChildren,
  isSelected,
  targets,
  isStatusLoading,
  isBudgetLoading,
  onToggleExpand,
  onSelect,
  onToggleStatus,
  onUpdateBudget,
}: TreeGridRowProps) {
  const getLevelStyles = () => {
    switch (node.type) {
      case "campaign":
        return "bg-muted/50";
      case "adset":
        return "bg-card";
      case "ad":
        return "bg-card";
      default:
        return "bg-card";
    }
  };

  const getIcon = () => {
    switch (node.type) {
      case "campaign":
        return <Target className="w-4 h-4 text-primary" />;
      case "adset":
        return <Layers className="w-4 h-4 text-blue-500" />;
      case "ad":
        return null; // Show thumbnail instead
      default:
        return null;
    }
  };

  const paddingLeft = `${depth * 16 + 12}px`;

  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer transition-colors",
        getLevelStyles(),
        isSelected && "ring-2 ring-primary ring-inset",
        "hover:bg-muted/60"
      )}
      onClick={onSelect}
    >
      {/* Name column */}
      <div className="col-span-4 flex items-center gap-2" style={{ paddingLeft }}>
        {/* Expand/Collapse button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="p-0.5 hover:bg-muted rounded transition-colors"
          >
            <ChevronRight
              className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-90"
              )}
            />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Icon or Thumbnail */}
        {node.type === "ad" ? (
          <CreativeThumbnail
            imageUrl={node.creativeUrl}
            title={node.creativeTitle}
            body={node.creativeBody}
            type={node.creativeType}
          />
        ) : (
          getIcon()
        )}

        {/* Name */}
        <span
          className={cn(
            "truncate",
            node.type === "campaign" && "font-semibold",
            node.type === "adset" && "font-medium"
          )}
          title={node.name}
        >
          {node.name}
        </span>
      </div>

      {/* Status column */}
      <div className="col-span-1" onClick={(e) => e.stopPropagation()}>
        <InlineStatusToggle
          id={node.id}
          isActive={node.status === "active"}
          isLoading={isStatusLoading}
          disabled={node.platform === "google"}
          onToggle={onToggleStatus}
        />
      </div>

      {/* Budget column */}
      <div className="col-span-2" onClick={(e) => e.stopPropagation()}>
        {node.budget ? (
          node.type !== "ad" ? (
            <InlineBudgetInput
              id={node.id}
              currentBudget={node.budget.amount}
              budgetType={node.budget.type}
              isLoading={isBudgetLoading}
              disabled={node.platform === "google"}
              onSave={onUpdateBudget}
            />
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </div>

      {/* CTR column */}
      <div className="col-span-1">
        <MetricCell
          metric="ctr"
          value={node.metrics.ctr}
          targets={targets}
          suffix="%"
          decimals={2}
        />
      </div>

      {/* CPA column */}
      <div className="col-span-1">
        <MetricCell
          metric="cpa"
          value={node.metrics.cpa}
          targets={targets}
          prefix="R$"
          decimals={0}
        />
      </div>

      {/* Conversions column */}
      <div className="col-span-1">
        <span className="text-sm font-medium">{node.metrics.conversions}</span>
      </div>

      {/* Spend column */}
      <div className="col-span-2">
        {node.budget ? (
          <BudgetProgressCell
            spent={node.metrics.spend}
            budget={node.budget.amount}
            budgetType={node.budget.type}
          />
        ) : (
          <span className="text-sm font-medium">
            R$ {node.metrics.spend.toFixed(2)}
          </span>
        )}
      </div>
    </div>
  );
}
