import { useState, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { WhatsAppConversationItem } from "./WhatsAppConversationItem";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";

interface WhatsAppConversationListProps {
  conversations: WhatsAppConversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  instanceSelector?: ReactNode;
}

export function WhatsAppConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  instanceSelector,
}: WhatsAppConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.phone.includes(searchQuery) ||
      conv.contact_name?.toLowerCase().includes(searchLower) ||
      conv.last_message_preview?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-full">
      {/* Instance selector */}
      {instanceSelector && (
        <div className="p-3 border-b">
          {instanceSelector}
        </div>
      )}
      
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "Nenhuma conversa encontrada" : "Nenhuma conversa ainda"}
            </p>
            {!searchQuery && (
              <p className="text-xs text-muted-foreground mt-1">
                Novas conversas aparecerão aqui
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <WhatsAppConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                onClick={() => onSelect(conversation.id)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
