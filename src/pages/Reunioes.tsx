import React, { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Video, Brain, Copy, ExternalLink, RefreshCw, Clock, Users, Search, Trash2, Pencil, Film } from "lucide-react";
import { useGoogleMeetMeetings, GoogleMeetMeeting } from "@/hooks/useGoogleMeetMeetings";
import { CreateMeetingModal } from "@/components/meetings/CreateMeetingModal";
import { EditMeetingModal } from "@/components/meetings/EditMeetingModal";
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
  const { meetings, loading, createMeeting, creating, updateMeeting, deleteMeeting, checkTranscript, processSummary } = useGoogleMeetMeetings();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<GoogleMeetMeeting | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<GoogleMeetMeeting | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [transcriptFilter, setTranscriptFilter] = useState("all");

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchTitle = m.title.toLowerCase().includes(term);
        const matchClient = (m.clients as unknown)?.name?.toLowerCase().includes(term);
        const matchTeam = (m.teams as unknown)?.name?.toLowerCase().includes(term);
        if (!matchTitle && !matchClient && !matchTeam) return false;
      }
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (transcriptFilter !== "all" && m.transcript_status !== transcriptFilter) return false;
      return true;
    });
  }, [meetings, searchTerm, statusFilter, transcriptFilter]);

  const handleCopyLink = (uri: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
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

  const handleDelete = async (meetingId: string) => {
    setDeletingId(meetingId);
    await deleteMeeting(meetingId);
    setDeletingId(null);
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

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, cliente ou squad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="scheduled">Agendada</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluída</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
            <Select value={transcriptFilter} onValueChange={setTranscriptFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Transcrição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas transcrições</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="completed">Disponível</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredMeetings.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">
              {meetings.length === 0 ? "Nenhuma reunião ainda" : "Nenhuma reunião encontrada"}
            </h3>
            <p className="text-muted-foreground text-sm mb-4">
              {meetings.length === 0
                ? "Crie sua primeira reunião para começar a usar transcrições automáticas"
                : "Tente ajustar os filtros de busca"}
            </p>
            {meetings.length === 0 && (
              <Button onClick={() => setShowCreateModal(true)} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Reunião
              </Button>
            )}
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Squad</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transcrição</TableHead>
                  <TableHead>IA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMeetings.map((meeting) => (
                  <TableRow
                    key={meeting.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedMeeting(meeting)}
                  >
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {meeting.title}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(meeting.clients as unknown)?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {(meeting.teams as unknown)?.name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {meeting.scheduled_at
                        ? format(new Date(meeting.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : format(new Date(meeting.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[meeting.status] || statusColors.scheduled}>
                        {statusLabels[meeting.status] || meeting.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {transcriptStatusLabels[meeting.transcript_status] || meeting.transcript_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {meeting.ai_summary ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Brain className="h-3 w-3" />
                          Resumo
                        </Badge>
                      ) : meeting.recording_url ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Film className="h-3 w-3" />
                          Gravação
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {meeting.meeting_uri && (
                          <Button aria-label="Copiar"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => handleCopyLink(meeting.meeting_uri, e)}
                            title="Copiar link"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {meeting.meeting_uri && (
                          <Button aria-label="Fechar"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => window.open(meeting.meeting_uri, '_blank')}
                            title="Abrir no Meet"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {meeting.status === 'completed' && meeting.transcript_status !== 'completed' && (
                          <Button aria-label="Atualizar"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCheckTranscript(meeting.id)}
                            disabled={processingId === meeting.id}
                            title="Buscar transcrição"
                          >
                            <RefreshCw className={`h-3.5 w-3.5 ${processingId === meeting.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        {meeting.transcript_status === 'completed' && !meeting.ai_summary && (
                          <Button aria-label="Ação"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleProcessSummary(meeting.id)}
                            disabled={processingId === meeting.id}
                            title="Gerar resumo IA"
                          >
                            <Brain className={`h-3.5 w-3.5 ${processingId === meeting.id ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                        <Button aria-label="Editar"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingMeeting(meeting)}
                          title="Editar"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir reunião</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a reunião "{meeting.title}"? Essa ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(meeting.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      <CreateMeetingModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={createMeeting}
        creating={creating}
      />

      {editingMeeting && (
        <EditMeetingModal
          meeting={editingMeeting}
          open={!!editingMeeting}
          onClose={() => setEditingMeeting(null)}
          onSubmit={updateMeeting}
        />
      )}

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
