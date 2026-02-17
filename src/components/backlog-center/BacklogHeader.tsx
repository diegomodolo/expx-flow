import { Badge } from "@/components/ui/badge";
import { Clock, Inbox, TrendingUp } from "lucide-react";

interface Props {
  totalStats: { totalTasks: number; totalMinutes: number; totalHours: number };
}

export function BacklogHeader({ totalStats }: Props) {
  return (
    <div className="border-b bg-card px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Inbox className="w-5 h-5 text-primary" />
          Backlog Command Center
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Central de processamento de demandas</p>
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
