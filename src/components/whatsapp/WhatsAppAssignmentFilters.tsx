import { User, Users, UserCheck, UserX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AssignmentFilter = "all" | "mine" | "my-squad" | "unassigned";

interface WhatsAppAssignmentFiltersProps {
  activeFilter: AssignmentFilter;
  onFilterChange: (filter: AssignmentFilter) => void;
  myConversationsCount?: number;
  mySquadConversationsCount?: number;
  unassignedCount?: number;
}

export function WhatsAppAssignmentFilters({
  activeFilter,
  onFilterChange,
  myConversationsCount = 0,
  mySquadConversationsCount = 0,
  unassignedCount = 0,
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
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
          {count !== undefined && count > 0 && (
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center",
              isActive ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
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
