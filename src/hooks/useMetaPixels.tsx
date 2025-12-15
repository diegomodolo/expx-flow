import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MetaPixel {
  id: string;
  client_id: string;
  company_id: string;
  pixel_id: string;
  pixel_name: string;
  creation_time: string | null;
  is_primary: boolean;
  is_unavailable: boolean;
  last_fired_time: string | null;
  data_use_setting: string | null;
  stats: any;
  created_at: string;
  updated_at: string;
}

export interface PixelEvent {
  id: string;
  pixel_id: string;
  client_id: string;
  company_id: string;
  event_name: string;
  event_time: string;
  event_id: string | null;
  action_source: string;
  user_data: any;
  custom_data: any;
  status: string;
  meta_response: any;
  error_message: string | null;
  created_at: string;
}

export interface SendEventParams {
  pixelId?: string;
  eventName: string;
  actionSource?: string;
  userData: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    externalId?: string;
  };
  customData?: {
    value?: number;
    currency?: string;
    contentName?: string;
    contentCategory?: string;
    contentIds?: string[];
    contentType?: string;
    orderId?: string;
    status?: string;
  };
  eventSourceUrl?: string;
}

export function useMetaPixels(clientId: string, companyId: string) {
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [events, setEvents] = useState<PixelEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchPixels = useCallback(async () => {
    if (!clientId || !companyId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("meta_pixels")
        .select("*")
        .eq("client_id", clientId)
        .order("is_primary", { ascending: false })
        .order("pixel_name");

      if (error) throw error;
      setPixels(data || []);
    } catch (error) {
      console.error("Error fetching pixels:", error);
    } finally {
      setLoading(false);
    }
  }, [clientId, companyId]);

  const syncPixels = useCallback(async () => {
    if (!clientId || !companyId) return;

    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-meta-pixels", {
        body: {
          action: "sync",
          clientId,
          companyId,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        toast({
          title: "Erro ao sincronizar",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setPixels(data?.pixels || []);
      toast({
        title: "Pixels sincronizados",
        description: `${data?.pixels?.length || 0} pixel(s) encontrado(s)`,
      });
    } catch (error) {
      console.error("Error syncing pixels:", error);
      toast({
        title: "Erro ao sincronizar",
        description: "Não foi possível sincronizar os pixels",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  }, [clientId, companyId, toast]);

  const setPrimaryPixel = useCallback(async (localPixelId: string) => {
    if (!clientId || !companyId) return;

    try {
      const { data, error } = await supabase.functions.invoke("manage-meta-pixels", {
        body: {
          action: "set-primary",
          clientId,
          companyId,
          localPixelId,
        },
      });

      if (error) throw error;

      // Update local state
      setPixels((prev) =>
        prev.map((p) => ({
          ...p,
          is_primary: p.id === localPixelId,
        }))
      );

      toast({
        title: "Pixel principal definido",
        description: "Este pixel será usado por padrão para envio de eventos",
      });
    } catch (error) {
      console.error("Error setting primary pixel:", error);
      toast({
        title: "Erro",
        description: "Não foi possível definir o pixel principal",
        variant: "destructive",
      });
    }
  }, [clientId, companyId, toast]);

  const fetchEvents = useCallback(async (limit = 50) => {
    if (!clientId) return;

    try {
      const { data, error } = await supabase
        .from("pixel_events_log")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  }, [clientId]);

  const sendEvent = useCallback(async (params: SendEventParams) => {
    if (!clientId || !companyId) return null;

    try {
      const { data, error } = await supabase.functions.invoke("send-pixel-event", {
        body: {
          clientId,
          companyId,
          ...params,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast({
          title: "Erro ao enviar evento",
          description: data.error,
          variant: "destructive",
        });
        return null;
      }

      toast({
        title: "Evento enviado",
        description: `Evento "${params.eventName}" enviado com sucesso`,
      });

      // Refresh events list
      await fetchEvents();

      return data;
    } catch (error) {
      console.error("Error sending event:", error);
      toast({
        title: "Erro ao enviar evento",
        description: "Não foi possível enviar o evento",
        variant: "destructive",
      });
      return null;
    }
  }, [clientId, companyId, toast, fetchEvents]);

  const getPixelStats = useCallback(async (pixelId: string, localPixelId: string) => {
    if (!clientId || !companyId) return null;

    try {
      const { data, error } = await supabase.functions.invoke("manage-meta-pixels", {
        body: {
          action: "get-stats",
          clientId,
          companyId,
          pixelId,
          localPixelId,
        },
      });

      if (error) throw error;
      return data?.stats;
    } catch (error) {
      console.error("Error getting pixel stats:", error);
      return null;
    }
  }, [clientId, companyId]);

  return {
    pixels,
    events,
    loading,
    syncing,
    fetchPixels,
    syncPixels,
    setPrimaryPixel,
    fetchEvents,
    sendEvent,
    getPixelStats,
  };
}
