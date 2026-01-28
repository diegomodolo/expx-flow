import { User, Users, UserCheck, UserX, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AssignmentFilter = "all" | "mine" | "my-squad" | "unassigned" | "no-squad";

interface WhatsAppAssignmentFiltersProps {
  activeFilter: AssignmentFilter;
  onFilterChange: (filter: AssignmentFilter) => void;
  myConversationsCount?: number;
  mySquadConversationsCount?: number;
  unassignedCount?: number;
  noSquadCount?: number;
}

export function WhatsAppAssignmentFilters({
  activeFilter,
  onFilterChange,
  myConversationsCount = 0,
  mySquadConversationsCount = 0,
  unassignedCount = 0,
  noSquadCount = 0,
}: WhatsAppAssignmentFiltersProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b bg-muted/30">
      <FilterButton
        icon={Users}
        label="Todas"
        isActive={activeFilter === "all"}
        onClick={() => onFilterChange("all")}
      />
      <FilterButton
        icon={UserCheck}
        label="Minhas"
        isActive={activeFilter === "mine"}
        onClick={() => onFilterChange("mine")}
        count={myConversationsCount}
      />
      <FilterButton
        icon={User}
        label="Meu Squad"
        isActive={activeFilter === "my-squad"}
        onClick={() => onFilterChange("my-squad")}
        count={mySquadConversationsCount}
      />
      <FilterButton
        icon={UserX}
        label="Não atribuídas"
        isActive={activeFilter === "unassigned"}
        onClick={() => onFilterChange("unassigned")}
        count={unassignedCount}
      />
      <FilterButton
        icon={HelpCircle}
        label="Sem Squad"
        isActive={activeFilter === "no-squad"}
        onClick={() => onFilterChange("no-squad")}
        count={noSquadCount}
      />
    </div>
  );
}

interface FilterButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}

function FilterButton({ icon: Icon, label, isActive, onClick, count }: FilterButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "flex items-center justify-center gap-1 p-1.5 rounded text-[9px] font-medium transition-colors min-w-[28px]",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {count !== undefined && count > 0 && (
            <span className={cn(
              "text-[8px] font-bold",
              isActive ? "text-primary-foreground/80" : "text-primary"
            )}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
