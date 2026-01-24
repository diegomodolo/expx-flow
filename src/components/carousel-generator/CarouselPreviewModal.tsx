import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Download, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Slide = {
  slide_number?: number;
  headline?: string;
  body?: string;
  image_url?: string;
  imageUrl?: string;
};

type CarouselData = {
  id: string;
  carousel_type: string;
  theme: string | null;
  status: string;
  created_at: string;
  slides: Slide[];
  caption: string | null;
  client: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
};

interface CarouselPreviewModalProps {
  carousel: CarouselData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CarouselPreviewModal({
  carousel,
  open,
  onOpenChange,
}: CarouselPreviewModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [captionCopied, setCaptionCopied] = useState(false);

  const slides = Array.isArray(carousel.slides) ? carousel.slides : [];
  const totalSlides = slides.length;

  const getImageUrl = (slide: Slide): string | null => {
    return slide?.image_url || slide?.imageUrl || null;
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : totalSlides - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : 0));
  };

  const handleDownloadSlide = async () => {
    const slide = slides[currentSlide];
    const imageUrl = getImageUrl(slide);
    if (!imageUrl) {
      toast.error("Imagem não disponível");
      return;
    }

    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `carrossel-slide-${currentSlide + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Slide baixado!");
    } catch {
      toast.error("Erro ao baixar imagem");
    }
  };

  const handleDownloadAll = async () => {
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const imageUrl = getImageUrl(slide);
      if (!imageUrl) continue;

      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `carrossel-slide-${i + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        // Small delay between downloads
        await new Promise((r) => setTimeout(r, 300));
      } catch {
        console.error(`Erro ao baixar slide ${i + 1}`);
      }
    }
    toast.success("Todos os slides foram baixados!");
  };

  const handleCopyCaption = () => {
    if (!carousel.caption) return;
    navigator.clipboard.writeText(carousel.caption);
    setCaptionCopied(true);
    toast.success("Legenda copiada!");
    setTimeout(() => setCaptionCopied(false), 2000);
  };

  const currentSlideData = slides[currentSlide];
  const currentImageUrl = getImageUrl(currentSlideData);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      tutorial: "Tutorial",
      comparison: "Comparação",
      behind_scenes: "Bastidores",
      curated_list: "Lista Curada",
    };
    return labels[type] || type;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">
                {carousel.client?.name || "Carrossel"}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{getTypeLabel(carousel.carousel_type)}</Badge>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(carousel.created_at), "dd MMM yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadSlide}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Slide
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                <Download className="w-4 h-4 mr-2" />
                Baixar Todos
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-0">
          {/* Image Preview */}
          <div className="relative bg-muted aspect-[4/5] lg:aspect-auto lg:h-[60vh]">
            {currentImageUrl ? (
              <img
                src={currentImageUrl}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                Imagem não disponível
              </div>
            )}

            {/* Navigation */}
            {totalSlides > 1 && (
              <>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
                  onClick={handleNext}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </>
            )}

            {/* Slide indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentSlide ? "bg-primary" : "bg-white/50"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="border-l p-4 overflow-auto max-h-[60vh] space-y-4">
            {/* Slide Info */}
            <div>
              <p className="text-sm font-medium mb-2">
                Slide {currentSlide + 1} de {totalSlides}
              </p>
              {currentSlideData?.headline && (
                <p className="text-sm text-muted-foreground">
                  {currentSlideData.headline}
                </p>
              )}
            </div>

            {/* Thumbnails */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Slides</p>
              <div className="grid grid-cols-4 gap-2">
                {slides.map((slide, idx) => {
                  const thumbUrl = getImageUrl(slide);
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`aspect-[4/5] rounded border-2 overflow-hidden transition-colors ${
                        idx === currentSlide
                          ? "border-primary"
                          : "border-transparent hover:border-muted-foreground/30"
                      }`}
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          {idx + 1}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Caption */}
            {carousel.caption && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Legenda</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCaption}
                    className="h-7"
                  >
                    {captionCopied ? (
                      <Check className="w-3 h-3 mr-1" />
                    ) : (
                      <Copy className="w-3 h-3 mr-1" />
                    )}
                    {captionCopied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {carousel.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
