import { Phone, PhoneOff, Mic, MicOff, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWebphone, WebphoneStatus } from "@/hooks/useWebphone";

interface WhatsAppWebphoneProps {
  domain: string;
  extension: string;
  password: string;
}

const STATUS_LABEL: Record<WebphoneStatus, string> = {
  disconnected: "Desconectado",
  connecting: "Conectando...",
  registered: "Pronto para ligar",
  ringing: "Chamada recebida",
  "in-call": "Em chamada",
};

const STATUS_COLOR: Record<WebphoneStatus, string> = {
  disconnected: "bg-muted text-muted-foreground",
  connecting: "bg-yellow-100 text-yellow-800",
  registered: "bg-green-100 text-green-800",
  ringing: "bg-blue-100 text-blue-800",
  "in-call": "bg-green-600 text-white",
};

export function WhatsAppWebphone({
  domain,
  extension,
  password,
}: WhatsAppWebphoneProps) {
  const { status, isMuted, answer, hangup, toggleMute } = useWebphone({
    domain,
    extension,
    password,
  });

  const showControls = status === "ringing" || status === "in-call";

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background/80 backdrop-blur-sm text-xs">
      <Phone
        className={cn(
          "h-3.5 w-3.5",
          status === "registered" || status === "in-call"
            ? "text-green-500"
            : "text-muted-foreground",
        )}
      />
      <Badge
        variant="outline"
        className={cn("text-[10px] px-1.5 py-0 border-0", STATUS_COLOR[status])}
      >
        {STATUS_LABEL[status]}
      </Badge>

      {showControls && (
        <div className="flex items-center gap-1 ml-1">
          {status === "ringing" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={answer}
              title="Atender"
            >
              <PhoneCall className="h-3.5 w-3.5" />
            </Button>
          )}
          {status === "in-call" && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={toggleMute}
              title={isMuted ? "Desmutar" : "Mutar"}
            >
              {isMuted ? (
                <MicOff className="h-3.5 w-3.5 text-orange-500" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={hangup}
            title="Desligar"
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
