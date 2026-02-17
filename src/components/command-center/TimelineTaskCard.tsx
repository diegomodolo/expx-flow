import React, { useRef, useState, useCallback } from "react";
import { CommandCenterTask } from "@/hooks/useCommandCenter";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, AlertTriangle, GripVertical } from "lucide-react";
import { differenceInMinutes } from "date-fns";

interface Props {
  task: CommandCenterTask;
  slotWidth: number;
  slotDuration?: number;
  startHour: number;
  selectedDate?: Date;
  onReposition?: (taskId: string, newStartDate: Date) => void;
  onClickTask?: (task: CommandCenterTask) => void;
}

export function TimelineTaskCard({ task, slotWidth, slotDuration = 20, startHour, selectedDate, onReposition, onClickTask }: Props) {
  const dragMoved = useRef(false);
  const estimatedMin = task.ai_estimated_minutes || slotDuration;
  const slotsOccupied = Math.max(1, Math.ceil(estimatedMin / slotDuration));
  const width = slotsOccupied * slotWidth;

  const taskStart = task.start_date ? new Date(task.start_date) : null;
  let leftOffset = 0;
  if (taskStart) {
    const dayStart = new Date(taskStart);
    dayStart.setHours(startHour, 0, 0, 0);
    const minutesFromStart = differenceInMinutes(taskStart, dayStart);
    leftOffset = (minutesFromStart / slotDuration) * slotWidth;
  }

  const isDone = task.status === "done";
  const isOvertime = taskStart && !isDone && differenceInMinutes(new Date(), taskStart) > estimatedMin + 7;

  const [dragging, setDragging] = useState(false);
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startLeft: number; containerLeft: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onReposition && !onClickTask) return;
    e.preventDefault();
    e.stopPropagation();
    dragMoved.current = false;

    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    dragRef.current = {
      startX: e.clientX,
      startLeft: leftOffset,
      containerLeft: containerRect.left,
    };
    setDragging(true);
    setDragLeft(leftOffset);

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 4) dragMoved.current = true;
      if (!dragMoved.current || isDone) return;
      const newLeft = dragRef.current.startLeft + dx;
      const snappedSlot = Math.round(newLeft / slotWidth);
      const snappedLeft = Math.max(0, snappedSlot * slotWidth);
      setDragLeft(snappedLeft);
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!dragMoved.current) {
        // It was a click, not a drag
        onClickTask?.(task);
      } else if (dragRef.current && onReposition && !isDone) {
        const dx = ev.clientX - dragRef.current.startX;
        const newLeft = dragRef.current.startLeft + dx;
        const snappedSlot = Math.max(0, Math.round(newLeft / slotWidth));
        const newMinutesFromDayStart = snappedSlot * slotDuration;

        // Use selectedDate as base date if provided, otherwise fall back to taskStart date
        const baseDate = selectedDate ? new Date(selectedDate) : (taskStart ? new Date(taskStart) : new Date());
        const newDate = new Date(baseDate);
        newDate.setHours(startHour, 0, 0, 0);
        newDate.setMinutes(newMinutesFromDayStart);
        onReposition(task.id, newDate);
      }
      dragRef.current = null;
      setDragging(false);
      setDragLeft(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [isDone, onReposition, onClickTask, leftOffset, slotWidth, slotDuration, startHour, taskStart, selectedDate, task]);

  const displayLeft = dragLeft !== null ? dragLeft : leftOffset;

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-1 h-[calc(100%-8px)] rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-medium overflow-hidden",
        isDone
          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
          : isOvertime
          ? "bg-orange-500/20 border border-orange-500/40 text-orange-600 dark:text-orange-400 animate-pulse"
          : "bg-primary/10 border border-primary/30 text-primary",
        dragging ? "opacity-80 shadow-lg z-50 cursor-grabbing" : "cursor-grab",
        !dragging && "transition-all duration-300"
      )}
      style={{ left: `${Math.max(0, displayLeft)}px`, width: `${width}px` }}
      title={`${task.title} (${estimatedMin}min) — arraste para mover`}
    >
      {!isDone && onReposition && (
        <GripVertical className="w-3 h-3 flex-shrink-0 opacity-40" />
      )}
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
