import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { format } from "date-fns";

interface CalendarEventChipProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: (event: CalendarEvent) => void;
}

export function CalendarEventChip({
  event,
  compact = false,
  onClick,
}: CalendarEventChipProps) {
  const time = event.allDay ? "" : format(event.start, "HH:mm");

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      className="w-full text-left rounded px-1.5 py-0.5 text-xs truncate cursor-pointer hover:opacity-80 transition-opacity"
      style={{
        backgroundColor: `${event.color}20`,
        borderLeft: `2px solid ${event.color}`,
        color: event.color,
      }}
      title={`${time ? time + " — " : ""}${event.title}`}
    >
      {compact ? (
        <span className="truncate">
          {time ? `${time} ` : ""}
          {event.title}
        </span>
      ) : (
        <div>
          {time && <span className="font-medium">{time}</span>}
          <span className={time ? " ml-1" : ""}>{event.title}</span>
        </div>
      )}
    </button>
  );
}
