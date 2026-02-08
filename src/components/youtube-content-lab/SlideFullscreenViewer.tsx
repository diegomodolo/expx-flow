import { useState, useEffect, useCallback } from "react";
import { YouTubeSlide } from "@/hooks/useYouTubeSlides";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Pencil,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideFullscreenViewerProps {
  slides: YouTubeSlide[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialIndex?: number;
  onEditSlide?: (slide: YouTubeSlide) => void;
}

export function SlideFullscreenViewer({
  slides,
  open,
  onOpenChange,
  initialIndex = 0,
  onEditSlide,
}: SlideFullscreenViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Reset to initial index when opening
  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex);
    }
  }, [open, initialIndex]);

  const completedSlides = slides.filter(s => s.image_url && s.status === "completed");
  const currentSlide = completedSlides[currentIndex];

  const goToPrevious = useCallback(() => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : completedSlides.length - 1));
  }, [completedSlides.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev < completedSlides.length - 1 ? prev + 1 : 0));
  }, [completedSlides.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          goToPrevious();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNext();
          break;
        case "Escape":
          onOpenChange(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goToPrevious, goToNext, onOpenChange]);

  const handleDownload = async () => {
    if (!currentSlide?.image_url) return;
    
    try {
      const response = await fetch(currentSlide.image_url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `slide-${currentSlide.slide_order}-${currentSlide.title.replace(/\s+/g, "-")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  if (completedSlides.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="text-white">
              <p className="text-sm opacity-70">Slide {currentIndex + 1} de {completedSlides.length}</p>
              <h3 className="text-lg font-semibold">{currentSlide?.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="h-5 w-5" />
              </Button>
              {onEditSlide && currentSlide && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => {
                    onOpenChange(false);
                    onEditSlide(currentSlide);
                  }}
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main image area */}
          <div className="flex-1 flex items-center justify-center p-8 pt-20 pb-20">
            {currentSlide?.image_url && (
              <img
                src={currentSlide.image_url}
                alt={currentSlide.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>

          {/* Navigation arrows */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20 rounded-full"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-8 w-8" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 text-white hover:bg-white/20 rounded-full"
            onClick={goToNext}
          >
            <ChevronRight className="h-8 w-8" />
          </Button>

          {/* Thumbnails */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex justify-center gap-2 overflow-x-auto pb-2">
              {completedSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-9 rounded overflow-hidden border-2 transition-all",
                    index === currentIndex
                      ? "border-primary ring-2 ring-primary/50"
                      : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img
                    src={slide.image_url!}
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
