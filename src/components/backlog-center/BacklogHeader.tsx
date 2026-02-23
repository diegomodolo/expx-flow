import { Clock, Inbox, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Squad {
  id: string;
  name: string;
  color: string | null;
}

interface Props {
  totalStats: { totalTasks: number; totalMinutes: number; totalHours: number };
  squads?: Squad[];
  selectedSquadId: string | null;
  onSquadChange: (id: string | null) => void;
}

export function BacklogHeader({ totalStats, squads = [], selectedSquadId, onSquadChange }: Props) {
  return (
    <div className="border-b bg-card px-6 py-4 flex items-center justify-between gap-4">
      {/* Squad filter */}
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-muted-foreground" />
        <Select
          value={selectedSquadId || "all"}
          onValueChange={(val) => onSquadChange(val === "all" ? null : val)}
        >
          <SelectTrigger className="w-[200px] h-9 text-sm">
            <SelectValue placeholder="Todas as Squads" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Squads</SelectItem>
            {squads.map((squad) => (
              <SelectItem key={squad.id} value={squad.id}>
                <div className="flex items-center gap-2">
                  {squad.color && (
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: squad.color }}
                    />
                  )}
                  <span>{squad.name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{totalStats.totalTasks}</span>
          <span className="text-xs text-muted-foreground">tarefas</span>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{totalStats.totalHours}h</span>
          <span className="text-xs text-muted-foreground">acumuladas</span>
        </div>

        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {totalStats.totalHours > 0 ? Math.ceil(totalStats.totalMinutes / 360) : 0}
          </span>
          <span className="text-xs text-muted-foreground">dias/pessoa</span>
        </div>
      </div>
    </div>
  );
}
