import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ImageIcon, Layers, Plus, Clock, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScheduleSlot, useInstagramScheduleSlots } from '@/hooks/useInstagramScheduleSlots';
import { ScheduleSlotEditor } from './ScheduleSlotEditor';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom', fullLabel: 'Domingo' },
  { value: 1, label: 'Seg', fullLabel: 'Segunda' },
  { value: 2, label: 'Ter', fullLabel: 'Terça' },
  { value: 3, label: 'Qua', fullLabel: 'Quarta' },
  { value: 4, label: 'Qui', fullLabel: 'Quinta' },
  { value: 5, label: 'Sex', fullLabel: 'Sexta' },
  { value: 6, label: 'Sáb', fullLabel: 'Sábado' },
];

// Common posting hours (simplified view)
const DISPLAY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

interface ScheduleGridProps {
  configId: string;
  isCollapsible?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ScheduleGrid({ configId, isCollapsible, open, onOpenChange }: ScheduleGridProps) {
  const {
    slots,
    slotsByDayAndHour,
    isLoading,
    createSlot,
    updateSlot,
    deleteSlot,
    isCreating,
    isUpdating,
    isDeleting,
    stats
  } = useInstagramScheduleSlots(configId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);

  const handleCellClick = (day: number, hour: number) => {
    const key = `${day}-${hour}`;
    const existingSlot = slotsByDayAndHour[key];
    
    setSelectedDay(day);
    setSelectedHour(hour);
    setSelectedSlot(existingSlot || null);
    setEditorOpen(true);
  };

  const handleSave = (data: { post_type: 'single' | 'carousel'; carousel_images: number }) => {
    if (selectedSlot) {
      updateSlot({
        slotId: selectedSlot.id,
        post_type: data.post_type,
        carousel_images: data.carousel_images
      });
    } else {
      createSlot({
        config_id: configId,
        day_of_week: selectedDay,
        hour: selectedHour,
        post_type: data.post_type,
        carousel_images: data.carousel_images
      });
    }
    setEditorOpen(false);
  };

  const handleDelete = () => {
    if (selectedSlot) {
      deleteSlot(selectedSlot.id);
      setEditorOpen(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const gridContent = (
    <>
      <ScrollArea className="w-full">
        <div className="min-w-[600px]">
          {/* Header row - days */}
          <div className="grid grid-cols-8 gap-1 mb-1">
            <div className="h-10 flex items-center justify-center text-xs font-medium text-muted-foreground">
              Horário
            </div>
            {DAYS_OF_WEEK.map(day => (
              <div 
                key={day.value}
                className="h-10 flex items-center justify-center text-xs font-medium"
              >
                {day.label}
              </div>
            ))}
          </div>

          {/* Grid rows - hours */}
          {DISPLAY_HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-1 mb-1">
              {/* Hour label */}
              <div className="h-10 flex items-center justify-center text-xs text-muted-foreground">
                {String(hour).padStart(2, '0')}:00
              </div>
              
              {/* Day cells */}
              {DAYS_OF_WEEK.map(day => {
                const key = `${day.value}-${hour}`;
                const slot = slotsByDayAndHour[key];
                
                return (
                  <button
                    key={key}
                    onClick={() => handleCellClick(day.value, hour)}
                    className={cn(
                      "h-10 rounded-md border transition-all flex items-center justify-center",
                      "hover:border-primary hover:bg-primary/5",
                      slot && slot.is_enabled
                        ? slot.post_type === 'carousel'
                          ? "bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700"
                          : "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700"
                        : "bg-muted/30 border-muted hover:bg-muted/50"
                    )}
                  >
                    {slot && slot.is_enabled ? (
                      slot.post_type === 'carousel' ? (
                        <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      )
                    ) : (
                      <Plus className="w-3 h-3 text-muted-foreground/50" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 flex items-center justify-center">
            <ImageIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          </div>
          <span>Imagem Única</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 flex items-center justify-center">
            <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
          </div>
          <span>Carrossel</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-muted/30 border border-muted flex items-center justify-center">
            <Plus className="w-3 h-3 text-muted-foreground/50" />
          </div>
          <span>Vazio</span>
        </div>
      </div>
    </>
  );

  const headerContent = (
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Grade de Agendamento
          {isCollapsible && (
            <ChevronDown className={cn("w-4 h-4 transition-transform", open && "rotate-180")} />
          )}
        </CardTitle>
        <CardDescription>
          Clique em uma célula para configurar o tipo de post
        </CardDescription>
      </div>
      <div className="flex gap-2">
        <Badge variant="outline" className="flex items-center gap-1">
          <ImageIcon className="w-3 h-3" />
          {stats.singleCount} únicos
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          {stats.carouselCount} carrosséis
        </Badge>
        <Badge variant="secondary">
          {stats.totalSlotsPerWeek} posts/semana
        </Badge>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        {isCollapsible ? (
          <>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                {headerContent}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {gridContent}
              </CardContent>
            </CollapsibleContent>
          </>
        ) : (
          <>
            <CardHeader className="pb-3">
              {headerContent}
            </CardHeader>
            <CardContent>
              {gridContent}
            </CardContent>
          </>
        )}
      </Card>

      <ScheduleSlotEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        slot={selectedSlot}
        dayOfWeek={selectedDay}
        hour={selectedHour}
        onSave={handleSave}
        onDelete={handleDelete}
        isLoading={isCreating || isUpdating || isDeleting}
      />
    </>
  );
}
