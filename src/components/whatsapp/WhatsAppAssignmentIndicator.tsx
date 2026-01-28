import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, UserX } from "lucide-react";
import { WhatsAppAssignment } from "@/hooks/useWhatsAppAssignments";
import { cn } from "@/lib/utils";

interface WhatsAppAssignmentIndicatorProps {
  assignment: WhatsAppAssignment | null;
  size?: "sm" | "md";
  showUnassigned?: boolean;
}

export function WhatsAppAssignmentIndicator({
  assignment,
  size = "sm",
  showUnassigned = true,
}: WhatsAppAssignmentIndicatorProps) {
  const sizeClasses = {
    sm: "h-4 w-4 text-[8px]",
    md: "h-5 w-5 text-[10px]",
  };

  if (!assignment) {
    if (!showUnassigned) return null;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "rounded-full border border-dashed border-muted-foreground/50 flex items-center justify-center bg-muted/50",
            sizeClasses[size]
          )}>
            <UserX className="h-2.5 w-2.5 text-muted-foreground/70" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Não atribuída
        </TooltipContent>
      </Tooltip>
    );
  }

  if (assignment.assigned_type === "squad" && assignment.assigned_team) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "rounded-full flex items-center justify-center border-2 border-background",
              sizeClasses[size]
            )}
            style={{ 
              backgroundColor: assignment.assigned_team.color || "hsl(var(--primary))" 
            }}
          >
            <Users className="h-2 w-2 text-white" />
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Squad: {assignment.assigned_team.name}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (assignment.assigned_type === "individual" && assignment.assigned_user) {
    const initials = getInitials(assignment.assigned_user.full_name || "");
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Avatar className={cn(sizeClasses[size], "border-2 border-background")}>
            {assignment.assigned_user.avatar_url && (
              <AvatarImage 
                src={assignment.assigned_user.avatar_url} 
                alt={assignment.assigned_user.full_name || ""}
              />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground text-[8px]">
              {initials}
            </AvatarFallback>
          </Avatar>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          Atendente: {assignment.assigned_user.full_name || "Sem nome"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
