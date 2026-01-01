import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Clock, CalendarIcon, Infinity } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { EditableStrategy } from "./types";

interface EditableScheduleSectionProps {
  strategy: EditableStrategy;
  onChange: (updates: Partial<EditableStrategy>) => void;
}

export function EditableScheduleSection({ strategy, onChange }: EditableScheduleSectionProps) {
  const handleStartDateChange = (date: Date | undefined) => {
    if (date) {
      onChange({ startDate: date });
      
      // If has end date and end date is before new start date, adjust it
      if (strategy.hasEndDate && strategy.endDate && strategy.endDate < date) {
        const newEndDate = new Date(date);
        newEndDate.setDate(newEndDate.getDate() + strategy.duration);
        onChange({ endDate: newEndDate });
      }
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    if (date && date >= strategy.startDate) {
      onChange({ endDate: date });
      
      // Update duration based on new dates
      const diffTime = Math.abs(date.getTime() - strategy.startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      onChange({ duration: diffDays });
    }
  };

  const handleHasEndDateChange = (hasEndDate: boolean) => {
    if (hasEndDate) {
      // Set end date to 30 days from start
      const newEndDate = new Date(strategy.startDate);
      newEndDate.setDate(newEndDate.getDate() + 30);
      onChange({ 
        hasEndDate: true, 
        endDate: newEndDate,
        duration: 30
      });
    } else {
      // Remove end date (infinite campaign)
      onChange({ 
        hasEndDate: false, 
        endDate: null,
        duration: 0 
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Cronograma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Has End Date Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Infinity className="w-4 h-4" />
              Definir data de término
            </Label>
            <p className="text-xs text-muted-foreground">
              {strategy.hasEndDate 
                ? "A campanha terá data de término"
                : "A campanha rodará indefinidamente"
              }
            </p>
          </div>
          <Switch
            checked={strategy.hasEndDate}
            onCheckedChange={handleHasEndDateChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !strategy.startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {strategy.startDate 
                    ? format(strategy.startDate, "dd/MM/yyyy", { locale: ptBR })
                    : "Selecione..."
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={strategy.startDate}
                  onSelect={handleStartDateChange}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date - only show if hasEndDate is true */}
          <div className="space-y-2">
            <Label>Data de Término</Label>
            {strategy.hasEndDate ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !strategy.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {strategy.endDate 
                      ? format(strategy.endDate, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione..."
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={strategy.endDate || undefined}
                    onSelect={handleEndDateChange}
                    disabled={(date) => date < strategy.startDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <div className="h-10 flex items-center px-3 border rounded-md bg-muted/50 text-muted-foreground">
                <Infinity className="w-4 h-4 mr-2" />
                Sem data de término
              </div>
            )}
          </div>
        </div>

        {/* Duration Display */}
        <div className="p-3 bg-muted rounded-lg flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Duração</span>
          <span className="font-semibold">
            {strategy.hasEndDate && strategy.duration > 0 
              ? `${strategy.duration} dias`
              : "Indefinida"
            }
          </span>
        </div>

        {/* Optimal Hours Toggle */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="space-y-0.5">
            <Label>Horários Otimizados</Label>
            <p className="text-xs text-muted-foreground">
              {strategy.useOptimalHours 
                ? strategy.optimalHours
                : "Exibir anúncios a qualquer hora"
              }
            </p>
          </div>
          <Switch
            checked={strategy.useOptimalHours}
            onCheckedChange={(checked) => onChange({ useOptimalHours: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
