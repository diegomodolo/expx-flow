import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, ExternalLink, RefreshCw, Brain, ChevronDown, ChevronUp, FileText, CheckCircle2, Clock, Users, Video } from "lucide-react";
import { GoogleMeetMeeting } from "@/hooks/useGoogleMeetMeetings";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface MeetingDetailsModalProps {
  meeting: GoogleMeetMeeting;
  open: boolean;
  onClose: () => void;
  onCheckTranscript: (id: string) => Promise<void>;
  onProcessSummary: (id: string) => Promise<void>;
  processing: boolean;
}

export function MeetingDetailsModal({
  meeting,
  open,
  onClose,
  onCheckTranscript,
  onProcessSummary,
  processing,
}: MeetingDetailsModalProps) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <DialogTitle className="text-xl">{meeting.title}</DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge className="ml-2" variant="outline">{meeting.status}</Badge>
              </div>
              {meeting.clients && (
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="ml-2 font-medium">{(meeting.clients as any)?.name}</span>
                </div>
              )}
              {meeting.teams && (
                <div>
                  <span className="text-muted-foreground">Squad:</span>
                  <span className="ml-2 font-medium">{(meeting.teams as any)?.name}</span>
                </div>
              )}
              {meeting.scheduled_at && (
                <div>
                  <span className="text-muted-foreground">Agendada:</span>
                  <span className="ml-2">{format(new Date(meeting.scheduled_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              {meeting.started_at && (
                <div>
                  <span className="text-muted-foreground">Início:</span>
                  <span className="ml-2">{format(new Date(meeting.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
              {meeting.ended_at && (
                <div>
                  <span className="text-muted-foreground">Fim:</span>
                  <span className="ml-2">{format(new Date(meeting.ended_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                </div>
              )}
            </div>

            {/* Meeting Link */}
            {meeting.meeting_uri && (
              <Card>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Link da Reunião</p>
                    <p className="text-sm text-muted-foreground truncate max-w-md">{meeting.meeting_uri}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleCopy(meeting.meeting_uri)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.open(meeting.meeting_uri, '_blank')}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {meeting.transcript_status !== 'completed' && (
                <Button
                  variant="outline"
                  onClick={() => onCheckTranscript(meeting.id)}
                  disabled={processing}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
                  Buscar Transcrição
                </Button>
              )}
              {meeting.transcript_status === 'completed' && !meeting.ai_summary && (
                <Button
                  variant="outline"
                  onClick={() => onProcessSummary(meeting.id)}
                  disabled={processing}
                  className="gap-2"
                >
                  <Brain className={`h-4 w-4 ${processing ? 'animate-spin' : ''}`} />
                  Gerar Resumo com IA
                </Button>
              )}
            </div>

            {/* AI Summary */}
            {meeting.ai_summary && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Resumo da IA</h3>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{meeting.ai_summary}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {meeting.ai_action_items && meeting.ai_action_items.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">Itens de Ação</h3>
                  </div>
                  <div className="space-y-3">
                    {meeting.ai_action_items.map((item: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.responsible && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Responsável: {item.responsible}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {item.priority === 'high' ? '🔴 Alta' : item.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Raw Transcript */}
            {meeting.raw_transcript && (
              <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <CardContent className="p-4 cursor-pointer flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-sm">Transcrição Completa</span>
                      </div>
                      {transcriptOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="px-4 pb-4 pt-0">
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-4 rounded-lg max-h-96 overflow-auto">
                        {meeting.raw_transcript}
                      </pre>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
