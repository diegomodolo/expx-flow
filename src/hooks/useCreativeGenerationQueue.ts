import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface CreativeQueueItem {
  id: string;
  client_id: string;
  company_id: string;
  user_id: string;
  generation_type: string;
  creative_type: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  hashtags: string | null;
  theme: string | null;
  generated_content: any;
  status: string;
  quality_score: number | null;
  source_creative_id: string | null;
  research_theme_id: string | null;
  published_at: string | null;
  scheduled_post_id: string | null;
  presentation_id: string | null;
  generated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCreativeGenerationQueue(clientId: string) {
  const { activeCompany } = useCompany();
  const [creatives, setCreatives] = useState<CreativeQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCreatives = useCallback(async () => {
    if (!clientId || !activeCompany?.company_id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('creative_generation_queue')
        .select('*')
        .eq('client_id', clientId)
        .eq('company_id', activeCompany.company_id)
        .order('generated_at', { ascending: false });

      if (error) throw error;
      setCreatives(data || []);
    } catch (error: any) {
      console.error('Error fetching creatives:', error);
      toast.error('Erro ao carregar criativos');
    } finally {
      setLoading(false);
    }
  }, [clientId, activeCompany?.company_id]);

  useEffect(() => {
    fetchCreatives();
  }, [fetchCreatives]);

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('creative_generation_queue')
        .update({ 
          status,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      
      setCreatives(prev => 
        prev.map(c => c.id === id ? { ...c, status, reviewed_at: new Date().toISOString() } : c)
      );
      
      toast.success(status === 'approved' ? 'Criativo aprovado!' : 'Criativo rejeitado');
      return true;
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
      return false;
    }
  };

  const deleteCreative = async (id: string) => {
    try {
      const { error } = await supabase
        .from('creative_generation_queue')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setCreatives(prev => prev.filter(c => c.id !== id));
      toast.success('Criativo removido');
      return true;
    } catch (error: any) {
      console.error('Error deleting creative:', error);
      toast.error('Erro ao remover criativo');
      return false;
    }
  };

  return {
    creatives,
    loading,
    fetchCreatives,
    updateStatus,
    deleteCreative,
  };
}
