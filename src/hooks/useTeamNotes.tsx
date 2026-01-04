import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface TeamNote {
  id: string;
  content: string;
  is_pinned: boolean;
  created_at: string;
  user_id: string;
  author_name?: string;
  author_avatar?: string;
}

export const useTeamNotes = () => {
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['team-notes', activeCompany?.company_id],
    queryFn: async () => {
      if (!activeCompany?.company_id) return [];

      const { data, error } = await supabase
        .from('team_notes')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set(data.map(note => note.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return data.map(note => ({
        ...note,
        author_name: profileMap.get(note.user_id)?.full_name || 'Usuário',
        author_avatar: profileMap.get(note.user_id)?.avatar_url
      })) as TeamNote[];
    },
    enabled: !!activeCompany?.company_id
  });

  const addNote = useMutation({
    mutationFn: async (content: string) => {
      if (!activeCompany?.company_id || !user?.id) {
        throw new Error('Empresa ou usuário não encontrado');
      }

      const { error } = await supabase
        .from('team_notes')
        .insert({
          company_id: activeCompany.company_id,
          user_id: user.id,
          content
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes'] });
      toast.success('Nota adicionada');
    },
    onError: () => {
      toast.error('Erro ao adicionar nota');
    }
  });

  const togglePin = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await supabase
        .from('team_notes')
        .update({ is_pinned: !isPinned })
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes'] });
    }
  });

  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('team_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-notes'] });
      toast.success('Nota removida');
    }
  });

  return {
    notes,
    isLoading,
    addNote,
    togglePin,
    deleteNote,
    currentUserId: user?.id
  };
};
