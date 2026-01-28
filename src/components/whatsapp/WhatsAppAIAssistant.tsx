import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Loader2, Sparkles, Copy, Check, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface WhatsAppAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  customerMessage: string;
  contactName: string;
  onUseResponse: (response: string) => void;
}

export function WhatsAppAIAssistant({
  isOpen,
  onClose,
  customerMessage,
  contactName,
  onUseResponse,
}: WhatsAppAIAssistantProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInitialized = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Generate initial suggestion when opened with a new message
  useEffect(() => {
    if (isOpen && customerMessage && !hasInitialized.current) {
      hasInitialized.current = true;
      generateInitialSuggestion();
    }
    
    // Reset when closed
    if (!isOpen) {
      hasInitialized.current = false;
      setMessages([]);
      setInput("");
    }
  }, [isOpen, customerMessage]);

  const generateInitialSuggestion = async () => {
    setIsLoading(true);
    
    const systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp. 
O cliente "${contactName}" enviou a seguinte mensagem:

"${customerMessage}"

Sugira uma resposta profissional, cordial e objetiva para essa mensagem.
Mantenha o tom conversacional adequado para WhatsApp (não muito formal, mas profissional).
Não use saudações como "Olá" no início, pois a conversa já está em andamento.
Responda diretamente ao que o cliente perguntou ou comentou.`;

    try {
      const response = await supabase.functions.invoke("whatsapp-ai-assistant", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Gere uma sugestão de resposta para essa mensagem do cliente." }
          ],
        },
      });

      if (response.error) throw response.error;

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data?.content || "Não foi possível gerar uma sugestão.",
      };

      setMessages([assistantMessage]);
    } catch (error) {
      console.error("Error generating suggestion:", error);
      toast.error("Erro ao gerar sugestão");
      
      setMessages([{
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Desculpe, não consegui gerar uma sugestão no momento. Por favor, tente novamente.",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build conversation history for context
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp.
Contexto: O cliente "${contactName}" enviou: "${customerMessage}"

Você está ajudando o atendente a formular respostas para o cliente.
Mantenha o tom conversacional adequado para WhatsApp.
Siga as instruções do atendente para ajustar a resposta.`;

      const response = await supabase.functions.invoke("whatsapp-ai-assistant", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: userMessage.content },
          ],
        },
      });

      if (response.error) throw response.error;

      const assistantMessage: AIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.data?.content || "Não foi possível processar sua solicitação.",
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao processar mensagem");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleUseResponse = (text: string) => {
    onUseResponse(text);
  };

  if (!isOpen) return null;

  return (
    <div className="w-80 min-w-80 border-l bg-background flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Assistente IA</h3>
            <p className="text-xs text-muted-foreground">Sugestões de resposta</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Customer message context */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground mb-1">Mensagem do cliente:</p>
        <p className="text-sm bg-muted rounded-lg px-3 py-2 line-clamp-3">
          {customerMessage}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              <div
                className={cn(
                  "rounded-lg px-3 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground ml-8"
                    : "bg-muted mr-4"
                )}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                )}
              </div>

              {/* Action buttons for assistant messages */}
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleCopy(message.content, message.id)}
                  >
                    {copiedId === message.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copiar
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleUseResponse(message.content)}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Usar resposta
                  </Button>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Gerando resposta...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Peça ajustes na resposta..."
            disabled={isLoading}
            className="text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Dica: "seja mais formal", "adicione emojis", "resuma"
        </p>
      </div>
    </div>
  );
}
