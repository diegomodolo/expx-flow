import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  format,
} from "date-fns";
import { CalendarEvent } from "@/hooks/useCalendarEvents";
import { CalendarEventChip } from "./CalendarEventChip";

interface CalendarMonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDayClick: (date: Date) => void;
}

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_EVENTS_PER_DAY = 3;

export function CalendarMonthView({
  currentDate,
  events,
  onEventClick,
  onDayClick,
}: CalendarMonthViewProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = format(event.start, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  return (
    <div className="border rounded-lg overflow-hidden flex flex-col flex-1">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-muted/50">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2 border-b"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: "1fr" }}>
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDay.get(key) || [];
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={key}
              className={`border-b border-r p-1 cursor-pointer hover:bg-muted/30 transition-colors overflow-hidden ${
                !isCurrentMonth ? "bg-muted/10" : ""
              }`}
              onClick={() => onDayClick(day)}
            >
              <div className="flex justify-end">
                <span
                  className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${
                    isCurrentDay
                      ? "bg-primary text-primary-foreground font-bold"
                      : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {format(day, "d")}
                </span>
              </div>
              <div
                className="space-y-0.5 mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                {dayEvents.slice(0, MAX_EVENTS_PER_DAY).map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    compact
                    onClick={onEventClick}
                  />
                ))}
                {dayEvents.length > MAX_EVENTS_PER_DAY && (
                  <div className="text-[10px] text-muted-foreground text-center">
                    +{dayEvents.length - MAX_EVENTS_PER_DAY} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
