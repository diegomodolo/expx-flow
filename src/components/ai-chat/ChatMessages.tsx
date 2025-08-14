import React, { useEffect, useRef } from "react";
import { Bot, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

interface ChatMessagesProps {
  messages: Message[];
  loading: boolean;
}

export function ChatMessages({ messages, loading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Function to format message content with basic markdown
  const formatMessage = (content: string) => {
    // Convert **bold** to <strong>
    let formatted = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert bullet points starting with - or *
    formatted = formatted.replace(/^[•\-\*]\s+(.+)$/gm, '• $1');
    
    // Convert numbered lists
    formatted = formatted.replace(/^\d+\.\s+(.+)$/gm, '• $1');
    
    // Convert line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Converse com a IA</h3>
            <p className="text-sm">
              Faça perguntas sobre campanhas, peça sugestões de otimização ou solicite análises de performance.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                </div>
              )}
              
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground ml-12'
                    : 'bg-muted mr-12'
                }`}
              >
                <div
                  className="prose prose-sm max-w-none text-current"
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(message.content)
                  }}
                />
                <div className="text-xs opacity-70 mt-2">
                  {format(new Date(message.created_at), "HH:mm", { locale: ptBR })}
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4 mr-12">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>IA está pensando...</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}