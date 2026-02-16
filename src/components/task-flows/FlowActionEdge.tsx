import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from "@xyflow/react";
import { ArrowRight, Copy, Ghost } from "lucide-react";
import type { FlowActionType } from "./FlowEdgeActionModal";

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
}: EdgeProps) {
  const actionType = (data?.actionType as FlowActionType) || "move";
  const config = actionConfig[actionType];
  const Icon = config.icon;

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
            className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white shadow-md"
            style={{ backgroundColor: config.color }}
          >
            <Icon className="h-3 w-3" />
            {config.label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
