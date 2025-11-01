import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CustomNodeData {
  label: string;
  description?: string;
  color: string;
  category: string;
  onEdit: (id: string) => void;
  [key: string]: unknown;
}

export const CustomNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const handleColor = nodeData.color || "#3B82F6";

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-border"
      />
      
      <div
        className="min-w-[180px] max-w-[250px] rounded-lg border-2 shadow-lg bg-card overflow-hidden"
        style={{ borderColor: handleColor }}
      >
        <div
          className="px-3 py-2 flex items-center justify-between gap-2"
          style={{ backgroundColor: `${handleColor}15` }}
        >
          <span className="font-medium text-sm text-foreground truncate">
            {nodeData.label}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              nodeData.onEdit(id as string);
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
        </div>
        
        {nodeData.description && (
          <div className="px-3 py-2 text-xs text-muted-foreground border-t">
            {nodeData.description}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-border"
      />
    </div>
  );
});

CustomNode.displayName = "CustomNode";
