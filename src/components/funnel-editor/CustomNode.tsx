import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { 
  Pencil, 
  Facebook, 
  Search, 
  Youtube, 
  Mail, 
  BookOpen, 
  Newspaper, 
  Video,
  Megaphone,
  FileText,
  MessageSquare,
  Users,
  Target,
  TrendingUp,
  CheckCircle,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, LucideIcon> = {
  facebook: Facebook,
  google: Search,
  youtube: Youtube,
  mail: Mail,
  'book-open': BookOpen,
  newspaper: Newspaper,
  video: Video,
  megaphone: Megaphone,
  'file-text': FileText,
  'message-square': MessageSquare,
  users: Users,
  target: Target,
  'trending-up': TrendingUp,
  'check-circle': CheckCircle,
};

export interface CustomNodeData {
  label: string;
  description?: string;
  color: string;
  category: string;
  icon?: string;
  onEdit: (id: string) => void;
  [key: string]: unknown;
}

export const CustomNode = memo(({ id, data }: NodeProps) => {
  const nodeData = data as CustomNodeData;
  const handleColor = nodeData.color || "#3B82F6";
  const IconComponent = nodeData.icon ? iconMap[nodeData.icon] : null;

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
        className="min-w-[180px] max-w-[250px] rounded-lg border-2 shadow-lg bg-card overflow-hidden"
        style={{ borderColor: handleColor }}
      >
        <div
          className="px-3 py-2 flex items-center justify-between gap-2"
          style={{ backgroundColor: `${handleColor}15` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {IconComponent && (
              <IconComponent 
                className="h-4 w-4 shrink-0" 
                style={{ color: handleColor }}
              />
            )}
            <span className="font-medium text-sm text-foreground truncate">
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
          <div className="px-3 py-2 text-xs text-muted-foreground border-t">
            {nodeData.description}
          </div>
        )}
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

CustomNode.displayName = "CustomNode";
