import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppMessages, MediaAttachment } from "@/hooks/useWhatsAppMessages";
import { WhatsAppMessageBubble } from "./WhatsAppMessageBubble";
import { WhatsAppMessageInput } from "./WhatsAppMessageInput";
import { WhatsAppMessagesLoading } from "./WhatsAppMessagesLoading";
import { WhatsAppLabelPicker } from "./WhatsAppLabelPicker";
import { WhatsAppLabelList } from "./WhatsAppLabelBadge";
import { WhatsAppAIAssistant } from "./WhatsAppAIAssistant";
import { WhatsAppAISendDialog } from "./WhatsAppAISendDialog";
import { WhatsAppClientLinker } from "./WhatsAppClientLinker";
import { WhatsAppAssignmentPicker } from "./WhatsAppAssignmentPicker";
import { useWhatsAppLabels } from "@/hooks/useWhatsAppLabels";
import { useWhatsAppQuickReplies } from "@/hooks/useWhatsAppQuickReplies";
import { useWhatsAppPanelSizes } from "@/hooks/useWhatsAppPanelSizes";
import { useWhatsAppAIAgentConfig } from "@/hooks/useWhatsAppAIAgentConfig";
import { useConversationAssignment } from "@/hooks/useWhatsAppAssignments";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Phone, RefreshCw, Trash2, MoreVertical, Loader2, CheckCheck, Sparkles, Archive, ArchiveRestore, Circle, CircleDot, BellOff, Bell, Pin, PinOff, Ban, Building2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQueryClient } from "@tanstack/react-query";

interface WhatsAppChatWindowProps {
  conversation: WhatsAppConversation;
  companyId: string | undefined;
  instanceId?: string | null;
  onChatDeleted?: (conversationId: string) => void;
  onChatArchived?: (conversationId: string, archived: boolean) => void;
  onNavigateAway?: () => void; // Called when navigating away (e.g., to client page)
}

