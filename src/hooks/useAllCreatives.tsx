import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  source: 'fabrica_criativos' | 'gerador_criativos' | 'fabrica_anuncios' | 'fabrica_carrosseis';
  creative_type: string | null;
  theme: string | null;
  slides?: any[]; // Para carrosséis
}

interface Client {
  id: string;
  name: string;
}

interface AdGeneratedContent {
  image_url?: string;
  creative_image_url?: string; // Campo usado pela Fábrica de Anúncios
  video_url?: string;
  body?: string;
  primary_text?: string;
  headline?: string;
  ad_type?: string;
}

export interface TotalCounts {
  fabricaAnuncios: number;
  fabricaCriativos: number;
  geradorCriativos: number;
  fabricaCarrosseis: number;
  total: number;
}

const PAGE_SIZE = 20;

export function useAllCreatives(clientIdFilter?: string) {
  const { activeCompany } = useCompany();
  const [creatives, setCreatives] = useState<UnifiedCreative[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCounts, setTotalCounts] = useState<TotalCounts>({ fabricaAnuncios: 0, fabricaCriativos: 0, geradorCriativos: 0, fabricaCarrosseis: 0, total: 0 });
  const pageRef = useRef(0);
  const clientMapRef = useRef<Map<string, string>>(new Map());
  const isFetchingRef = useRef(false);

  // Fetch total counts (lightweight query)
  const fetchTotalCounts = useCallback(async () => {
    if (!activeCompany?.company_id) return;

    try {
      let fabricaCriativosCountQuery = supabase
        .from('creative_generation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id);

      let geradorCountQuery = supabase
        .from('visual_creatives')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id);

      let fabricaAnunciosCountQuery = supabase
        .from('ad_generation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id);

      let fabricaCarrosseisCountQuery = supabase
        .from('carousel_generation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', activeCompany.company_id);

      if (clientIdFilter) {
        fabricaCriativosCountQuery = fabricaCriativosCountQuery.eq('client_id', clientIdFilter);
        geradorCountQuery = geradorCountQuery.eq('client_id', clientIdFilter);
        fabricaAnunciosCountQuery = fabricaAnunciosCountQuery.eq('client_id', clientIdFilter);
        fabricaCarrosseisCountQuery = fabricaCarrosseisCountQuery.eq('client_id', clientIdFilter);
      }

      const [fcCount, gCount, faCount, carCount] = await Promise.all([
        fabricaCriativosCountQuery,
        geradorCountQuery,
        fabricaAnunciosCountQuery,
        fabricaCarrosseisCountQuery,
      ]);

      const fabricaCriativos = fcCount.count || 0;
      const geradorCriativos = gCount.count || 0;
      const fabricaAnuncios = faCount.count || 0;
      const fabricaCarrosseis = carCount.count || 0;

      setTotalCounts({
        fabricaCriativos,
        geradorCriativos,
        fabricaAnuncios,
        fabricaCarrosseis,
        total: fabricaCriativos + geradorCriativos + fabricaAnuncios + fabricaCarrosseis,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }, [activeCompany?.company_id, clientIdFilter]);

  const fetchClients = useCallback(async () => {
    if (!activeCompany?.company_id) return new Map<string, string>();
    
    const { data: clientsData } = await supabase
      .from('clients')
      .select('id, name')
      .eq('company_id', activeCompany.company_id)
      .order('name', { ascending: true });

    const map = new Map<string, string>();
    (clientsData || []).forEach(c => map.set(c.id, c.name));
    setClients(clientsData || []);
    clientMapRef.current = map;
    return map;
  }, [activeCompany?.company_id]);

  const fetchCreativesPage = useCallback(async (pageNum: number, existingClientMap?: Map<string, string>): Promise<{ creatives: UnifiedCreative[]; hasMoreData: boolean }> => {
    if (!activeCompany?.company_id) {
      return { creatives: [], hasMoreData: false };
    }

    const offset = pageNum * PAGE_SIZE;
    const limit = PAGE_SIZE;
    const mapToUse = existingClientMap || clientMapRef.current;

    // Build queries for all three sources with pagination
    let fabricaCriativosQuery = supabase
      .from('creative_generation_queue')
      .select('id, client_id, company_id, image_url, video_url, caption, status, created_at, creative_type, theme')
      .eq('company_id', activeCompany.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    let geradorQuery = supabase
      .from('visual_creatives')
      .select('id, client_id, company_id, image_url, video_url, caption, title, status, created_at, creative_type, theme')
      .eq('company_id', activeCompany.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    let fabricaAnunciosQuery = supabase
      .from('ad_generation_queue')
      .select('id, client_id, company_id, generated_content, status, created_at, generation_type')
      .eq('company_id', activeCompany.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    let fabricaCarrosseisQuery = supabase
      .from('carousel_generation_queue')
      .select('id, client_id, company_id, slides, caption, status, created_at, carousel_type, theme, cover_image_url')
      .eq('company_id', activeCompany.company_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply client filter if provided
    if (clientIdFilter) {
      fabricaCriativosQuery = fabricaCriativosQuery.eq('client_id', clientIdFilter);
      geradorQuery = geradorQuery.eq('client_id', clientIdFilter);
      fabricaAnunciosQuery = fabricaAnunciosQuery.eq('client_id', clientIdFilter);
      fabricaCarrosseisQuery = fabricaCarrosseisQuery.eq('client_id', clientIdFilter);
    }

    const [fabricaCriativosResult, geradorResult, fabricaAnunciosResult, fabricaCarrosseisResult] = await Promise.all([
      fabricaCriativosQuery,
      geradorQuery,
      fabricaAnunciosQuery,
      fabricaCarrosseisQuery,
    ]);

    if (fabricaCriativosResult.error) throw fabricaCriativosResult.error;
    if (geradorResult.error) throw geradorResult.error;
    if (fabricaAnunciosResult.error) throw fabricaAnunciosResult.error;
    if (fabricaCarrosseisResult.error) throw fabricaCarrosseisResult.error;

    // Normalize fábrica de criativos
    const fabricaCriativosCreatives: UnifiedCreative[] = (fabricaCriativosResult.data || []).map(item => ({
      id: item.id,
      client_id: item.client_id,
      client_name: mapToUse.get(item.client_id) || 'Cliente desconhecido',
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
      client_name: mapToUse.get(item.client_id) || 'Cliente desconhecido',
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
      // A imagem pode estar em creative_image_url ou image_url
      const imageUrl = content?.creative_image_url || content?.image_url || null;
      return {
        id: item.id,
        client_id: item.client_id,
        client_name: mapToUse.get(item.client_id) || 'Cliente desconhecido',
        company_id: item.company_id,
        image_url: imageUrl,
        video_url: content?.video_url || null,
        caption: content?.body || content?.primary_text || null,
        title: content?.headline || null,
        status: item.status,
        created_at: item.created_at,
        source: 'fabrica_anuncios' as const,
        creative_type: content?.ad_type || item.generation_type || null,
        theme: null,
      };
    });

    // Normalize fábrica de carrosséis
    const fabricaCarrosseisCreatives: UnifiedCreative[] = (fabricaCarrosseisResult.data || []).map(item => {
      const slides = item.slides as any[] | null;
      // Usa a cover_image_url ou a primeira imagem dos slides
      const firstSlideImage = slides && slides.length > 0 ? slides[0]?.image_url : null;
      return {
        id: item.id,
        client_id: item.client_id,
        client_name: mapToUse.get(item.client_id) || 'Cliente desconhecido',
        company_id: item.company_id,
        image_url: item.cover_image_url || firstSlideImage || null,
        video_url: null,
        caption: item.caption,
        title: item.theme || 'Carrossel',
        status: item.status,
        created_at: item.created_at,
        source: 'fabrica_carrosseis' as const,
        creative_type: item.carousel_type,
        theme: item.theme,
        slides: slides || [],
      };
    });

    // Combine and sort by created_at (most recent first)
    const pageCreatives = [
      ...fabricaCriativosCreatives, 
      ...geradorCreatives, 
      ...fabricaAnunciosCreatives,
      ...fabricaCarrosseisCreatives
    ].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Take only PAGE_SIZE items from the combined result
    const limitedCreatives = pageCreatives.slice(0, PAGE_SIZE);

    // Check if we have more data
    const totalFetched = (fabricaCriativosResult.data?.length || 0) + 
                         (geradorResult.data?.length || 0) + 
                         (fabricaAnunciosResult.data?.length || 0) +
                         (fabricaCarrosseisResult.data?.length || 0);
    
    return { creatives: limitedCreatives, hasMoreData: totalFetched >= limit };
  }, [activeCompany?.company_id, clientIdFilter]);

  const fetchInitial = useCallback(async () => {
    if (!activeCompany?.company_id || isFetchingRef.current) {
      setLoading(false);
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);
    pageRef.current = 0;
    setHasMore(true);
    
    try {
      // Fetch counts and clients in parallel
      const [map] = await Promise.all([
        fetchClients(),
        fetchTotalCounts(),
      ]);
      
      const result = await fetchCreativesPage(0, map);
      setCreatives(result.creatives);
      setHasMore(result.hasMoreData);
    } catch (error: any) {
      console.error('Error fetching creatives:', error);
      toast.error('Erro ao carregar criativos');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [activeCompany?.company_id, fetchClients, fetchCreativesPage, fetchTotalCounts]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const result = await fetchCreativesPage(nextPage);
      setCreatives(prev => [...prev, ...result.creatives]);
      pageRef.current = nextPage;
      setHasMore(result.hasMoreData);
    } catch (error: any) {
      console.error('Error loading more creatives:', error);
      toast.error('Erro ao carregar mais criativos');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchCreativesPage]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Get unique clients that have creatives
  const clientsWithCreatives = useMemo(() => {
    const uniqueClientIds = new Set(creatives.map(c => c.client_id));
    return clients.filter(c => uniqueClientIds.has(c.id));
  }, [creatives, clients]);

  return {
    creatives,
    clients: clientsWithCreatives,
    allClients: clients,
    loading,
    loadingMore,
    hasMore,
    totalCounts,
    loadMore,
    refetch: fetchInitial,
  };
}
