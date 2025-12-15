import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  User, 
  Phone, 
  Building2,
  Loader2 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationMessage {
  id: string;
  client_name: string | null;
  contact_name: string | null;
  recipient_phone: string;
  message_content: string;
  status: string;
  sent_at: string | null;
  error_message: string | null;
}

interface NotificationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  executionLogId: string | null;
  triggerName: string;
}

export function NotificationDetailsModal({
  open,
  onOpenChange,
  executionLogId,
  triggerName,
}: NotificationDetailsModalProps) {
  const [messages, setMessages] = useState<NotificationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (open && executionLogId) {
      fetchMessages();
    }
  }, [open, executionLogId]);

  const fetchMessages = async () => {
    if (!executionLogId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_notification_log")
        .select("*")
        .eq("execution_log_id", executionLogId)
        .order("sent_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const sentCount = messages.filter(m => m.status === 'sent').length;
  const failedCount = messages.filter(m => m.status !== 'sent').length;

  // Group messages by client
  const messagesByClient = messages.reduce((acc, msg) => {
    const clientName = msg.client_name || 'Sem cliente';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(msg);
    return acc;
  }, {} as Record<string, NotificationMessage[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Detalhes da Execução: {triggerName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhuma mensagem encontrada para esta execução</p>
            <p className="text-sm text-muted-foreground mt-1">
              As mensagens enviadas após esta atualização aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <strong className="text-green-500">{sentCount}</strong> enviadas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  <strong className="text-red-500">{failedCount}</strong> falhas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <strong>{Object.keys(messagesByClient).length}</strong> clientes
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 h-[500px]">
              {/* Messages List */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/30">
                  <h4 className="font-medium text-sm">Mensagens Enviadas</h4>
                </div>
                <ScrollArea className="h-[450px]">
                  <div className="p-2 space-y-1">
                    {Object.entries(messagesByClient).map(([clientName, clientMessages]) => (
                      <div key={clientName} className="mb-3">
                        <div className="px-2 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {clientName}
                        </div>
                        {clientMessages.map((msg) => (
                          <button
                            key={msg.id}
                            onClick={() => setSelectedMessage(msg)}
                            className={`w-full text-left p-3 rounded-lg transition-colors ${
                              selectedMessage?.id === msg.id
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {msg.contact_name || 'Contato'}
                                </span>
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={msg.status === 'sent' 
                                  ? "bg-green-500/10 text-green-500" 
                                  : "bg-red-500/10 text-red-500"
                                }
                              >
                                {msg.status === 'sent' ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" /> Enviada</>
                                ) : (
                                  <><XCircle className="h-3 w-3 mr-1" /> Falha</>
                                )}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {msg.recipient_phone}
                            </div>
                            {msg.sent_at && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {format(new Date(msg.sent_at), "dd/MM HH:mm", { locale: ptBR })}
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Message Content */}
              <div className="border rounded-lg">
                <div className="p-3 border-b bg-muted/30">
                  <h4 className="font-medium text-sm">Conteúdo da Mensagem</h4>
                </div>
                <ScrollArea className="h-[450px]">
                  {selectedMessage ? (
                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Contato:</span>
                          <span className="font-medium">{selectedMessage.contact_name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Cliente:</span>
                          <span className="font-medium">{selectedMessage.client_name || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Telefone:</span>
                          <span className="font-medium">{selectedMessage.recipient_phone}</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Mensagem:</p>
                        <div className="p-3 rounded-lg bg-muted/30 whitespace-pre-wrap text-sm">
                          {selectedMessage.message_content}
                        </div>
                      </div>

                      {selectedMessage.error_message && (
                        <>
                          <Separator />
                          <div>
                            <p className="text-sm text-red-500 mb-2">Erro:</p>
                            <div className="p-3 rounded-lg bg-red-500/10 text-sm text-red-500">
                              {selectedMessage.error_message}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                      Selecione uma mensagem para ver o conteúdo
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
