import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface GoogleMeetIntegration {
  id: string;
  company_id: string;
  user_id?: string | null;
  expires_at: string;
  is_active: boolean;
  user_email?: string | null;
  created_at: string;
}

export function useGoogleMeetIntegration(userId?: string) {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<GoogleMeetIntegration | null>(
    null,
  );
  const processingCodeRef = useRef<string | null>(null);

  const getAuthUrl = (from?: string) => {
    const clientId = import.meta.env.VITE_GOOGLE_MEET_CLIENT_ID;
    const redirectUri = `${window.location.origin}/google-meet/callback`;
    const scopes = [
      "https://www.googleapis.com/auth/meetings.space.created",
      "https://www.googleapis.com/auth/meetings.space.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/calendar.events",
    ].join(" ");

    const resolvedFrom = from || (userId ? "profile" : "settings");
    const state = JSON.stringify({
      ...(userId ? { userId } : {}),
      from: resolvedFrom,
    });

    return (
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`
    );
  };

  const connectGoogle = (from?: string) => {
    window.location.href = getAuthUrl(from);
  };

  const handleCallback = async (
    code: string,
    companyId: string,
    callbackUserId?: string,
  ) => {
    if (processingCodeRef.current === code) {
      throw new Error("Code already being processed");
    }

    try {
      processingCodeRef.current = code;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const redirectUri = `${window.location.origin}/google-meet/callback`;
      const effectiveUserId = callbackUserId || userId;

      const { data, error } = await supabase.functions.invoke(
        "google-meet-oauth",
        {
          body: {
            action: "exchange",
            code,
            companyId,
            redirectUri,
            userId: effectiveUserId,
          },
        },
      );

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Google Meet conectado com sucesso!");
      processingCodeRef.current = null;
      return data;
    } catch (error: unknown) {
      processingCodeRef.current = null;
      const message =
        error instanceof Error ? error.message : "Erro ao conectar";
      toast.error(`Erro ao conectar Google Meet: ${message}`);
      throw error;
    }
  };

  const loadIntegration = async (companyId: string) => {
    try {
      setLoading(true);
      let query = supabase
        .from("google_meet_integrations" as unknown)
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (userId) {
        query = query.eq("user_id", userId);
      } else {
        query = query.is("user_id", null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      setIntegration(data as unknown);
    } catch (error: unknown) {
      console.error("Error loading Meet integration:", error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!activeCompany || !integration) return;
    try {
      const { error } = await supabase
        .from("google_meet_integrations" as unknown)
        .update({ is_active: false })
        .eq("id", integration.id);

      if (error) throw error;
      setIntegration(null);
      toast.success("Google Meet desconectado com sucesso!");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao desconectar";
      toast.error(`Erro ao desconectar: ${message}`);
    }
  };

  const refreshToken = async () => {
    if (!activeCompany?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "google-meet-oauth",
        {
          body: {
            action: "refresh_token",
            companyId: activeCompany.company_id,
            userId,
          },
        },
      );
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success(data.message || "Token renovado!");
      await loadIntegration(activeCompany.company_id);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao renovar";
      toast.error(`Erro ao renovar token: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany, userId]);

  return {
    loading,
    integration,
    connectGoogle,
    handleCallback,
    loadIntegration,
    disconnectGoogle,
    refreshToken,
    getAuthUrl,
  };
}
