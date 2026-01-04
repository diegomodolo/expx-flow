import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Loader2, Copy, Check, ArrowDown, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCompany } from "@/contexts/CompanyContext";

interface ContentPlanAIChatProps {
  clientId: string;
  clientName: string;
  clientBriefing?: string;
  contentPlanId: string;
  onInsertContent: (content: string, field: string) => void;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const quickPrompts = [
  { label: "Melhor Criativo", prompt: "Qual foi o criativo que melhor performou nos últimos 30 dias? Explique o porquê." },
  { label: "Mais Engajamento", prompt: "Qual post gerou mais engajamento recentemente? Analise o que funcionou." },
  { label: "Temas Cadastrados", prompt: "Quais são os temas cadastrados para este cliente? Sugira novos posts baseados neles." },
  { label: "Headlines", prompt: "Sugira 5 headlines criativas baseadas nos criativos que mais performam." },
  { label: "Ideias de Posts", prompt: "Sugira 10 ideias de posts baseadas no briefing e performance histórica." },
  { label: "Análise CTR", prompt: "Quais criativos têm o melhor CTR? O que eles têm em comum?" },
];

export function ContentPlanAIChat({
  clientId,
  clientName,
  clientBriefing,
  contentPlanId,
  onInsertContent,
}: ContentPlanAIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { activeCompany } = useCompany();
  const companyId = activeCompany?.company_id;

  // Load chat history on mount
  const loadChatHistory = useCallback(async () => {
    if (!contentPlanId || !companyId) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("content_plan_chat_messages")
        .select("*")
        .eq("content_plan_id", contentPlanId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data) {
        setMessages(
          data.map((msg) => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }))
        );
      }
    } catch (error: any) {
      console.error("Error loading chat history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contentPlanId, companyId]);

  useEffect(() => {
    loadChatHistory();
  }, [loadChatHistory]);

  // Save message to database
  const saveMessage = async (role: "user" | "assistant", content: string): Promise<string | null> => {
    if (!contentPlanId || !companyId) return null;

    try {
      const { data, error } = await supabase
        .from("content_plan_chat_messages")
        .insert({
          content_plan_id: contentPlanId,
          client_id: clientId,
          company_id: companyId,
          role,
          content,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data?.id || null;
    } catch (error: any) {
      console.error("Error saving message:", error);
      return null;
    }
  };

  // Clear chat history
  const handleClearHistory = async () => {
    if (!contentPlanId) return;

    try {
      const { error } = await supabase
        .from("content_plan_chat_messages")
        .delete()
        .eq("content_plan_id", contentPlanId);

      if (error) throw error;

      setMessages([]);
      toast.success("Histórico limpo");
    } catch (error: any) {
      toast.error("Erro ao limpar histórico: " + error.message);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userContent = input.trim();
    setInput("");
    setIsLoading(true);

    // Save user message to DB first
    const userMsgId = await saveMessage("user", userContent);
    
    const userMessage: Message = {
      id: userMsgId || Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const { data, error } = await supabase.functions.invoke("content-plan-chat", {
        body: {
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userContent },
          ],
          clientId,
        },
      });

      if (error) throw error;

      const assistantContent = data.content || data.message || "Desculpe, não consegui processar sua solicitação.";
      
      // Save assistant message to DB
      const assistantMsgId = await saveMessage("assistant", assistantContent);

      const assistantMessage: Message = {
        id: assistantMsgId || (Date.now() + 1).toString(),
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error("Erro ao comunicar com a IA: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt + " ");
    textareaRef.current?.focus();
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success("Copiado!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-muted/20">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Assistente IA</h3>
              <p className="text-xs text-muted-foreground">
                Vinculado a {clientName}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={handleClearHistory}
              title="Limpar histórico"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {!clientBriefing && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
            Cliente sem briefing configurado
          </Badge>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="flex-shrink-0 p-3 border-b bg-background/50">
        <p className="text-xs text-muted-foreground mb-2">Prompts rápidos:</p>
        <div className="flex flex-wrap gap-1">
          {quickPrompts.map((qp) => (
            <Button
              key={qp.label}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleQuickPrompt(qp.prompt)}
            >
              {qp.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {isLoadingHistory ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/50 mb-4" />
            <p className="text-xs text-muted-foreground">Carregando histórico...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h4 className="text-sm font-medium text-muted-foreground mb-1">
              Como posso ajudar?
            </h4>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Pergunte sobre ideias de posts, headlines, legendas ou hashtags
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg p-3",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-border/50">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopy(message.content, message.id)}
                      >
                        {copiedId === message.id ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs gap-1"
                        onClick={() => onInsertContent(message.content, "caption")}
                      >
                        <ArrowDown className="w-3 h-3" />
                        Inserir
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t bg-background">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta..."
            className="min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px]"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
