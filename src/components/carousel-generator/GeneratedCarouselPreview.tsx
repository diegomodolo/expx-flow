import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, ChevronLeft, ChevronRight, X, Heart, MessageCircle, Send, Bookmark, CalendarPlus, FileText, Presentation } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { GeneratedSlideEditCard } from "./GeneratedSlideEditCard";
import { SlideImageEditModal } from "./SlideImageEditModal";

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
  clientId: string;
  companyId: string;
  onClose: () => void;
  onScheduleClick?: () => void;
  onSendToContentPlan?: () => void;
  onSendToPresentation?: () => void;
}

export function GeneratedCarouselPreview({
  carouselId,
  clientId,
  companyId,
  onClose,
  onScheduleClick,
  onSendToContentPlan,
  onSendToPresentation,
}: GeneratedCarouselPreviewProps) {
  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [isSlideEditModalOpen, setIsSlideEditModalOpen] = useState(false);

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
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="aspect-[4/5] w-full max-w-[340px] mx-auto rounded-lg" />
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
        className="absolute top-2 right-2 h-7 w-7 z-10"
        onClick={onClose}
      >
        <X className="h-4 w-4" />
      </Button>

      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          Carrossel Gerado!
        </CardTitle>
        <CardDescription className="text-xs">
          {carousel.slides.length} slides • {carousel.carousel_type}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Instagram Mockup */}
        <div className="max-w-[340px] mx-auto">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-sm overflow-hidden">
            {/* Instagram Header */}
            <div className="flex items-center gap-2.5 p-3 border-b border-border/50">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-[2px]">
                <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
                  <span className="text-[9px] font-semibold">IG</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">sua_marca</p>
                <p className="text-[11px] text-muted-foreground">Patrocinado</p>
              </div>
              <button className="text-muted-foreground">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>
            </div>

            {/* Image Container - 4:5 aspect ratio */}
            <div className="relative aspect-[4/5] bg-muted">
              {activeSlide?.image_url ? (
                <img
                  src={activeSlide.image_url}
                  alt={`Slide ${activeSlideIndex + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">
                    Imagem não disponível
                  </p>
                </div>
              )}

              {/* Navigation arrows */}
              {carousel.slides.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full shadow-md bg-white/90 hover:bg-white"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-3 w-3 text-black" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full shadow-md bg-white/90 hover:bg-white"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-3 w-3 text-black" />
                  </Button>
                </>
              )}

              {/* Dots indicator on image */}
              {carousel.slides.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {carousel.slides.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlideIndex(idx)}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-colors",
                        idx === activeSlideIndex 
                          ? "bg-blue-500" 
                          : "bg-white/60"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Instagram Actions */}
            <div className="p-2.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <Heart className="w-5 h-5" />
                  <MessageCircle className="w-5 h-5" />
                  <Send className="w-5 h-5" />
                </div>
                <Bookmark className="w-5 h-5" />
              </div>
              
              <p className="text-[10px] font-semibold mb-1">1.234 curtidas</p>
              <p className="text-[10px] line-clamp-2">
                <span className="font-semibold">sua_marca</span>{" "}
                {carousel.caption?.substring(0, 60) || activeSlide?.headline}...
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Slide {activeSlideIndex + 1}/{carousel.slides.length}
              </p>
            </div>
          </div>
        </div>

        {/* Individual Slide Editing Section */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Editar Slides Individuais
          </p>
          <div className="grid grid-cols-5 gap-2">
            {carousel.slides.map((slide, idx) => (
              <GeneratedSlideEditCard
                key={idx}
                slide={slide}
                onEditClick={() => {
                  setEditingSlideIndex(idx);
                  setIsSlideEditModalOpen(true);
                }}
                isEditing={editingSlideIndex === idx && isSlideEditModalOpen}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2">
          <Button 
            onClick={() => {
              if (onScheduleClick) {
                onScheduleClick();
              } else {
                toast.info("Agendar publicação - em breve!");
              }
            }}
            className="w-full"
            size="sm"
          >
            <CalendarPlus className="w-3.5 h-3.5 mr-2" />
            Agendar Publicação
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <Button 
              onClick={() => {
                if (onSendToContentPlan) {
                  onSendToContentPlan();
                } else {
                  toast.info("Enviar para planejamento - em breve!");
                }
              }}
              variant="outline"
              size="sm"
            >
              <FileText className="w-3.5 h-3.5 mr-2" />
              Planejamento
            </Button>
            
            <Button 
              onClick={() => {
                if (onSendToPresentation) {
                  onSendToPresentation();
                } else {
                  toast.info("Enviar para apresentação - em breve!");
                }
              }}
              variant="outline"
              size="sm"
            >
              <Presentation className="w-3.5 h-3.5 mr-2" />
              Apresentação
            </Button>
          </div>
        </div>

        {/* Slide Edit Modal */}
        <SlideImageEditModal
          open={isSlideEditModalOpen}
          onOpenChange={setIsSlideEditModalOpen}
          slideNumber={editingSlideIndex !== null ? editingSlideIndex + 1 : 1}
          currentImageUrl={editingSlideIndex !== null ? carousel.slides[editingSlideIndex]?.image_url || "" : ""}
          carouselId={carouselId}
          clientId={clientId}
          companyId={companyId}
          onImageUpdated={(newUrl) => {
            // Update carousel state locally
            if (editingSlideIndex !== null) {
              const updatedSlides = [...carousel.slides];
              updatedSlides[editingSlideIndex] = {
                ...updatedSlides[editingSlideIndex],
                image_url: newUrl,
              };
              setCarousel({ ...carousel, slides: updatedSlides });
            }
            setEditingSlideIndex(null);
          }}
        />
      </CardContent>
    </Card>
  );
}
