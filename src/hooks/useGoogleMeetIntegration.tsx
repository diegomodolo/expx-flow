import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface GoogleMeetIntegration {
  id: string;
  company_id: string;
  expires_at: string;
  is_active: boolean;
  user_email?: string | null;
  created_at: string;
}

export function useGoogleMeetIntegration() {
  const { activeCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<GoogleMeetIntegration | null>(null);
  const processingCodeRef = useRef<string | null>(null);

  const getAuthUrl = () => {
    const clientId = import.meta.env.VITE_GOOGLE_ADS_CLIENT_ID;
    const redirectUri = `${window.location.origin}/google-meet/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/meetings.space.created',
      'https://www.googleapis.com/auth/meetings.space.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' ');

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent`;
  };

  const connectGoogle = () => {
    window.location.href = getAuthUrl();
  };

  const handleCallback = async (code: string, companyId: string) => {
    if (processingCodeRef.current === code) {
      throw new Error('Code already being processed');
    }

    try {
      processingCodeRef.current = code;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const redirectUri = `${window.location.origin}/google-meet/callback`;

      const { data, error } = await supabase.functions.invoke('google-meet-oauth', {
        body: { action: 'exchange', code, companyId, redirectUri },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success("Google Meet conectado com sucesso!");
      processingCodeRef.current = null;
      return data;
    } catch (error: any) {
      processingCodeRef.current = null;
      toast.error(`Erro ao conectar Google Meet: ${error.message}`);
      throw error;
    }
  };

  const loadIntegration = async (companyId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('google_meet_integrations' as any)
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      setIntegration(data as any);
    } catch (error: any) {
      console.error("Error loading Meet integration:", error);
    } finally {
      setLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    if (!activeCompany || !integration) return;
    try {
      const { error } = await supabase
        .from('google_meet_integrations' as any)
        .update({ is_active: false })
        .eq('id', integration.id);

      if (error) throw error;
      setIntegration(null);
      toast.success("Google Meet desconectado com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao desconectar: ${error.message}`);
    }
  };

  const refreshToken = async () => {
    if (!activeCompany?.company_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-meet-oauth', {
        body: { action: 'refresh_token', companyId: activeCompany.company_id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success(data.message || 'Token renovado!');
      await loadIntegration(activeCompany.company_id);
    } catch (error: any) {
      toast.error(`Erro ao renovar token: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeCompany) {
      loadIntegration(activeCompany.company_id);
    }
  }, [activeCompany]);

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
