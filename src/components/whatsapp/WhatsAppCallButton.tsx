import { useState } from "react";
import { Phone, PhoneCall, PhoneOff, Clock, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useVoiceCalls, VoiceCall } from "@/hooks/useVoiceCalls";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WhatsAppCallButtonProps {
  companyId: string;
  conversationId: string;
  phone: string;
  contactName?: string;
  hasApi4ComConfig: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: typeof Phone }
> = {
  initiated: {
    label: "Iniciando...",
    color: "text-yellow-500",
    icon: PhoneCall,
  },
  ringing: { label: "Chamando...", color: "text-blue-500", icon: PhoneCall },
  completed: { label: "Concluída", color: "text-green-500", icon: Phone },
  busy: { label: "Ocupado", color: "text-red-500", icon: PhoneOff },
  failed: { label: "Falhou", color: "text-red-500", icon: PhoneOff },
  cancelled: {
    label: "Cancelada",
    color: "text-muted-foreground",
    icon: PhoneOff,
  },
  no_answer: {
    label: "Sem resposta",
    color: "text-orange-500",
    icon: PhoneOff,
  },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function CallHistoryItem({ call }: { call: VoiceCall }) {
  const config = STATUS_CONFIG[call.status] || STATUS_CONFIG.failed;
  const Icon = config.icon;
  const date = parseISO(call.created_at);

  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <div className={cn("mt-0.5 shrink-0", config.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-xs font-medium", config.color)}>
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {format(date, "dd/MM HH:mm", { locale: ptBR })}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          {call.duration_seconds !== null && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(call.duration_seconds)}
            </span>
          )}
          {call.record_url && (
            <a
              href={call.record_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <Mic className="h-3 w-3" />
              Gravação
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export function WhatsAppCallButton({
  companyId,
  conversationId,
  phone,
  contactName,
  hasApi4ComConfig,
}: WhatsAppCallButtonProps) {
  const [open, setOpen] = useState(false);
  const { calls, isLoading, initiateCall, isInitiating } = useVoiceCalls(
    companyId,
    conversationId,
  );

  const handleCall = () => {
    window.open("https://expx.api4com.com", "_blank", "noopener,noreferrer");
    setTimeout(() => {
      initiateCall({ companyId, conversationId, phone, contactName });
      setOpen(false);
    }, 2000);
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Ligar para contato"
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => setOpen(true)}
          >
            <Phone className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Ligar</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Ligar para {contactName || phone}
            </DialogTitle>
            <DialogDescription>
              {hasApi4ComConfig
                ? `Iniciar ligação para ${phone} via API4Com.`
                : "Configure a API4Com em Configurações > WhatsApp antes de ligar."}
            </DialogDescription>
          </DialogHeader>

          {calls.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Histórico de chamadas
              </p>
              <ScrollArea className="h-[160px] rounded border p-2">
                {calls.map((call) => (
                  <CallHistoryItem key={call.id} call={call} />
                ))}
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCall}
              disabled={!hasApi4ComConfig || isInitiating}
              className="gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              {isInitiating ? "Iniciando..." : "Ligar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
