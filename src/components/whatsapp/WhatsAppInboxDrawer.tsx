import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCompany } from "@/contexts/CompanyContext";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useWhatsAppConversations } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppInstances } from "@/hooks/useWhatsAppInstances";
import { useWhatsAppRealtime } from "@/hooks/useWhatsAppRealtime";
import { WhatsAppConversationList } from "./WhatsAppConversationList";
import { WhatsAppChatWindow } from "./WhatsAppChatWindow";
import { MessageSquare, Settings, AlertCircle, Phone, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WhatsAppInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppInboxDrawer({ isOpen, onClose }: WhatsAppInboxDrawerProps) {
  const { activeCompany } = useCompany();
  const { config, isLoading: isLoadingConfig } = useWhatsAppConfig(activeCompany?.company_id);
  const { instances, userInstances, isLoading: isLoadingInstances } = useWhatsAppInstances(activeCompany?.company_id);
  
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

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

  const { conversations, isLoading: isLoadingConversations, markAsRead } = useWhatsAppConversations(
    activeCompany?.company_id,
    selectedInstanceId
  );

  // Enable realtime updates
  useWhatsAppRealtime(activeCompany?.company_id);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const selectedInstance = availableInstances.find(i => i.id === selectedInstanceId);
  
  // Check if connected (for UazapiGO, check instance; for Z-API, check config)
  const isUazapi = config?.provider === "uazapi";
  const isConnected = isUazapi 
    ? (selectedInstance?.is_connected || false)
    : config?.is_connected;

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    markAsRead(id);
  };

  const handleInstanceChange = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setSelectedConversationId(null); // Reset selected conversation when changing instance
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <SheetTitle>WhatsApp</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/configuracoes/whatsapp" onClick={onClose}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </SheetHeader>

        {!isConnected && !isUazapi ? (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4 p-4">
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
          <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] gap-4 p-4">
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
          <div className="flex flex-col h-[calc(100vh-65px)]">
            {/* Instance Selector - Only show for UazapiGO with multiple instances */}
            {isUazapi && availableInstances.length > 0 && (
              <div className="px-4 py-2 border-b bg-muted/30">
                <Select value={selectedInstanceId || ""} onValueChange={handleInstanceChange}>
                  <SelectTrigger className="w-full">
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
              {/* Conversation List */}
              <div className="w-1/3 border-r overflow-hidden flex flex-col">
                <WhatsAppConversationList
                  conversations={conversations}
                  isLoading={isLoadingConversations}
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                />
              </div>

              {/* Chat Window */}
              <div className="flex-1 overflow-hidden">
                {selectedConversation ? (
                  <WhatsAppChatWindow
                    conversation={selectedConversation}
                    companyId={activeCompany?.company_id}
                    instanceId={selectedInstanceId}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                    <MessageSquare className="h-16 w-16 opacity-20" />
                    <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
