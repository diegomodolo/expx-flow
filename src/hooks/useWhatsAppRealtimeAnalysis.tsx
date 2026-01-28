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
  score: number; // 0-10 rating
  readyMessage: string; // Ready-to-send message
  timestamp: string;
}

interface StoredAnalysis {
  id: string;
  conversation_id: string;
  company_id: string;
  temperature: string;
  sentiment_score: number;
  score: number;
  alerts: string[];
  interpretation: string | null;
  suggestion: string | null;
  insight: string | null;
  ready_message: string | null;
  last_analyzed_message_id: string | null;
  created_at: string;
  updated_at: string;
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
    message_type?: string;
    audio_transcription?: string | null;
    transcription_status?: string | null;
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
  const [isNewAnalysis, setIsNewAnalysis] = useState(false); // Flag to indicate if analysis was just generated
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingStored, setIsLoadingStored] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAnalyzedMessageId = useRef<string | null>(null);
  const currentConversationId = useRef<string | null>(null);
  
  const { config } = useWhatsAppAIAgentConfig(companyId, instanceId);

  // Load stored analysis from database
  const loadStoredAnalysis = useCallback(async (convId: string): Promise<{ analysis: RealtimeAnalysis | null; lastMessageId: string | null }> => {
    if (!companyId || !convId) return { analysis: null, lastMessageId: null };

    try {
      setIsLoadingStored(true);
      console.log("[useWhatsAppRealtimeAnalysis] Loading stored analysis for conversation:", convId);

      const { data, error } = await supabase
        .from("whatsapp_realtime_analysis")
        .select("*")
        .eq("conversation_id", convId)
        .maybeSingle();

      if (error) {
        console.error("[useWhatsAppRealtimeAnalysis] Error loading stored analysis:", error);
        return { analysis: null, lastMessageId: null };
      }

      if (data) {
        console.log("[useWhatsAppRealtimeAnalysis] Found stored analysis:", data);
        const storedData = data as StoredAnalysis;
        
        // Parse stored insight JSON if exists
        let departmentInsight = {
          type: "general",
          insight: storedData.insight || "",
          actionItems: [],
        };
        
        try {
          if (storedData.insight && storedData.insight.startsWith("{")) {
            departmentInsight = JSON.parse(storedData.insight);
          }
        } catch (e) {
          // Keep default structure if parsing fails
        }

        const analysis: RealtimeAnalysis = {
          temperature: storedData.temperature as "positive" | "neutral" | "negative",
          interpretation: storedData.interpretation || "",
          suggestion: storedData.suggestion || "",
          departmentInsight,
          alerts: storedData.alerts || [],
          score: storedData.score || 5,
          readyMessage: storedData.ready_message || "",
          timestamp: storedData.updated_at,
        };

        return { 
          analysis, 
          lastMessageId: storedData.last_analyzed_message_id 
        };
      }

      return { analysis: null, lastMessageId: null };
    } catch (err) {
      console.error("[useWhatsAppRealtimeAnalysis] Failed to load stored analysis:", err);
      return { analysis: null, lastMessageId: null };
    } finally {
      setIsLoadingStored(false);
    }
  }, [companyId]);

  // Save analysis to database (both current and history)
  const saveAnalysis = useCallback(async (
    analysisData: RealtimeAnalysis, 
    convId: string,
    messageCount: number = 0,
    lastMessageDirection: string = "inbound",
    lastMsgId: string | null = null
  ) => {
    if (!companyId || !convId) return;

    try {
      console.log("[useWhatsAppRealtimeAnalysis] Saving analysis for conversation:", convId, "with lastMsgId:", lastMsgId);

      const now = new Date().toISOString();

      // Data for current analysis (upsert - keeps only latest)
      const currentDataToSave = {
        conversation_id: convId,
        company_id: companyId,
        temperature: analysisData.temperature,
        sentiment_score: 0,
        score: analysisData.score,
        alerts: analysisData.alerts,
        interpretation: analysisData.interpretation,
        suggestion: analysisData.suggestion,
        insight: JSON.stringify(analysisData.departmentInsight),
        ready_message: analysisData.readyMessage || null,
        last_analyzed_message_id: lastMsgId,
        updated_at: now,
      };

      // Data for history (always insert - keeps all records)
      const historyDataToSave = {
        conversation_id: convId,
        company_id: companyId,
        temperature: analysisData.temperature,
        score: analysisData.score,
        alerts: analysisData.alerts,
        interpretation: analysisData.interpretation,
        suggestion: analysisData.suggestion,
        insight: analysisData.departmentInsight, // JSONB directly
        ready_message: analysisData.readyMessage || null,
        message_count: messageCount,
        last_message_direction: lastMessageDirection,
        analyzed_at: now,
      };

      // Save both in parallel
      const [currentResult, historyResult] = await Promise.all([
        // Update current analysis
        supabase
          .from("whatsapp_realtime_analysis")
          .upsert(currentDataToSave, { onConflict: "conversation_id" }),
        // Insert into history
        supabase
          .from("whatsapp_realtime_analysis_history")
          .insert(historyDataToSave),
      ]);

      if (currentResult.error) {
        console.error("[useWhatsAppRealtimeAnalysis] Error saving current analysis:", currentResult.error);
      }
      if (historyResult.error) {
        console.error("[useWhatsAppRealtimeAnalysis] Error saving analysis history:", historyResult.error);
      }
      
      if (!currentResult.error && !historyResult.error) {
        console.log("[useWhatsAppRealtimeAnalysis] Analysis saved to both tables successfully");
      }
    } catch (err) {
      console.error("[useWhatsAppRealtimeAnalysis] Failed to save analysis:", err);
    }
  }, [companyId]);

  // Load stored analysis when conversation changes
  useEffect(() => {
    if (!enabled || !conversationId || conversationId === currentConversationId.current) {
      return;
    }

    console.log("[useWhatsAppRealtimeAnalysis] Conversation changed from", currentConversationId.current, "to", conversationId);
    
    // Clear current analysis immediately when switching
    setAnalysis(null);
    setIsNewAnalysis(false);
    lastAnalyzedMessageId.current = null;
    currentConversationId.current = conversationId;

    // Load stored analysis for new conversation
    loadStoredAnalysis(conversationId).then((result) => {
      if (result.analysis) {
        setAnalysis(result.analysis);
        setIsNewAnalysis(false); // Restored analysis, not new
        // Set the lastAnalyzedMessageId from the stored value to prevent re-analysis
        if (result.lastMessageId) {
          lastAnalyzedMessageId.current = result.lastMessageId;
          console.log("[useWhatsAppRealtimeAnalysis] Restored lastAnalyzedMessageId:", result.lastMessageId);
        }
      }
    });
  }, [conversationId, enabled, loadStoredAnalysis]);

  const analyzeConversation = useCallback(async (latestMessages: typeof messages) => {
    if (!companyId || latestMessages.length === 0 || !conversationId) return;

    const lastMessage = latestMessages[latestMessages.length - 1];
    
    // Don't re-analyze if we already analyzed this message
    if (lastMessage.id === lastAnalyzedMessageId.current) return;

    // Check if last message is audio and waiting for transcription
    const isAudioMessage = lastMessage.message_type === "audio" || lastMessage.message_type === "ptt";
    const isTranscriptionPending = lastMessage.transcription_status === "processing" || 
                                   lastMessage.transcription_status === "pending";
    const hasNoTranscription = isAudioMessage && !lastMessage.audio_transcription;

    if (isAudioMessage && (isTranscriptionPending || hasNoTranscription)) {
      console.log("[useWhatsAppRealtimeAnalysis] Waiting for audio transcription...");
      return; // Wait for transcription to be ready
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get last 15 messages for context, using transcription for audio messages
      const contextMessages = latestMessages.slice(-15).map((m) => {
        const isAudio = m.message_type === "audio" || m.message_type === "ptt";
        // Use transcription for audio messages, otherwise use content
        const messageContent = isAudio && m.audio_transcription 
          ? `[Áudio] ${m.audio_transcription}` 
          : m.content;

        return {
          role: m.direction === "inbound" ? "customer" : "agent",
          content: messageContent,
          timestamp: m.created_at,
        };
      });

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
        const newAnalysis: RealtimeAnalysis = {
          ...analysisResult,
          timestamp: new Date().toISOString(),
        };
        
        setAnalysis(newAnalysis);
        setIsNewAnalysis(true); // This is a newly generated analysis
        lastAnalyzedMessageId.current = lastMessage.id;

        // Save to database (both current and history) with the message ID
        await saveAnalysis(
          newAnalysis, 
          conversationId, 
          latestMessages.length,
          lastMessage.direction,
          lastMessage.id
        );
      }
    } catch (err) {
      console.error("[useWhatsAppRealtimeAnalysis] Error:", err);
      setError("Erro ao analisar conversa");
    } finally {
      setIsAnalyzing(false);
    }
  }, [companyId, conversationId, config, saveAnalysis]);

  // Trigger analysis when messages change and analysis is enabled
  useEffect(() => {
    if (!enabled || messages.length === 0 || conversationId !== currentConversationId.current) return;

    const lastMessage = messages[messages.length - 1];
    
    // Only analyze if there's a new message
    if (lastMessage.id !== lastAnalyzedMessageId.current) {
      // Small debounce to avoid multiple rapid calls
      const timeoutId = setTimeout(() => {
        analyzeConversation(messages);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [enabled, messages, analyzeConversation, conversationId]);

  // Reset when disabled
  useEffect(() => {
    if (!enabled) {
      setAnalysis(null);
      setIsNewAnalysis(false);
      lastAnalyzedMessageId.current = null;
    }
  }, [enabled]);

  const triggerAnalysis = useCallback(() => {
    if (messages.length > 0) {
      lastAnalyzedMessageId.current = null; // Force re-analysis
      analyzeConversation(messages);
    }
  }, [messages, analyzeConversation]);

  // Function to mark analysis as consumed (no longer new)
  const markAnalysisConsumed = useCallback(() => {
    setIsNewAnalysis(false);
  }, []);

  return {
    analysis,
    isNewAnalysis,
    isAnalyzing: isAnalyzing || isLoadingStored,
    error,
    triggerAnalysis,
    markAnalysisConsumed,
  };
}
