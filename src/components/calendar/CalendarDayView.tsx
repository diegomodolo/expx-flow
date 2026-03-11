import { useMemo } from "react";
import { isSameDay, format, getHours, getMinutes } from "date-fns";
import { CalendarEvent } from "@/hooks/useCalendarEvents";

interface CalendarDayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const HOUR_HEIGHT = 64;

export function CalendarDayView({
  currentDate,
  events,
  onEventClick,
}: CalendarDayViewProps) {
  const dayEvents = useMemo(
    () => events.filter((e) => isSameDay(e.start, currentDate)),
    [events, currentDate],
  );

  const allDayEvents = dayEvents.filter((e) => e.allDay);
  const timedEvents = dayEvents.filter((e) => !e.allDay);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="border-b p-2 space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase">
            Dia todo
          </span>
          {allDayEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="flex items-center gap-2 w-full text-left rounded px-2 py-1.5 text-sm hover:bg-muted/50"
              style={{ borderLeft: `3px solid ${event.color}` }}
            >
              <span style={{ color: event.color }}>{event.title}</span>
              {event.ownerName && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {event.ownerName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Hourly timeline */}
      <div
        className="relative overflow-auto"
        style={{
          height: `${HOURS.length * HOUR_HEIGHT}px`,
          maxHeight: "calc(100vh - 280px)",
        }}
      >
        {HOURS.map((hour, i) => (
          <div
            key={hour}
            className="absolute left-0 right-0 border-t border-border/30 flex"
            style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
          >
            <div className="w-16 text-right pr-3 pt-1 text-xs text-muted-foreground flex-shrink-0">
              {String(hour).padStart(2, "0")}:00
            </div>
            <div className="flex-1 border-l" />
          </div>
        ))}

        {/* Events */}
        {timedEvents.map((event) => {
          const topPx =
            (getHours(event.start) - 6) * HOUR_HEIGHT +
            (getMinutes(event.start) / 60) * HOUR_HEIGHT;
          return (
            <button
              key={event.id}
              onClick={() => onEventClick(event)}
              className="absolute left-16 right-4 rounded-md px-3 py-1.5 text-sm hover:opacity-80 text-left"
              style={{
                top: `${Math.max(0, topPx)}px`,
                height: "56px",
                backgroundColor: `${event.color}15`,
                borderLeft: `3px solid ${event.color}`,
              }}
            >
              <div className="font-medium" style={{ color: event.color }}>
                {format(event.start, "HH:mm")} — {event.title}
              </div>
              {event.ownerName && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {event.ownerName}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
