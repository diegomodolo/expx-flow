import React, { useCallback, useEffect, useRef, useState } from "react";
import { DragDropContext, DropResult } from "react-beautiful-dnd";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CommandCenterHeader } from "@/components/command-center/CommandCenterHeader";
import { SquadSelector } from "@/components/command-center/SquadSelector";
import { BacklogColumn } from "@/components/command-center/BacklogColumn";
import { WorkloadTimeline } from "@/components/command-center/WorkloadTimeline";
import { TaskDialog } from "@/components/tasks/TaskDialog";
import { useCommandCenter, SquadMember, CommandCenterTask } from "@/hooks/useCommandCenter";
import { useWorkSchedules } from "@/hooks/useWorkSchedules";
import { useBacklogCommandCenter } from "@/hooks/useBacklogCommandCenter";
import { useCompany } from "@/contexts/CompanyContext";
import { BacklogHeader } from "@/components/backlog-center/BacklogHeader";
import { BacklogClientSidebar } from "@/components/backlog-center/BacklogClientSidebar";
import { BacklogBucket } from "@/components/backlog-center/BacklogBucket";
import { BacklogFooterBar } from "@/components/backlog-center/BacklogFooterBar";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Radar, Loader2, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const START_HOUR = 0;
const TOTAL_MINUTES = 1440; // 24 hours

