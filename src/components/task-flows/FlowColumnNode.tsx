import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Columns3 } from "lucide-react";

export interface FlowColumnNodeData {
  label: string;
  columnName: string;
  ownerName: string;
  color: string;
  columnId: string;
  userId: string;
  [key: string]: unknown;
}

export const FlowColumnNode = memo(({ data }: NodeProps) => {
  const nodeData = data as FlowColumnNodeData;
  const borderColor = nodeData.color || "#3B82F6";

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="w-3 h-3 !bg-border"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 !bg-border"
      />

      <div
        className="min-w-[200px] max-w-[280px] rounded-lg border-2 shadow-lg bg-card overflow-hidden"
        style={{ borderColor }}
      >
        <div
          className="px-3 py-2.5 flex items-center gap-2"
          style={{ backgroundColor: `${borderColor}15` }}
        >
          <Columns3 className="h-4 w-4 shrink-0" style={{ color: borderColor }} />
          <div className="flex-1 min-w-0">
            <span className="font-medium text-sm text-foreground block truncate">
              {nodeData.columnName}
            </span>
            <span className="text-xs text-muted-foreground truncate block">
              {nodeData.ownerName}
            </span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="w-3 h-3 !bg-border"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 !bg-border"
      />
    </div>
  );
});

FlowColumnNode.displayName = "FlowColumnNode";
