import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Crown, Shield, Wrench, Bot, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface SquadAgentNodeData {
  label: string;
  description?: string;
  role: "leader" | "manager" | "executor";
  agent_id: string;
  squad_instructions?: string;
  onEdit: (id: string) => void;
  [key: string]: unknown;
}

const roleConfig = {
  leader: { icon: Crown, color: "#F59E0B", label: "Líder", bg: "bg-yellow-500/10" },
  manager: { icon: Shield, color: "#3B82F6", label: "Gerente", bg: "bg-blue-500/10" },
  executor: { icon: Wrench, color: "#10B981", label: "Executor", bg: "bg-green-500/10" },
};

export const SquadAgentNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as SquadAgentNodeData;
  const config = roleConfig[nodeData.role] || roleConfig.executor;
  const RoleIcon = config.icon;

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} id="top" className="w-3 h-3 !bg-border" />
      <Handle type="target" position={Position.Left} id="left" className="w-3 h-3 !bg-border" />

      <div
        className="min-w-[200px] max-w-[280px] rounded-lg border-2 shadow-lg bg-card overflow-hidden"
        style={{ borderColor: config.color }}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between gap-2"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Bot className="h-4 w-4 shrink-0" style={{ color: config.color }} />
            <span className="font-medium text-sm text-foreground truncate">{nodeData.label}</span>
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

        {/* Body */}
        <div className="px-3 py-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <RoleIcon className="h-3.5 w-3.5" style={{ color: config.color }} />
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {config.label}
            </Badge>
          </div>
          {nodeData.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">{nodeData.description}</p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className="w-3 h-3 !bg-border" />
      <Handle type="source" position={Position.Right} id="right" className="w-3 h-3 !bg-border" />
    </div>
  );
});

SquadAgentNode.displayName = "SquadAgentNode";
