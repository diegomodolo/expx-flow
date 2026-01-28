import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useCompany } from "@/contexts/CompanyContext";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useWhatsAppConversations } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useWhatsAppRealtime } from "@/hooks/useWhatsAppRealtime";
import { useSyncWhatsAppChats } from "@/hooks/useSyncWhatsAppChats";
import { useWhatsAppPanelSizes } from "@/hooks/useWhatsAppPanelSizes";
import { WhatsAppConversationList } from "./WhatsAppConversationList";
import { WhatsAppChatWindow } from "./WhatsAppChatWindow";
import { WhatsAppAIAgentConfigModal } from "./WhatsAppAIAgentConfigModal";
import { WhatsAppQuickReplyManager } from "./WhatsAppQuickReplyManager";
import { MessageSquare, Settings, AlertCircle, Phone, CheckCircle2, XCircle, RefreshCw, Archive, Star, Users, MessageCircle, BellOff, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface WhatsAppInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppInboxDrawer({ isOpen, onClose }: WhatsAppInboxDrawerProps) {
  const { activeCompany } = useCompany();
  const { config, isLoading: isLoadingConfig } = useWhatsAppConfig(activeCompany?.company_id);
  const { instances, userInstances, isLoading: isLoadingInstances } = useWhatsAppInstances(activeCompany?.company_id);
  const navigate = useNavigate();
  
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false);
  const [isQuickReplyManagerOpen, setIsQuickReplyManagerOpen] = useState(false);
  const hasTriggeredSync = useRef(false);
  
  // Panel sizes persistence
  const { sizes, isLoaded: sizesLoaded, setConversationListSize } = useWhatsAppPanelSizes();

  // Hook para sincronização de chats
  const { syncChats, isSyncing } = useSyncWhatsAppChats(activeCompany?.company_id);

  // Determine which instances to show (user's assigned instances, or all if admin)
  const availableInstances = userInstances.length > 0 ? userInstances : instances;

  // Set default instance
  useEffect(() => {
    if (availableInstances.length > 0 && !selectedInstanceId) {
      // Try to find user's default instance
      const defaultInstance = availableInstances.find((i: any) => i.is_default);
      if (defaultInstance) {
        setSelectedInstanceId(defaultInstance.id);
      } else {
        // Use first available instance
        setSelectedInstanceId(availableInstances[0].id);
      }
    }
  }, [availableInstances, selectedInstanceId]);

  // Sincronizar chats quando abrir o modal ou trocar instância
  useEffect(() => {
    if (isOpen && selectedInstanceId && !hasTriggeredSync.current) {
      hasTriggeredSync.current = true;
      syncChats(selectedInstanceId);
    }
    
    // Reset flag quando fechar o modal
    if (!isOpen) {
      hasTriggeredSync.current = false;
    }
  }, [isOpen, selectedInstanceId, syncChats]);

  // Sincronizar quando trocar de instância
  const handleInstanceChange = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setSelectedConversationId(null); // Reset selected conversation when changing instance
    syncChats(instanceId); // Sincronizar chats da nova instância
  };

  const { conversations, isLoading: isLoadingConversations, markAsRead, refetchConversations } = useWhatsAppConversations(
    activeCompany?.company_id,
    selectedInstanceId
  );

  // Enable realtime updates
  useWhatsAppRealtime(activeCompany?.company_id);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const selectedInstance = availableInstances.find(i => i.id === selectedInstanceId);
  
  // Filter conversations based on active filter
  const filteredConversations = conversations.filter(c => {
    switch (activeFilter) {
      case "unread":
        return (c.unread_count || 0) > 0;
      case "favorites":
        // TODO: Implement favorites when field is added
        return false;
      case "groups":
        // TODO: Implement groups detection
        return false;
      case "archived":
        // TODO: Implement archived when field is added
        return false;
      case "muted":
        // TODO: Implement muted when field is added
        return false;
      case "all":
      default:
        return true;
    }
  });
  
  // Check if connected (for UazapiGO, check instance; for Z-API, check config)
  const isUazapi = config?.provider === "uazapi";
  const isConnected = isUazapi 
    ? (selectedInstance?.is_connected || false)
    : config?.is_connected;

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    markAsRead(id);
  };

  const handleChatDeleted = (conversationId: string) => {
    // If the deleted chat is selected, clear selection
    if (selectedConversationId === conversationId) {
      setSelectedConversationId(null);
    }
    // Refresh conversation list
    refetchConversations();
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[90vh] max-h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <DialogTitle>WhatsApp</DialogTitle>
          </div>
        </DialogHeader>

        {!isConnected && !isUazapi ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">WhatsApp não conectado</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Configure sua integração com Z-API ou UazapiGO para usar o chat do WhatsApp
            </p>
            <Button asChild>
              <Link to="/configuracoes/whatsapp" onClick={onClose}>
                Configurar WhatsApp
              </Link>
            </Button>
          </div>
        ) : isUazapi && availableInstances.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 p-4">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Phone className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">Nenhuma instância disponível</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Crie uma instância ou solicite acesso a uma instância existente
            </p>
            <Button asChild>
              <Link to="/configuracoes/whatsapp" onClick={onClose}>
                Configurar Instâncias
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Instance Selector - Only show for UazapiGO with multiple instances */}
            {isUazapi && availableInstances.length > 0 && (
              <div className="px-4 py-2 border-b bg-muted/30 flex-shrink-0">
                <Select value={selectedInstanceId || ""} onValueChange={handleInstanceChange}>
                  <SelectTrigger className="w-full max-w-md">
                    <SelectValue placeholder="Selecione uma instância">
                      {selectedInstance && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{selectedInstance.instance_name}</span>
                          {selectedInstance.connected_phone && (
                            <span className="text-muted-foreground text-xs">
                              ({selectedInstance.connected_phone})
                            </span>
                          )}
                          {selectedInstance.is_connected ? (
                            <CheckCircle2 className="h-3 w-3 text-google-green-500 ml-auto" />
                          ) : (
                            <XCircle className="h-3 w-3 text-google-yellow-500 ml-auto" />
                          )}
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {availableInstances.map((instance) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>{instance.instance_name}</span>
                          {instance.connected_phone && (
                            <span className="text-muted-foreground text-xs">
                              ({instance.connected_phone})
                            </span>
                          )}
                          {instance.is_connected ? (
                            <CheckCircle2 className="h-3 w-3 text-google-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-google-yellow-500" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar with filter icons - WhatsApp Web style */}
              <TooltipProvider delayDuration={300}>
                <div className="w-14 min-w-14 border-r bg-muted/30 flex flex-col items-center py-3 gap-1">
                  <SidebarFilterButton
                    icon={MessageCircle}
                    label="Todas"
                    isActive={activeFilter === "all"}
                    onClick={() => setActiveFilter("all")}
                    count={conversations.length}
                  />
                  <SidebarFilterButton
                    icon={MessageSquare}
                    label="Não lidas"
                    isActive={activeFilter === "unread"}
                    onClick={() => setActiveFilter("unread")}
                    count={conversations.filter(c => (c.unread_count || 0) > 0).length}
                  />
                  <SidebarFilterButton
                    icon={Star}
                    label="Favoritos"
                    isActive={activeFilter === "favorites"}
                    onClick={() => setActiveFilter("favorites")}
                  />
                  <SidebarFilterButton
                    icon={Users}
                    label="Grupos"
                    isActive={activeFilter === "groups"}
                    onClick={() => setActiveFilter("groups")}
                  />
                  
                  <div className="flex-1" />
                  
                  <SidebarFilterButton
                    icon={Archive}
                    label="Arquivados"
                    isActive={activeFilter === "archived"}
                    onClick={() => setActiveFilter("archived")}
                  />
                  <SidebarFilterButton
                    icon={BellOff}
                    label="Silenciados"
                    isActive={activeFilter === "muted"}
                    onClick={() => setActiveFilter("muted")}
                  />
                  
                  <div className="h-px w-8 bg-border my-2" />
                  
                  <SidebarFilterButton
                    icon={Zap}
                    label="Respostas Rápidas"
                    isActive={isQuickReplyManagerOpen}
                    onClick={() => setIsQuickReplyManagerOpen(true)}
                  />
                  
                  <SidebarFilterButton
                    icon={Sparkles}
                    label="Configurar IA"
                    isActive={isAIConfigOpen}
                    onClick={() => setIsAIConfigOpen(true)}
                  />
                  
                  {selectedInstanceId && (
                    <SidebarFilterButton
                      icon={RefreshCw}
                      label="Atualizar conversas"
                      isActive={false}
                      onClick={() => syncChats(selectedInstanceId)}
                      isSyncing={isSyncing}
                    />
                  )}
                  
                  <div className="h-px w-8 bg-border my-2" />
                  
                  <SidebarFilterButton
                    icon={Settings}
                    label="Configurações"
                    isActive={false}
                    onClick={() => {
                      onClose();
                      navigate("/configuracoes/whatsapp");
                    }}
                  />
                </div>
              </TooltipProvider>

              {/* Quick Reply Manager Modal */}
              <WhatsAppQuickReplyManager
                instanceId={selectedInstanceId}
                open={isQuickReplyManagerOpen}
                onOpenChange={setIsQuickReplyManagerOpen}
              />

              {/* AI Config Modal */}
              <WhatsAppAIAgentConfigModal
                isOpen={isAIConfigOpen}
                onClose={() => setIsAIConfigOpen(false)}
                companyId={activeCompany?.company_id}
                instanceId={selectedInstanceId}
              />

              {/* Resizable panels for conversation list and chat */}
              <ResizablePanelGroup 
                direction="horizontal" 
                className="flex-1"
                onLayout={(sizes) => {
                  if (sizes[0]) {
                    setConversationListSize(sizes[0]);
                  }
                }}
              >
                {/* Conversation List Panel */}
                <ResizablePanel 
                  defaultSize={sizesLoaded ? sizes.conversationList : 25} 
                  minSize={15} 
                  maxSize={40}
                  className="border-r"
                >
                  <WhatsAppConversationList
                    conversations={filteredConversations}
                    isLoading={isLoadingConversations}
                    selectedId={selectedConversationId}
                    onSelect={handleSelectConversation}
                  />
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Chat Window Panel */}
                <ResizablePanel defaultSize={sizesLoaded ? sizes.chatWindow : 75} minSize={40}>
                  {selectedConversation ? (
                    <WhatsAppChatWindow
                      conversation={selectedConversation}
                      companyId={activeCompany?.company_id}
                      instanceId={selectedInstanceId}
                      onChatDeleted={handleChatDeleted}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                      <MessageSquare className="h-16 w-16 opacity-20" />
                      <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
                    </div>
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Sidebar filter button component
interface SidebarFilterButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  count?: number;
  isSyncing?: boolean;
}

function SidebarFilterButton({ icon: Icon, label, isActive, onClick, count, isSyncing }: SidebarFilterButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={isSyncing}
          className={cn(
            "relative w-10 h-10 rounded-full flex items-center justify-center transition-colors",
            isActive 
              ? "bg-primary text-primary-foreground" 
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            isSyncing && "opacity-70 cursor-not-allowed"
          )}
        >
          <Icon className={cn("h-5 w-5", isSyncing && "animate-spin")} />
          {count !== undefined && count > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full text-[10px] font-medium flex items-center justify-center px-1",
              isActive 
                ? "bg-background text-foreground" 
                : "bg-primary text-primary-foreground"
            )}>
              {count > 99 ? "99+" : count}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
