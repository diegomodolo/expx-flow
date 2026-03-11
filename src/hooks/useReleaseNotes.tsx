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

  const { data: totalCount = 0 } = useQuery({
    queryKey: ["release-notes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("release_notes")
        .select("*", { count: "exact", head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const hasMore = notes.length < totalCount;

  const loadMore = () => {
    setLimit((prev) => prev + PAGE_SIZE);
  };

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "sync-release-notes"
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["release-notes"] });
      queryClient.invalidateQueries({ queryKey: ["release-notes-count"] });
    },
  });

  return {
    notes,
    loading: isLoading,
    hasMore,
    loadMore,
    sync: syncMutation.mutate,
    syncing: syncMutation.isPending,
  };
}
