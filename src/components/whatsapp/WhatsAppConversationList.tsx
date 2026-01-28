import { useState, ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search } from "lucide-react";
import { WhatsAppConversationItem } from "./WhatsAppConversationItem";
import { WhatsAppConversation } from "@/hooks/useWhatsAppConversations";
import { WhatsAppAssignmentFilters, AssignmentFilter } from "./WhatsAppAssignmentFilters";
import { WhatsAppAssignment } from "@/hooks/useWhatsAppAssignments";

interface WhatsAppConversationListProps {
  conversations: WhatsAppConversation[];
  isLoading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  instanceSelector?: ReactNode;
  assignments?: WhatsAppAssignment[];
  currentUserId?: string;
  currentUserTeamId?: string;
}

export function WhatsAppConversationList({
  conversations,
  isLoading,
  selectedId,
  onSelect,
  instanceSelector,
  assignments = [],
  currentUserId,
  currentUserTeamId,
}: WhatsAppConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");

  // Create a map for quick assignment lookup
  const assignmentMap = new Map(assignments.map(a => [a.conversation_id, a]));

  // Filter by search query
  const searchFilteredConversations = conversations.filter((conv) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      conv.phone.includes(searchQuery) ||
      conv.contact_name?.toLowerCase().includes(searchLower) ||
      conv.last_message_preview?.toLowerCase().includes(searchLower)
    );
  });

  // Filter by assignment
  const filteredConversations = searchFilteredConversations.filter((conv) => {
    const assignment = assignmentMap.get(conv.id);

    switch (assignmentFilter) {
      case "mine":
        return assignment?.assigned_to_user_id === currentUserId;
      case "my-squad":
        // "Meu Squad" here means: conversations linked to clients that belong to the squad
        // where the logged-in user is the WhatsApp responsible (teams.id === clients.team_id)
        return !!conv.client_id && !!currentUserTeamId && conv.client_team_id === currentUserTeamId;
      case "unassigned":
        return !assignment;
      case "no-squad":
        // "Sem Squad" means: conversations without a linked client, OR with a client that has no squad
        return !conv.client_id || !conv.client_team_id;
      case "all":
      default:
        return true;
    }
  });

  // Calculate counts for filters
  const myConversationsCount = searchFilteredConversations.filter(
    c => assignmentMap.get(c.id)?.assigned_to_user_id === currentUserId
  ).length;
  
  const mySquadConversationsCount = currentUserTeamId
    ? searchFilteredConversations.filter(
        c => !!c.client_id && c.client_team_id === currentUserTeamId
      ).length
    : 0;
  
  const unassignedCount = searchFilteredConversations.filter(
    c => !assignmentMap.get(c.id)
  ).length;

  const noSquadCount = searchFilteredConversations.filter(
    c => !c.client_id || !c.client_team_id
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Instance selector */}
      {instanceSelector && (
        <div className="p-3 border-b">
          {instanceSelector}
        </div>
      )}

      {/* Assignment filters */}
      <WhatsAppAssignmentFilters
        activeFilter={assignmentFilter}
        onFilterChange={setAssignmentFilter}
        myConversationsCount={myConversationsCount}
        mySquadConversationsCount={mySquadConversationsCount}
        unassignedCount={unassignedCount}
        noSquadCount={noSquadCount}
      />
      
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
                assignment={assignmentMap.get(conversation.id) || null}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
