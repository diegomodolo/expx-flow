import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Layers,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  Calendar,
  FileText,
  Instagram,
  Facebook,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Slide {
  slide_number?: number;
  position?: number;
  type?: string;
  headline?: string;
  body_text?: string;
  body?: string;
  image_url?: string;
  visual_description?: string;
  cta?: string;
}

interface Carousel {
  id: string;
  carousel_type: string;
  slides: Slide[];
  caption: string | null;
  hashtags?: string | null;
  cta_text: string | null;
  theme: string | null;
  status: string;
  generated_at?: string;
  clients?: { name: string; company?: string } | null;
}

interface CarouselPreviewModalProps {
  carousel: Carousel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove?: () => void;
  onReject?: () => void;
  onPublishNow?: () => void;
  onSchedule?: () => void;
  onSendToPresentation?: () => void;
}

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial/Hack",
  comparison: "Nós vs. Eles",
  behind_scenes: "Bastidores",
  curated_list: "Curadoria",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  approved: { label: "Aprovado", color: "bg-green-500 text-white" },
  rejected: { label: "Reprovado", color: "bg-red-500 text-white" },
  published: { label: "Publicado", color: "bg-blue-500 text-white" },
};

export function CarouselPreviewModal({
  carousel,
  open,
  onOpenChange,
  onApprove,
  onReject,
  onPublishNow,
  onSchedule,
  onSendToPresentation,
}: CarouselPreviewModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'facebook'>('instagram');

  const slides = carousel.slides || [];
  const slide = slides[currentSlide];
  const statusConfig = STATUS_LABELS[carousel.status] || STATUS_LABELS.pending;

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const clientName = carousel.clients?.name || 'marca_oficial';
  const accountName = clientName.toLowerCase().replace(/\s+/g, '_');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Preview do Carrossel</h2>
          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        </div>

        {/* Platform Tabs */}
        <div className="px-4 pt-2">
          <Tabs value={previewPlatform} onValueChange={(v) => setPreviewPlatform(v as 'instagram' | 'facebook')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="instagram" className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Instagram
              </TabsTrigger>
              <TabsTrigger value="facebook" className="flex items-center gap-2">
                <Facebook className="h-4 w-4" />
                Facebook
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[calc(95vh-280px)]">
          <div className="flex justify-center p-4">
            {/* Post Mockup */}
            <div className="w-full max-w-md bg-background border rounded-lg shadow-sm overflow-hidden">
              {/* Post Header */}
              <div className="flex items-center gap-3 p-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-background flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {accountName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <span className="font-medium text-sm">{accountName}</span>
                <MoreHorizontal className="h-5 w-5 ml-auto text-muted-foreground" />
              </div>

              {/* Image - Aspect Ratio 3:4 */}
              <div className="relative aspect-[3/4] bg-muted">
                {slide?.image_url ? (
                  <img
                    src={slide.image_url}
                    alt={`Slide ${currentSlide + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-violet-500/20 to-violet-500/5 p-6">
                    <Layers className="h-16 w-16 text-violet-500/50 mb-4" />
                    {slide?.headline && (
                      <p className="text-center font-semibold text-lg">{slide.headline}</p>
                    )}
                    {(slide?.body_text || slide?.body) && (
                      <p className="text-center text-sm text-muted-foreground mt-2">
                        {slide.body_text || slide.body}
                      </p>
                    )}
                  </div>
                )}

                {/* Navigation Arrows */}
                {slides.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-8 w-8"
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>

                    {/* Slide Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                      {slides.map((_, idx) => (
                        <button
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            idx === currentSlide ? 'bg-white' : 'bg-white/50'
                          }`}
                          onClick={() => setCurrentSlide(idx)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Post Actions */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Heart className="h-6 w-6" />
                    <MessageCircle className="h-6 w-6" />
                    <Share2 className="h-6 w-6" />
                  </div>
                  <Bookmark className="h-6 w-6" />
                </div>

                {/* Caption */}
                <div className="text-sm">
                  <span className="font-medium">{accountName}</span>{' '}
                  <span className="text-foreground">
                    {carousel.caption || slide?.body_text || slide?.body || 'Sem legenda'}
                  </span>
                </div>

                {/* Hashtags */}
                {carousel.hashtags && (
                  <p className="text-sm text-blue-500">{carousel.hashtags}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{typeLabels[carousel.carousel_type] || carousel.carousel_type}</Badge>
              {carousel.theme && <Badge variant="outline">{carousel.theme}</Badge>}
              {carousel.generated_at && (
                <span>Gerado em {format(new Date(carousel.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="border-t p-4 space-y-3 bg-background">
          {carousel.status === 'pending' && (onApprove || onReject) && (
            <div className="grid grid-cols-2 gap-3">
              <Button 
                className="bg-green-500 hover:bg-green-600 text-white"
                onClick={onApprove}
              >
                <Check className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
              <Button 
                variant="destructive"
                onClick={onReject}
              >
                <X className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button 
              variant="outline" 
              onClick={onPublishNow}
              disabled={!onPublishNow}
            >
              <Send className="h-4 w-4 mr-2" />
              Publicar Agora
            </Button>
            <Button 
              variant="outline" 
              onClick={onSchedule}
              disabled={!onSchedule}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agendar
            </Button>
            <Button 
              variant="outline" 
              onClick={onSendToPresentation}
              disabled={!onSendToPresentation}
            >
              <FileText className="h-4 w-4 mr-2" />
              Apresentação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
