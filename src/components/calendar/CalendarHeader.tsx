import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarViewMode } from "@/hooks/useCalendarEvents";

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
}: CalendarHeaderProps) {
  const navigatePrev = () => {
    switch (viewMode) {
      case "month":
        onDateChange(subMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(subWeeks(currentDate, 1));
        break;
      case "day":
        onDateChange(subDays(currentDate, 1));
        break;
    }
  };

  const navigateNext = () => {
    switch (viewMode) {
      case "month":
        onDateChange(addMonths(currentDate, 1));
        break;
      case "week":
        onDateChange(addWeeks(currentDate, 1));
        break;
      case "day":
        onDateChange(addDays(currentDate, 1));
        break;
    }
  };

  const goToToday = () => onDateChange(new Date());

  const getTitle = () => {
    switch (viewMode) {
      case "month":
        return format(currentDate, "MMMM yyyy", { locale: ptBR });
      case "week": {
        const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
        const we = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(ws, "d MMM", { locale: ptBR })} — ${format(we, "d MMM yyyy", { locale: ptBR })}`;
      }
      case "day":
        return format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });
    }
  };

  const viewModes: { value: CalendarViewMode; label: string }[] = [
    { value: "month", label: "Mês" },
    { value: "week", label: "Semana" },
    { value: "day", label: "Dia" },
  ];

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <Button
          aria-label="Anterior"
          variant="outline"
          size="icon"
          onClick={navigatePrev}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold capitalize min-w-[200px] text-center">
          {getTitle()}
        </h2>
        <Button
          aria-label="Próximo"
          variant="outline"
          size="icon"
          onClick={navigateNext}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={goToToday}
          className="text-primary"
        >
          Hoje
        </Button>
      </div>

      <div className="flex bg-muted rounded-lg p-0.5">
        {viewModes.map((mode) => (
          <Button
            key={mode.value}
            variant={viewMode === mode.value ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange(mode.value)}
            className="text-xs"
          >
            {mode.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
