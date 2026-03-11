import { useMemo } from "react";
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isToday,
  format,
  getHours,
  getMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarEvent } from "@/hooks/useCalendarEvents";

interface CalendarWeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);
const HOUR_HEIGHT = 60;

export function CalendarWeekView({
  currentDate,
  events,
  onEventClick,
}: CalendarWeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const allDayEvents = events.filter((e) => e.allDay);
  const timedEvents = events.filter((e) => !e.allDay);

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-muted/50">
        <div />
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`text-center py-2 border-l ${isToday(day) ? "bg-primary/10" : ""}`}
          >
            <div className="text-xs text-muted-foreground capitalize">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div
              className={`text-sm font-medium ${isToday(day) ? "text-primary" : ""}`}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b">
          <div className="text-[10px] text-muted-foreground text-right pr-2 py-1">
            Dia todo
          </div>
          {weekDays.map((day) => {
            const dayAllDay = allDayEvents.filter((e) =>
              isSameDay(e.start, day),
            );
            return (
              <div
                key={day.toISOString()}
                className="border-l p-0.5 space-y-0.5"
              >
                {dayAllDay.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className="w-full text-left rounded px-1 py-0.5 text-[10px] truncate hover:opacity-80"
                    style={{
                      backgroundColor: `${event.color}20`,
                      color: event.color,
                      borderLeft: `2px solid ${event.color}`,
                    }}
                  >
                    {event.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Hourly grid */}
      <div
        className="overflow-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <div
          className="grid grid-cols-[60px_repeat(7,1fr)] relative"
          style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}
        >
          {/* Hour labels & lines */}
          {HOURS.map((hour, i) => (
            <div key={hour} className="contents" style={{ gridRow: "1" }}>
              <div
                className="absolute left-0 w-[60px] text-right pr-2 text-[10px] text-muted-foreground"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              >
                {String(hour).padStart(2, "0")}:00
              </div>
              <div
                className="absolute left-[60px] right-0 border-t border-border/30"
                style={{ top: `${i * HOUR_HEIGHT}px` }}
              />
            </div>
          ))}

          {/* Day columns with events */}
          {weekDays.map((day, dayIndex) => {
            const dayTimedEvents = timedEvents.filter((e) =>
              isSameDay(e.start, day),
            );
            return (
              <div
                key={day.toISOString()}
                className={`relative border-l ${isToday(day) ? "bg-primary/5" : ""}`}
                style={{
                  gridColumn: dayIndex + 2,
                  gridRow: "1",
                  height: "100%",
                }}
              >
                {dayTimedEvents.map((event) => {
                  const topPx =
                    (getHours(event.start) - 6) * HOUR_HEIGHT +
                    (getMinutes(event.start) / 60) * HOUR_HEIGHT;
                  return (
                    <button
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] truncate hover:opacity-80 text-left"
                      style={{
                        top: `${Math.max(0, topPx)}px`,
                        height: "48px",
                        backgroundColor: `${event.color}20`,
                        color: event.color,
                        borderLeft: `2px solid ${event.color}`,
                      }}
                      title={event.title}
                    >
                      <div className="font-medium">
                        {format(event.start, "HH:mm")}
                      </div>
                      <div className="truncate">{event.title}</div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
