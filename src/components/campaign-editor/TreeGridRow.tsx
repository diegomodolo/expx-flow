import { TreeNode, ClientTargets } from "@/hooks/useCampaignTree";
import { MetricCell } from "./MetricCell";
import { InlineStatusToggle } from "./InlineStatusToggle";
import { InlineBudgetInput } from "./InlineBudgetInput";
import { BudgetProgressCell } from "./BudgetProgressCell";
import { CreativeThumbnail } from "./CreativeThumbnail";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronRight, Layers, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeGridRowProps {
  node: TreeNode;
  depth: number;
  isExpanded: boolean;
  hasChildren: boolean;
  isSelected: boolean;
  isChecked: boolean;
  targets: ClientTargets;
  isStatusLoading: boolean;
  isBudgetLoading: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  onToggleCheck: () => void;
  onToggleStatus: (newStatus: boolean) => void;
  onUpdateBudget: (newBudget: number) => void;
}

export function TreeGridRow({
  node,
  depth,
  isExpanded,
  hasChildren,
  isSelected,
  isChecked,
  targets,
  isStatusLoading,
  isBudgetLoading,
  onToggleExpand,
  onSelect,
  onToggleCheck,
  onToggleStatus,
  onUpdateBudget,
}: TreeGridRowProps) {
  const getLevelStyles = () => {
    // All levels now use bg-card for consistent white background
    return "bg-card";
  };

  const getIcon = () => {
    switch (node.type) {
      case "campaign":
        return <Target className="w-4 h-4 text-primary" />;
      case "adset":
        return <Layers className="w-4 h-4 text-muted-foreground" />;
      case "ad":
        return null; // Show thumbnail instead
      default:
        return null;
    }
  };

  const paddingLeft = `${depth * 20 + 4}px`;

  return (
    <tr
      className={cn(
        "cursor-pointer transition-colors",
        getLevelStyles(),
        isSelected && "ring-2 ring-primary ring-inset",
        "hover:bg-muted/50"
      )}
      onClick={onSelect}
    >
      {/* Checkbox column */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggleCheck()}
        />
      </td>

      {/* Name column */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2" style={{ paddingLeft }}>
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
                  "w-4 h-4 transition-transform text-muted-foreground",
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
              "truncate text-sm",
              node.type === "campaign" && "font-medium text-foreground",
              node.type === "adset" && "font-normal text-foreground",
              node.type === "ad" && "font-normal text-foreground"
            )}
            title={node.name}
          >
            {node.name}
          </span>
        </div>
      </td>

      {/* Status column */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
        <InlineStatusToggle
          id={node.id}
          isActive={node.status === "active"}
          isLoading={isStatusLoading}
          disabled={node.platform === "google"}
          onToggle={onToggleStatus}
        />
      </td>

      {/* Budget column */}
      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
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
      </td>

      {/* CTR column */}
      <td className="px-3 py-3">
        <MetricCell
          metric="ctr"
          value={node.metrics.ctr}
          targets={targets}
          suffix="%"
          decimals={2}
        />
      </td>

      {/* CPA column */}
      <td className="px-3 py-3">
        <MetricCell
          metric="cpa"
          value={node.metrics.cpa}
          targets={targets}
          prefix="R$"
          decimals={0}
        />
      </td>

      {/* CPM column */}
      <td className="px-3 py-3">
        <MetricCell
          metric="cpm"
          value={node.metrics.cpm}
          targets={targets}
          prefix="R$"
          decimals={2}
        />
      </td>

      {/* CPC column */}
      <td className="px-3 py-3">
        <MetricCell
          metric="cpc"
          value={node.metrics.cpc}
          targets={targets}
          prefix="R$"
          decimals={2}
        />
      </td>

      {/* Conversions column */}
      <td className="px-3 py-3">
        <span className="text-sm font-medium">{node.metrics.conversions}</span>
      </td>

      {/* Spend column */}
      <td className="px-3 py-3">
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
      </td>
    </tr>
  );
}
