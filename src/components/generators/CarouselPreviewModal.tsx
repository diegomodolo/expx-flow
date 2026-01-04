import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, X, BookOpen, Users, Sparkles, LayoutGrid, Layers } from "lucide-react";

interface Slide {
  position: number;
  type: string;
  headline?: string;
  subheadline?: string;
  body?: string;
  image_url?: string;
  checklist?: string[];
  cta_text?: string;
  testimonial?: string;
  metric?: string;
}

interface Carousel {
  id: string;
  carousel_type: string;
  slides: Slide[];
  caption: string | null;
  cta_text: string | null;
  theme: string | null;
  status: string;
  clients?: { name: string } | null;
}

interface CarouselPreviewModalProps {
  carousel: Carousel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: () => void;
  onReject?: () => void;
}

const typeIcons: Record<string, typeof BookOpen> = {
  tutorial: BookOpen,
  comparison: Users,
  behind_scenes: Sparkles,
  curated_list: LayoutGrid,
};

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial/Hack",
  comparison: "Nós vs. Eles",
  behind_scenes: "Bastidores",
  curated_list: "Curadoria",
};

const slideTypeLabels: Record<string, string> = {
  hook: "Gancho (Capa)",
  retention: "Retenção",
  content: "Conteúdo",
  authority: "Autoridade",
  save_bait: "Resumo (Save-bait)",
  cta: "Call-to-Action",
};

export function CarouselPreviewModal({
  carousel,
  open,
  onOpenChange,
  onApprove,
  onReject,
}: CarouselPreviewModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = carousel.slides || [];
  const slide = slides[currentSlide];
  const TypeIcon = typeIcons[carousel.carousel_type] || Layers;

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5" />
              {carousel.clients?.name || 'Carrossel'}
            </DialogTitle>
            <Badge variant="outline">
              {typeLabels[carousel.carousel_type]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {slides.length > 0 && slide ? (
            <div className="flex flex-col h-full">
              {/* Slide Navigation Dots */}
              <div className="flex justify-center gap-1 mb-4">
                {slides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Slide Content */}
              <div className="flex-1 flex gap-4 min-h-0">
                {/* Image Preview */}
                <div className="w-1/2 bg-muted rounded-lg overflow-hidden relative aspect-square flex-shrink-0">
                  {slide.image_url ? (
                    <img
                      src={slide.image_url}
                      alt={`Slide ${currentSlide + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5">
                      <Layers className="h-16 w-16 text-violet-500/50" />
                    </div>
                  )}
                  
                  {/* Navigation Arrows */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={goToPrevious}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                    onClick={goToNext}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Slide Counter */}
                  <Badge className="absolute bottom-2 right-2 bg-background/80">
                    {currentSlide + 1} / {slides.length}
                  </Badge>
                </div>

                {/* Slide Details */}
                <div className="w-1/2 overflow-y-auto space-y-4">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      {slideTypeLabels[slide.type] || slide.type}
                    </Badge>
                    {slide.headline && (
                      <h3 className="text-lg font-semibold">{slide.headline}</h3>
                    )}
                    {slide.subheadline && (
                      <p className="text-sm text-muted-foreground mt-1">{slide.subheadline}</p>
                    )}
                  </div>

                  {slide.body && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Corpo do texto</h4>
                      <p className="text-sm">{slide.body}</p>
                    </div>
                  )}

                  {slide.testimonial && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Depoimento</h4>
                      <p className="text-sm italic">"{slide.testimonial}"</p>
                    </div>
                  )}

                  {slide.metric && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Métrica</h4>
                      <p className="text-2xl font-bold text-primary">{slide.metric}</p>
                    </div>
                  )}

                  {slide.checklist && slide.checklist.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">Checklist</h4>
                      <ul className="space-y-1">
                        {slide.checklist.map((item, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="h-3 w-3 text-green-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {slide.cta_text && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-1">CTA</h4>
                      <Badge variant="default">{slide.cta_text}</Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption */}
              {carousel.caption && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Legenda do Post</h4>
                  <p className="text-sm whitespace-pre-wrap">{carousel.caption}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Nenhum slide disponível</p>
            </div>
          )}
        </div>

        {carousel.status === 'pending' && (onApprove || onReject) && (
          <DialogFooter className="gap-2">
            {onReject && (
              <Button variant="outline" onClick={onReject}>
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            )}
            {onApprove && (
              <Button onClick={onApprove}>
                <Check className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
