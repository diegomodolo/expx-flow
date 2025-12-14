import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileVideo,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Upload,
  Loader2,
  Play,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PresentationMeeting, usePresentationMeetings } from "@/hooks/usePresentationMeetings";

interface MeetingsHistoryProps {
  meetings: PresentationMeeting[];
  isLoading: boolean;
  presentationId: string;
  onRefresh: () => void;
}

export function MeetingsHistory({ meetings, isLoading, presentationId, onRefresh }: MeetingsHistoryProps) {
  const [expandedMeetings, setExpandedMeetings] = useState<Record<string, boolean>>({});
  const [editingMeeting, setEditingMeeting] = useState<PresentationMeeting | null>(null);
  const [notes, setNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  const { updateMeeting, uploadRecording } = usePresentationMeetings(presentationId);

  const toggleExpand = (meetingId: string) => {
    setExpandedMeetings(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId],
    }));
  };

  const handleEditMeeting = (meeting: PresentationMeeting) => {
    setEditingMeeting(meeting);
    setNotes(meeting.notes || "");
  };

  const handleSaveNotes = async () => {
    if (!editingMeeting) return;
    await updateMeeting.mutateAsync({
      meetingId: editingMeeting.id,
      updates: { notes },
    });
    setEditingMeeting(null);
    onRefresh();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, meetingId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadRecording(file, meetingId);
      onRefresh();
    } catch (error) {
      console.error("Error uploading recording:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const getMeetingDuration = (meeting: PresentationMeeting): string => {
    if (!meeting.started_at || !meeting.ended_at) return "-";
    const minutes = differenceInMinutes(new Date(meeting.ended_at), new Date(meeting.started_at));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhuma reunião</h3>
          <p className="text-muted-foreground max-w-sm">
            Publique a apresentação e compartilhe o link com seu cliente para iniciar uma reunião de aprovação.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {meetings.map((meeting, index) => {
          const isExpanded = expandedMeetings[meeting.id];
          const isLatest = index === 0;

          return (
            <Card key={meeting.id} className={isLatest ? "border-primary/50" : ""}>
              <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(meeting.id)}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        meeting.status === 'completed' ? 'bg-green-500/10' :
                        meeting.status === 'in_progress' ? 'bg-yellow-500/10' :
                        'bg-muted'
                      }`}>
                        <Users className={`w-5 h-5 ${
                          meeting.status === 'completed' ? 'text-green-500' :
                          meeting.status === 'in_progress' ? 'text-yellow-500' :
                          'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          Reunião {meetings.length - index}
                          {isLatest && <Badge variant="outline" className="text-xs">Mais recente</Badge>}
                          <Badge variant={
                            meeting.status === 'completed' ? 'default' :
                            meeting.status === 'in_progress' ? 'secondary' :
                            'outline'
                          }>
                            {meeting.status === 'completed' ? 'Finalizada' :
                             meeting.status === 'in_progress' ? 'Em andamento' :
                             'Cancelada'}
                          </Badge>
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(meeting.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Stats */}
                      <div className="hidden md:flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{meeting.approved_count || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-500">
                          <XCircle className="w-4 h-4" />
                          <span>{meeting.rejected_count || 0}</span>
                        </div>
                        {meeting.participants && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" />
                            <span>{meeting.participants.length}</span>
                          </div>
                        )}
                      </div>

                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="icon">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Time Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-muted/50">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Início</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {meeting.started_at 
                            ? format(new Date(meeting.started_at), "HH:mm", { locale: ptBR })
                            : "-"
                          }
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Fim</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="w-3 h-3" />
                          {meeting.ended_at 
                            ? format(new Date(meeting.ended_at), "HH:mm", { locale: ptBR })
                            : "-"
                          }
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Duração</p>
                        <p className="text-sm font-medium">{getMeetingDuration(meeting)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Participantes</p>
                        <p className="text-sm font-medium">{meeting.participants?.length || 0}</p>
                      </div>
                    </div>

                    {/* Participants */}
                    {meeting.participants && meeting.participants.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Participantes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {meeting.participants.map((p) => (
                            <Badge key={p.id} variant="secondary">
                              {p.name} ({p.role})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recording */}
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <FileVideo className="w-4 h-4" />
                        Gravação
                      </h4>
                      {meeting.recording_url ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(meeting.recording_url!, '_blank')}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Assistir Gravação
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`recording-${meeting.id}`}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed hover:bg-muted transition-colors">
                              {isUploading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Upload className="w-4 h-4" />
                              )}
                              <span className="text-sm">
                                {isUploading ? "Enviando..." : "Fazer upload da gravação"}
                              </span>
                            </div>
                          </Label>
                          <Input
                            id={`recording-${meeting.id}`}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, meeting.id)}
                            disabled={isUploading}
                          />
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Observações
                        </h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditMeeting(meeting)}
                        >
                          Editar
                        </Button>
                      </div>
                      {meeting.notes ? (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3 rounded-lg bg-muted/50">
                          {meeting.notes}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">
                          Nenhuma observação adicionada.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      {/* Edit Notes Dialog */}
      <Dialog open={!!editingMeeting} onOpenChange={() => setEditingMeeting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Observações da Reunião</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a reunião..."
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMeeting(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveNotes}
              disabled={updateMeeting.isPending}
            >
              {updateMeeting.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
