import { WhatsAppMessage } from "@/hooks/useWhatsAppMessages";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck, Clock, AlertCircle, Download, FileText, Image, Video, Headphones, Loader2, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { WhatsAppAudioPlayer } from "./WhatsAppAudioPlayer";
import { WhatsAppImageViewer } from "./WhatsAppImageViewer";
import { WhatsAppReactionPicker } from "./WhatsAppReactionPicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface WhatsAppMessageBubbleProps {
  message: WhatsAppMessage;
  instanceId?: string | null;
  companyId?: string;
  remoteJid?: string; // phone@s.whatsapp.net format
  onMessageEdited?: (messageId: string, newContent: string) => void;
}

export function WhatsAppMessageBubble({ message, instanceId, companyId, remoteJid, onMessageEdited }: WhatsAppMessageBubbleProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [displayContent, setDisplayContent] = useState(message.content);
  const [isDeleted, setIsDeleted] = useState(message.status === "deleted");
  const editInputRef = useRef<HTMLInputElement>(null);
  const isOutgoing = message.direction === "outgoing";
  const isFailed = message.status === "failed";
  const hasMedia = !!message.media_url;
  const isMediaType = ["image", "video", "audio", "document"].includes(message.message_type);
  const isTextMessage = message.message_type === "text";
  
  const extractFileName = (): string => {
    // Try to extract filename from content (e.g., "📎 fatura_rene_tanana.pdf")
    let fileName = message.content
      .replace("📎 ", "")
      .replace(/^\[.*\]\s*/, "")
      .trim();
    
    // If no valid filename found, create one based on message type
    if (!fileName || fileName.length < 2) {
      const extension = message.message_type === "image" ? "jpg" 
        : message.message_type === "video" ? "mp4"
        : message.message_type === "audio" ? "mp3"
        : message.message_type === "document" ? "pdf"
        : "file";
      fileName = `whatsapp_${message.message_type}_${Date.now()}.${extension}`;
    }
    
    return fileName;
  };

  const handleDownload = async () => {
    if (!message.media_url && !message.external_id) return;
    
    setIsDownloading(true);
    const fileName = extractFileName();
    
    try {
      // Use edge function as proxy (UazapiGO requires /message/download before getting the real file)
      const { data: blob, error } = await supabase.functions.invoke("download-whatsapp-media", {
        body: { instanceId, messageId: message.external_id, mediaUrl: message.media_url, fileName },
      });
      
      if (error) throw error;
      if (!(blob instanceof Blob)) throw new Error("Resposta inválida do download");
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Download concluído!");
    } catch (error) {
      console.error("Error downloading file:", error);
      // Fallback: try direct download
      try {
        const response = await fetch(message.media_url);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success("Download concluído!");
        } else {
          throw new Error("Failed to download");
        }
      } catch (fallbackError) {
        console.error("Fallback download failed:", fallbackError);
        toast.error("Erro ao baixar arquivo. Abrindo em nova aba...");
        window.open(message.media_url, "_blank");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteMessage = async () => {
    if (!companyId) {
      toast.error("Não foi possível apagar a mensagem");
      return;
    }

    setIsDeleting(true);

    try {
      // If we have external_id and instanceId, delete from provider too
      if (instanceId && message.external_id) {
        const { data, error } = await supabase.functions.invoke("delete-whatsapp-message", {
          body: {
            company_id: companyId,
            instance_id: instanceId,
            message_id: message.external_id,
            remote_jid: messageRemoteJid,
            from_me: isOutgoing,
            supabase_message_id: message.id,
          },
        });

        if (error) throw error;

        if (data?.success) {
          setIsDeleted(true);
          toast.success("Mensagem apagada");
        } else {
          throw new Error(data?.error || "Erro ao apagar mensagem");
        }
      } else {
        // Only delete locally (message doesn't have external_id yet)
        const { error } = await supabase
          .from("whatsapp_messages")
          .update({ status: "deleted", content: "🚫 Mensagem apagada" })
          .eq("id", message.id);

        if (error) throw error;

        setIsDeleted(true);
        toast.success("Mensagem apagada localmente");
      }
    } catch (err: any) {
      console.error("[WhatsAppMessageBubble] Delete error:", err);
      toast.error(err.message || "Erro ao apagar mensagem");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditMessage = async () => {
    if (!companyId || !instanceId || !message.external_id) {
      toast.error("Não é possível editar esta mensagem");
      return;
    }

    if (!editText.trim() || editText.trim() === message.content) {
      setIsEditDialogOpen(false);
      return;
    }

    setIsEditing(true);

    try {
      const { data, error } = await supabase.functions.invoke("edit-whatsapp-message", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          message_id: message.external_id,
          new_text: editText.trim(),
          supabase_message_id: message.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setDisplayContent(editText.trim());
        setIsEditDialogOpen(false);
        onMessageEdited?.(message.id, editText.trim());
        toast.success("Mensagem editada");
      } else {
        throw new Error(data?.error || "Erro ao editar mensagem");
      }
    } catch (err: any) {
      console.error("[WhatsAppMessageBubble] Edit error:", err);
      toast.error(err.message || "Erro ao editar mensagem");
    } finally {
      setIsEditing(false);
    }
  };

  // Focus input when dialog opens
  useEffect(() => {
    if (isEditDialogOpen && editInputRef.current) {
      setTimeout(() => editInputRef.current?.focus(), 100);
    }
  }, [isEditDialogOpen]);

  const getMediaIcon = () => {
    switch (message.message_type) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "audio":
        return <Headphones className="h-4 w-4" />;
      case "document":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getMediaLabel = () => {
    switch (message.message_type) {
      case "image":
        return "Imagem";
      case "video":
        return "Vídeo";
      case "audio":
        return "Áudio";
      case "document":
        return "Documento";
      default:
        return "Arquivo";
    }
  };
  
  // Build remoteJid if not provided
  const messageRemoteJid = remoteJid || `${message.company_id}@s.whatsapp.net`;

  // If message is deleted, show simplified view
  if (isDeleted) {
    return (
      <div className={cn("flex", isOutgoing ? "justify-end" : "justify-start")}>
        <div className={cn(
          "rounded-lg px-3 py-2 shadow-sm italic text-muted-foreground",
          isOutgoing ? "bg-muted/50 rounded-br-none" : "bg-muted/50 rounded-bl-none"
        )}>
          <span className="text-sm">🚫 Mensagem apagada</span>
        </div>
      </div>
    );
  }
  
  // Check if delete action is available (needs external_id to delete from provider)
  const canDeleteFromProvider = !!message.external_id && !!instanceId && !!companyId;
  // Always allow showing delete button for outgoing messages (will delete locally if no external_id)
  const canShowDeleteButton = isOutgoing && !!companyId;
  // Edit is only available for text messages with external_id
  const canEditMessage = isOutgoing && isTextMessage && !!message.external_id && !!instanceId && !!companyId;
  
  return (
    <>
    <div className={cn("flex group", isOutgoing ? "justify-end" : "justify-start")}>
      {/* Action buttons for outgoing messages - show on left */}
      {canShowDeleteButton && (
        <div className="flex items-center gap-1 mr-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Delete button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Apagar mensagem?</AlertDialogTitle>
                <AlertDialogDescription>
                  {canDeleteFromProvider 
                    ? "Esta ação irá apagar a mensagem para todos os participantes da conversa. Esta ação não pode ser desfeita."
                    : "Esta ação irá apagar a mensagem localmente. Esta ação não pode ser desfeita."
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDeleteMessage}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Apagar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Edit button - only for text messages with external_id */}
          {canEditMessage && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => {
                setEditText(displayContent);
                setIsEditDialogOpen(true);
              }}
              disabled={isEditing}
            >
              {isEditing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
            </Button>
          )}

          {/* Reaction picker - only if has external_id */}
          {message.external_id && instanceId && (
            <WhatsAppReactionPicker
              messageId={message.external_id}
              remoteJid={messageRemoteJid}
              companyId={companyId}
              instanceId={instanceId}
              isOutgoing={isOutgoing}
              currentReaction={message.reaction}
            />
          )}
        </div>
      )}
      
      <div className="relative max-w-[75%]">
        <div
          className={cn(
            "rounded-lg px-3 py-2 shadow-sm overflow-hidden",
            isOutgoing
              ? isFailed 
                ? "bg-destructive/20 text-foreground rounded-br-none border border-destructive/30"
                : "bg-primary text-primary-foreground rounded-br-none"
              : "bg-muted rounded-bl-none",
            // Add bottom margin if there's a reaction to make room for the badge
            message.reaction && "mb-4"
          )}
        >
          {/* Media preview/download area */}
          {isMediaType && (hasMedia || message.external_id) && (
            <div className="mb-2">
              {message.message_type === "image" ? (
                <WhatsAppImageViewer
                  mediaUrl={message.media_url}
                  messageId={message.external_id}
                  supabaseMessageId={message.id}
                  instanceId={instanceId ?? null}
                  isOutgoing={isOutgoing && !isFailed}
                  cachedMediaUrl={message.cached_media_url}
                />
              ) : message.message_type === "audio" ? (
                <WhatsAppAudioPlayer
                  mediaUrl={message.media_url}
                  messageId={message.external_id}
                  supabaseMessageId={message.id}
                  instanceId={instanceId ?? null}
                  isOutgoing={isOutgoing && !isFailed}
                  cachedMediaUrl={message.cached_media_url}
                />
              ) : (
                <Button
                  variant={isOutgoing && !isFailed ? "secondary" : "outline"}
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    getMediaIcon()
                  )}
                  <span className="flex-1 text-left truncate">
                    {isDownloading 
                      ? "Baixando..." 
                      : message.content.startsWith("📎") || message.content.startsWith("[") 
                        ? message.content.replace("📎 ", "").replace(/^\[.*\]$/, getMediaLabel())
                        : message.content.substring(0, 30)}
                  </span>
                  {!isDownloading && <Download className="h-4 w-4 shrink-0" />}
                </Button>
              )}
            </div>
          )}

          {/* Text content - hide if it's just a placeholder for media with download button */}
          {!(isMediaType && hasMedia && (message.content.startsWith("📎") || message.content.startsWith("["))) && (
            <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
          )}

          {/* Media without URL - show content as is */}
          {isMediaType && !hasMedia && (
            <div className="flex items-center gap-2 text-sm opacity-80">
              {getMediaIcon()}
              <span>{message.content}</span>
            </div>
          )}

          <div className={cn(
            "flex items-center justify-end gap-1 mt-1",
            isOutgoing 
              ? isFailed 
                ? "text-destructive" 
                : "text-primary-foreground/70" 
              : "text-muted-foreground"
          )}>
            <span className="text-xs">
              {format(new Date(message.sent_at), "HH:mm")}
            </span>
            {isOutgoing && (
              <MessageStatus status={message.status} />
            )}
          </div>
          {isFailed && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Falha ao enviar
            </p>
          )}
        </div>
        
        {/* Persistent reaction badge - WhatsApp style */}
        {message.reaction && (
          <div 
            className={cn(
              "absolute -bottom-3 bg-background border rounded-full px-1.5 py-0.5 shadow-sm text-sm",
              isOutgoing ? "right-2" : "left-2"
            )}
          >
            {message.reaction}
          </div>
        )}
      </div>
      
      {/* Reaction picker for incoming messages - show on right */}
      {!isOutgoing && companyId && instanceId && message.external_id && (
        <div className="flex items-center ml-1">
          <WhatsAppReactionPicker
            messageId={message.external_id}
            remoteJid={messageRemoteJid}
            companyId={companyId}
            instanceId={instanceId}
            isOutgoing={isOutgoing}
            currentReaction={message.reaction}
          />
        </div>
      )}
    </div>
      
      {/* Edit message dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mensagem</DialogTitle>
            <DialogDescription>
              Edite o texto da mensagem. A alteração será visível para todos os participantes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              ref={editInputRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              placeholder="Digite a nova mensagem..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEditMessage();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditMessage} disabled={isEditing || !editText.trim()}>
              {isEditing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MessageStatus({ status }: { status: string }) {
  switch (status) {
    case "read":
      return <CheckCheck className="h-3.5 w-3.5 text-sky-300" />;
    case "delivered":
      return <CheckCheck className="h-3.5 w-3.5" />;
    case "sent":
      return <Check className="h-3.5 w-3.5" />;
    case "sending":
      return <Clock className="h-3.5 w-3.5 opacity-70" />;
    case "failed":
      return <AlertCircle className="h-3.5 w-3.5" />;
    case "pending":
      return <Check className="h-3.5 w-3.5 opacity-50" />;
    default:
      return null;
  }
}
