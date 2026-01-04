import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, ImageIcon, Instagram, Megaphone, AlertCircle, LayoutGrid, Images } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreativeReference {
  id: string;
  imageUrl: string;
  name?: string;
  caption?: string;
  type: 'ad' | 'instagram';
}

interface CarouselItem {
  id: string;
  imageUrl: string;
  caption: string;
  children: { id: string; imageUrl: string; mediaType: string }[];
  timestamp: string;
}

interface ReferenceSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
  instagramAccountId?: string;
  companyId: string;
  onSelect: (images: string[]) => void;
  maxSelections?: number;
}

export function ReferenceSelectionDialog({
  open,
  onOpenChange,
  clientId,
  instagramAccountId,
  companyId,
  onSelect,
  maxSelections = 3
}: ReferenceSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState<'ads' | 'instagram' | 'carousels' | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyProgress, setCopyProgress] = useState({ current: 0, total: 0 });
  const [adCreatives, setAdCreatives] = useState<CreativeReference[]>([]);
  const [instagramPosts, setInstagramPosts] = useState<CreativeReference[]>([]);
  const [instagramCarousels, setInstagramCarousels] = useState<CarouselItem[]>([]);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedCarousel, setSelectedCarousel] = useState<CarouselItem | null>(null);
  const [hasAdAccount, setHasAdAccount] = useState(false);
  const [hasInstagram, setHasInstagram] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ads");
  
  // Pagination cursors
  const [nextAdCursor, setNextAdCursor] = useState<string | null>(null);
  const [nextInstagramCursor, setNextInstagramCursor] = useState<string | null>(null);
  const [nextCarouselCursor, setNextCarouselCursor] = useState<string | null>(null);
  const [hasMoreAds, setHasMoreAds] = useState(false);
  const [hasMoreInstagram, setHasMoreInstagram] = useState(false);
  const [hasMoreCarousels, setHasMoreCarousels] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    if (open && companyId) {
      // Reset state when opening
      setAdCreatives([]);
      setInstagramPosts([]);
      setInstagramCarousels([]);
      setNextAdCursor(null);
      setNextInstagramCursor(null);
      setNextCarouselCursor(null);
      setHasMoreAds(false);
      setHasMoreInstagram(false);
      setHasMoreCarousels(false);
      setSelectedImages([]);
      setSelectedCarousel(null);
      fetchReferences();
    }
  }, [open, clientId, instagramAccountId, companyId]);

  const fetchReferences = async (adCursor?: string, instagramCursor?: string, carouselCursor?: string, append = false) => {
    if (!append) {
      setLoading(true);
    }
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('fetch-creative-references', {
        body: { 
          clientId, 
          instagramAccountId, 
          companyId,
          limit: 20,
          adCursor,
          instagramCursor,
          carouselCursor,
          includeCarousels: true
        }
      });

      if (error) throw error;

      if (data.success) {
        if (append) {
          // Append new items to existing ones, avoiding duplicates
          if (adCursor) {
            const existingIds = new Set(adCreatives.map(c => c.id));
            const newAds = (data.adCreatives || []).filter((c: CreativeReference) => !existingIds.has(c.id));
            setAdCreatives(prev => [...prev, ...newAds]);
          }
          if (instagramCursor) {
            const existingIds = new Set(instagramPosts.map(p => p.id));
            const newPosts = (data.instagramPosts || []).filter((p: CreativeReference) => !existingIds.has(p.id));
            setInstagramPosts(prev => [...prev, ...newPosts]);
          }
          if (carouselCursor) {
            const existingIds = new Set(instagramCarousels.map(c => c.id));
            const newCarousels = (data.instagramCarousels || []).filter((c: CarouselItem) => !existingIds.has(c.id));
            setInstagramCarousels(prev => [...prev, ...newCarousels]);
          }
        } else {
          setAdCreatives(data.adCreatives || []);
          setInstagramPosts(data.instagramPosts || []);
          setInstagramCarousels(data.instagramCarousels || []);
        }
        
        setHasAdAccount(data.hasAdAccount || false);
        setHasInstagram(data.hasInstagram || false);
        setNextAdCursor(data.nextAdCursor || null);
        setNextInstagramCursor(data.nextInstagramCursor || null);
        setNextCarouselCursor(data.nextCarouselCursor || null);
        setHasMoreAds(data.hasMoreAds || false);
        setHasMoreInstagram(data.hasMoreInstagram || false);
        setHasMoreCarousels(data.hasMoreCarousels || false);
      } else {
        setError(data.error || "Erro ao buscar referências");
      }
    } catch (err) {
      console.error("Error fetching references:", err);
      setError("Erro ao buscar imagens de referência");
    } finally {
      setLoading(false);
      setLoadingMore(null);
    }
  };

  const loadMoreAds = async () => {
    if (!nextAdCursor || loadingMore) return;
    setLoadingMore('ads');
    await fetchReferences(nextAdCursor, undefined, undefined, true);
  };

  const loadMoreInstagram = async () => {
    if (!nextInstagramCursor || loadingMore) return;
    setLoadingMore('instagram');
    await fetchReferences(undefined, nextInstagramCursor, undefined, true);
  };

  const loadMoreCarousels = async () => {
    if (!nextCarouselCursor || loadingMore) return;
    setLoadingMore('carousels');
    await fetchReferences(undefined, undefined, nextCarouselCursor, true);
  };

  const toggleSelection = (imageUrl: string) => {
    // If in carousel tab, don't allow individual selection
    if (activeTab === "carousels") return;
    
    setSelectedImages(prev => {
      if (prev.includes(imageUrl)) {
        return prev.filter(url => url !== imageUrl);
      }
      if (prev.length >= maxSelections) {
        toast({
          title: "Limite atingido",
          description: `Você pode selecionar no máximo ${maxSelections} imagens.`,
          variant: "destructive"
        });
        return prev;
      }
      return [...prev, imageUrl];
    });
  };

  const selectCarousel = (carousel: CarouselItem) => {
    if (selectedCarousel?.id === carousel.id) {
      setSelectedCarousel(null);
    } else {
      setSelectedCarousel(carousel);
      // Clear individual selections when selecting a carousel
      setSelectedImages([]);
    }
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
          body: { imageUrl: url, folder: 'reference-images' }
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
    // Determine which images to use
    let imagesToCopy: string[] = [];
    
    if (selectedCarousel) {
      // If a carousel is selected, use all its children images
      imagesToCopy = selectedCarousel.children.map(child => child.imageUrl);
    } else if (selectedImages.length > 0) {
      imagesToCopy = selectedImages;
    }
    
    if (imagesToCopy.length === 0) return;
    
    setCopying(true);
    setCopyProgress({ current: 0, total: imagesToCopy.length });
    
    try {
      // Copy all selected images to our storage
      const permanentUrls = await copyImagesToStorage(imagesToCopy);
      
      toast({
        title: selectedCarousel ? "Carrossel importado" : "Imagens copiadas",
        description: selectedCarousel 
          ? `${permanentUrls.length} slides do carrossel importados com sucesso.`
          : `${permanentUrls.length} imagem(ns) salva(s) com sucesso.`,
      });
      
      onSelect(permanentUrls);
      setSelectedImages([]);
      setSelectedCarousel(null);
      onOpenChange(false);
    } catch (err) {
      console.error('Error in handleConfirm:', err);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao copiar as imagens.",
        variant: "destructive"
      });
    } finally {
      setCopying(false);
      setCopyProgress({ current: 0, total: 0 });
    }
  };

  const handleCancel = () => {
    setSelectedImages([]);
    setSelectedCarousel(null);
    onOpenChange(false);
  };

  const renderImageGrid = (
    items: CreativeReference[], 
    emptyMessage: string, 
    noAccountMessage: string, 
    hasAccount: boolean,
    hasMore: boolean,
    onLoadMore: () => void,
    isLoadingMore: boolean
  ) => {
    if (!hasAccount) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{noAccountMessage}</p>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => {
            const isSelected = selectedImages.includes(item.imageUrl);
            const selectionIndex = selectedImages.indexOf(item.imageUrl);
            
            return (
              <div
                key={item.id}
                className={cn(
                  "relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                  isSelected 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => toggleSelection(item.imageUrl)}
              >
                <img
                  src={item.imageUrl}
                  alt={item.name || item.caption || "Referência"}
                  className="w-full h-32 object-cover"
                  loading="lazy"
                />
                
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {selectionIndex + 1}
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className={cn(
                  "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity",
                  isSelected ? "opacity-30" : "opacity-0 hover:opacity-100"
                )}>
                  <Check className="w-8 h-8 text-white" />
                </div>
                
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs truncate">
                    {item.name || item.caption || "Imagem"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Load More Button */}
        {hasMore && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full max-w-xs"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                `Carregar mais (${items.length} carregadas)`
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderCarouselGrid = () => {
    if (!hasInstagram) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Conta do Instagram não configurada para este cliente.</p>
        </div>
      );
    }

    if (instagramCarousels.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <LayoutGrid className="w-12 h-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum carrossel encontrado no Instagram.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Selecione um carrossel para importar todas as suas imagens como referência.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {instagramCarousels.map((carousel) => {
            const isSelected = selectedCarousel?.id === carousel.id;
            
            return (
              <div
                key={carousel.id}
                className={cn(
                  "relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all",
                  isSelected 
                    ? "border-primary ring-2 ring-primary/30" 
                    : "border-transparent hover:border-muted-foreground/30"
                )}
                onClick={() => selectCarousel(carousel)}
              >
                {/* Carousel preview with stacked effect */}
                <div className="relative">
                  <img
                    src={carousel.imageUrl}
                    alt={carousel.caption}
                    className="w-full h-40 object-cover"
                    loading="lazy"
                  />
                  
                  {/* Stacked effect indicator */}
                  <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-1">
                    <Images className="w-3 h-3 text-white" />
                    <span className="text-white text-xs font-medium">{carousel.children.length}</span>
                  </div>
                  
                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className={cn(
                    "absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity",
                    isSelected ? "opacity-30" : "opacity-0 hover:opacity-100"
                  )}>
                    <Check className="w-8 h-8 text-white" />
                  </div>
                </div>
                
                {/* Caption */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-white text-xs truncate">
                    {carousel.caption}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Selected carousel preview */}
        {selectedCarousel && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <h4 className="text-sm font-medium mb-3">
              Slides do carrossel selecionado ({selectedCarousel.children.length} imagens)
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectedCarousel.children.map((child, index) => (
                <div key={child.id} className="relative shrink-0">
                  <img
                    src={child.imageUrl}
                    alt={`Slide ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-md"
                  />
                  <div className="absolute top-1 left-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Load More Button */}
        {hasMoreCarousels && (
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={loadMoreCarousels}
              disabled={loadingMore === 'carousels'}
              className="w-full max-w-xs"
            >
              {loadingMore === 'carousels' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Carregando...
                </>
              ) : (
                `Carregar mais (${instagramCarousels.length} carregados)`
              )}
            </Button>
          </div>
        )}
      </div>
    );
  };

  const totalAvailable = adCreatives.length + instagramPosts.length + instagramCarousels.length;
  const selectionCount = selectedCarousel 
    ? selectedCarousel.children.length 
    : selectedImages.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Selecionar Imagens de Referência
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {activeTab === "carousels" 
              ? "Selecione um carrossel para importar todas as suas imagens."
              : `Selecione até ${maxSelections} imagens dos seus anúncios ou posts do Instagram.`
            }
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {copying ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">
                Copiando imagens... ({copyProgress.current}/{copyProgress.total})
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Salvando no servidor para garantir que não expirem
              </p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Carregando imagens...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => fetchReferences()}>
                Tentar novamente
              </Button>
            </div>
          ) : totalAvailable === 0 && !hasAdAccount && !hasInstagram ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Este cliente não possui conta de anúncios do Meta ou Instagram configurados.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Configure as integrações na aba "Contas & Integrações" para importar imagens.
              </p>
            </div>
          ) : (
            <Tabs 
              value={activeTab} 
              onValueChange={(value) => {
                setActiveTab(value);
                // Clear selections when switching tabs
                if (value === "carousels") {
                  setSelectedImages([]);
                } else {
                  setSelectedCarousel(null);
                }
              }}
              className="h-full flex flex-col"
            >
              <TabsList className="grid w-full grid-cols-3 shrink-0">
                <TabsTrigger value="ads" className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4" />
                  Anúncios ({adCreatives.length}{hasMoreAds ? '+' : ''})
                </TabsTrigger>
                <TabsTrigger value="instagram" className="flex items-center gap-2">
                  <Instagram className="w-4 h-4" />
                  Instagram ({instagramPosts.length}{hasMoreInstagram ? '+' : ''})
                </TabsTrigger>
                <TabsTrigger value="carousels" className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Carrosséis ({instagramCarousels.length}{hasMoreCarousels ? '+' : ''})
                </TabsTrigger>
              </TabsList>
              
              <div className="flex-1 overflow-y-auto mt-4 min-h-0 max-h-[50vh]">
                <TabsContent value="ads" className="mt-0 h-full">
                  {renderImageGrid(
                    adCreatives,
                    "Nenhum criativo de imagem encontrado na conta de anúncios.",
                    "Conta de anúncios do Meta não configurada para este cliente.",
                    hasAdAccount,
                    hasMoreAds,
                    loadMoreAds,
                    loadingMore === 'ads'
                  )}
                </TabsContent>
                
                <TabsContent value="instagram" className="mt-0 h-full">
                  {renderImageGrid(
                    instagramPosts,
                    "Nenhum post de imagem encontrado no Instagram.",
                    "Conta do Instagram não configurada para este cliente.",
                    hasInstagram,
                    hasMoreInstagram,
                    loadMoreInstagram,
                    loadingMore === 'instagram'
                  )}
                </TabsContent>
                
                <TabsContent value="carousels" className="mt-0 h-full">
                  {renderCarouselGrid()}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {selectedCarousel 
              ? `Carrossel com ${selectedCarousel.children.length} imagens selecionado`
              : `${selectedImages.length} de ${maxSelections} selecionadas`
            }
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={copying}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={selectionCount === 0 || copying}
            >
              {copying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Copiando...
                </>
              ) : selectedCarousel ? (
                `Importar Carrossel (${selectedCarousel.children.length} imagens)`
              ) : (
                `Usar Selecionadas (${selectedImages.length})`
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
