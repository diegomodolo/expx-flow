import { useState } from "react";
import { YouTubeSlide } from "@/hooks/useYouTubeSlides";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Pencil,
  Loader2,
  ImageOff,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlideFullscreenViewer } from "./SlideFullscreenViewer";

interface SlideCarouselProps {
  slides: YouTubeSlide[];
  generatingImages: Set<string>;
  onEditSlide: (slide: YouTubeSlide) => void;
  onRegenerateImage: (slideId: string) => void;
}

export function SlideCarousel({
  slides,
  generatingImages,
  onEditSlide,
  onRegenerateImage,
}: SlideCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const completedSlides = slides.filter(s => s.image_url && s.status === "completed");

  // Update current index when carousel changes
  const onSelect = () => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  };

  const handleOpenFullscreen = (index: number) => {
    setFullscreenIndex(index);
    setFullscreenOpen(true);
  };

  if (slides.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nenhum slide gerado ainda</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {slides.map((slide, index) => {
              const isGenerating = generatingImages.has(slide.id);
              const hasImage = slide.image_url && slide.status === "completed";
              const hasError = slide.status === "error";

              return (
                <CarouselItem key={slide.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                  <Card className="overflow-hidden group">
                    <CardContent className="p-0 relative">
                      <AspectRatio ratio={16 / 9}>
                        {isGenerating ? (
                          <div className="w-full h-full bg-muted flex flex-col items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                            <p className="text-sm text-muted-foreground">Gerando...</p>
                          </div>
                        ) : hasImage ? (
                          <img
                            src={slide.image_url!}
                            alt={slide.title}
                            className="w-full h-full object-cover"
                          />
                        ) : hasError ? (
                          <div className="w-full h-full bg-destructive/10 flex flex-col items-center justify-center">
                            <ImageOff className="h-8 w-8 text-destructive mb-2" />
                            <p className="text-sm text-destructive">Erro ao gerar</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => onRegenerateImage(slide.id)}
                            >
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Tentar novamente
                            </Button>
                          </div>
                        ) : (
                          <div className="w-full h-full bg-muted flex flex-col items-center justify-center p-4">
                            <p className="text-sm font-medium text-center mb-1">{slide.title}</p>
                            <p className="text-xs text-muted-foreground text-center line-clamp-3">
                              {slide.content}
                            </p>
                          </div>
                        )}
                      </AspectRatio>

                      {/* Overlay controls */}
                      {hasImage && (
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => handleOpenFullscreen(index)}
                          >
                            <Expand className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onEditSlide(slide)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            onClick={() => onRegenerateImage(slide.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Slide number badge */}
                      <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                        {slide.slide_order}/{slides.length}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Slide title below */}
                  <p className="mt-2 text-sm font-medium truncate px-1">{slide.title}</p>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          
          <CarouselPrevious className="-left-4 md:-left-6" />
          <CarouselNext className="-right-4 md:-right-6" />
        </Carousel>

        {/* Dots indicator */}
        <div className="flex justify-center gap-1 mt-4">
          {slides.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === current ? "bg-primary" : "bg-muted-foreground/30"
              )}
              onClick={() => api?.scrollTo(index)}
            />
          ))}
        </div>
      </div>

      {/* Fullscreen viewer */}
      <SlideFullscreenViewer
        slides={slides}
        open={fullscreenOpen}
        onOpenChange={setFullscreenOpen}
        initialIndex={fullscreenIndex}
        onEditSlide={onEditSlide}
      />
    </>
  );
}
