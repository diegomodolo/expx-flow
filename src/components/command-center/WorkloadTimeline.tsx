import React, { useState, useCallback, useRef, useEffect } from "react";
import { TimelineRow } from "./TimelineRow";
import { SquadMember, CommandCenterTask } from "@/hooks/useCommandCenter";
import { WorkSchedule } from "@/hooks/useWorkSchedules";
import { Clock, ZoomIn, ZoomOut, GripHorizontal, ChevronLeft, ChevronRight, CalendarDays, Settings2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, addDays, subDays, isToday, isTomorrow, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface TimelineSettings {
  slotDuration: number;
  startHour: number;
  endHour: number;
}

const SETTING_KEY = "cc-timeline-settings";

function usePersistedTimelineSettings() {
  const [settings, setSettings] = useState<TimelineSettings | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load from DB on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoaded(true); return; }

        const { data } = await supabase
          .from("user_ui_settings" as unknown)
          .select("setting_value")
          .eq("user_id", user.id)
          .eq("setting_key", SETTING_KEY)
          .maybeSingle() as unknown;

        if ((data as unknown)?.setting_value) {
          setSettings((data as unknown).setting_value as TimelineSettings);
        }
      } catch {
        // fallback — no saved settings
      }
      setLoaded(true);
    })();
  }, []);

  const save = useCallback(async (s: TimelineSettings) => {
    setSettings(s);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("user_ui_settings" as unknown)
        .upsert(
          { user_id: user.id, setting_key: SETTING_KEY, setting_value: s as unknown, updated_at: new Date().toISOString() },
          { onConflict: "user_id,setting_key" }
        );
    } catch (err) {
      console.error("[TimelineSettings] Failed to persist:", err);
    }
  }, []);

  return { settings, save, loaded };
}

