import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Flame, Users } from "lucide-react";
import type { BacklogClient } from "@/hooks/useBacklogCommandCenter";

interface Props {
  clients: BacklogClient[];
  selectedClientId: string | null;
  onSelectClient: (id: string | null) => void;
  totalStats: { totalTasks: number; totalMinutes: number; totalHours: number };
}

const tempColors = {
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
};

const tempLabels = {
  blue: "Normal",
  orange: "Acumulando",
  red: "Parado 48h+",
};

export function BacklogClientSidebar({ clients, selectedClientId, onSelectClient, totalStats }: Props) {
  return (
    <div className="w-72 border-r bg-card flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="p-4 border-b space-y-2">
        <h2 className="font-semibold text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Clientes no Backlog
        </h2>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{totalStats.totalHours}h acumuladas</span>
          <span>•</span>
          <span>{totalStats.totalTasks} tarefas</span>
        </div>
      </div>

      {/* All clients button */}
      <button
        onClick={() => onSelectClient(null)}
        className={cn(
          "px-4 py-3 text-left text-sm border-b transition-colors hover:bg-accent",
          !selectedClientId && "bg-accent font-medium"
        )}
      >
        Todos os clientes
      </button>

      {/* Client list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {clients.map((client) => {
            const hours = Math.floor(client.totalMinutes / 60);
            const mins = client.totalMinutes % 60;
            const timeLabel = hours > 0 ? `${hours}h${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;

            return (
              <button
                key={client.id}
                onClick={() => onSelectClient(client.id === selectedClientId ? null : client.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent group",
                  selectedClientId === client.id && "bg-accent ring-1 ring-primary/20"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={client.avatar || undefined} />
                  <AvatarFallback className="text-xs bg-muted">
                    {client.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{client.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {timeLabel}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{client.taskCount} tarefas</span>
                  </div>
                </div>

                {/* Temperature indicator */}
                <div className="flex flex-col items-center gap-1 shrink-0" title={tempLabels[client.temperature]}>
                  <div className={cn("w-2.5 h-2.5 rounded-full", tempColors[client.temperature])} />
                  {client.temperature === "red" && (
                    <Flame className="w-3 h-3 text-destructive animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}

          {clients.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">Nenhuma tarefa no backlog</p>
          )}
        </div>
      </ScrollArea>

      {/* Temperature legend */}
      <div className="p-3 border-t">
        <p className="text-[10px] font-medium text-muted-foreground mb-2">Temperatura</p>
        <div className="space-y-1">
          {(["blue", "orange", "red"] as const).map((t) => (
            <div key={t} className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full", tempColors[t])} />
              <span>{tempLabels[t]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
