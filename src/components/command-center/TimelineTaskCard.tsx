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
  onResize?: (taskId: string, newStartDate: Date, newEstimatedMinutes: number) => void;
  onClickTask?: (task: CommandCenterTask) => void;
}

export function TimelineTaskCard({ task, slotWidth, slotDuration = 20, startHour, selectedDate, onReposition, onResize, onClickTask }: Props) {
  const dragMoved = useRef(false);
  const estimatedMin = task.ai_estimated_minutes || slotDuration;
  const slotsOccupied = Math.max(1, Math.ceil(estimatedMin / slotDuration));
  const baseWidth = slotsOccupied * slotWidth;

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

  // Drag-to-move state
  const [dragging, setDragging] = useState(false);
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const dragRef = useRef<{ startX: number; startLeft: number } | null>(null);

  // Resize state
  const [resizing, setResizing] = useState<"left" | "right" | null>(null);
  const [resizeLeft, setResizeLeft] = useState<number | null>(null);
  const [resizeWidth, setResizeWidth] = useState<number | null>(null);
  const resizeRef = useRef<{ startX: number; origLeft: number; origWidth: number; edge: "left" | "right" } | null>(null);
  const resizeValuesRef = useRef<{ left: number; width: number }>({ left: 0, width: 0 });

  // --- MOVE ---
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onReposition && !onClickTask) return;
    e.preventDefault();
    e.stopPropagation();
    dragMoved.current = false;

    dragRef.current = { startX: e.clientX, startLeft: leftOffset };
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
        onClickTask?.(task);
      } else if (dragRef.current && onReposition && !isDone) {
        const dx = ev.clientX - dragRef.current.startX;
        const newLeft = dragRef.current.startLeft + dx;
        const snappedSlot = Math.max(0, Math.round(newLeft / slotWidth));
        const newMinutesFromDayStart = snappedSlot * slotDuration;
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

  // --- RESIZE ---
  const handleResizeMouseDown = useCallback((edge: "left" | "right", e: React.MouseEvent) => {
    if (isDone || !onResize) return;
    e.preventDefault();
    e.stopPropagation();

    resizeRef.current = { startX: e.clientX, origLeft: leftOffset, origWidth: baseWidth, edge };
    setResizing(edge);
    setResizeLeft(leftOffset);
    setResizeWidth(baseWidth);
    resizeValuesRef.current = { left: leftOffset, width: baseWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const dx = ev.clientX - resizeRef.current.startX;

      if (edge === "right") {
        const newWidth = resizeRef.current.origWidth + dx;
        const snappedSlots = Math.max(1, Math.round(newWidth / slotWidth));
        const w = snappedSlots * slotWidth;
        setResizeWidth(w);
        resizeValuesRef.current.width = w;
      } else {
        const newLeft = resizeRef.current.origLeft + dx;
        const snappedSlot = Math.max(0, Math.round(newLeft / slotWidth));
        const snappedLeft = snappedSlot * slotWidth;
        const rightEdge = resizeRef.current.origLeft + resizeRef.current.origWidth;
        const newWidth = rightEdge - snappedLeft;
        if (newWidth >= slotWidth) {
          setResizeLeft(snappedLeft);
          setResizeWidth(newWidth);
          resizeValuesRef.current = { left: snappedLeft, width: newWidth };
        }
      }
    };

    const onMouseUp = () => {
      if (resizeRef.current && onResize) {
        const finalLeft = resizeValuesRef.current.left;
        const finalWidth = resizeValuesRef.current.width;
        const snappedStartSlot = Math.max(0, Math.round(finalLeft / slotWidth));
        const snappedSlots = Math.max(1, Math.round(finalWidth / slotWidth));
        const newMinutesFromDayStart = snappedStartSlot * slotDuration;
        const newEstimated = snappedSlots * slotDuration;

        const baseDate = selectedDate ? new Date(selectedDate) : (taskStart ? new Date(taskStart) : new Date());
        const newDate = new Date(baseDate);
        newDate.setHours(startHour, 0, 0, 0);
        newDate.setMinutes(newMinutesFromDayStart);

        onResize(task.id, newDate, newEstimated);
      }
      resizeRef.current = null;
      setResizing(null);
      setResizeLeft(null);
      setResizeWidth(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [isDone, onResize, leftOffset, baseWidth, slotWidth, slotDuration, startHour, taskStart, selectedDate, task, resizeLeft, resizeWidth]);

  const displayLeft = resizeLeft ?? dragLeft ?? leftOffset;
  const displayWidth = resizeWidth ?? baseWidth;

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-1 h-[calc(100%-8px)] rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-medium overflow-hidden group/card",
        isDone
          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
          : isOvertime
          ? "bg-orange-500/20 border border-orange-500/40 text-orange-600 dark:text-orange-400 animate-pulse"
          : "bg-primary/10 border border-primary/30 text-primary",
        (dragging || resizing) ? "opacity-80 shadow-lg z-50" : "",
        dragging ? "cursor-grabbing" : "cursor-grab",
        !(dragging || resizing) && "transition-all duration-300"
      )}
      style={{ left: `${Math.max(0, displayLeft)}px`, width: `${displayWidth}px` }}
      title={`${task.title} (${estimatedMin}min) — arraste para mover, bordas para redimensionar`}
    >
      {/* Left resize handle */}
      {!isDone && onResize && (
        <div
          onMouseDown={(e) => handleResizeMouseDown("left", e)}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity"
        >
          <div className="w-0.5 h-3/5 rounded-full bg-current opacity-40" />
        </div>
      )}

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

      {/* Right resize handle */}
      {!isDone && onResize && (
        <div
          onMouseDown={(e) => handleResizeMouseDown("right", e)}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity"
        >
          <div className="w-0.5 h-3/5 rounded-full bg-current opacity-40" />
        </div>
      )}
    </div>
  );
}
