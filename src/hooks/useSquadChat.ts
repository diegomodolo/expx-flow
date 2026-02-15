import { useState } from "react";
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
}

export function useSquadChat(squadId: string) {
  const [messages, setMessages] = useState<SquadChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendMessage = async (message: string) => {
    if (!squadId || !message.trim()) return;

    setLoading(true);

    // Add user message
    const userMsg: SquadChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("squad-orchestrator", {
        body: { squadId, message },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro desconhecido");

      // Add agent step messages
      const agentMessages: SquadChatMessage[] = (data.steps || []).map(
        (step: { agent_name: string; role: string; output: string; step_order: number }, idx: number) => ({
          id: `step-${data.execution_id}-${idx}`,
          role: "agent" as const,
          agent_name: step.agent_name,
          agent_role: step.role,
          content: step.output,
          step_order: step.step_order,
          created_at: new Date().toISOString(),
        })
      );

      setMessages((prev) => [...prev, ...agentMessages]);
    } catch (err: any) {
      console.error("Squad orchestrator error:", err);
      toast({
        title: "Erro na execução da squad",
        description: err.message || "Não foi possível executar a squad.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => setMessages([]);

  return { messages, loading, sendMessage, clearMessages };
}
