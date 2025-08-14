import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/hooks/use-toast';

export interface ContentGeneration {
  id: string;
  content_type: string;
  theme: string;
  generated_content: string;
  status: string;
  client_id: string;
  user_id: string;
  company_id: string;
  created_at: string;
  updated_at: string;
  clients?: {
    name: string;
    company: string;
  } | null;
}

export function useContentGenerations() {
  const [generations, setGenerations] = useState<ContentGeneration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeCompany } = useCompany();
  const { toast } = useToast();

  const fetchGenerations = async () => {
    if (!user || !activeCompany) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('content_generations')
        .select(`
          *,
          clients (
            name,
            company
          )
        `)
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setGenerations((data as unknown as ContentGeneration[]) || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Erro ao carregar conteúdos",
        description: "Não foi possível carregar os conteúdos gerados.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteGeneration = async (id: string) => {
    try {
      const { error } = await supabase
        .from('content_generations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGenerations(prev => prev.filter(gen => gen.id !== id));
      toast({
        title: "Conteúdo deletado",
        description: "O conteúdo foi removido com sucesso."
      });
    } catch (err: any) {
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível deletar o conteúdo.",
        variant: "destructive"
      });
    }
  };

  const updateGeneration = async (id: string, updates: Partial<ContentGeneration>) => {
    try {
      const { error } = await supabase
        .from('content_generations')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setGenerations(prev =>
        prev.map(gen => gen.id === id ? { ...gen, ...updates } : gen)
      );

      toast({
        title: "Conteúdo atualizado",
        description: "O conteúdo foi atualizado com sucesso."
      });
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o conteúdo.",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchGenerations();
  }, [user, activeCompany]);

  return {
    generations,
    loading,
    error,
    fetchGenerations,
    deleteGeneration,
    updateGeneration
  };
}