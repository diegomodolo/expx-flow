import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Instagram, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface CarouselChild {
  id: string;
  media_type: "IMAGE" | "VIDEO";
  media_url: string;
  thumbnail_url?: string;
}

export interface SelectedCarousel {
  id: string;
  media_url: string;
  caption?: string;
  timestamp: string;
  children: CarouselChild[];
}

interface InstagramMedia {
  id: string;
  media_type: string;
  media_url: string;
  caption?: string;
  timestamp: string;
  permalink: string;
}

interface InstagramCarouselSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  instagramId: string;
  onSelect: (carousel: SelectedCarousel) => void;
}

export function InstagramCarouselSelector({
  open,
  onOpenChange,
  clientId,
  instagramId,
  onSelect,
}: InstagramCarouselSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(false);
  const [carousels, setCarousels] = useState<InstagramMedia[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchCarousels = useCallback(async (cursor?: string) => {
    if (!clientId || !instagramId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instagram-media", {
        body: {
          clientId,
          instagramId,
          mediaType: "CAROUSEL_ALBUM",
          limit: 20,
          after: cursor,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Filter only CAROUSEL_ALBUM
      const carouselItems = (data.media || []).filter(
        (m: InstagramMedia) => m.media_type === "CAROUSEL_ALBUM"
      );

      if (cursor) {
        setCarousels((prev) => [...prev, ...carouselItems]);
      } else {
        setCarousels(carouselItems);
      }
      
      setNextCursor(data.nextCursor || null);
      setHasMore(data.hasMore || false);
    } catch (err: any) {
      console.error("Error fetching carousels:", err);
      toast.error("Erro ao buscar carrosséis do Instagram");
    } finally {
      setIsLoading(false);
    }
  }, [clientId, instagramId]);

  useEffect(() => {
    if (open && clientId && instagramId) {
      setCarousels([]);
      setSelectedId(null);
      setNextCursor(null);
      fetchCarousels();
    }
  }, [open, clientId, instagramId, fetchCarousels]);

  const handleLoadMore = () => {
    if (nextCursor && hasMore && !isLoading) {
      fetchCarousels(nextCursor);
    }
  };

  const handleSelectCarousel = async (carousel: InstagramMedia) => {
    setSelectedId(carousel.id);
    setIsLoadingChildren(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("fetch-instagram-carousel-children", {
        body: {
          clientId,
          carouselMediaId: carousel.id,
        },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      const selectedCarousel: SelectedCarousel = {
        id: carousel.id,
        media_url: carousel.media_url,
        caption: carousel.caption,
        timestamp: carousel.timestamp,
        children: data.children || [],
      };

      onSelect(selectedCarousel);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error fetching carousel children:", err);
      toast.error("Erro ao buscar slides do carrossel");
      setSelectedId(null);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5" />
            Selecionar Carrossel do Instagram
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh] pr-4">
          {isLoading && carousels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Buscando carrosséis...</p>
            </div>
          ) : carousels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Instagram className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">Nenhum carrossel encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                O cliente precisa ter carrosséis publicados no Instagram
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {carousels.map((carousel) => (
                  <button
                    key={carousel.id}
                    onClick={() => handleSelectCarousel(carousel)}
                    disabled={isLoadingChildren}
                    className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedId === carousel.id
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <img
                      src={carousel.media_url}
                      alt={carousel.caption?.slice(0, 50) || "Carrossel"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    
                    {/* Carousel indicator */}
                    <div className="absolute top-2 right-2 flex gap-0.5">
                      <ChevronLeft className="w-3 h-3 text-white drop-shadow" />
                      <ChevronRight className="w-3 h-3 text-white drop-shadow" />
                    </div>

                    {/* Selected overlay */}
                    {selectedId === carousel.id && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        {isLoadingChildren ? (
                          <Loader2 className="w-8 h-8 animate-spin text-white" />
                        ) : (
                          <Check className="w-8 h-8 text-white drop-shadow" />
                        )}
                      </div>
                    )}

                    {/* Caption preview on hover */}
                    {carousel.caption && (
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs text-white line-clamp-2">
                          {carousel.caption}
                        </p>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      "Carregar mais"
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
