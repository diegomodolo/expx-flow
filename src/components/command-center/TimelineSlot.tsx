import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  index: number;
  isOccupied: boolean;
  isUnavailable?: boolean;
  isDragOver?: boolean;
  slotWidth: number;
}

export function TimelineSlot({ index, isOccupied, isUnavailable, isDragOver, slotWidth }: Props) {
  return (
    <div
      className={cn(
        "h-full border-r border-border/30 transition-colors duration-150 flex-shrink-0 relative",
        isUnavailable && "bg-muted/60",
        isDragOver && !isOccupied && !isUnavailable && "bg-emerald-500/20",
        isDragOver && isOccupied && "bg-red-500/20",
        isDragOver && isUnavailable && "bg-red-500/10",
        !isDragOver && !isUnavailable && index % 2 === 0 && "bg-muted/20"
      )}
      style={{ width: `${slotWidth}px` }}
      title={isUnavailable ? "Horário indisponível" : undefined}
    >
      {isUnavailable && (
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 3px, currentColor 3px, currentColor 4px)",
        }} />
      )}
    </div>
  );
}
