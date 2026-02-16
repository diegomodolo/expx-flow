import React, { useCallback } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CommandCenterHeader } from "@/components/command-center/CommandCenterHeader";
import { SquadSelector } from "@/components/command-center/SquadSelector";
import { BacklogColumn } from "@/components/command-center/BacklogColumn";
import { WorkloadTimeline } from "@/components/command-center/WorkloadTimeline";
import { useCommandCenter, SquadMember } from "@/hooks/useCommandCenter";
import { Radar, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const START_HOUR = 8;
const TOTAL_MINUTES = 360; // 6 hours

export default function SquadCommandCenter() {
  const {
    teams,
    teamsLoading,
    selectedTeamId,
    setSelectedTeamId,
    selectedTeam,
    backlogTasks,
    timelineTasks,
    loading,
    assignTask,
    getAgingHours,
    getTodayMetrics,
    fetchTasks,
  } = useCommandCenter();

  const { toast } = useToast();
  const [overflowDialog, setOverflowDialog] = React.useState<{
    taskId: string;
    memberId: string;
    memberName: string;
    startDate: Date;
  } | null>(null);

  const members: SquadMember[] = (selectedTeam?.members || []).map(m => ({
    ...m,
    discord_user_id: null,
  }));

  const findNextFreeSlot = useCallback((memberId: string): Date => {
    const memberTasks = timelineTasks.filter(t => t.assigned_user_id === memberId);
    const today = new Date();
    today.setHours(START_HOUR, 0, 0, 0);

    if (memberTasks.length === 0) return today;

    // Find latest task end
    let latestEnd = today.getTime();
    memberTasks.forEach(task => {
      if (!task.start_date) return;
      const start = new Date(task.start_date).getTime();
      const duration = (task.ai_estimated_minutes || 18) * 60000;
      const end = start + duration;
      if (end > latestEnd) latestEnd = end;
    });

    return new Date(latestEnd);
  }, [timelineTasks]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;

    // Only handle drops from backlog to timeline
    if (!source.droppableId.startsWith("backlog")) return;
    if (!destination.droppableId.startsWith("timeline-")) return;

    const memberId = destination.droppableId.replace("timeline-", "");
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    const task = backlogTasks.find(t => t.id === draggableId);
    if (!task) return;

    const nextFreeSlot = findNextFreeSlot(memberId);
    const taskDuration = (task.ai_estimated_minutes || 18) * 60000;
    const dayEnd = new Date();
    dayEnd.setHours(START_HOUR + 6, 0, 0, 0);

    // Check if it overflows
    if (nextFreeSlot.getTime() + taskDuration > dayEnd.getTime()) {
      setOverflowDialog({
        taskId: draggableId,
        memberId,
        memberName: member.name,
        startDate: nextFreeSlot,
      });
      return;
    }

    try {
      await assignTask(draggableId, memberId, member.name, nextFreeSlot);
      toast({ title: "Tarefa atribuída", description: `"${task.title}" → ${member.name}` });
    } catch {
      toast({ title: "Erro ao atribuir", variant: "destructive" });
    }
  }, [backlogTasks, members, findNextFreeSlot, assignTask, toast]);

  const handleOverflowConfirm = async () => {
    if (!overflowDialog) return;
    try {
      const task = backlogTasks.find(t => t.id === overflowDialog.taskId);
      await assignTask(overflowDialog.taskId, overflowDialog.memberId, overflowDialog.memberName, overflowDialog.startDate);
      toast({ title: "Tarefa atribuída", description: `"${task?.title}" → ${overflowDialog.memberName} (overflow)` });
    } catch {
      toast({ title: "Erro ao atribuir", variant: "destructive" });
    }
    setOverflowDialog(null);
  };

  const metrics = getTodayMetrics();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radar className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">Command Center</h1>
          </div>
          <SquadSelector
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelect={setSelectedTeamId}
            loading={teamsLoading}
          />
        </div>

        {loading || teamsLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            {/* Header metrics */}
            <div className="mb-6">
              <CommandCenterHeader metrics={metrics} teamName={selectedTeam?.name || "—"} />
            </div>

            {/* Main layout: Backlog + Timeline */}
            <div className="flex gap-4">
              {/* Backlog column */}
              <div className="w-72 flex-shrink-0 rounded-2xl bg-card border border-border overflow-hidden">
                <BacklogColumn
                  tasks={backlogTasks}
                  getAgingHours={getAgingHours}
                  teamColor={selectedTeam?.color}
                />
              </div>

              {/* Timeline */}
              <div className="flex-1 min-w-0 overflow-x-auto">
                <WorkloadTimeline
                  members={members}
                  tasks={timelineTasks}
                  startHour={START_HOUR}
                />
              </div>
            </div>
          </DragDropContext>
        )}

        {/* Overflow dialog */}
        <AlertDialog open={!!overflowDialog} onOpenChange={() => setOverflowDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cuidado: Overflow de horário</AlertDialogTitle>
              <AlertDialogDescription>
                Esta tarefa empurrará o cronograma para além das 6h do dia de {overflowDialog?.memberName}. Deseja confirmar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleOverflowConfirm}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
