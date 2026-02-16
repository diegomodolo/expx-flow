import React from "react";
import { CommandCenterTask } from "@/hooks/useCommandCenter";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface Props {
  task: CommandCenterTask;
  slotWidth: number;
  startHour: number;
}

export function TimelineTaskCard({ task, slotWidth, startHour }: Props) {
  const estimatedMin = task.ai_estimated_minutes || 18;
  const slotsOccupied = Math.max(1, Math.ceil(estimatedMin / 18));
  const width = slotsOccupied * slotWidth;

  // Calculate position from start_date
  const taskStart = task.start_date ? new Date(task.start_date) : null;
  let leftOffset = 0;
  if (taskStart) {
    const dayStart = new Date(taskStart);
    dayStart.setHours(startHour, 0, 0, 0);
    const minutesFromStart = differenceInMinutes(taskStart, dayStart);
    leftOffset = (minutesFromStart / 18) * slotWidth;
  }

  const isDone = task.status === "done";
  const isOvertime = taskStart && !isDone && differenceInMinutes(new Date(), taskStart) > estimatedMin + 7;

  return (
    <div
      className={cn(
        "absolute top-1 h-[calc(100%-8px)] rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-medium transition-all duration-500 overflow-hidden",
        isDone
          ? "bg-emerald-500/30 border border-emerald-500/50 text-emerald-300"
          : isOvertime
          ? "bg-orange-500/30 border border-orange-500/50 text-orange-300 animate-pulse"
          : "bg-cyan-500/20 border border-cyan-500/30 text-cyan-200"
      )}
      style={{ left: `${Math.max(0, leftOffset)}px`, width: `${width}px` }}
      title={`${task.title} (${estimatedMin}min)`}
    >
      {isDone ? (
        <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
      ) : isOvertime ? (
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
      ) : (
        <Clock className="w-3 h-3 flex-shrink-0" />
      )}
      <span className="truncate">{task.title}</span>
    </div>
  );
}