interface Props {
  members: SquadMember[];
  tasks: CommandCenterTask[];
  startHour?: number;
  workSchedules?: WorkSchedule[];
  onRepositionTask?: (taskId: string, newStartDate: Date) => void;
  onResizeTask?: (taskId: string, newStartDate: Date, newEstimatedMinutes: number) => void;
  onClickTask?: (task: CommandCenterTask) => void;
  onSendToBacklog?: (taskId: string) => void;
  onReturnToBacklogCenter?: (taskId: string) => void;
  onSendToNextDay?: (taskId: string) => void;
  onReassignTask?: (taskId: string, newUserId: string, newMemberName: string, newStartDate: Date) => void;
  draggingTask?: CommandCenterTask | null;
  dropSlotRef?: React.MutableRefObject<number | null>;
  timelineContainerRef?: React.MutableRefObject<HTMLDivElement | null>;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DEFAULT_SLOT_DURATION = 20;
const MIN_SLOT_WIDTH = 32;
const MAX_SLOT_WIDTH = 120;
const MIN_ROW_HEIGHT = 44;
const MAX_ROW_HEIGHT = 120;

function formatDateLabel(date: Date): string {
  if (isToday(date)) return "Hoje";
  if (isTomorrow(date)) return "Amanhã";
  if (isYesterday(date)) return "Ontem";
  return format(date, "EEE, d 'de' MMM", { locale: ptBR });
}

export function WorkloadTimeline({ members, tasks, startHour: _startHourProp = 0, workSchedules = [], onRepositionTask, onResizeTask, onClickTask, onSendToBacklog, onReturnToBacklogCenter, onSendToNextDay, onReassignTask, draggingTask, dropSlotRef, timelineContainerRef, selectedDate, onDateChange }: Props) {
  const { settings: savedSettings, save: persistSettings, loaded: settingsLoaded } = usePersistedTimelineSettings();
  const [slotWidth, setSlotWidth] = useState(56);
  const [rowHeight, setRowHeight] = useState(68);
  const [slotDuration, setSlotDuration] = useState(DEFAULT_SLOT_DURATION);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempSlotDuration, setTempSlotDuration] = useState(slotDuration);
  const [timelineStartHour, setTimelineStartHour] = useState(0);
  const [timelineEndHour, setTimelineEndHour] = useState(23);
  const [tempStartHour, setTempStartHour] = useState(timelineStartHour);
  const [tempEndHour, setTempEndHour] = useState(timelineEndHour);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mouseSlot, setMouseSlot] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // Apply persisted settings once loaded from DB
  useEffect(() => {
    if (settingsLoaded && savedSettings) {
      setSlotDuration(savedSettings.slotDuration);
      setTimelineStartHour(savedSettings.startHour);
      setTimelineEndHour(savedSettings.endHour);
      setTempSlotDuration(savedSettings.slotDuration);
      setTempStartHour(savedSettings.startHour);
      setTempEndHour(savedSettings.endHour);
    }
  }, [settingsLoaded, savedSettings]);

  const effectiveStartHour = timelineStartHour;
  const timelineMinutes = (timelineEndHour - timelineStartHour + 1) * 60;
  const totalSlots = Math.floor(timelineMinutes / slotDuration);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = rowHeight;
    resizeRef.current = { startY, startHeight };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientY - resizeRef.current.startY;
      const membersCount = Math.max(members.length, 1);
      const perRowDelta = delta / membersCount;
      const newHeight = Math.min(MAX_ROW_HEIGHT, Math.max(MIN_ROW_HEIGHT, resizeRef.current.startHeight + perRowDelta));
      setRowHeight(Math.round(newHeight));
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [rowHeight, members.length]);

  // Filter tasks by selected date
  const filteredTasks = tasks.filter(task => {
    if (!task.start_date) return false;
    const taskDate = new Date(task.start_date);
    return (
      taskDate.getFullYear() === selectedDate.getFullYear() &&
      taskDate.getMonth() === selectedDate.getMonth() &&
      taskDate.getDate() === selectedDate.getDate()
    );
  });

  // Track mouse position over timeline during drag
  React.useEffect(() => {
    if (!draggingTask) {
      setMouseSlot(null);
      return;
    }
    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;
      // Find the first timeline row's ruler area (after the 192px member column)
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const mouseX = e.clientX - rect.left + scrollLeft - 192; // 192 = w-48 member column
      if (mouseX < 0) {
        setMouseSlot(null);
        if (dropSlotRef) dropSlotRef.current = null;
        return;
      }
      const slot = Math.floor(mouseX / slotWidth);
      const clampedSlot = Math.max(0, Math.min(slot, totalSlots - 1));
      setMouseSlot(clampedSlot);
      if (dropSlotRef) dropSlotRef.current = clampedSlot;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [draggingTask, slotWidth, totalSlots, dropSlotRef]);

  const isFuture = !isToday(selectedDate);

  return (
    <div className="bg-card border border-border overflow-hidden flex flex-col flex-1 min-h-0">
      {/* Header with controls */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border flex-wrap gap-y-2">
        <Clock className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Timeline — {String(timelineStartHour).padStart(2,"0")}h às {String(timelineEndHour).padStart(2,"0")}h</h3>

        {/* Date navigation */}
        <div className="flex items-center gap-1 ml-4 bg-muted/40 rounded-lg px-1 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDateChange(subDays(selectedDate, 1))}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-6 px-2 text-xs font-medium gap-1.5 min-w-[110px]",
                  isFuture && "text-primary"
                )}
              >
                <CalendarDays className="w-3 h-3" />
                {formatDateLabel(selectedDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    onDateChange(d);
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onDateChange(addDays(selectedDate, 1))}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>

          {!isToday(selectedDate) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => onDateChange(new Date())}
            >
              Hoje
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-4">
          {/* Slot width control */}
          <div className="flex items-center gap-2">
            <ZoomOut className="w-3.5 h-3.5 text-muted-foreground" />
            <Slider
              value={[slotWidth]}
              onValueChange={([v]) => setSlotWidth(v)}
              min={MIN_SLOT_WIDTH}
              max={MAX_SLOT_WIDTH}
              step={4}
              className="w-24"
            />
            <ZoomIn className="w-3.5 h-3.5 text-muted-foreground" />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => { setTempSlotDuration(slotDuration); setTempStartHour(timelineStartHour); setTempEndHour(timelineEndHour); setSettingsOpen(true); }}
            title="Configurar duração dos slots"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>

          <span className="text-[10px] text-muted-foreground/50">{totalSlots} slots de {slotDuration}min</span>
        </div>
      </div>

      {/* Future date banner */}
      {isFuture && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10">
          <CalendarDays className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary/80">
            Visualizando {format(selectedDate, "d 'de' MMMM", { locale: ptBR })} — tarefas agendadas para este dia aparecem na timeline.
          </span>
        </div>
      )}

      {/* Scrollable timeline area - single scroll for ruler + all rows */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-auto">
        <div style={{ minWidth: `${192 + slotWidth * totalSlots}px` }}>
          {/* Time ruler - sticky top */}
          <div className="flex border-b border-border sticky top-0 z-10 bg-card">
            <div className="w-48 flex-shrink-0 px-4 py-1">
              <span className="text-[10px] text-muted-foreground/50">Colaborador</span>
            </div>
            <div className="flex">
              {Array.from({ length: totalSlots }).map((_, i) => {
                const totalMinutes = effectiveStartHour * 60 + i * slotDuration;
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                const showLabel = (slotDuration * i) % 60 === 0 || i === 0;
                const label = showLabel ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}` : "";
                return (
                  <div key={i} className="border-r border-border/50 flex-shrink-0 px-0.5" style={{ width: `${slotWidth}px` }}>
                    {label && <span className="text-[9px] text-muted-foreground/50">{label}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Member rows */}
          {members.length > 0 ? (
            members.map(member => {
            const memberSchedule = workSchedules.find(ws => ws.id === member.work_schedule_id) || null;
            
            // Compute ghost preview for this member based on mouse position
            let ghostPreview: { startSlot: number; slotsNeeded: number; title: string } | null = null;
            if (draggingTask && mouseSlot !== null) {
              const slotsNeeded = Math.max(1, Math.ceil((draggingTask.ai_estimated_minutes || 20) / slotDuration));
              ghostPreview = { startSlot: mouseSlot, slotsNeeded, title: draggingTask.title };
            }

            return (
              <TimelineRow
                key={member.id}
                member={member}
                tasks={filteredTasks}
                startHour={effectiveStartHour}
                slotWidth={slotWidth}
                totalSlots={totalSlots}
                slotDuration={slotDuration}
                rowHeight={rowHeight}
                selectedDate={selectedDate}
                workSchedule={memberSchedule}
                onRepositionTask={onRepositionTask}
                onResizeTask={onResizeTask}
                onClickTask={onClickTask}
                onSendToBacklog={onSendToBacklog}
                onReturnToBacklogCenter={onReturnToBacklogCenter}
                onSendToNextDay={onSendToNextDay}
                onReassignTask={onReassignTask}
                ghostPreview={ghostPreview}
              />
            );
          })
        ) : (
          <div className="flex items-center justify-center py-16 text-muted-foreground/50 text-sm">
            Nenhum membro na squad selecionada
          </div>
        )}
        </div>
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={cn(
          "flex items-center justify-center py-1 cursor-ns-resize border-t border-border",
          "hover:bg-muted/50 transition-colors group select-none"
        )}
        title="Arraste para redimensionar as linhas"
      >
        <GripHorizontal className="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              Configurar Timeline
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Duração de cada slot (minutos)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                step={5}
                value={tempSlotDuration}
                onChange={e => setTempSlotDuration(Math.max(5, Math.min(60, Number(e.target.value))))}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Hora início</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={tempStartHour}
                  onChange={e => {
                    const v = Math.max(0, Math.min(23, Number(e.target.value)));
                    setTempStartHour(v);
                    if (v >= tempEndHour) setTempEndHour(Math.min(23, v + 1));
                  }}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Hora fim</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={tempEndHour}
                  onChange={e => {
                    const v = Math.max(0, Math.min(23, Number(e.target.value)));
                    setTempEndHour(v);
                    if (v <= tempStartHour) setTempStartHour(Math.max(0, v - 1));
                  }}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {String(tempStartHour).padStart(2,"0")}h às {String(tempEndHour).padStart(2,"0")}h = {(tempEndHour - tempStartHour + 1)}h → {Math.floor(((tempEndHour - tempStartHour + 1) * 60) / tempSlotDuration)} slots de {tempSlotDuration}min
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={() => { setSlotDuration(tempSlotDuration); setTimelineStartHour(tempStartHour); setTimelineEndHour(tempEndHour); persistSettings({ slotDuration: tempSlotDuration, startHour: tempStartHour, endHour: tempEndHour }); setSettingsOpen(false); }}>Aplicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
