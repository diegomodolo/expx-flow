import React from "react";
import { Plus, Trash2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

interface AgentConversationsSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onConversationSelect: (conversationId: string) => void;
  onConversationDelete: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function AgentConversationsSidebar({
  conversations,
  currentConversation,
  onConversationSelect,
  onConversationDelete,
  onNewConversation
}: AgentConversationsSidebarProps) {
  return (
    <div className="w-80 border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button onClick={onNewConversation} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      {/* Lista de Conversas */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma conversa ainda
              </p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversation?.id === conversation.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{conversation.title}</p>
                    <p className={`text-xs mt-1 ${
                      currentConversation?.id === conversation.id
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}>
                      {format(new Date(conversation.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Todas as mensagens desta conversa serão perdidas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.stopPropagation();
                            onConversationDelete(conversation.id);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
