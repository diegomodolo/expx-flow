import React, { useEffect, useRef } from "react";
import { Bot, User, Loader2, Users, Wrench, CheckCircle2, XCircle, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { SquadChatMessage } from "@/hooks/useSquadChat";

interface SquadChatMessagesProps {
  messages: SquadChatMessage[];
  loading: boolean;
}

const roleLabels: Record<string, string> = {
  leader: "Líder",
  lider: "Líder",
  manager: "Gerente",
  gerente: "Gerente",
  executor: "Executor",
};

const roleColors: Record<string, string> = {
  leader: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  lider: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  manager: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  gerente: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  executor: "bg-green-500/15 text-green-600 border-green-500/30",
};

export function SquadChatMessages({ messages, loading }: SquadChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const formatMessage = (content: string) => {
    let formatted = content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, "• $1");
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, "• $1");
    formatted = formatted.replace(/\n/g, "<br>");
    return formatted;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <div className="text-center">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <h3 className="text-sm font-medium mb-1">Testar a Squad</h3>
              <p className="text-xs">
                Envie uma mensagem e veja os agentes colaborando em tempo real.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              // Tool call message — special compact style
              if (message.role === "tool_call") {
                return (
                  <div key={message.id} className="flex gap-3 justify-start">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <Wrench className="w-4 h-4 text-purple-500" />
                      </div>
                    </div>
                    <div className="max-w-[85%] rounded-lg p-2.5 bg-purple-500/10 border border-purple-500/20 mr-4">
                      <div className="flex items-center gap-2">
                        {message.success ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                          {message.agent_name}
                        </span>
                        <span className="text-xs text-muted-foreground">executou</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
                          {message.skill_name}
                        </Badge>
                      </div>
                      {message.image_url && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <ImageIcon className="w-3 h-3" />
                          <span>Imagem gerada com sucesso</span>
                        </div>
                      )}
                      <div className="text-[10px] opacity-60 mt-1">
                        {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              }

              // Thinking message — handled separately below
              if (message.isThinking) return null;

              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "agent" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-12"
                        : "bg-muted mr-4"
                    }`}
                  >
                    {message.role === "agent" && message.agent_name && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold">
                          {message.agent_name}
                        </span>
                        {message.agent_role && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 h-4 ${
                              roleColors[message.agent_role] || "bg-muted text-muted-foreground"
                            }`}
                          >
                            {roleLabels[message.agent_role] || message.agent_role}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div
                      className="prose prose-sm max-w-none text-current text-sm"
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(message.content),
                      }}
                    />
                    <div className="text-[10px] opacity-60 mt-1.5">
                      {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Thinking messages */}
            {messages.filter(m => m.isThinking).map((thinkingMsg) => (
              <div key={thinkingMsg.id} className="flex gap-3 justify-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{thinkingMsg.agent_name}</span>
                    {thinkingMsg.agent_role && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 h-4 ${
                          roleColors[thinkingMsg.agent_role] || "bg-muted text-muted-foreground"
                        }`}
                      >
                        {roleLabels[thinkingMsg.agent_role] || thinkingMsg.agent_role}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
