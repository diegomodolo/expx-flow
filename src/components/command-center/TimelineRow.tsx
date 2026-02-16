import React from "react";
import { Droppable } from "react-beautiful-dnd";
import { SquadMember, CommandCenterTask } from "@/hooks/useCommandCenter";
import { TimelineSlot } from "./TimelineSlot";
import { TimelineTaskCard } from "./TimelineTaskCard";
import { User } from "lucide-react";

interface Props {
  member: SquadMember;
  tasks: CommandCenterTask[];
  startHour: number;
  slotWidth: number;
  totalSlots: number;
}

export function TimelineRow({ member, tasks, startHour, slotWidth, totalSlots }: Props) {
  const memberTasks = tasks.filter(t => t.assigned_user_id === member.id);

  const occupiedSlots = new Set<number>();
  memberTasks.forEach(task => {
    if (!task.start_date) return;
    const taskStart = new Date(task.start_date);
    const dayStart = new Date(taskStart);
    dayStart.setHours(startHour, 0, 0, 0);
    const minutesFromStart = (taskStart.getTime() - dayStart.getTime()) / 60000;
    const startSlot = Math.floor(minutesFromStart / 18);
    const estimatedMin = task.ai_estimated_minutes || 18;
    const slotsNeeded = Math.ceil(estimatedMin / 18);
    for (let i = startSlot; i < startSlot + slotsNeeded && i < totalSlots; i++) {
      if (i >= 0) occupiedSlots.add(i);
    }
  });

  return (
    <div className="flex items-stretch border-b border-border/50 group">
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
            className="flex-1 flex relative overflow-x-auto"
            style={{ minHeight: "48px" }}
          >
            <div className="flex h-full">
              {Array.from({ length: totalSlots }).map((_, i) => (
                <TimelineSlot
                  key={i}
                  index={i}
                  isOccupied={occupiedSlots.has(i)}
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
                startHour={startHour}
              />
            ))}

            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
