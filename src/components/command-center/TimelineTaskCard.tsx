import React, { useRef, useState, useCallback } from "react";
import { CommandCenterTask } from "@/hooks/useCommandCenter";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, AlertTriangle, GripVertical, Undo2, CalendarArrowDown, ArrowLeftToLine } from "lucide-react";
import { differenceInMinutes } from "date-fns";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";

interface Props {
  task: CommandCenterTask;
  slotWidth: number;
  slotDuration?: number;
  startHour: number;
  selectedDate?: Date;
  onReposition?: (taskId: string, newStartDate: Date) => void;
  onResize?: (taskId: string, newStartDate: Date, newEstimatedMinutes: number) => void;
  onClickTask?: (task: CommandCenterTask) => void;
  onSendToBacklog?: (taskId: string) => void;
  onReassign?: (taskId: string, newUserId: string, newMemberName: string, newStartDate: Date) => void;
  onSendToNextDay?: (taskId: string) => void;
}

export function TimelineTaskCard({ task, slotWidth, slotDuration = 20, startHour, selectedDate, onReposition, onResize, onClickTask, onSendToBacklog, onReassign, onSendToNextDay }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
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
  const [dragTop, setDragTop] = useState<number | null>(null);
  const [returningToBacklog, setReturningToBacklog] = useState(false);
  const [targetMemberName, setTargetMemberName] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startLeft: number; startY: number; origParent: HTMLElement | null } | null>(null);

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

    // Find the parent row element for cross-row detection
    const cardEl = e.currentTarget as HTMLElement;
    const rowEl = cardEl.closest('[data-member-user-id]') as HTMLElement | null;

    dragRef.current = { startX: e.clientX, startLeft: leftOffset, startY: e.clientY, origParent: rowEl };
    setDragging(true);
    setDragLeft(leftOffset);
    setDragTop(null);
    setTargetMemberName(null);

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragMoved.current = true;
      if (!dragMoved.current || isDone) return;
      const newLeft = dragRef.current.startLeft + dx;
      // Detect backlog: check if cursor is over the backlog column
      const card = cardRef.current;
      if (card) card.style.pointerEvents = 'none';
      const elementsAtCursor = document.elementsFromPoint(ev.clientX, ev.clientY);
      if (card) card.style.pointerEvents = '';
      const overBacklog = elementsAtCursor.some(el => el.closest('[data-backlog-column]'));
      
      if (overBacklog && onSendToBacklog) {
        setReturningToBacklog(true);
        setTargetMemberName(null);
      } else {
        setReturningToBacklog(false);
      }
      const snappedSlot = Math.round(newLeft / slotWidth);
      const snappedLeft = Math.max(-150, snappedSlot * slotWidth);
      setDragLeft(snappedLeft);

      // Detect cross-row via Y offset
      if (Math.abs(dy) > 10) {
        setDragTop(dy);
        // Temporarily hide card so elementsFromPoint can see the row beneath
        const card = cardRef.current;
        if (card) card.style.pointerEvents = 'none';
        const elementsUnder = document.elementsFromPoint(ev.clientX, ev.clientY);
        if (card) card.style.pointerEvents = '';
        const targetRow = elementsUnder.find(el => el.closest('[data-member-user-id]'))?.closest('[data-member-user-id]') as HTMLElement | null;
        if (targetRow && targetRow !== dragRef.current.origParent) {
          setTargetMemberName(targetRow.getAttribute('data-member-name'));
        } else {
          setTargetMemberName(null);
        }
      } else {
        setDragTop(null);
        setTargetMemberName(null);
      }
    };

    const onMouseUp = (ev: MouseEvent) => {
      if (!dragMoved.current) {
        onClickTask?.(task);
      } else if (dragRef.current && !isDone) {
        const dx = ev.clientX - dragRef.current.startX;
        const newLeft = dragRef.current.startLeft + dx;
        // Check if dropped over backlog column
        const card = cardRef.current;
        if (card) card.style.pointerEvents = 'none';
        const dropElements = document.elementsFromPoint(ev.clientX, ev.clientY);
        if (card) card.style.pointerEvents = '';
        const droppedOnBacklog = dropElements.some(el => el.closest('[data-backlog-column]'));
        
        if (droppedOnBacklog && onSendToBacklog) {
          onSendToBacklog(task.id);
        } else {
          // Check if dropped on a different member row - reuse elementsFromPoint from above
          const targetRow = dropElements.find(el => el.closest('[data-member-user-id]'))?.closest('[data-member-user-id]') as HTMLElement | null;
          const targetUserId = targetRow?.getAttribute('data-member-user-id');
          const targetName = targetRow?.getAttribute('data-member-name');
          const isNewMember = targetUserId && targetUserId !== task.assigned_user_id;

          const snappedSlot = Math.max(0, Math.round(newLeft / slotWidth));
          const newMinutesFromDayStart = snappedSlot * slotDuration;
          const baseDate = selectedDate ? new Date(selectedDate) : (taskStart ? new Date(taskStart) : new Date());
          const newDate = new Date(baseDate);
          newDate.setHours(startHour, 0, 0, 0);
          newDate.setMinutes(newMinutesFromDayStart);

          if (isNewMember && onReassign && targetName) {
            onReassign(task.id, targetUserId, targetName, newDate);
          } else if (onReposition) {
            onReposition(task.id, newDate);
          }
        }
      }
      dragRef.current = null;
      setDragging(false);
      setDragLeft(null);
      setDragTop(null);
      setReturningToBacklog(false);
      setTargetMemberName(null);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [isDone, onReposition, onReassign, onClickTask, onSendToBacklog, leftOffset, slotWidth, slotDuration, startHour, taskStart, selectedDate, task]);

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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={cardRef}
          onMouseDown={handleMouseDown}
          className={cn(
            "absolute top-1 h-[calc(100%-8px)] rounded-lg px-2 py-1 flex items-center gap-1 text-xs font-medium overflow-hidden group/card",
            returningToBacklog
              ? "bg-destructive/20 border-2 border-dashed border-destructive/50 text-destructive"
              : targetMemberName
              ? "bg-accent/30 border-2 border-dashed border-accent-foreground/50 text-accent-foreground"
              : isDone
              ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
              : isOvertime
              ? "bg-orange-500/20 border border-orange-500/40 text-orange-600 dark:text-orange-400 animate-pulse"
              : "bg-primary/10 border border-primary/30 text-primary",
            (dragging || resizing) ? "opacity-80 shadow-lg z-50" : "",
            dragging ? "cursor-grabbing" : "cursor-grab",
            !(dragging || resizing) && "transition-all duration-300"
          )}
          style={{
            left: `${Math.max(returningToBacklog ? -150 : 0, displayLeft)}px`,
            width: `${displayWidth}px`,
            transform: dragTop !== null ? `translateY(${dragTop}px)` : undefined,
            zIndex: dragTop !== null ? 100 : undefined,
          }}
          title={`${task.title} (${estimatedMin}min)`}
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

          {returningToBacklog ? (
            <>
              <Undo2 className="w-3 h-3 flex-shrink-0 animate-pulse" />
              <span className="truncate font-semibold">Soltar → Backlog</span>
            </>
          ) : targetMemberName ? (
            <>
              <GripVertical className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-semibold">→ {targetMemberName}</span>
            </>
          ) : (
            <>
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
            </>
          )}

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
      </ContextMenuTrigger>
      <ContextMenuContent>
        {onSendToNextDay && (
          <ContextMenuItem onClick={() => onSendToNextDay(task.id)}>
            <CalendarArrowDown className="w-4 h-4 mr-2" />
            Enviar para amanhã
          </ContextMenuItem>
        )}
        {onSendToBacklog && (
          <ContextMenuItem onClick={() => onSendToBacklog(task.id)}>
            <ArrowLeftToLine className="w-4 h-4 mr-2" />
            Devolver ao backlog
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
