import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SquadChatMessage {
  id: string;
  role: "user" | "agent";
  agent_name?: string;
  agent_role?: string;
  content: string;
  step_order?: number;
  created_at: string;
  isThinking?: boolean;
}

export function useSquadChat(squadId: string) {
  const [messages, setMessages] = useState<SquadChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { toast } = useToast();

  const sendMessage = async (message: string) => {
    if (!squadId || !message.trim()) return;

    setLoading(true);

    const userMsg: SquadChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/squad-orchestrator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ squadId, message }),
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 2);

          if (!chunk.startsWith("data: ")) continue;
          const jsonStr = chunk.slice(6);

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "thinking") {
              // Add a "thinking" placeholder message
              setMessages((prev) => {
                // Remove any existing thinking message
                const filtered = prev.filter((m) => !m.isThinking);
                return [
                  ...filtered,
                  {
                    id: `thinking-${event.step_order}`,
                    role: "agent",
                    agent_name: event.agent_name,
                    agent_role: event.role,
                    content: "",
                    step_order: event.step_order,
                    created_at: new Date().toISOString(),
                    isThinking: true,
                  },
                ];
              });
            } else if (event.type === "step") {
              // Replace thinking with actual message
              setMessages((prev) => {
                const filtered = prev.filter((m) => !m.isThinking);
                return [
                  ...filtered,
                  {
                    id: `step-${event.step_order}-${Date.now()}`,
                    role: "agent",
                    agent_name: event.agent_name,
                    agent_role: event.role,
                    content: event.output,
                    step_order: event.step_order,
                    created_at: new Date().toISOString(),
                  },
                ];
              });
            } else if (event.type === "error") {
              setMessages((prev) => {
                const filtered = prev.filter((m) => !m.isThinking);
                return [
                  ...filtered,
                  {
                    id: `error-${event.step_order}-${Date.now()}`,
                    role: "agent",
                    agent_name: event.agent_name,
                    agent_role: event.role,
                    content: event.output,
                    step_order: event.step_order,
                    created_at: new Date().toISOString(),
                  },
                ];
              });
            }
            // type === "done" → nothing extra needed
          } catch {
            // partial JSON, ignore
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled — remove thinking messages and add cancellation notice
        setMessages((prev) => {
          const filtered = prev.filter((m) => !m.isThinking);
          return [
            ...filtered,
            {
              id: `cancelled-${Date.now()}`,
              role: "agent",
              agent_name: "Sistema",
              content: "⏹️ Processo interrompido pelo usuário.",
              created_at: new Date().toISOString(),
            },
          ];
        });
      } else {
        console.error("Squad orchestrator error:", err);
        toast({
          title: "Erro na execução da squad",
          description: err.message || "Não foi possível executar a squad.",
          variant: "destructive",
        });
      }
    } finally {
      abortControllerRef.current = null;
      setLoading(false);
    }
  };

  const stopExecution = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const clearMessages = () => setMessages([]);

  return { messages, loading, sendMessage, clearMessages, stopExecution };
}
