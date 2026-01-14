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

// Mapeia o preset do frontend para o preset do Meta API
export const presetToMetaPreset: Record<PeriodPreset, string | null> = {
  today: 'today',
  '7days': 'last_7d',
  '14days': 'last_14d',
  '30days': 'last_30d',
  quarter: 'last_90d',
  custom: null,
};

interface PeriodSelectorProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }, metaPreset?: string | null) => void;
}

export const PeriodSelector = ({ dateRange, onDateRangeChange }: PeriodSelectorProps) => {
  const [selectedPreset, setSelectedPreset] = useState<PeriodPreset>("30days");
  const [isCustomOpen, setIsCustomOpen] = useState(false);

  const handlePresetSelect = (preset: PeriodPreset) => {
    setSelectedPreset(preset);

    const now = new Date();
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);

    const from = new Date(now);

    // Presets devem ser “dias completos” e com contagem inclusiva.
    // Ex: "7 dias" = hoje + 6 dias anteriores (total 7).
    switch (preset) {
      case "today":
        from.setHours(0, 0, 0, 0);
        to.setHours(23, 59, 59, 999);
        break;
      case "7days":
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        break;
      case "14days":
        from.setDate(from.getDate() - 13);
        from.setHours(0, 0, 0, 0);
        break;
      case "30days":
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        break;
      case "quarter":
        from.setDate(from.getDate() - 89);
        from.setHours(0, 0, 0, 0);
        break;
      default:
        return;
    }

    // Enviar também o metaPreset para usar date_preset na API do Meta
    const metaPreset = presetToMetaPreset[preset];
    onDateRangeChange({ from, to }, metaPreset);
  };

  const handleCustomDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      setSelectedPreset("custom");
      // Custom range não usa meta preset
      onDateRangeChange({ from: range.from, to: range.to }, null);
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
              Os dados mostram conversões com janela de atribuição de <strong>7 dias após clique</strong> +{" "}
              <strong>1 dia após visualização</strong>.
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
