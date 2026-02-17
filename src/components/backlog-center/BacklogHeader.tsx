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
    <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Inbox className="w-5 h-5 text-primary" />
            Backlog Command Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Central de processamento de demandas</p>
        </div>

        <Select
          value={selectedSquadId ?? "all"}
          onValueChange={(v) => onSquadChange(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[200px]">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              <SelectValue placeholder="Filtrar por Squad" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Todos os Squads
              </span>
            </SelectItem>
            {squads.map((squad) => (
              <SelectItem key={squad.id} value={squad.id}>
                <span className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: squad.color || '#6B7280' }}
                  />
                  {squad.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
