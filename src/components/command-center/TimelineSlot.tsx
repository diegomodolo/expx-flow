import React from "react";
import { cn } from "@/lib/utils";

interface Props {
  index: number;
  isOccupied: boolean;
  isDragOver?: boolean;
  slotWidth: number;
}

export function TimelineSlot({ index, isOccupied, isDragOver, slotWidth }: Props) {
  return (
    <div
      className={cn(
        "h-full border-r border-white/5 transition-colors duration-150 flex-shrink-0",
        isDragOver && !isOccupied && "bg-emerald-500/20",
        isDragOver && isOccupied && "bg-red-500/20",
        !isDragOver && index % 2 === 0 && "bg-white/[0.02]"
      )}
      style={{ width: `${slotWidth}px` }}
    />
  );
}
