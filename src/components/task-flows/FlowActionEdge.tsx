import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { ArrowRight, Copy, Ghost, UserRound, CircleDot, Tag } from "lucide-react";
import type { FlowActionType, FlowEdgePropertyChanges } from "./FlowEdgeActionModal";

const actionConfig: Record<FlowActionType, { label: string; color: string; icon: typeof ArrowRight }> = {
  move: { label: "Mover", color: "#22c55e", icon: ArrowRight },
  copy: { label: "Cópia", color: "#3b82f6", icon: Copy },
  ghost: { label: "Fantasma", color: "#a855f7", icon: Ghost },
};

export function FlowActionEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps & { data?: { actionType?: FlowActionType; propertyChanges?: FlowEdgePropertyChanges; onEditEdge?: (edgeId: string) => void } }) {
  const actionType = (data?.actionType as FlowActionType) || "move";
  const config = actionConfig[actionType];
  const Icon = config.icon;
  const props = data?.propertyChanges;
  const hasProps = props && (props.changeStatus || props.changeResponsible || props.changeClassificacao);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{ stroke: config.color, strokeWidth: 2 }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan"
        >
          <div
            className="flex flex-col items-center gap-1 cursor-pointer hover:scale-110 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              data?.onEditEdge?.(id);
            }}
          >
            {/* Action badge */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white shadow-md"
              style={{ backgroundColor: config.color }}
            >
              <Icon className="h-3 w-3" />
              {config.label}
            </div>

            {/* Property change indicators */}
            {hasProps && (
              <div className="flex items-center gap-1">
                {props.changeStatus && (
                  <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                    <CircleDot className="h-2.5 w-2.5" />
                  </div>
                )}
                {props.changeResponsible && (
                  <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                    <UserRound className="h-2.5 w-2.5" />
                  </div>
                )}
                {props.changeClassificacao && (
                  <div className="flex items-center gap-0.5 bg-card border border-border rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm">
                    <Tag className="h-2.5 w-2.5" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
