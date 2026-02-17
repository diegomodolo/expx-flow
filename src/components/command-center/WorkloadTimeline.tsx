import React, { useState, useCallback, useRef } from "react";
import { TimelineRow } from "./TimelineRow";
import { SquadMember, CommandCenterTask } from "@/hooks/useCommandCenter";
import { Clock, ZoomIn, ZoomOut, GripHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface Props {
  members: SquadMember[];
  tasks: CommandCenterTask[];
  startHour?: number;
  onRepositionTask?: (taskId: string, newStartDate: Date) => void;
  onClickTask?: (task: CommandCenterTask) => void;
}

const TOTAL_SLOTS = 20;
const MIN_SLOT_WIDTH = 32;
const MAX_SLOT_WIDTH = 120;
const MIN_ROW_HEIGHT = 44;
const MAX_ROW_HEIGHT = 120;

export function WorkloadTimeline({ members, tasks, startHour = 8, onRepositionTask, onClickTask }: Props) {
  const [slotWidth, setSlotWidth] = useState(56);
  const [rowHeight, setRowHeight] = useState(52);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = rowHeight;
    resizeRef.current = { startY, startHeight };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientY - resizeRef.current.startY;
      const membersCount = Math.max(members.length, 1);
      const perRowDelta = delta / membersCount;
      const newHeight = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, resizeRef.current.startHeight + perRowDelta));
      setRowHeight(Math.round(newHeight));
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [rowHeight, members.length]);

  return (
    <div className="rounded-2xl bg-card border border-border overflow-hidden flex flex-col">
      {/* Header with controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Timeline — 6h</h3>

        <div className="ml-auto flex items-center gap-4">
          {/* Slot width control */}
          <div className="flex items-center gap-2">
            <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
            <Slider
              value={[slotWidth]}
              onValueChange={([v]) => setSlotWidth(v)}
              min={MIN_SLOT_WIDTH}
              max={MAX_SLOT_WIDTH}
              step={4}
              className="w-24"
            />
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          <span className="text-[10px] text-muted-foreground/50">{TOTAL_SLOTS} slots de 18min</span>
        </div>
      </div>

      {/* Time ruler */}
      <div className="flex border-b border-border">
        <div className="w-48 flex-shrink-0 px-4 py-1">
          <span className="text-[10px] text-muted-foreground/50">Colaborador</span>
        </div>
        <div className="flex-1 flex overflow-x-auto">
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const totalMinutes = startHour * 60 + i * 18;
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            const label = i % 3 === 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : "";
            return (
              <div key={i} className="border-r border-border/50 flex-shrink-0 px-0.5" style={{ width: `${slotWidth}px` }}>
                {label && <span className="text-[9px] text-muted-foreground/50">{label}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Member rows */}
      {members.length > 0 ? (
        members.map(member => (
          <TimelineRow
            key={member.id}
            member={member}
            tasks={tasks}
            startHour={startHour}
            slotWidth={slotWidth}
            totalSlots={TOTAL_SLOTS}
            rowHeight={rowHeight}
            onRepositionTask={onRepositionTask}
            onClickTask={onClickTask}
          />
        ))
      ) : (
        <div className="flex items-center justify-center py-16 text-muted-foreground/50 text-sm">
          Nenhum membro na squad selecionada
        </div>
      )}

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={cn(
          "flex items-center justify-center py-1 cursor-ns-resize border-t border-border",
          "hover:bg-muted/50 transition-colors group select-none"
        )}
        title="Arraste para redimensionar as linhas"
      >
        <GripHorizontal className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
    </div>
  );
}
