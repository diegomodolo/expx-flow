import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

export interface UnifiedCreative {
  id: string;
  client_id: string;
  client_name: string;
  company_id: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  title: string | null;
  status: string;
  created_at: string;
  source: 'fabrica_criativos' | 'gerador_criativos' | 'fabrica_anuncios';
  creative_type: string | null;
  theme: string | null;
}

interface Client {
  id: string;
  name: string;
}

interface AdGeneratedContent {
  image_url?: string;
  video_url?: string;
  body?: string;
  headline?: string;
  ad_type?: string;
}

export function useAllCreatives(clientIdFilter?: string) {
  const { activeCompany } = useCompany();
  const [creatives, setCreatives] = useState<UnifiedCreative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllCreatives = useCallback(async () => {
    if (!activeCompany?.company_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Fetch clients for name mapping
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', activeCompany.company_id)
        .order('name', { ascending: true });

      const clientMap = new Map<string, string>();
      (clientsData || []).forEach(c => clientMap.set(c.id, c.name));
      setClients(clientsData || []);

      // Build queries for all three sources
      let fabricaCriativosQuery = supabase
        .from('creative_generation_queue')
        .select('id, client_id, company_id, image_url, video_url, caption, status, created_at, creative_type, theme')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      let geradorQuery = supabase
        .from('visual_creatives')
        .select('id, client_id, company_id, image_url, video_url, caption, title, status, created_at, creative_type, theme')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      let fabricaAnunciosQuery = supabase
        .from('ad_generation_queue')
        .select('id, client_id, company_id, generated_content, status, created_at, generation_type')
        .eq('company_id', activeCompany.company_id)
        .order('created_at', { ascending: false });

      // Apply client filter if provided
      if (clientIdFilter) {
        fabricaCriativosQuery = fabricaCriativosQuery.eq('client_id', clientIdFilter);
        geradorQuery = geradorQuery.eq('client_id', clientIdFilter);
        fabricaAnunciosQuery = fabricaAnunciosQuery.eq('client_id', clientIdFilter);
      }

      const [fabricaCriativosResult, geradorResult, fabricaAnunciosResult] = await Promise.all([
        fabricaCriativosQuery,
        geradorQuery,
        fabricaAnunciosQuery,
      ]);

      if (fabricaCriativosResult.error) throw fabricaCriativosResult.error;
      if (geradorResult.error) throw geradorResult.error;
      if (fabricaAnunciosResult.error) throw fabricaAnunciosResult.error;

      // Normalize fábrica de criativos
      const fabricaCriativosCreatives: UnifiedCreative[] = (fabricaCriativosResult.data || []).map(item => ({
        id: item.id,
        client_id: item.client_id,
        client_name: clientMap.get(item.client_id) || 'Cliente desconhecido',
        company_id: item.company_id,
        image_url: item.image_url,
        video_url: item.video_url,
        caption: item.caption,
        title: null,
        status: item.status,
        created_at: item.created_at,
        source: 'fabrica_criativos' as const,
        creative_type: item.creative_type,
        theme: item.theme,
      }));

      // Normalize gerador de criativos
      const geradorCreatives: UnifiedCreative[] = (geradorResult.data || []).map(item => ({
        id: item.id,
        client_id: item.client_id,
        client_name: clientMap.get(item.client_id) || 'Cliente desconhecido',
        company_id: item.company_id,
        image_url: item.image_url,
        video_url: item.video_url,
        caption: item.caption,
        title: item.title,
        status: item.status,
        created_at: item.created_at,
        source: 'gerador_criativos' as const,
        creative_type: item.creative_type,
        theme: item.theme,
      }));

      // Normalize fábrica de anúncios
      const fabricaAnunciosCreatives: UnifiedCreative[] = (fabricaAnunciosResult.data || []).map(item => {
        const content = item.generated_content as AdGeneratedContent | null;
        return {
          id: item.id,
          client_id: item.client_id,
          client_name: clientMap.get(item.client_id) || 'Cliente desconhecido',
          company_id: item.company_id,
          image_url: content?.image_url || null,
          video_url: content?.video_url || null,
          caption: content?.body || null,
          title: content?.headline || null,
          status: item.status,
          created_at: item.created_at,
          source: 'fabrica_anuncios' as const,
          creative_type: content?.ad_type || item.generation_type || null,
          theme: null,
        };
      });

      // Combine and sort by created_at (most recent first)
      const allCreatives = [
        ...fabricaCriativosCreatives, 
        ...geradorCreatives, 
        ...fabricaAnunciosCreatives
      ].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCreatives(allCreatives);
    } catch (error: any) {
      console.error('Error fetching all creatives:', error);
      toast.error('Erro ao carregar criativos');
    } finally {
      setLoading(false);
    }
  }, [activeCompany?.company_id, clientIdFilter]);

  useEffect(() => {
    fetchAllCreatives();
  }, [fetchAllCreatives]);

  // Get unique clients that have creatives (already sorted alphabetically from query)
  const clientsWithCreatives = useMemo(() => {
    const uniqueClientIds = new Set(creatives.map(c => c.client_id));
    return clients.filter(c => uniqueClientIds.has(c.id));
  }, [creatives, clients]);

  return {
    creatives,
    clients: clientsWithCreatives,
    allClients: clients,
    loading,
    refetch: fetchAllCreatives,
  };
}