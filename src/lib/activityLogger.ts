// src/lib/activityLogger.ts
import { supabase } from "@/integrations/supabase/client";

// sessionId persiste durante o ciclo de vida da aba (resets no reload)
let _sessionId: string | null = null;

export function getSessionId(): string {
  if (!_sessionId) {
    _sessionId = crypto.randomUUID();
  }
  return _sessionId;
}

export function resetSessionId(): void {
  _sessionId = crypto.randomUUID();
}

export interface ActivityLogPayload {
  company_id: string;
  user_id: string;
  event_type: "page_view" | "action" | "login" | "logout";
  page_path?: string;
  page_title?: string;
  module?: string;
  action_name?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
  duration_ms?: number;
}

// Fire-and-forget: nunca propaga erros para a UI
export async function insertActivityLog(
  payload: ActivityLogPayload,
): Promise<void> {
  try {
    await (supabase as any).from("user_activity_logs").insert({
      ...payload,
      session_id: getSessionId(),
      user_agent: navigator.userAgent,
    });
  } catch {
    // silencioso — logs nunca devem quebrar a UI
  }
}
