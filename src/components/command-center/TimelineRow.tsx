import React, { useMemo } from "react";
import { Droppable } from "react-beautiful-dnd";
import { SquadMember, CommandCenterTask } from "@/hooks/useCommandCenter";
import { WorkSchedule } from "@/hooks/useWorkSchedules";
import { TimelineSlot } from "./TimelineSlot";
import { TimelineTaskCard } from "./TimelineTaskCard";
import { User } from "lucide-react";

interface Props {
  member: SquadMember;
  tasks: CommandCenterTask[];
  startHour: number;
  slotWidth: number;
  totalSlots: number;
  slotDuration?: number;
  rowHeight?: number;
  selectedDate?: Date;
  workSchedule?: WorkSchedule | null;
  onRepositionTask?: (taskId: string, newStartDate: Date) => void;
  onClickTask?: (task: CommandCenterTask) => void;
}

export function TimelineRow({ member, tasks, startHour, slotWidth, totalSlots, slotDuration = 20, rowHeight = 52, selectedDate, workSchedule, onRepositionTask, onClickTask }: Props) {
  const memberTasks = tasks.filter(t => t.assigned_user_id === member.user_id);

  const occupiedSlots = new Set<number>();
  memberTasks.forEach(task => {
    if (!task.start_date) return;
    const taskStart = new Date(task.start_date);
    const dayStart = new Date(taskStart);
    dayStart.setHours(startHour, 0, 0, 0);
    const minutesFromStart = (taskStart.getTime() - dayStart.getTime()) / 60000;
    const startSlot = Math.floor(minutesFromStart / slotDuration);
    const estimatedMin = task.ai_estimated_minutes || slotDuration;
    const slotsNeeded = Math.ceil(estimatedMin / slotDuration);
    for (let i = startSlot; i < startSlot + slotsNeeded && i < totalSlots; i++) {
      if (i >= 0) occupiedSlots.add(i);
    }
  });

  // Calculate unavailable slots based on work schedule
  const unavailableSlots = useMemo(() => {
    const slots = new Set<number>();
    if (!workSchedule) return slots;

    const toMin = (t: string) => {
      const [h, m] = (t || "00:00").substring(0, 5).split(":").map(Number);
      return h * 60 + m;
    };

    const wsStart = toMin(workSchedule.work_start);
    const lunchStart = toMin(workSchedule.lunch_start);
    const lunchEnd = toMin(workSchedule.lunch_end);
    const wsEnd = toMin(workSchedule.work_end);
    const timelineStart = startHour * 60;

    for (let i = 0; i < totalSlots; i++) {
      const slotStartMin = timelineStart + i * slotDuration;
      const slotEndMin = slotStartMin + slotDuration;

      // Before work starts
      if (slotEndMin <= wsStart || slotStartMin >= wsEnd) {
        slots.add(i);
        continue;
      }
      // During lunch
      if (slotStartMin >= lunchStart && slotEndMin <= lunchEnd) {
        slots.add(i);
      }
    }
    return slots;
  }, [workSchedule, startHour, totalSlots, slotDuration]);

  return (
    <div className="flex items-stretch border-b border-border/50 group" style={{ minHeight: `${rowHeight}px` }}>
      {/* Member info */}
      <div className="w-48 flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-muted/30">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {member.avatar ? (
            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-foreground font-medium truncate">{member.name}</p>
          <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
        </div>
      </div>

      {/* Timeline ruler */}
      <Droppable droppableId={`timeline-${member.id}`} direction="horizontal">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 flex relative"
            style={{ minHeight: `${rowHeight}px` }}
          >
            <div className="flex h-full">
              {Array.from({ length: totalSlots }).map((_, i) => (
                <TimelineSlot
                  key={i}
                  index={i}
                  isOccupied={occupiedSlots.has(i)}
                  isUnavailable={unavailableSlots.has(i)}
                  isDragOver={snapshot.isDraggingOver}
                  slotWidth={slotWidth}
                />
              ))}
            </div>

            {memberTasks.map(task => (
              <TimelineTaskCard
                key={task.id}
                task={task}
                slotWidth={slotWidth}
                slotDuration={slotDuration}
                startHour={startHour}
                selectedDate={selectedDate}
                onReposition={onRepositionTask}
                onClickTask={onClickTask}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
