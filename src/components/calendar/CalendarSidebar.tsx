import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEmployeePermissions } from "@/hooks/useEmployeePermissions";
import type { CalendarEvent } from "@/hooks/useCalendarEvents";

interface Employee {
  id: string;
  user_id: string;
  name: string;
  profile_avatar_url?: string | null;
}

interface CalendarSidebarProps {
  employees: Employee[];
  sharedWithMeUserIds: string[];
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  enabledTypes: CalendarEvent["type"][];
  onEnabledTypesChange: (types: CalendarEvent["type"][]) => void;
  onShareClick: () => void;
}

const EVENT_TYPE_CONFIG: {
  type: CalendarEvent["type"];
  label: string;
  color: string;
}[] = [
  { type: "meeting", label: "Reuniões", color: "#4CAF50" },
  { type: "task", label: "Tarefas", color: "#2196F3" },
  { type: "deadline", label: "Deadlines", color: "#FF9800" },
  { type: "presentation", label: "Apresentações", color: "#00BCD4" },
];

export function CalendarSidebar({
  employees,
  sharedWithMeUserIds,
  selectedUserIds,
  onSelectedUserIdsChange,
  enabledTypes,
  onEnabledTypesChange,
  onShareClick,
}: CalendarSidebarProps) {
  const { user } = useAuth();
  const { hasPermission } = useEmployeePermissions();
  const isAdmin = hasPermission("calendario-admin");

  const currentEmployee = employees.find((e) => e.user_id === user?.id);
  const sharedEmployees = employees.filter(
    (e) => sharedWithMeUserIds.includes(e.user_id) && e.user_id !== user?.id,
  );
  const otherEmployees = employees.filter(
    (e) => e.user_id !== user?.id && !sharedWithMeUserIds.includes(e.user_id),
  );

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
    } else {
      onSelectedUserIdsChange([...selectedUserIds, userId]);
    }
  };

  const toggleEventType = (type: CalendarEvent["type"]) => {
    if (enabledTypes.includes(type)) {
      onEnabledTypesChange(enabledTypes.filter((t) => t !== type));
    } else {
      onEnabledTypesChange([...enabledTypes, type]);
    }
  };

  const renderEmployee = (emp: Employee) => (
    <label
      key={emp.user_id}
      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
    >
      <Checkbox
        checked={selectedUserIds.includes(emp.user_id)}
        onCheckedChange={() => toggleUser(emp.user_id)}
      />
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium text-white flex-shrink-0"
        style={{
          backgroundColor: selectedUserIds.includes(emp.user_id)
            ? "#7c3aed"
            : "#6b7280",
        }}
      >
        {emp.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()}
      </div>
      <span className="text-sm truncate">{emp.name}</span>
    </label>
  );

  return (
    <div className="w-[220px] border-r flex flex-col h-full overflow-y-auto p-3 space-y-4">
      {/* Meu Calendario */}
      <div>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Meu Calendário
        </h4>
        {currentEmployee && renderEmployee(currentEmployee)}
      </div>

      {/* Compartilhados comigo */}
      {sharedEmployees.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Compartilhados comigo
          </h4>
          {sharedEmployees.map(renderEmployee)}
        </div>
      )}

      {/* Todos Colaboradores (admin only) */}
      {isAdmin && otherEmployees.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            Todos Colaboradores
            <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              ADMIN
            </span>
          </h4>
          {otherEmployees.map(renderEmployee)}
        </div>
      )}

      {/* Tipos de Evento */}
      <div className="border-t pt-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          Tipos de Evento
        </h4>
        {EVENT_TYPE_CONFIG.map((et) => (
          <label
            key={et.type}
            className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted/50 cursor-pointer"
          >
            <Checkbox
              checked={enabledTypes.includes(et.type)}
              onCheckedChange={() => toggleEventType(et.type)}
            />
            <div
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: et.color }}
            />
            <span className="text-sm">{et.label}</span>
          </label>
        ))}
      </div>

      {/* Compartilhar */}
      <div className="border-t pt-3">
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 text-xs"
          onClick={onShareClick}
        >
          <Share2 className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">Compartilhar calendário</span>
        </Button>
      </div>
    </div>
  );
}
