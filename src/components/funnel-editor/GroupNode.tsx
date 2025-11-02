import { memo } from "react";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { Pencil, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface GroupNodeData {
  label: string;
  description?: string;
  color?: string;
  onEdit: (id: string) => void;
}

export const GroupNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as GroupNodeData;
  const borderColor = nodeData?.color || "#8B5CF6";

  return (
    <>
      <NodeResizer
        minWidth={250}
        minHeight={200}
        isVisible={selected}
        lineClassName="!border-primary"
        handleClassName="!h-3 !w-3 !bg-primary"
      />
      
      <div
        className="w-full h-full rounded-lg border-2 bg-card/50 backdrop-blur-sm"
        style={{ borderColor, borderStyle: 'dashed' }}
      >
        <div
          className="px-3 py-2 flex items-center justify-between gap-2 border-b-2"
          style={{ 
            borderColor,
            backgroundColor: `${borderColor}10`
          }}
        >
          <div className="flex items-center gap-2">
            <Package 
              className="h-4 w-4" 
              style={{ color: borderColor }}
            />
            <span className="font-semibold text-sm">
              {nodeData.label}
            </span>
          </div>
          
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
          <div className="px-3 py-2 text-xs text-muted-foreground italic">
            {nodeData.description}
          </div>
        )}
      </div>
    </>
  );
});

GroupNode.displayName = "GroupNode";
