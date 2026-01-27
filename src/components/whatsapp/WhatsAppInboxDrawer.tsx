import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCompany } from "@/contexts/CompanyContext";
import { useWhatsAppConfig } from "@/hooks/useWhatsAppConfig";
import { useWhatsAppConversations } from "@/hooks/useWhatsAppConversations";
import { useWhatsAppRealtime } from "@/hooks/useWhatsAppRealtime";
import { WhatsAppConversationList } from "./WhatsAppConversationList";
import { WhatsAppChatWindow } from "./WhatsAppChatWindow";
import { MessageSquare, Settings, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface WhatsAppInboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WhatsAppInboxDrawer({ isOpen, onClose }: WhatsAppInboxDrawerProps) {
  const { activeCompany } = useCompany();
  const { config, isLoading: isLoadingConfig } = useWhatsAppConfig(activeCompany?.company_id);
  const { conversations, isLoading: isLoadingConversations, markAsRead } = useWhatsAppConversations(activeCompany?.company_id);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Enable realtime updates
  useWhatsAppRealtime(activeCompany?.company_id);

  const selectedConversation = conversations.find(c => c.id === selectedConversationId);
  const isConnected = config?.is_connected;

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    markAsRead(id);
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

        {!isConnected ? (
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
        ) : (
          <div className="flex h-[calc(100vh-65px)]">
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
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
                  <MessageSquare className="h-16 w-16 opacity-20" />
                  <p className="text-sm">Selecione uma conversa para ver as mensagens</p>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
