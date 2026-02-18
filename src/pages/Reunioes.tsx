import React, { useState } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Video, FileText, Brain, Copy, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Clock, Users } from "lucide-react";
import { useGoogleMeetMeetings, GoogleMeetMeeting } from "@/hooks/useGoogleMeetMeetings";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { MeetingDetailsModal } from "@/components/meetings/MeetingDetailsModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  completed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const statusLabels: Record<string, string> = {
  scheduled: "Agendada",
  in_progress: "Em Andamento",
  completed: "Concluída",
  failed: "Falhou",
};

const transcriptStatusLabels: Record<string, string> = {
  pending: "Pendente",
  processing: "Processando",
  completed: "Disponível",
  failed: "Falhou",
  not_available: "Não Disponível",
};

export default function Reunioes() {
  const { meetings, loading, createMeeting, creating, checkTranscript, processSummary } = useGoogleMeetMeetings();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<GoogleMeetMeeting | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleCopyLink = (uri: string) => {
    navigator.clipboard.writeText(uri);
    toast.success("Link copiado!");
  };

  const handleCheckTranscript = async (meetingId: string) => {
    setProcessingId(meetingId);
    await checkTranscript(meetingId);
    setProcessingId(null);
  };

  const handleProcessSummary = async (meetingId: string) => {
    setProcessingId(meetingId);
    await processSummary(meetingId);
    setProcessingId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reuniões</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Crie reuniões no Google Meet e obtenha transcrições e resumos automáticos
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Reunião
          </Button>
        </div>

        {/* Meetings List */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma reunião ainda</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Crie sua primeira reunião para começar a usar transcrições automáticas
            </p>
            <Button onClick={() => setShowCreateModal(true)} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Reunião
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4">
            {meetings.map((meeting) => (
              <Card
                key={meeting.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedMeeting(meeting)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-foreground truncate">{meeting.title}</h3>
                        <Badge className={statusColors[meeting.status] || statusColors.scheduled}>
                          {statusLabels[meeting.status] || meeting.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {meeting.clients && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {(meeting.clients as any)?.name}
                          </span>
                        )}
                        {meeting.teams && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {(meeting.teams as any)?.name}
                          </span>
                        )}
                        {meeting.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(meeting.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {!meeting.scheduled_at && meeting.created_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {format(new Date(meeting.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {/* Transcript status */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Transcrição: {transcriptStatusLabels[meeting.transcript_status] || meeting.transcript_status}
                        </span>
                        {meeting.ai_summary && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Brain className="h-3 w-3" />
                            Resumo disponível
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                      {meeting.meeting_uri && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(meeting.meeting_uri)}
                            title="Copiar link"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.open(meeting.meeting_uri, '_blank')}
                            title="Abrir no Meet"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {meeting.status === 'completed' && meeting.transcript_status !== 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCheckTranscript(meeting.id)}
                          disabled={processingId === meeting.id}
                          className="gap-1"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${processingId === meeting.id ? 'animate-spin' : ''}`} />
                          Buscar Transcrição
                        </Button>
                      )}
                      {meeting.transcript_status === 'completed' && !meeting.ai_summary && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProcessSummary(meeting.id)}
                          disabled={processingId === meeting.id}
                          className="gap-1"
                        >
                          <Brain className={`h-3.5 w-3.5 ${processingId === meeting.id ? 'animate-spin' : ''}`} />
                          Gerar Resumo
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateMeetingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createMeeting}
        creating={creating}
      />

      {selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          open={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onCheckTranscript={handleCheckTranscript}
          onProcessSummary={handleProcessSummary}
          processing={processingId === selectedMeeting.id}
        />
      )}
    </DashboardLayout>
  );
}
