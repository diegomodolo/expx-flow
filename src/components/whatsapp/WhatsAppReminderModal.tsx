import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClientTouchpoints } from "@/hooks/useClientTouchpoints";

interface WhatsAppReminderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
}

export function WhatsAppReminderModal({
  open,
  onOpenChange,
  clientId,
  clientName,
}: WhatsAppReminderModalProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createTouchpoint } = useClientTouchpoints(clientId);

  const handleSubmit = async () => {
    if (!date || !reason.trim()) return;

    setIsSubmitting(true);

    try {
      // Combine date and time
      let reminderDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(":").map(Number);
        reminderDate.setHours(hours, minutes, 0, 0);
      } else {
        reminderDate.setHours(9, 0, 0, 0); // Default to 9 AM
      }

      await createTouchpoint.mutateAsync({
        clientId,
        touchpointType: "whatsapp",
        summary: reason,
        occurredAt: new Date().toISOString(),
        nextAction: `Lembrete: ${reason}`,
        nextActionDate: reminderDate.toISOString(),
      });

      // Reset form and close
      setDate(undefined);
      setTime("");
      setReason("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating reminder:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = date && reason.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Lembrete</DialogTitle>
          <DialogDescription>
            Agende um lembrete para retornar contato com {clientName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reminder-date">Data do lembrete *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="reminder-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-time">Hora (opcional)</Label>
            <Input
              id="reminder-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="09:00"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="reminder-reason">Motivo *</Label>
            <Textarea
              id="reminder-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Verificar se recebeu a proposta..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Lembrete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
