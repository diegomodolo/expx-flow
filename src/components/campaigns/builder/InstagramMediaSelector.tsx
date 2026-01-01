import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, Instagram, Image, Film, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MediaItem {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  caption?: string;
  timestamp: string;
  permalink?: string;
}

interface InstagramMediaSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL';
  maxSelection?: number;
  onSelect: (urls: string[]) => void;
}

export function InstagramMediaSelector({
  open,
  onOpenChange,
  clientId,
  mediaType,
  maxSelection = mediaType === 'CAROUSEL' ? 10 : 1,
  onSelect,
}: InstagramMediaSelectorProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyProgress, setCopyProgress] = useState({ current: 0, total: 0 });
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [instagramAccount, setInstagramAccount] = useState<{id: string, username: string} | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const { toast } = useToast();

  const fetchInstagramMedia = useCallback(async (cursor?: string) => {
    if (!clientId) return;

    const isLoadingMore = !!cursor;
    if (isLoadingMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setMedia([]);
      setSelectedMedia([]);
    }

    try {
      // First get the client's Instagram account (only on initial load)
      let igAccountId = instagramAccount?.id;
      
      if (!igAccountId) {
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('instagram_account_id, instagram_accounts:instagram_account_id(instagram_id, username)')
          .eq('id', clientId)
          .single();

        if (clientError) throw clientError;

        if (!clientData?.instagram_account_id) {
          toast({
            title: 'Instagram não configurado',
            description: 'Este cliente não tem uma conta do Instagram vinculada.',
            variant: 'destructive',
          });
          onOpenChange(false);
          return;
        }

        const igAccount = clientData.instagram_accounts as any;
        setInstagramAccount({ id: igAccount.instagram_id, username: igAccount.username });
        igAccountId = igAccount.instagram_id;
      }

      // Fetch media from Instagram
      const { data, error } = await supabase.functions.invoke('fetch-instagram-media', {
        body: {
          clientId,
          instagramId: igAccountId,
          mediaType: mediaType === 'VIDEO' ? 'VIDEO' : 'IMAGE',
          limit: 24,
          after: cursor,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      if (isLoadingMore) {
        setMedia(prev => [...prev, ...(data.media || [])]);
      } else {
        setMedia(data.media || []);
      }
      
      setNextCursor(data.nextCursor || null);
      setHasMore(data.hasMore || false);
    } catch (err: any) {
      console.error('Error fetching Instagram media:', err);
      toast({
        title: 'Erro ao carregar mídia',
        description: err.message || 'Não foi possível carregar a mídia do Instagram.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [clientId, mediaType, toast, onOpenChange, instagramAccount]);

  const handleLoadMore = () => {
    if (nextCursor && !loadingMore) {
      fetchInstagramMedia(nextCursor);
    }
  };

  useEffect(() => {
    if (open) {
      setInstagramAccount(null);
      setNextCursor(null);
      setHasMore(false);
      fetchInstagramMedia();
    }
  }, [open]);

  const toggleSelection = (mediaUrl: string) => {
    setSelectedMedia(prev => {
      if (prev.includes(mediaUrl)) {
        return prev.filter(url => url !== mediaUrl);
      }
      if (prev.length >= maxSelection) {
        if (maxSelection === 1) {
          return [mediaUrl];
        }
        toast({
          title: 'Limite atingido',
          description: `Você pode selecionar no máximo ${maxSelection} itens.`,
        });
        return prev;
      }
      return [...prev, mediaUrl];
    });
  };

  // Check if URL is already from our storage (permanent URL)
  const isStorageUrl = (url: string): boolean => {
    return url.includes('supabase.co/storage') || url.includes('.supabase.co');
  };

  // Copy external images to our storage to get permanent URLs
  const copyImagesToStorage = async (imageUrls: string[]): Promise<string[]> => {
    const permanentUrls: string[] = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      setCopyProgress({ current: i + 1, total: imageUrls.length });
      
      // Skip if already a storage URL
      if (isStorageUrl(url)) {
        permanentUrls.push(url);
        continue;
      }
      
      try {
        const { data, error } = await supabase.functions.invoke('copy-external-image', {
          body: { imageUrl: url, folder: 'instagram-media' }
        });
        
        if (error) throw error;
        
        if (data.success && data.url) {
          console.log('Image copied successfully:', data.url);
          permanentUrls.push(data.url);
        } else {
          console.error('Failed to copy image:', data.error);
          // Keep original URL as fallback
          permanentUrls.push(url);
          toast({
            title: "Aviso",
            description: `Não foi possível copiar uma imagem. Usando URL original.`,
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error('Error copying image:', err);
        // Keep original URL as fallback
        permanentUrls.push(url);
      }
    }
    
    return permanentUrls;
  };

  const handleConfirm = async () => {
    if (selectedMedia.length === 0) return;

    setCopying(true);
    setCopyProgress({ current: 0, total: selectedMedia.length });

    try {
      // Copy all selected media to our storage
      const permanentUrls = await copyImagesToStorage(selectedMedia);
      
      toast({
        title: "Mídia copiada",
        description: `${permanentUrls.length} item(ns) salvo(s) com sucesso.`,
      });

      onSelect(permanentUrls);
      onOpenChange(false);
    } catch (err) {
      console.error('Error in handleConfirm:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao copiar a mídia.",
        variant: "destructive"
      });
    } finally {
      setCopying(false);
      setCopyProgress({ current: 0, total: 0 });
    }
  };

  const getMediaTypeLabel = () => {
    switch (mediaType) {
      case 'VIDEO':
        return 'vídeos';
      case 'CAROUSEL':
        return 'imagens';
      default:
        return 'imagens';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Selecionar do Instagram
            {instagramAccount && (
              <span className="text-sm font-normal text-muted-foreground">
                @{instagramAccount.username}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {copying ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Copiando mídia... ({copyProgress.current}/{copyProgress.total})
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Salvando no servidor para garantir que não expirem
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Carregando {getMediaTypeLabel()}...
              </p>
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              {mediaType === 'VIDEO' ? (
                <Film className="h-12 w-12 mb-2 opacity-50" />
              ) : (
                <Image className="h-12 w-12 mb-2 opacity-50" />
              )}
              <p>Nenhum {mediaType === 'VIDEO' ? 'vídeo' : 'imagem'} encontrado</p>
            </div>
          ) : (
            <ScrollArea className="h-[450px]">
              <div className="p-1">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {media.map((item) => {
                    const isSelected = selectedMedia.includes(item.media_url);
                    const thumbnailUrl = item.thumbnail_url || item.media_url;
                    
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSelection(item.media_url)}
                        className={cn(
                          'relative aspect-square rounded-lg overflow-hidden cursor-pointer group transition-all',
                          'border-2',
                          isSelected 
                            ? 'border-primary ring-2 ring-primary/30' 
                            : 'border-transparent hover:border-muted-foreground/30'
                        )}
                      >
                        <img
                          src={thumbnailUrl}
                          alt={item.caption?.slice(0, 50) || 'Instagram media'}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                            <div className="bg-primary text-primary-foreground rounded-full p-1.5">
                              <Check className="h-4 w-4" />
                            </div>
                          </div>
                        )}

                        {/* Video indicator */}
                        {item.media_type === 'VIDEO' && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded">
                            <Play className="h-3 w-3" />
                          </div>
                        )}

                        {/* Carousel indicator */}
                        {item.media_type === 'CAROUSEL_ALBUM' && (
                          <div className="absolute top-2 right-2 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs">
                            📷+
                          </div>
                        )}

                        {/* Hover info */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">
                            {item.caption?.slice(0, 40) || 'Sem legenda'}
                            {item.caption && item.caption.length > 40 ? '...' : ''}
                          </p>
                          <p className="text-white/70 text-xs">
                            {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center mt-4 pb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Carregando...
                        </>
                      ) : (
                        'Carregar mais'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedMedia.length} de {maxSelection} selecionado(s)
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={copying}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={selectedMedia.length === 0 || copying}
              >
                {copying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Copiando...
                  </>
                ) : (
                  `Usar selecionado${selectedMedia.length > 1 ? 's' : ''}`
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
