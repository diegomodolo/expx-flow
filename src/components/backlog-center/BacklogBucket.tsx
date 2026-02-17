import { ScrollArea } from "@/components/ui/scroll-area";
import { BacklogTaskCard } from "./BacklogTaskCard";
import { BacklogQuickEntry } from "./BacklogQuickEntry";
import { Loader2, Inbox } from "lucide-react";
import type { BacklogTask } from "@/hooks/useBacklogCommandCenter";

interface Props {
  tasks: BacklogTask[];
  loading: boolean;
  selectedTaskIds: Set<string>;
  onToggleTask: (id: string) => void;
  getReadiness: (task: BacklogTask) => { ready: boolean; hasDescription: boolean; hasEstimate: boolean; hasClient: boolean };
  getAgingHours: (createdAt: string) => number;
  clients: any[];
  companyId: string | undefined;
}

export function BacklogBucket({
  tasks,
  loading,
  selectedTaskIds,
  onToggleTask,
  getReadiness,
  getAgingHours,
  clients,
  companyId,
}: Props) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Quick Entry */}
      <BacklogQuickEntry clients={clients} companyId={companyId} />

      {/* Tasks list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Inbox className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">Backlog vazio</p>
              <p className="text-xs">Nenhuma tarefa aguardando distribuição</p>
            </div>
          ) : (
            tasks.map((task) => (
              <BacklogTaskCard
                key={task.id}
                task={task}
                selected={selectedTaskIds.has(task.id)}
                onToggle={() => onToggleTask(task.id)}
                readiness={getReadiness(task)}
                agingHours={getAgingHours(task.created_at)}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
