import React from "react";
import { TimelineRow } from "./TimelineRow";
import { SquadMember, CommandCenterTask } from "@/hooks/useCommandCenter";
import { Clock } from "lucide-react";

interface Props {
  members: SquadMember[];
  tasks: CommandCenterTask[];
  startHour?: number;
}

const TOTAL_SLOTS = 20; // 20 x 18min = 6 hours
const SLOT_WIDTH = 56; // px per 18min slot

export function WorkloadTimeline({ members, tasks, startHour = 8 }: Props) {
  // Time ruler labels
  const timeLabels: string[] = [];
  for (let i = 0; i <= TOTAL_SLOTS; i++) {
    const totalMinutes = startHour * 60 + i * 18;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (i % 3 === 0) timeLabels.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  return (
    <div className="rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.08)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <Clock className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">Timeline — 6h</h3>
        <span className="text-xs text-white/30 ml-auto">{TOTAL_SLOTS} slots de 18min</span>
      </div>

      {/* Time ruler */}
      <div className="flex border-b border-white/10">
        <div className="w-48 flex-shrink-0 px-4 py-1">
          <span className="text-[10px] text-white/30">Colaborador</span>
        </div>
        <div className="flex-1 flex">
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
            const totalMinutes = startHour * 60 + i * 18;
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            const label = i % 3 === 0 ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : "";
            return (
              <div key={i} className="border-r border-white/5 flex-shrink-0 px-0.5" style={{ width: `${SLOT_WIDTH}px` }}>
                {label && <span className="text-[9px] text-white/25">{label}</span>}
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
            slotWidth={SLOT_WIDTH}
            totalSlots={TOTAL_SLOTS}
          />
        ))
      ) : (
        <div className="flex items-center justify-center py-16 text-white/20 text-sm">
          Nenhum membro na squad selecionada
        </div>
      )}
    </div>
  );
}