export function WhatsAppChatWindow({ conversation, companyId, instanceId, onChatDeleted, onChatArchived, onNavigateAway }: WhatsAppChatWindowProps) {
  const navigate = useNavigate();
  const { messages, isLoading, isFetchingFromApi, isSyncingInBackground, isSendingMedia, sendMessage, sendMedia, fetchMessagesFromApi } = useWhatsAppMessages(
    conversation.id,
    companyId
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [deleteFromWhatsApp, setDeleteFromWhatsApp] = useState(true);
  const [deleteLocal, setDeleteLocal] = useState(true);
  const [chatLabelIds, setChatLabelIds] = useState<string[]>(conversation.label_ids || []);
  const [showProfilePic, setShowProfilePic] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [isTogglingRead, setIsTogglingRead] = useState(false);
  const [isMuting, setIsMuting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(conversation.client_id || null);
  const [linkedClientName, setLinkedClientName] = useState<string | null>(conversation.client_name || null);
  const [linkedClientLogo, setLinkedClientLogo] = useState<string | null>(conversation.client_logo_url || null);

  // Update linked client state when conversation changes
  useEffect(() => {
    setLinkedClientId(conversation.client_id || null);
    setLinkedClientName(conversation.client_name || null);
    setLinkedClientLogo(conversation.client_logo_url || null);
  }, [conversation.id, conversation.client_id, conversation.client_name, conversation.client_logo_url]);
  
  // AI Assistant state
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiSelectedMessage, setAiSelectedMessage] = useState("");
  const [aiSendDialogOpen, setAiSendDialogOpen] = useState(false);
  const [aiSuggestedResponse, setAiSuggestedResponse] = useState("");
  const [isSendingAiResponse, setIsSendingAiResponse] = useState(false);
  
  const { labels } = useWhatsAppLabels(companyId, instanceId ?? null);
  const { quickReplies, isLoading: quickRepliesLoading } = useWhatsAppQuickReplies(instanceId ?? null);
  const { sizes, setAiAssistantSize } = useWhatsAppPanelSizes();
  const { config: aiAgentConfig } = useWhatsAppAIAgentConfig(companyId, instanceId);
  const { assignment: currentAssignment } = useConversationAssignment(conversation.id, companyId);
  const queryClient = useQueryClient();

  // Check if realtime analysis is forced globally
  const forceRealtimeAnalysis = aiAgentConfig?.force_realtime_analysis ?? false;
  
  // If forced, keep AI assistant always open
  const isAiAssistantVisible = forceRealtimeAnalysis || aiAssistantOpen;

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

  const handleArchiveChat = async () => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível arquivar o chat");
      return;
    }

    setIsArchiving(true);
    const newArchiveState = !conversation.is_archived;

    try {
      const { data, error } = await supabase.functions.invoke("archive-whatsapp-chat", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone: conversation.phone,
          conversation_id: conversation.id,
          archive: newArchiveState,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(newArchiveState ? "Chat arquivado" : "Chat desarquivado");
        onChatArchived?.(conversation.id, newArchiveState);
      } else {
        throw new Error(data?.error || "Erro ao arquivar chat");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Archive chat error:", err);
      toast.error(err.message || "Erro ao arquivar chat");
    } finally {
      setIsArchiving(false);
    }
  };

  const handleToggleChatRead = async () => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível alterar status de leitura");
      return;
    }

    setIsTogglingRead(true);
    const newReadState = conversation.unread_count > 0; // If has unread, mark as read; otherwise mark as unread

    try {
      const { data, error } = await supabase.functions.invoke("toggle-whatsapp-chat-read", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          conversation_id: conversation.id,
          phone: conversation.phone,
          read: newReadState,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(newReadState ? "Chat marcado como lido" : "Chat marcado como não lido");
      } else {
        throw new Error(data?.error || "Erro ao alterar status");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Toggle read error:", err);
      toast.error(err.message || "Erro ao alterar status de leitura");
    } finally {
      setIsTogglingRead(false);
    }
  };

  const handleMuteChat = async (muteEndTime: number) => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível silenciar o chat");
      return;
    }

    setIsMuting(true);

    try {
      const { data, error } = await supabase.functions.invoke("mute-whatsapp-chat", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone: conversation.phone,
          mute_end_time: muteEndTime,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message);
      } else {
        throw new Error(data?.error || "Erro ao silenciar chat");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Mute chat error:", err);
      toast.error(err.message || "Erro ao silenciar chat");
    } finally {
      setIsMuting(false);
    }
  };

  const handlePinChat = async () => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível fixar o chat");
      return;
    }

    setIsPinning(true);
    const newPinStatus = !conversation.is_pinned;

    try {
      const { data, error } = await supabase.functions.invoke("pin-whatsapp-chat", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone: conversation.phone,
          pin: newPinStatus,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message);
      } else {
        throw new Error(data?.error || "Erro ao fixar chat");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Pin chat error:", err);
      toast.error(err.message || "Erro ao fixar chat");
    } finally {
      setIsPinning(false);
    }
  };

  const handleBlockContact = async () => {
    if (!companyId || !instanceId) {
      toast.error("Não foi possível bloquear o contato");
      return;
    }

    setIsBlocking(true);

    try {
      const { data, error } = await supabase.functions.invoke("block-whatsapp-contact", {
        body: {
          company_id: companyId,
          instance_id: instanceId,
          phone: conversation.phone,
          block: true,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(data.message);
      } else {
        throw new Error(data?.error || "Erro ao bloquear contato");
      }
    } catch (err: any) {
      console.error("[WhatsAppChatWindow] Block contact error:", err);
      toast.error(err.message || "Erro ao bloquear contato");
    } finally {
      setIsBlocking(false);
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

  const handleNavigateToClient = () => {
    if (linkedClientId) {
      onNavigateAway?.(); // Close the drawer first
      navigate(`/clientes/${linkedClientId}`);
    }
  };

  return (
    <ResizablePanelGroup 
      direction="horizontal" 
      className="h-full"
      onLayout={(panelSizes) => {
        // When AI assistant is open, save the AI panel size (second panel)
        if (aiAssistantOpen && panelSizes[1]) {
          setAiAssistantSize(panelSizes[1]);
        }
      }}
    >
      {/* Main chat area */}
      <ResizablePanel defaultSize={aiAssistantOpen ? (100 - sizes.aiAssistant) : 100} minSize={50}>
        <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-muted/30">
        <div className="relative shrink-0">
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
          
          {/* Client logo overlay - clickable to navigate to client */}
          {linkedClientId && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  onClick={handleNavigateToClient}
                  className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-background bg-background overflow-hidden shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  {linkedClientLogo ? (
                    <img 
                      src={linkedClientLogo} 
                      alt={linkedClientName || "Cliente"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-3 w-3 text-primary" />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <span>Abrir cadastro: {linkedClientName}</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
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
            {/* Background sync indicator */}
            {isSyncingInBackground && (
              <span className="ml-2 flex items-center gap-1 text-primary/70">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="text-[10px]">Sincronizando...</span>
              </span>
            )}
          </p>
        </div>
        
        {/* Client linker */}
        <WhatsAppClientLinker
          conversationId={conversation.id}
          currentClientId={conversation.client_id}
          companyId={companyId}
          onClientChange={(clientId, clientName, clientLogoUrl) => {
            setLinkedClientId(clientId);
            setLinkedClientName(clientName);
            setLinkedClientLogo(clientLogoUrl || null);
          }}
        />
        
        {/* Assignment picker */}
        <WhatsAppAssignmentPicker
          conversationId={conversation.id}
          companyId={companyId}
          currentAssignment={currentAssignment || null}
          onAssignmentChange={() => {
            queryClient.invalidateQueries({ queryKey: ["whatsapp-assignments", companyId] });
            queryClient.invalidateQueries({ queryKey: ["whatsapp-assignment", conversation.id] });
          }}
        />
        
        {/* Label picker */}
        <WhatsAppLabelPicker
          phone={conversation.phone}
          currentLabelIds={chatLabelIds}
          companyId={companyId}
          instanceId={instanceId ?? null}
          onLabelsChange={setChatLabelIds}
        />
        
        {/* Open client button - only shows when a client is linked */}
        {linkedClientId && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNavigateToClient}
                title="Abrir cadastro do cliente"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir cadastro: {linkedClientName}</TooltipContent>
          </Tooltip>
        )}
        
        {/* AI Assistant button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={aiAssistantOpen ? "secondary" : "ghost"}
              size="icon"
              onClick={() => setAiAssistantOpen(!aiAssistantOpen)}
              title="Assistente IA"
            >
              <Sparkles className={cn("h-4 w-4", aiAssistantOpen && "text-primary")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Assistente IA</TooltipContent>
        </Tooltip>
        
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
            <DropdownMenuItem 
              onClick={handleToggleChatRead}
              disabled={isTogglingRead}
            >
              {isTogglingRead ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : conversation.unread_count > 0 ? (
                <Circle className="h-4 w-4 mr-2" />
              ) : (
                <CircleDot className="h-4 w-4 mr-2" />
              )}
              {conversation.unread_count > 0 ? "Marcar como lido" : "Marcar como não lido"}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleArchiveChat}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : conversation.is_archived ? (
                <ArchiveRestore className="h-4 w-4 mr-2" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              {conversation.is_archived ? "Desarquivar chat" : "Arquivar chat"}
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handlePinChat}
              disabled={isPinning}
            >
              {isPinning ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : conversation.is_pinned ? (
                <PinOff className="h-4 w-4 mr-2" />
              ) : (
                <Pin className="h-4 w-4 mr-2" />
              )}
              {conversation.is_pinned ? "Desafixar chat" : "Fixar no topo"}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={isMuting}>
                {isMuting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BellOff className="h-4 w-4 mr-2" />
                )}
                Silenciar notificações
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => handleMuteChat(8)}>
                  Por 8 horas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMuteChat(168)}>
                  Por 1 semana
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMuteChat(-1)}>
                  Permanentemente
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleMuteChat(0)}>
                  <Bell className="h-4 w-4 mr-2" />
                  Remover silenciamento
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleBlockContact}
              disabled={isBlocking}
              className="text-destructive focus:text-destructive"
            >
              {isBlocking ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Bloquear contato
            </DropdownMenuItem>
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
      </ResizablePanel>

      {/* AI Assistant Panel - show when open or forced */}
      {isAiAssistantVisible && (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={sizes.aiAssistant} minSize={20} maxSize={50}>
            <WhatsAppAIAssistant
              isOpen={isAiAssistantVisible}
              onClose={() => setAiAssistantOpen(false)}
              conversationId={conversation.id}
              companyId={companyId}
              instanceId={instanceId}
              customerMessage={aiSelectedMessage}
              contactName={displayName}
              onUseResponse={handleUseAIResponse}
              forceRealtimeAnalysis={forceRealtimeAnalysis}
              conversationMessages={messages.map((m) => ({
                id: m.id,
                content: m.content || "",
                direction: m.direction === "incoming" ? "inbound" : "outbound",
                created_at: m.sent_at,
                message_type: m.message_type,
                audio_transcription: m.audio_transcription,
                transcription_status: m.transcription_status,
              }))}
            />
          </ResizablePanel>
        </>
      )}

      {/* AI Send Dialog */}
      <WhatsAppAISendDialog
        isOpen={aiSendDialogOpen}
        onClose={() => setAiSendDialogOpen(false)}
        initialMessage={aiSuggestedResponse}
        onSend={handleSendAIResponse}
        isSending={isSendingAiResponse}
      />
    </ResizablePanelGroup>
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
