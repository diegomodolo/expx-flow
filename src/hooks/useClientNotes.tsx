import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/contexts/CompanyContext";

export interface ClientNote {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface ProfilesMap {
  [userId: string]: { full_name: string | null; avatar_url: string | null };
}

export const useClientNotes = (clientId: string) => {
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [profilesByUserId, setProfilesByUserId] = useState<ProfilesMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!user?.id || !activeCompany?.company_id || !clientId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await (supabase as any)
        .from("client_notes")
        .select("*")
        .eq("client_id", clientId)
        .eq("company_id", activeCompany.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes((data || []) as ClientNote[]);

      const userIds: string[] = Array.from(new Set(((data || []) as any[]).map((n: any) => n.user_id as string)));
      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", userIds as string[]);
        if (profilesError) throw profilesError;
        const map: ProfilesMap = {};
        (profiles || []).forEach((p: any) => {
          map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
        });
        setProfilesByUserId(map);
      } else {
        setProfilesByUserId({});
      }
    } catch (e: any) {
      console.error("Erro ao buscar anotações:", e);
      setError(e.message || "Erro ao buscar anotações");
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeCompany?.company_id, clientId]);

  const addNote = useCallback(
    async (content: string) => {
      if (!user?.id || !activeCompany?.company_id || !clientId) return;
      const { error } = await (supabase as any).from("client_notes").insert({
        client_id: clientId,
        company_id: activeCompany.company_id,
        user_id: user.id,
        content,
      });
      if (error) throw error;
      await fetchNotes();
    },
    [user?.id, activeCompany?.company_id, clientId, fetchNotes]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      const { error } = await (supabase as any).from("client_notes").delete().eq("id", noteId);
      if (error) throw error;
      await fetchNotes();
    },
    [fetchNotes]
  );

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    profilesByUserId,
    loading,
    error,
    refetch: fetchNotes,
    addNote,
    deleteNote,
  };
};
