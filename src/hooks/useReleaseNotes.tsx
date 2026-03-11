import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export interface ReleaseNote {
  id: string;
  title: string;
  friendly_title: string | null;
  category: "feature" | "fix" | "improvement" | "other";
  description: string | null;
  source_type: "commit" | "pr";
  source_ref: string;
  source_url: string | null;
  author_name: string | null;
  published_at: string;
  created_at: string;
}

const PAGE_SIZE = 50;

export function useReleaseNotes() {
  const queryClient = useQueryClient();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["release-notes", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_notes")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ReleaseNote[];
    },
  });

  const {
    data: stats = { total: 0, feature: 0, fix: 0, improvement: 0, other: 0 },
  } = useQuery({
    queryKey: ["release-notes-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("release_notes")
        .select("category");

      if (error) throw error;
      const rows = data || [];
      return {
        total: rows.length,
        feature: rows.filter((r) => r.category === "feature").length,
        fix: rows.filter((r) => r.category === "fix").length,
        improvement: rows.filter((r) => r.category === "improvement").length,
        other: rows.filter((r) => r.category === "other").length,
      };
    },
  });

  const hasMore = notes.length < stats.total;

  const loadMore = () => {
    setLimit((prev) => prev + PAGE_SIZE);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } =
        await supabase.functions.invoke("sync-release-notes");
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-notes"] });
      queryClient.invalidateQueries({ queryKey: ["release-notes-stats"] });
    },
  });

  return {
    notes,
    stats,
    loading: isLoading,
    hasMore,
    loadMore,
    sync: syncMutation.mutate,
    syncing: syncMutation.isPending,
  };
}
