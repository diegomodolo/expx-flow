import { useRef, useEffect, useState } from "react";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages, MediaAttachment } from "@/hooks/useWhatsAppMessages";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";
import { WhatsAppMessageInput } from "./WhatsAppMessageInput";
import { WhatsAppMessagesLoading } from "./WhatsAppMessagesLoading";
import { WhatsAppLabelPicker } from "./WhatsAppLabelPicker";
import { WhatsAppLabelList } from "./WhatsAppLabelBadge";
import { WhatsAppQuickReplyManager } from "./WhatsAppQuickReplyManager";
import { WhatsAppAIAssistant } from "./WhatsAppAIAssistant";
import { WhatsAppAISendDialog } from "./WhatsAppAISendDialog";
import { useWhatsAppLabels } from "@/hooks/useWhatsAppLabels";
import { useWhatsAppQuickReplies } from "@/hooks/useWhatsAppQuickReplies";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Phone, RefreshCw, Trash2, MoreVertical, Loader2, Zap, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface WhatsAppChatWindowProps {
  conversation: WhatsAppConversation;
  companyId: string | undefined;
  instanceId?: string | null;
  onChatDeleted?: (conversationId: string) => void;
}

export function WhatsAppChatWindow({ conversation, companyId, instanceId, onChatDeleted }: WhatsAppChatWindowProps) {
  const { messages, isLoading, isFetchingFromApi, isSendingMedia, sendMessage, sendMedia, fetchMessagesFromApi } = useWhatsAppMessages(
    conversation.id,
    companyId
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteFromWhatsApp, setDeleteFromWhatsApp] = useState(true);
  const [deleteLocal, setDeleteLocal] = useState(true);
  const [chatLabelIds, setChatLabelIds] = useState<string[]>(conversation.label_ids || []);
  const [showProfilePic, setShowProfilePic] = useState(false);
  const [quickReplyManagerOpen, setQuickReplyManagerOpen] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  
  // AI Assistant state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiSelectedMessage, setAiSelectedMessage] = useState("");
  const [aiSendDialogOpen, setAiSendDialogOpen] = useState(false);
  const [aiSuggestedResponse, setAiSuggestedResponse] = useState("");
  const [isSendingAiResponse, setIsSendingAiResponse] = useState(false);
  
  const { labels } = useWhatsAppLabels(companyId, instanceId ?? null);
  const { quickReplies, isLoading: quickRepliesLoading } = useWhatsAppQuickReplies(instanceId ?? null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const displayName = conversation.contact_name || formatPhoneNumber(conversation.phone);

  const handleSend = (message: string) => {
    sendMessage({ phone: conversation.phone, message, instanceId: instanceId ?? null });
  };

  const handleSendMedia = (media: MediaAttachment, caption: string) => {
    sendMedia({ phone: conversation.phone, media, caption, instanceId: instanceId ?? null });
  };

  const handleDeleteChat = async () => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível deletar o chat");
      return;
    }

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke("delete-whatsapp-chat", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone: conversation.phone,
          conversation_id: conversation.id,
          delete_chat_whatsapp: deleteFromWhatsApp,
          delete_local: deleteLocal,
          delete_chat_db: false,
          delete_messages_db: false,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Chat deletado com sucesso");
        setIsDeleteDialogOpen(false);
        onChatDeleted?.(conversation.id);
      } else {
        throw new Error(data?.error || "Erro ao deletar chat");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Delete chat error:", err);
      toast.error(err.message || "Erro ao deletar chat");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível marcar como lida");
      return;
    }

    setIsMarkingRead(true);

    try {
      const { data, error } = await supabase.functions.invoke("mark-whatsapp-read", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          conversation_id: conversation.id,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`${data.marked || 0} mensagens marcadas como lidas`);
      } else {
        throw new Error(data?.error || "Erro ao marcar mensagens");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Mark read error:", err);
      toast.error(err.message || "Erro ao marcar como lida");
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleOpenAIAssistant = (messageContent: string) => {
    setAiSelectedMessage(messageContent);
    setAiAssistantOpen(true);
  };

  const handleUseAIResponse = (response: string) => {
    setAiSuggestedResponse(response);
    setAiSendDialogOpen(true);
  };

  const handleSendAIResponse = async (message: string) => {
    setIsSendingAiResponse(true);
    try {
      await sendMessage({ phone: conversation.phone, message, instanceId: instanceId ?? null });
      setAiSendDialogOpen(false);
      setAiAssistantOpen(false);
      setAiSuggestedResponse("");
      toast.success("Mensagem enviada!");
    } catch (error) {
      console.error("Error sending AI response:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsSendingAiResponse(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 h-full min-w-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <Avatar 
          className={cn(
            "h-10 w-10",
            conversation.profile_pic_url && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
          )}
          onClick={() => conversation.profile_pic_url && setShowProfilePic(true)}
        >
          {conversation.profile_pic_url && (
            <AvatarImage 
              src={conversation.profile_pic_url} 
              alt={displayName}
              className="object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{displayName}</h3>
            {/* Label badges */}
            {chatLabelIds.length > 0 && (
              <WhatsAppLabelList 
                labels={labels.filter(l => chatLabelIds.includes(l.id))} 
                maxVisible={2}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {formatPhoneNumber(conversation.phone)}
          </p>
        </div>
        
        {/* Label picker */}
        <WhatsAppLabelPicker
          phone={conversation.phone}
          currentLabelIds={chatLabelIds}
          companyId={companyId}
          instanceId={instanceId ?? null}
          onLabelsChange={setChatLabelIds}
        />
        
        {/* Refresh messages button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchMessagesFromApi(true)}
          disabled={isFetchingFromApi}
          title="Atualizar mensagens"
        >
          <RefreshCw className={`h-4 w-4 ${isFetchingFromApi ? 'animate-spin' : ''}`} />
        </Button>

        {/* More options menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setQuickReplyManagerOpen(true)}>
              <Zap className="h-4 w-4 mr-2" />
              Respostas rápidas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => fetchMessagesFromApi(true)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar mensagens
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleMarkAllRead}
              disabled={isMarkingRead}
            >
              {isMarkingRead ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCheck className="h-4 w-4 mr-2" />
              )}
              Marcar tudo como lido
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => setIsDeleteDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Deletar chat
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Delete chat dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Escolha como deseja deletar este chat com {displayName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="delete-whatsapp" 
                checked={deleteFromWhatsApp}
                onCheckedChange={(checked) => setDeleteFromWhatsApp(checked === true)}
              />
              <Label htmlFor="delete-whatsapp" className="text-sm">
                Deletar do WhatsApp
                <span className="block text-xs text-muted-foreground">
                  Remove o chat do seu WhatsApp
                </span>
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="delete-local" 
                checked={deleteLocal}
                onCheckedChange={(checked) => setDeleteLocal(checked === true)}
              />
              <Label htmlFor="delete-local" className="text-sm">
                Deletar do sistema
                <span className="block text-xs text-muted-foreground">
                  Remove o chat e mensagens deste painel
                </span>
              </Label>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteChat}
              disabled={isDeleting || (!deleteFromWhatsApp && !deleteLocal)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                "Deletar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Profile picture modal */}
      <Dialog open={showProfilePic} onOpenChange={setShowProfilePic}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-transparent border-none">
          <div className="flex flex-col items-center gap-4 p-4">
            {conversation.profile_pic_url && (
              <img
                src={conversation.profile_pic_url}
                alt={displayName}
                className="w-72 h-72 rounded-full object-cover shadow-2xl"
              />
            )}
            <span className="text-lg font-semibold text-white drop-shadow-lg">
              {displayName}
            </span>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick reply manager dialog */}
      <WhatsAppQuickReplyManager 
        instanceId={instanceId ?? null}
        open={quickReplyManagerOpen}
        onOpenChange={setQuickReplyManagerOpen}
      />

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        {isLoading ? (
          <WhatsAppMessagesLoading />
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              Envie uma mensagem para iniciar a conversa
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMessagesFromApi(true)}
              disabled={isFetchingFromApi}
              className="mt-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetchingFromApi ? 'animate-spin' : ''}`} />
              Buscar mensagens anteriores
            </Button>
          </div>
        ) : (
          <div className="py-4 space-y-2">
            {messages.map((message) => (
              <WhatsAppMessageBubble 
                key={message.id} 
                message={message} 
                instanceId={instanceId ?? null}
                companyId={companyId}
                remoteJid={`${conversation.phone}@s.whatsapp.net`}
                onOpenAIAssistant={handleOpenAIAssistant}
              />
            ))}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <WhatsAppMessageInput 
        onSend={handleSend} 
        onSendMedia={handleSendMedia}
        isSending={isSendingMedia}
        quickReplies={quickReplies}
        quickRepliesLoading={quickRepliesLoading}
      />
      </div>

      {/* AI Assistant Panel */}
      <WhatsAppAIAssistant
        isOpen={aiAssistantOpen}
        onClose={() => setAiAssistantOpen(false)}
        customerMessage={aiSelectedMessage}
        contactName={displayName}
        onUseResponse={handleUseAIResponse}
      />

      {/* AI Send Dialog */}
      <WhatsAppAISendDialog
        isOpen={aiSendDialogOpen}
        onClose={() => setAiSendDialogOpen(false)}
        initialMessage={aiSuggestedResponse}
        onSend={handleSendAIResponse}
        isSending={isSendingAiResponse}
      />
    </div>
  );
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/^55/, "");
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

function getInitials(name: string): string {
  if (/^\d+$/.test(name.replace(/[\s\-\(\)]/g, ""))) {
    const digits = name.replace(/\D/g, "");
    return digits.slice(-2);
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}
