import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Presentation, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PresentationDetails {
  id: string;
  presentation_id: string;
  meeting_date: string;
  status: string;
  notes: string | null;
  recording_url: string | null;
  approved_count: number | null;
  rejected_count: number | null;
  presentation_name: string;
  client_name: string | null;
  public_token: string | null;
}

interface PresentationDetailsModalProps {
  presentationId: string;
  meetingId: string;
  open: boolean;
  onClose: () => void;
}

export function PresentationDetailsModal({
  presentationId,
  meetingId,
  open,
  onClose,
}: PresentationDetailsModalProps) {
  const navigate = useNavigate();

  const { data: details, isLoading: loading } = useQuery({
    queryKey: ["presentation-details", meetingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("presentation_meetings")
        .select(
          "id, presentation_id, meeting_date, status, notes, recording_url, approved_count, rejected_count, content_presentations(id, name, public_token, clients(name))",
        )
        .eq("id", meetingId)
        .single();

      if (error || !data) return null;

      const pres = (data as any).content_presentations;
      return {
        id: data.id,
        presentation_id: data.presentation_id,
        meeting_date: data.meeting_date,
        status: data.status,
        notes: data.notes,
        recording_url: data.recording_url,
        approved_count: data.approved_count,
        rejected_count: data.rejected_count,
        presentation_name: pres?.name || "Apresentação",
        client_name: pres?.clients?.name || null,
        public_token: pres?.public_token || null,
      } as PresentationDetails;
    },
    enabled: open && !!meetingId,
  });

  const statusLabels: Record<string, string> = {
    in_progress: "Em andamento",
    completed: "Concluída",
    scheduled: "Agendada",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Presentation className="h-5 w-5 text-cyan-500" />
            <DialogTitle className="text-xl">
              {loading ? "Carregando..." : details?.presentation_name}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!loading && details && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {details.client_name && (
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="ml-2 font-medium">
                    {details.client_name}
                  </span>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Data:</span>
                <span className="ml-2">
                  {format(new Date(details.meeting_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="ml-2">
                  {statusLabels[details.status] || details.status}
                </Badge>
              </div>
              {(details.approved_count != null ||
                details.rejected_count != null) && (
                <div>
                  <span className="text-muted-foreground">Aprovações:</span>
                  <span className="ml-2">
                    {details.approved_count || 0} aprovados,{" "}
                    {details.rejected_count || 0} rejeitados
                  </span>
                </div>
              )}
            </div>

            {details.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notas:</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg whitespace-pre-wrap">
                  {details.notes}
                </p>
              </div>
            )}

            {details.recording_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(details.recording_url!, "_blank")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Gravação
              </Button>
            )}

            <div className="flex gap-2 pt-2 border-t">
              {details.public_token && (
                <Button
                  variant="outline"
                  onClick={() =>
                    window.open(
                      `/apresentacao/${details.public_token}`,
                      "_blank",
                    )
                  }
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir Apresentação Pública
                </Button>
              )}
              <Button
                onClick={() => {
                  onClose();
                  navigate(
                    `/geradores/apresentacoes?id=${details.presentation_id}`,
                  );
                }}
                className="gap-2"
              >
                <Presentation className="h-4 w-4" />
                Ir para Apresentação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
