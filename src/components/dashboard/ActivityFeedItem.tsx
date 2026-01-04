import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Image, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  LayoutGrid,
  Bell,
  Zap,
  MessageSquare,
  Target
} from "lucide-react";
import { ActivityItem } from "@/hooks/useActivityFeed";
import { cn } from "@/lib/utils";

interface ActivityFeedItemProps {
  activity: ActivityItem;
}

const activityConfig: Record<string, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  label: string;
}> = {
  creative_generated: {
    icon: Image,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "Criativo",
  },
  carousel_generated: {
    icon: LayoutGrid,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Carrossel",
  },
  task_completed: {
    icon: CheckCircle2,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Tarefa",
  },
  campaign_optimized: {
    icon: TrendingUp,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    label: "Campanha",
  },
  lead_captured: {
    icon: Users,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    label: "Lead",
  },
  alert_resolved: {
    icon: Bell,
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    label: "Alerta",
  },
  automation_executed: {
    icon: Zap,
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/30",
    label: "Automação",
  },
  comment_added: {
    icon: MessageSquare,
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    label: "Comentário",
  },
  default: {
    icon: Target,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
    label: "Atividade",
  },
};

export function ActivityFeedItem({ activity }: ActivityFeedItemProps) {
  const config = activityConfig[activity.activity_type] || activityConfig.default;
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(activity.created_at), {
    addSuffix: true,
    locale: ptBR,
  });

  const getUserInitials = () => {
    if (activity.user_name) {
      return activity.user_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return "SY";
  };

  return (
    <div className="flex gap-3 p-4 hover:bg-muted/50 transition-colors rounded-lg group">
      {/* Icon/Avatar Column */}
      <div className="flex-shrink-0">
        {activity.metadata?.image_url ? (
          <div className="relative">
            <img
              src={activity.metadata.image_url}
              alt=""
              className="w-12 h-12 rounded-lg object-cover border border-border"
            />
            <div className={cn(
              "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
              config.bgColor
            )}>
              <Icon className={cn("w-3 h-3", config.color)} />
            </div>
          </div>
        ) : (
          <div className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center",
            config.bgColor
          )}>
            <Icon className={cn("w-6 h-6", config.color)} />
          </div>
        )}
      </div>

      {/* Content Column */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-foreground">
                {activity.title}
              </span>
              <Badge variant="secondary" className={cn("text-xs", config.bgColor, config.color)}>
                {config.label}
              </Badge>
            </div>
            
            {activity.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {activity.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              {activity.metadata?.client_name && (
                <>
                  <span className="font-medium">{activity.metadata.client_name}</span>
                  <span>•</span>
                </>
              )}
              {activity.user_name && (
                <>
                  <span>por {activity.user_name}</span>
                  <span>•</span>
                </>
              )}
              <span>{timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