export default function SquadCommandCenter() {
  const {
    teams,
    teamsLoading,
    selectedTeamId,
    setSelectedTeamId,
    selectedTeam,
    backlogTasks,
    timelineTasks,
    setTimelineTasks,
    loading,
    assignTask,
    unassignTask,
    getAgingHours,
    getTodayMetrics,
    fetchTasks,
    viewDate,
    setViewDate,
  } = useCommandCenter();

  const { schedules: workSchedules } = useWorkSchedules();
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<CommandCenterTask | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [activeView, setActiveView] = useState<'timeline' | 'backlog'>('timeline');
  const [overflowDialog, setOverflowDialog] = React.useState<{
    taskId: string;
    memberId: string;
    memberName: string;
    startDate: Date;
  } | null>(null);
  const [draggingTask, setDraggingTask] = useState<CommandCenterTask | null>(null);
  const dropSlotRef = useRef<number | null>(null);
  const timelineContainerRef = useRef<HTMLDivElement | null>(null);

  // Backlog center hooks
  const { activeCompany } = useCompany();
  const backlogCenter = useBacklogCommandCenter();
  const [releasing, setReleasing] = useState(false);

  // Sync squad filter: command center → backlog
  useEffect(() => {
    if (selectedTeamId && selectedTeamId !== backlogCenter.selectedSquadId) {
      backlogCenter.setSelectedSquadId(selectedTeamId);
    }
  }, [selectedTeamId]);

  // Unified squad change handler
  const handleSquadChange = useCallback((id: string) => {
    setSelectedTeamId(id);
    backlogCenter.setSelectedSquadId(id);
  }, [setSelectedTeamId, backlogCenter]);

  const handleRelease = async () => {
    if (backlogCenter.selectedTaskIds.size === 0) return;
    setReleasing(true);
    try {
      await backlogCenter.releaseToLeaders(Array.from(backlogCenter.selectedTaskIds));
    } finally {
      setReleasing(false);
    }
  };

  const members: SquadMember[] = (selectedTeam?.members || []).map(m => ({
    ...m,
    discord_user_id: null,
  }));

  const findNextFreeSlot = useCallback((userId: string): Date => {
    const memberTasks = timelineTasks.filter(t => t.assigned_user_id === userId);
    const today = new Date();
    today.setHours(START_HOUR, 0, 0, 0);

    if (memberTasks.length === 0) return today;

    // Find latest task end
    let latestEnd = today.getTime();
    memberTasks.forEach(task => {
      if (!task.start_date) return;
      const start = new Date(task.start_date).getTime();
      const duration = (task.ai_estimated_minutes || 20) * 60000;
      const end = start + duration;
      if (end > latestEnd) latestEnd = end;
    });

    return new Date(latestEnd);
  }, [timelineTasks]);

  const handleDragStart = useCallback((start: any) => {
    const task = backlogTasks.find(t => t.id === start.draggableId);
    setDraggingTask(task || null);
    dropSlotRef.current = null;
  }, [backlogTasks]);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const currentDropSlot = dropSlotRef.current;
    setDraggingTask(null);
    dropSlotRef.current = null;
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

    // Use the exact slot from mouse position, fallback to next free slot
    let startDate: Date;
    if (currentDropSlot !== null && currentDropSlot >= 0) {
      // Load timeline settings for slot duration and start hour
      const saved = (() => { try { const r = localStorage.getItem("cc-timeline-settings"); return r ? JSON.parse(r) : null; } catch { return null; } })();
      const slotDuration = saved?.slotDuration ?? 20;
      const timelineStartHour = saved?.startHour ?? 0;
      const minutesFromDayStart = timelineStartHour * 60 + currentDropSlot * slotDuration;
      startDate = new Date(viewDate);
      startDate.setHours(0, 0, 0, 0);
      startDate.setMinutes(minutesFromDayStart);
    } else {
      startDate = findNextFreeSlot(member.user_id);
    }

    try {
      await assignTask(draggableId, member.user_id, member.name, startDate);
      
    } catch {
      toast({ title: "Erro ao atribuir", variant: "destructive" });
    }
  }, [backlogTasks, members, findNextFreeSlot, assignTask, toast, viewDate]);

  const handleOverflowConfirm = async () => {
    if (!overflowDialog) return;
    try {
      const task = backlogTasks.find(t => t.id === overflowDialog.taskId);
      const member = members.find(m => m.id === overflowDialog.memberId);
      await assignTask(overflowDialog.taskId, member?.user_id || overflowDialog.memberId, overflowDialog.memberName, overflowDialog.startDate);
      
      
    } catch {
      toast({ title: "Erro ao atribuir", variant: "destructive" });
    }
    setOverflowDialog(null);
  };

  const handleRepositionTask = useCallback(async (taskId: string, newStartDate: Date) => {
    try {
      const task = timelineTasks.find(t => t.id === taskId);
      const estimatedMinutes = task?.ai_estimated_minutes || 20;
      const newDeadline = new Date(newStartDate.getTime() + estimatedMinutes * 60000);

      // Optimistic update
      setTimelineTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        start_date: newStartDate.toISOString(),
        deadline: newDeadline.toISOString().split('T')[0],
      } : t));

      const { error } = await supabase
        .from("tasks")
        .update({
          start_date: newStartDate.toISOString(),
          deadline: newDeadline.toISOString().split('T')[0],
          due_date: newDeadline.toISOString(),
        })
        .eq("id", taskId);
      if (error) {
        // Rollback
        if (task) setTimelineTasks(prev => prev.map(t => t.id === taskId ? task : t));
        throw error;
      }
      
    } catch {
      toast({ title: "Erro ao mover tarefa", variant: "destructive" });
    }
  }, [toast, timelineTasks, setTimelineTasks]);

  const handleResizeTask = useCallback(async (taskId: string, newStartDate: Date, newEstimatedMinutes: number) => {
    try {
      const task = timelineTasks.find(t => t.id === taskId);
      const newDeadline = new Date(newStartDate.getTime() + newEstimatedMinutes * 60000);

      // Optimistic update
      setTimelineTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        start_date: newStartDate.toISOString(),
        deadline: newDeadline.toISOString().split('T')[0],
        ai_estimated_minutes: newEstimatedMinutes,
      } : t));

      const { error } = await supabase
        .from("tasks")
        .update({
          start_date: newStartDate.toISOString(),
          deadline: newDeadline.toISOString().split('T')[0],
          due_date: newDeadline.toISOString(),
          ai_estimated_minutes: newEstimatedMinutes,
        })
        .eq("id", taskId);
      if (error) {
        if (task) setTimelineTasks(prev => prev.map(t => t.id === taskId ? task : t));
        throw error;
      }
      
    } catch {
      toast({ title: "Erro ao redimensionar", variant: "destructive" });
    }
  }, [toast, timelineTasks, setTimelineTasks]);

  const handleSendToBacklog = useCallback(async (taskId: string) => {
    const task = timelineTasks.find(t => t.id === taskId);
    try {
      await unassignTask(taskId);
      
    } catch {
      toast({ title: "Erro ao devolver ao backlog", variant: "destructive" });
    }
  }, [unassignTask, toast, timelineTasks]);

  const handleReassignTask = useCallback(async (taskId: string, newUserId: string, newMemberName: string, newStartDate: Date) => {
    const task = timelineTasks.find(t => t.id === taskId);
    try {
      const estimatedMinutes = task?.ai_estimated_minutes || 20;
      const deadlineDate = new Date(newStartDate.getTime() + estimatedMinutes * 60000);

      // Optimistic update
      setTimelineTasks(prev => prev.map(t => t.id === taskId ? {
        ...t,
        assigned_user_id: newUserId,
        responsible_name: newMemberName,
        start_date: newStartDate.toISOString(),
        deadline: deadlineDate.toISOString().split('T')[0],
      } : t));

      const { error } = await supabase
        .from("tasks")
        .update({
          assigned_user_id: newUserId,
          responsible_name: newMemberName,
          start_date: newStartDate.toISOString(),
          deadline: deadlineDate.toISOString().split('T')[0],
          due_date: deadlineDate.toISOString(),
        })
        .eq("id", taskId);
      if (error) {
        if (task) setTimelineTasks(prev => prev.map(t => t.id === taskId ? task : t));
        throw error;
      }
      
    } catch {
      toast({ title: "Erro ao reatribuir tarefa", variant: "destructive" });
    }
  }, [toast, timelineTasks, setTimelineTasks]);

  const metrics = getTodayMetrics();

  // Calculate time-based availability
  const timeAvailability = React.useMemo(() => {
    const toMin = (t: string) => {
      const [h, m] = (t || "00:00").substring(0, 5).split(":").map(Number);
      return h * 60 + m;
    };

    let totalCapacityMin = 0;
    let totalAllocatedMin = 0;

    members.forEach(member => {
      const schedule = workSchedules.find(ws => ws.id === member.work_schedule_id);
      let memberCapacity = 0;
      if (schedule) {
        const workMin = toMin(schedule.work_end) - toMin(schedule.work_start);
        const lunchMin = toMin(schedule.lunch_end) - toMin(schedule.lunch_start);
        memberCapacity = Math.max(0, workMin - lunchMin);
      } else {
        memberCapacity = 480; // default 8h
      }
      totalCapacityMin += memberCapacity;

      const memberTasks = timelineTasks.filter(t => t.assigned_user_id === member.user_id);
      const allocated = memberTasks.reduce((sum, t) => sum + (t.ai_estimated_minutes || 20), 0);
      totalAllocatedMin += allocated;
    });

    const freeMin = Math.max(0, totalCapacityMin - totalAllocatedMin);
    const freePercent = totalCapacityMin > 0 ? Math.round((freeMin / totalCapacityMin) * 100) : 0;
    const freeHours = Math.floor(freeMin / 60);
    const freeMinRemainder = freeMin % 60;
    const totalHours = Math.floor(totalCapacityMin / 60);

    return { totalCapacityMin, totalAllocatedMin, freeMin, freePercent, freeHours, freeMinRemainder, totalHours };
  }, [members, timelineTasks, workSchedules]);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-130px)] overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center justify-between flex-shrink-0 pb-4">
          <div className="flex items-center gap-3">
            {activeView === 'backlog' ? <Inbox className="w-6 h-6 text-primary" /> : <Radar className="w-6 h-6 text-primary" />}
            <h1 className="text-xl font-bold text-foreground tracking-tight">{activeView === 'backlog' ? 'Backlog' : 'Command Center'}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant={activeView === 'backlog' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                const newView = activeView === 'backlog' ? 'timeline' : 'backlog';
                setActiveView(newView);
                if (newView === 'timeline') fetchTasks();
              }}
              className="gap-2"
            >
              <Inbox className="w-4 h-4" />
              {activeView === 'backlog' ? 'Voltar à Timeline' : 'Backlog'}
            </Button>
            <SquadSelector
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelect={handleSquadChange}
              loading={teamsLoading}
            />
          </div>
        </div>

        {loading || teamsLoading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : activeView === 'backlog' ? (
          <>
            <div className="flex-shrink-0">
              <BacklogHeader
                totalStats={backlogCenter.totalStats}
                squads={backlogCenter.squads}
                selectedSquadId={selectedTeamId}
                onSquadChange={handleSquadChange}
              />
            </div>
            <ResizablePanelGroup direction="horizontal" autoSaveId="backlog-panels" className="flex flex-1 min-h-0">
              <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
                <BacklogClientSidebar
                  clients={backlogCenter.backlogClients}
                  selectedClientId={backlogCenter.selectedClientId}
                  onSelectClient={backlogCenter.setSelectedClientId}
                  totalStats={backlogCenter.totalStats}
                />
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={75}>
                <BacklogBucket
                  tasks={backlogCenter.filteredTasks}
                  loading={backlogCenter.tasksLoading}
                  selectedTaskIds={backlogCenter.selectedTaskIds}
                  onToggleTask={backlogCenter.toggleTaskSelection}
                  getReadiness={backlogCenter.getReadiness}
                  getAgingHours={backlogCenter.getAgingHours}
                  clients={backlogCenter.clients}
                  taskToClients={backlogCenter.taskToClients}
                  companyId={activeCompany?.company_id}
                  subtasksByParent={backlogCenter.subtasksByParent}
                  selectionBar={
                    <BacklogFooterBar
                      selectionStats={backlogCenter.selectionStats}
                      onRelease={handleRelease}
                      onClear={backlogCenter.clearSelection}
                      onSelectAll={backlogCenter.selectAll}
                      releasing={releasing}
                    />
                  }
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </>
        ) : (
          <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Header metrics */}
            <div className="my-4 flex-shrink-0">
              <CommandCenterHeader metrics={metrics} teamName={selectedTeam?.name || "—"} timeAvailability={timeAvailability} />
            </div>

            {/* Main layout: Backlog + Timeline */}
            <ResizablePanelGroup direction="horizontal" autoSaveId="command-center-panels" className="flex gap-0 flex-1 min-h-0">
              <ResizablePanel defaultSize={20} minSize={12} maxSize={35}>
                <div className="bg-card border border-border overflow-hidden flex flex-col h-full">
                  <BacklogColumn
                    tasks={backlogTasks}
                    getAgingHours={getAgingHours}
                    teamColor={selectedTeam?.color}
                    onClickTask={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
                  />
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={80}>
                <div className="flex-1 min-w-0 overflow-auto flex flex-col h-full">
                  <WorkloadTimeline
                    members={members}
                    tasks={timelineTasks}
                    startHour={START_HOUR}
                    workSchedules={workSchedules}
                    onRepositionTask={handleRepositionTask}
                    onResizeTask={handleResizeTask}
                    onClickTask={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
                    onSendToBacklog={handleSendToBacklog}
                    onReassignTask={handleReassignTask}
                    draggingTask={draggingTask}
                    dropSlotRef={dropSlotRef}
                    selectedDate={viewDate}
                    onDateChange={setViewDate}
                  />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
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

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={(open) => {
          setTaskDialogOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSave={async (taskData) => {
          if (!editingTask) return;
          try {
            await supabase.from("tasks").update(taskData).eq("id", editingTask.id);
            fetchTasks();
            toast({ title: "Tarefa atualizada" });
          } catch {
            toast({ title: "Erro ao atualizar", variant: "destructive" });
          }
          setTaskDialogOpen(false);
          setEditingTask(null);
        }}
      />
    </DashboardLayout>
  );
}
