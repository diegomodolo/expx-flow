import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calendar as CalendarIcon, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type PeriodPreset = "today" | "7days" | "14days" | "30days" | "quarter" | "custom";

interface PeriodSelectorProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export const PeriodSelector = ({ dateRange, onDateRangeChange }: PeriodSelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>("30days");
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetSelect = (preset: PeriodPreset) => {
    setSelectedPreset(preset);
    const now = new Date();
    let from: Date;
    let to = new Date();

    switch (preset) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date(now.setHours(23, 59, 59, 999));
        break;
      case "7days":
        from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "14days":
        from = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        from = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return;
    }

    onDateRangeChange({ from, to });
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setSelectedPreset("custom");
      onDateRangeChange({ from: range.from, to: range.to });
      setIsCustomOpen(false);
    }
  };

  const presetButtons = [
    { value: "today" as PeriodPreset, label: "Hoje" },
    { value: "7days" as PeriodPreset, label: "7 dias" },
    { value: "14days" as PeriodPreset, label: "14 dias" },
    { value: "30days" as PeriodPreset, label: "30 dias" },
    { value: "quarter" as PeriodPreset, label: "Trimestre" },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs">
              Os dados mostram conversões com janela de atribuição de <strong>7 dias após clique</strong>, 
              que é o padrão do Facebook Ads Manager.
            </p>
          </TooltipContent>
        </Tooltip>
        
        {/* Preset buttons */}
        {presetButtons.map((preset) => (
        <Button
          key={preset.value}
          variant={selectedPreset === preset.value ? "default" : "outline"}
          size="sm"
          onClick={() => handlePresetSelect(preset.value)}
        >
          {preset.label}
        </Button>
      ))}

      {/* Custom date range */}
      <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPreset === "custom" ? "default" : "outline"}
            size="sm"
            className={cn(
              "justify-start text-left font-normal min-w-[200px]",
              selectedPreset !== "custom" && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedPreset === "custom" ? (
              <>
                {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
              </>
            ) : (
              "Personalizado"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="end">
          <div className="p-3 border-b border-border bg-card">
            <p className="text-sm font-medium text-foreground">Selecione o período</p>
            <p className="text-xs text-muted-foreground">Escolha a data inicial e final</p>
          </div>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={{ from: dateRange.from, to: dateRange.to }}
            onSelect={handleCustomDateSelect as any}
            numberOfMonths={2}
            locale={ptBR}
            className="pointer-events-auto bg-card"
            />
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
};
