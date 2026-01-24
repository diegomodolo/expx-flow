import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselSlide {
  slide_number: number;
  headline: string;
  body_text: string;
  image_url?: string;
}

interface GeneratedCarousel {
  id: string;
  carousel_type: string;
  theme: string;
  slides: CarouselSlide[];
  caption: string;
  hashtags: string;
}

interface GeneratedCarouselPreviewProps {
  carouselId: string;
  onClose: () => void;
  onViewDetails: () => void;
}

export function GeneratedCarouselPreview({
  carouselId,
  onClose,
  onViewDetails,
}: GeneratedCarouselPreviewProps) {
  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  useEffect(() => {
    const fetchCarousel = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("carousel_generation_queue")
          .select("id, carousel_type, theme, slides, caption, hashtags")
          .eq("id", carouselId)
          .single();

        if (error) throw error;
        
        // Parse slides if needed
        const slides = typeof data.slides === "string" 
          ? JSON.parse(data.slides) 
          : data.slides;
        
        setCarousel({
          ...data,
          slides: slides as CarouselSlide[],
        });
      } catch (err) {
        console.error("Error fetching carousel:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCarousel();
  }, [carouselId]);

  const handlePrev = () => {
    if (!carousel) return;
    setActiveSlideIndex((prev) => 
      prev === 0 ? carousel.slides.length - 1 : prev - 1
    );
  };

  const handleNext = () => {
    if (!carousel) return;
    setActiveSlideIndex((prev) => 
      prev === carousel.slides.length - 1 ? 0 : prev + 1
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-[3/4] w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  if (!carousel) {
    return null;
  }

  const activeSlide = carousel.slides[activeSlideIndex];

  return (
    <Card className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          Carrossel Gerado!
        </CardTitle>
        <CardDescription>
          {carousel.slides.length} slides • {carousel.carousel_type}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Carousel viewer */}
        <div className="relative">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted">
            {activeSlide?.image_url ? (
              <img
                src={activeSlide.image_url}
                alt={`Slide ${activeSlideIndex + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  Imagem não disponível
                </p>
              </div>
            )}
          </div>

          {/* Navigation arrows */}
          {carousel.slides.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full shadow-md"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Dots indicator */}
        {carousel.slides.length > 1 && (
          <div className="flex justify-center gap-1.5">
            {carousel.slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setActiveSlideIndex(idx)}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  idx === activeSlideIndex 
                    ? "bg-primary" 
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}

        {/* Slide info */}
        <div className="space-y-1">
          <p className="text-sm font-medium line-clamp-2">
            {activeSlide?.headline}
          </p>
          <p className="text-xs text-muted-foreground">
            Slide {activeSlideIndex + 1} de {carousel.slides.length}
          </p>
        </div>

        {/* Action button */}
        <Button 
          onClick={onViewDetails} 
          className="w-full"
          variant="outline"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Ver Detalhes e Editar
        </Button>
      </CardContent>
    </Card>
  );
}
