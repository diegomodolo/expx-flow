import { useEffect, useState, useCallback, useRef } from "react";
import { supabasePublic } from "@/integrations/supabase/publicClient";
import { CriticalAlert } from "@/components/cs-tv-dashboard/CSTVCriticalAlertOverlay";
import { CelebrationAlert } from "@/components/cs-tv-dashboard/CSTVCelebrationOverlay";

interface UseCSTVRealtimeAlertsProps {
  token: string;
  companyId: string | null;
  onNewCriticalAlert: (alert: CriticalAlert) => void;
  onNewCelebrationAlert: (alert: CelebrationAlert) => void;
}

interface RealtimeAlertEvent {
  id: string;
  company_id: string;
  alert_type: "critical" | "celebration";
  alert_data: {
    analysisId: string;
    conversationId: string;
    score: number;
    temperature: string;
    interpretation: string;
    suggestion: string;
    contactName?: string;
    contactPhone?: string;
    clientName?: string | null;
    attendantId?: string | null;
    attendantName?: string | null;
    squadName?: string | null;
    lastClientMessage?: string | null;
    timestamp: string;
  };
  created_at: string;
}

export function useCSTVRealtimeAlerts({
  token,
  companyId,
  onNewCriticalAlert,
  onNewCelebrationAlert,
}: UseCSTVRealtimeAlertsProps) {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabasePublic.channel> | null>(null);
  
  // Check if an alert has already been displayed (persisted in DB)
  const checkAndMarkAsDisplayed = useCallback(async (
    analysisId: string, 
    alertType: "critical" | "celebration",
    alertData: RealtimeAlertEvent["alert_data"]
  ): Promise<boolean> => {
    if (!companyId) return false;
    
    try {
      // Check if already displayed
      const { data: existing, error: checkError } = await supabasePublic
        .from("cs_tv_displayed_alerts")
        .select("id")
        .eq("company_id", companyId)
        .eq("analysis_id", analysisId)
        .maybeSingle();

      if (checkError) {
        console.error("[useCSTVRealtimeAlerts] Error checking displayed alert:", checkError);
        return false;
      }

      if (existing) {
        console.log("[useCSTVRealtimeAlerts] Alert already displayed:", analysisId);
        return false;
      }

      // Mark as displayed
      const { error: insertError } = await supabasePublic
        .from("cs_tv_displayed_alerts")
        .insert({
          company_id: companyId,
          analysis_id: analysisId,
          alert_type: alertType,
          score: alertData.score,
          conversation_id: alertData.conversationId,
          contact_name: alertData.contactName || null,
          attendant_name: alertData.attendantName || null,
        });

      if (insertError) {
        // Might be a race condition with another dashboard - that's OK
        if (insertError.code === "23505") {
          console.log("[useCSTVRealtimeAlerts] Alert was displayed by another dashboard:", analysisId);
          return false;
        }
        console.error("[useCSTVRealtimeAlerts] Error marking alert as displayed:", insertError);
        return false;
      }

      console.log("[useCSTVRealtimeAlerts] Alert marked as displayed:", analysisId);
      return true;
    } catch (err) {
      console.error("[useCSTVRealtimeAlerts] Unexpected error:", err);
      return false;
    }
  }, [companyId]);

  // Handle new alert event from Realtime
  const handleNewAlert = useCallback(async (event: RealtimeAlertEvent) => {
    console.log("[useCSTVRealtimeAlerts] New alert event received:", event);

    const analysisId = event.alert_data.analysisId;
    if (!analysisId) {
      console.warn("[useCSTVRealtimeAlerts] Alert event missing analysisId");
      return;
    }

    // Check and mark as displayed (atomic operation)
    const shouldDisplay = await checkAndMarkAsDisplayed(
      analysisId,
      event.alert_type,
      event.alert_data
    );

    if (!shouldDisplay) {
      return;
    }

    // Build the alert object
    const baseAlert = {
      id: analysisId,
      conversationId: event.alert_data.conversationId,
      contactName: event.alert_data.contactName || "Sem nome",
      contactPhone: event.alert_data.contactPhone || "",
      clientName: event.alert_data.clientName || null,
      attendantId: event.alert_data.attendantId || null,
      attendantName: event.alert_data.attendantName || null,
      score: event.alert_data.score,
      temperature: event.alert_data.temperature,
      interpretation: event.alert_data.interpretation,
      analyzedAt: event.alert_data.timestamp,
    };

    if (event.alert_type === "critical") {
      const criticalAlert: CriticalAlert = {
        ...baseAlert,
        suggestion: event.alert_data.suggestion,
      };
      onNewCriticalAlert(criticalAlert);
    } else {
      const celebrationAlert: CelebrationAlert = {
        ...baseAlert,
        squadName: event.alert_data.squadName || null,
        lastClientMessage: event.alert_data.lastClientMessage || null,
      };
      onNewCelebrationAlert(celebrationAlert);
    }
  }, [checkAndMarkAsDisplayed, onNewCriticalAlert, onNewCelebrationAlert]);

  useEffect(() => {
    if (!companyId) {
      console.log("[useCSTVRealtimeAlerts] No companyId, skipping subscription");
      return;
    }

    console.log("[useCSTVRealtimeAlerts] Subscribing to realtime alerts for company:", companyId);

    // Create channel for realtime alerts
    const channel = supabasePublic
      .channel(`cs-tv-realtime-alerts-${companyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cs_tv_realtime_alert_events",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          console.log("[useCSTVRealtimeAlerts] Realtime payload received:", payload);
          const event = payload.new as RealtimeAlertEvent;
          handleNewAlert(event);
        }
      )
      .subscribe((status) => {
        console.log("[useCSTVRealtimeAlerts] Subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      console.log("[useCSTVRealtimeAlerts] Cleaning up subscription");
      if (channelRef.current) {
        supabasePublic.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setIsConnected(false);
    };
  }, [companyId, handleNewAlert]);

  return { isConnected };
}

// Helper hook to mark an alert as displayed (for use with periodic fetch fallback)
export function useMarkAlertAsDisplayed() {
  const markAsDisplayed = useCallback(async (
    companyId: string,
    analysisId: string,
    alertType: "critical" | "celebration",
    additionalData?: {
      score?: number;
      conversationId?: string;
      contactName?: string;
      attendantName?: string;
    }
  ): Promise<boolean> => {
    try {
      const { error } = await supabasePublic
        .from("cs_tv_displayed_alerts")
        .insert({
          company_id: companyId,
          analysis_id: analysisId,
          alert_type: alertType,
          score: additionalData?.score,
          conversation_id: additionalData?.conversationId,
          contact_name: additionalData?.contactName,
          attendant_name: additionalData?.attendantName,
        });

      if (error) {
        if (error.code === "23505") {
          // Already exists - not an error
          return true;
        }
        console.error("[useMarkAlertAsDisplayed] Error:", error);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[useMarkAlertAsDisplayed] Unexpected error:", err);
      return false;
    }
  }, []);

  return { markAsDisplayed };
}
