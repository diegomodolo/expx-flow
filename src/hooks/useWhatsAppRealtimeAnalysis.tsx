import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppAIAgentConfig, WhatsAppAIAgentConfig, defaultConfig } from "./useWhatsAppAIAgentConfig";

export interface RealtimeAnalysis {
  temperature: "positive" | "neutral" | "negative";
  interpretation: string;
  suggestion: string;
  departmentInsight: {
    type: string;
    insight: string;
    actionItems: string[];
  };
  alerts: string[];
  timestamp: string;
}

interface UseWhatsAppRealtimeAnalysisProps {
  conversationId: string;
  companyId: string | undefined;
  instanceId?: string | null;
  messages: Array<{
    id: string;
    content: string;
    direction: string;
    created_at: string;
  }>;
  enabled: boolean;
}

export function useWhatsAppRealtimeAnalysis({
  conversationId,
  companyId,
  instanceId,
  messages,
  enabled,
}: UseWhatsAppRealtimeAnalysisProps) {
  const [analysis, setAnalysis] = useState<RealtimeAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAnalyzedMessageId = useRef<string | null>(null);
  
  const { config } = useWhatsAppAIAgentConfig(companyId, instanceId);

  const analyzeConversation = useCallback(async (latestMessages: typeof messages) => {
    if (!companyId || latestMessages.length === 0) return;

    const lastMessage = latestMessages[latestMessages.length - 1];
    
    // Don't re-analyze if we already analyzed this message
    if (lastMessage.id === lastAnalyzedMessageId.current) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get last 15 messages for context
      const contextMessages = latestMessages.slice(-15).map((m) => ({
        role: m.direction === "inbound" ? "customer" : "agent",
        content: m.content,
        timestamp: m.created_at,
      }));

      const agentConfig = config || defaultConfig;

      const response = await supabase.functions.invoke("whatsapp-ai-assistant", {
        body: {
          mode: "analyze",
          messages: contextMessages,
          agentConfig: {
            department: agentConfig.department,
            primary_objective: agentConfig.primary_objective,
            agent_name: agentConfig.agent_name,
          },
        },
      });

      if (response.error) throw response.error;

      const analysisResult = response.data?.analysis;
      
      if (analysisResult) {
        setAnalysis({
          ...analysisResult,
          timestamp: new Date().toISOString(),
        });
        lastAnalyzedMessageId.current = lastMessage.id;
      }
    } catch (err) {
      console.error("[useWhatsAppRealtimeAnalysis] Error:", err);
      setError("Erro ao analisar conversa");
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, config]);

  // Trigger analysis when messages change and analysis is enabled
  useEffect(() => {
    if (!enabled || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    
    // Only analyze if there's a new message
    if (lastMessage.id !== lastAnalyzedMessageId.current) {
      // Small debounce to avoid multiple rapid calls
      const timeoutId = setTimeout(() => {
        analyzeConversation(messages);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [enabled, messages, analyzeConversation]);

  // Reset when disabled or conversation changes
  useEffect(() => {
    if (!enabled) {
      setAnalysis(null);
      lastAnalyzedMessageId.current = null;
    }
  }, [enabled, conversationId]);

  const triggerAnalysis = useCallback(() => {
    if (messages.length > 0) {
      lastAnalyzedMessageId.current = null; // Force re-analysis
      analyzeConversation(messages);
    }
  }, [messages, analyzeConversation]);

  return {
    analysis,
    isAnalyzing,
    error,
    triggerAnalysis,
  };
}
