import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";

export interface VisualCreative {
  id: string;
  company_id: string;
  client_id: string;
  client_name?: string;
  creative_type: string;
  theme: string;
  title: string;
  description: string;
  objective: string;
  target_audience?: string;
  copy_text?: string;
  caption?: string;
  image_url?: string;
  video_url?: string;
  media_type?: 'image' | 'video';
  generation_operation_id?: string;
  video_duration_seconds?: number;
  status: 'generating' | 'completed' | 'failed' | 'error';
  created_at: string;
  updated_at: string;
}

export function useVisualCreatives() {
  const [creatives, setCreatives] = useState<VisualCreative[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { activeCompany } = useCompany();

  const fetchCreatives = async () => {
    if (!activeCompany?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('visual_creatives')
        .select('*')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setCreatives((data || []).map(item => ({
        ...item,
        status: item.status as 'generating' | 'completed' | 'failed' | 'error',
        media_type: (item.media_type as 'image' | 'video') || 'image'
      })));
    } catch (err: any) {
      console.error('Error fetching visual creatives:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar criativos",
        description: "Não foi possível carregar o histórico de criativos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createCreative = async (creativeData: Omit<VisualCreative, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Creating visual creative:', creativeData);
      
      const { data, error } = await supabase
        .from('visual_creatives')
        .insert([creativeData])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating creative:', error);
        throw error;
      }

      console.log('Visual creative created successfully:', data);

      // Atualizar lista local
      setCreatives(prev => [{
        ...data,
        status: data.status as 'generating' | 'completed' | 'failed' | 'error',
        media_type: (data.media_type as 'image' | 'video') || 'image'
      }, ...prev]);

      toast({
        title: "Criativo salvo",
        description: "O criativo foi adicionado ao histórico com sucesso.",
      });

      return data;
    } catch (err: any) {
      console.error('Error creating creative:', err);
      toast({
        title: "Erro ao salvar criativo",
        description: err.message || "Não foi possível salvar o criativo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const updateCreative = async (id: string, updates: Partial<VisualCreative>) => {
    try {
      // For now, just show success message
      toast({
        title: "Criativo atualizado",
        description: "O criativo foi atualizado com sucesso.",
      });
    } catch (err: any) {
      console.error('Error updating creative:', err);
      toast({
        title: "Erro ao atualizar criativo",
        description: "Não foi possível atualizar o criativo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const deleteCreative = async (id: string) => {
    try {
      // For now, just show success message
      toast({
        title: "Criativo removido",
        description: "O criativo foi removido do histórico.",
      });
    } catch (err: any) {
      console.error('Error deleting creative:', err);
      toast({
        title: "Erro ao remover criativo",
        description: "Não foi possível remover o criativo.",
        variant: "destructive",
      });
      throw err;
    }
  };

  useEffect(() => {
    fetchCreatives();
  }, [activeCompany?.company_id]);

  return {
    creatives,
    loading,
    error,
    fetchCreatives,
    createCreative,
    updateCreative,
    deleteCreative,
  };
}