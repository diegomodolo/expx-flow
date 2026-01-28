import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Loader2, Sparkles, Copy, Check, MessageSquare, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { useWhatsAppAIChatMessages, AIMessage } from "@/hooks/useWhatsAppAIChatMessages";

interface WhatsAppAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  companyId: string | undefined;
  customerMessage?: string;
  contactName: string;
  onUseResponse: (response: string) => void;
}

export function WhatsAppAIAssistant({
  isOpen,
  onClose,
  conversationId,
  companyId,
  customerMessage,
  contactName,
  onUseResponse,
}: WhatsAppAIAssistantProps) {
  const { messages, isLoading: isLoadingHistory, addMessage, clearMessages } = useWhatsAppAIChatMessages(
    conversationId,
    companyId
  );
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasGeneratedSuggestion = useRef(false);
  const lastCustomerMessage = useRef<string | null>(null);

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

  // Generate initial suggestion when a new customer message is selected
  useEffect(() => {
    if (
      isOpen &&
      customerMessage &&
      customerMessage !== lastCustomerMessage.current &&
      !isLoadingHistory
    ) {
      lastCustomerMessage.current = customerMessage;
      hasGeneratedSuggestion.current = true;
      generateSuggestion(customerMessage);
    }
  }, [isOpen, customerMessage, isLoadingHistory]);

  // Reset refs when closed
  useEffect(() => {
    if (!isOpen) {
      hasGeneratedSuggestion.current = false;
      lastCustomerMessage.current = null;
    }
  }, [isOpen]);

  const generateSuggestion = async (messageToRespond: string) => {
    setIsGenerating(true);
    
    const systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp. 
O cliente "${contactName}" enviou a seguinte mensagem:

"${messageToRespond}"

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

      const content = response.data?.content || "Não foi possível gerar uma sugestão.";
      
      // Save both the context message and the assistant response
      await addMessage({
        role: "user",
        content: `[Contexto] Cliente perguntou: "${messageToRespond}"`,
      });
      await addMessage({
        role: "assistant",
        content,
      });
    } catch (error) {
      console.error("Error generating suggestion:", error);
      toast.error("Erro ao gerar sugestão");
      
      await addMessage({
        role: "assistant",
        content: "Desculpe, não consegui gerar uma sugestão no momento. Por favor, tente novamente.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isGenerating) return;

    const userContent = input.trim();
    setInput("");
    
    // Save user message
    await addMessage({ role: "user", content: userContent });
    
    setIsGenerating(true);

    try {
      // Build conversation history for context (last 10 messages)
      const recentMessages = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const systemPrompt = `Você é um assistente de atendimento ao cliente via WhatsApp.
Contexto: Você está ajudando o atendente a formular respostas para o cliente "${contactName}".
Mantenha o tom conversacional adequado para WhatsApp.
Siga as instruções do atendente para ajustar a resposta.`;

      const response = await supabase.functions.invoke("whatsapp-ai-assistant", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            ...recentMessages,
            { role: "user", content: userContent },
          ],
        },
      });

      if (response.error) throw response.error;

      const content = response.data?.content || "Não foi possível processar sua solicitação.";
      await addMessage({ role: "assistant", content });
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Erro ao processar mensagem");
    } finally {
      setIsGenerating(false);
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

  const handleClearHistory = async () => {
    try {
      await clearMessages();
      toast.success("Histórico limpo");
    } catch {
      toast.error("Erro ao limpar histórico");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-full h-full border-l bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Assistente IA</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
              {contactName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClearHistory}
              title="Limpar histórico"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique no ícone ✨ em uma mensagem do cliente
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                para receber sugestões de resposta
              </p>
            </div>
          ) : (
            messages.map((message) => (
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
                {message.role === "assistant" && !message.content.startsWith("Desculpe") && (
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
            ))
          )}

          {isGenerating && (
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
            disabled={isGenerating}
            className="text-sm"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            size="icon"
          >
            {isGenerating ? (
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
