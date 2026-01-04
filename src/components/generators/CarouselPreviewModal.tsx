import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
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
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  ImageOff,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RegenerateCarouselModal } from "@/components/repositorio-criativos/RegenerateCarouselModal";

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
  onStatusChange?: (status: string) => void;
}

const typeLabels: Record<string, string> = {
  tutorial: "Tutorial/Hack",
  comparison: "Nós vs. Eles",
  behind_scenes: "Bastidores",
  curated_list: "Curadoria",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pendente", icon: Clock, color: "text-yellow-600" },
  { value: "approved", label: "Aprovado", icon: CheckCircle, color: "text-green-600" },
  { value: "rejected", label: "Rejeitado", icon: XCircle, color: "text-red-600" },
  { value: "published", label: "Publicado", icon: Send, color: "text-blue-600" },
];

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  approved: { label: "Aprovado", className: "bg-green-100 text-green-700 border-green-200" },
  rejected: { label: "Rejeitado", className: "bg-red-100 text-red-700 border-red-200" },
  published: { label: "Publicado", className: "bg-blue-100 text-blue-700 border-blue-200" },
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
  onStatusChange,
}: CarouselPreviewModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [previewPlatform, setPreviewPlatform] = useState<'instagram' | 'facebook'>('instagram');
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  const slides = carousel.slides || [];
  const slide = slides[currentSlide];
  const statusConfig = STATUS_BADGES[carousel.status] || STATUS_BADGES.pending;

  // Check for missing images
  const getMissingImagesInfo = () => {
    const totalSlides = slides.length;
    const slidesWithImages = slides.filter(s => s.image_url && s.image_url.trim() !== '').length;
    const missingCount = totalSlides - slidesWithImages;
    return { totalSlides, slidesWithImages, missingCount, hasMissing: missingCount > 0 };
  };

  const missingInfo = getMissingImagesInfo();

  const handleRegenerateComplete = () => {
    setShowRegenerateModal(false);
    // Reload the page to refresh carousel data
    window.location.reload();
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  const clientName = carousel.clients?.name || 'marca_oficial';
  const accountName = clientName.toLowerCase().replace(/\s+/g, '_');

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange) {
      onStatusChange(newStatus);
    } else if (newStatus === 'approved' && onApprove) {
      onApprove();
    } else if (newStatus === 'rejected' && onReject) {
      onReject();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden" hideCloseButton>
        <VisuallyHidden>
          <DialogTitle>Preview do Carrossel</DialogTitle>
        </VisuallyHidden>

        <div className="flex flex-col lg:flex-row h-full max-h-[95vh]">
          {/* Left Column - Controls and Info */}
          <div className="w-full lg:w-[380px] flex flex-col border-r bg-muted/30">
            {/* Header */}
            <div className="p-4 border-b bg-background">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Detalhes do Carrossel</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Status Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <Select value={carousel.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const StatusIcon = STATUS_OPTIONS.find(s => s.value === carousel.status)?.icon || Clock;
                          const statusColor = STATUS_OPTIONS.find(s => s.value === carousel.status)?.color || "";
                          return (
                            <>
                              <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                              <span>{STATUS_BADGES[carousel.status]?.label || "Pendente"}</span>
                            </>
                          );
                        })()}
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${option.color}`} />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Metadata */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</label>
                    <p className="text-sm font-medium mt-1">{typeLabels[carousel.carousel_type] || carousel.carousel_type}</p>
                  </div>
                  
                  {carousel.theme && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tema</label>
                      <p className="text-sm font-medium mt-1">{carousel.theme}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Slides</label>
                    <p className="text-sm font-medium mt-1">{slides.length} slides</p>
                  </div>

                  {carousel.generated_at && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gerado em</label>
                      <p className="text-sm font-medium mt-1">
                        {format(new Date(carousel.generated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Regenerate Missing Images Button */}
                {missingInfo.hasMissing && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 mb-2">
                      <ImageOff className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {missingInfo.missingCount} de {missingInfo.totalSlides} imagens pendentes
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white border-orange-500 hover:border-orange-600"
                      onClick={() => setShowRegenerateModal(true)}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerar Imagens Faltantes
                    </Button>
                  </div>
                )}

                <Separator />

                {/* Caption */}
                {carousel.caption && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Legenda</label>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{carousel.caption}</p>
                  </div>
                )}

                {/* Hashtags */}
                {carousel.hashtags && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Hashtags</label>
                    <p className="text-sm mt-1 text-primary">{carousel.hashtags}</p>
                  </div>
                )}

                {/* CTA */}
                {carousel.cta_text && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">CTA</label>
                    <p className="text-sm mt-1">{carousel.cta_text}</p>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t bg-background space-y-3">
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={onPublishNow}
              >
                <Send className="h-4 w-4 mr-2" />
                Publicar Agora
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={onSchedule}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Agendar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={onSendToPresentation}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Apresentação
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="flex-1 flex flex-col bg-background min-w-0">
            {/* Platform Tabs */}
            <div className="p-4 border-b">
              <Tabs value={previewPlatform} onValueChange={(v) => setPreviewPlatform(v as 'instagram' | 'facebook')}>
                <TabsList className="grid w-full max-w-xs grid-cols-2">
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

            {/* Preview Content */}
            <ScrollArea className="flex-1">
              <div className="flex justify-center p-6">
                {/* Post Mockup */}
                <div className="w-full max-w-sm bg-background border rounded-xl shadow-lg overflow-hidden">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-[2px]">
                      <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                        <span className="text-xs font-semibold">
                          {accountName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className="font-semibold text-sm">{accountName}</span>
                    </div>
                    <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                  </div>

                  {/* Image - Aspect Ratio 4:5 (Instagram standard) */}
                  <div className="relative aspect-[4/5] bg-muted">
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
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {slides.map((_, idx) => (
                            <button
                              key={idx}
                              className={`w-1.5 h-1.5 rounded-full transition-all ${
                                idx === currentSlide ? 'bg-white scale-125' : 'bg-white/50'
                              }`}
                              onClick={() => setCurrentSlide(idx)}
                            />
                          ))}
                        </div>

                        {/* Slide Counter */}
                        <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                          {currentSlide + 1}/{slides.length}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Post Actions */}
                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Heart className="h-6 w-6 hover:text-red-500 cursor-pointer transition-colors" />
                        <MessageCircle className="h-6 w-6 hover:text-primary cursor-pointer transition-colors" />
                        <Share2 className="h-6 w-6 hover:text-primary cursor-pointer transition-colors" />
                      </div>
                      <Bookmark className="h-6 w-6 hover:text-primary cursor-pointer transition-colors" />
                    </div>

                    {/* Likes */}
                    <p className="text-sm font-semibold">1.234 curtidas</p>

                    {/* Caption */}
                    <div className="text-sm">
                      <span className="font-semibold">{accountName}</span>{' '}
                      <span className="text-foreground">
                        {carousel.caption || slide?.body_text || slide?.body || 'Sem legenda'}
                      </span>
                    </div>

                    {/* Hashtags */}
                    {carousel.hashtags && (
                      <p className="text-sm text-primary">{carousel.hashtags}</p>
                    )}

                    {/* View Comments */}
                    <p className="text-sm text-muted-foreground">Ver todos os 42 comentários</p>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Slide Thumbnails */}
            {slides.length > 1 && (
              <div className="p-4 border-t bg-muted/30">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {slides.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`relative flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentSlide 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                    >
                      {s.image_url ? (
                        <img
                          src={s.image_url}
                          alt={`Slide ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                        {idx + 1}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Regenerate Modal */}
      <RegenerateCarouselModal
        open={showRegenerateModal}
        onOpenChange={setShowRegenerateModal}
        carouselId={carousel.id}
        missingCount={missingInfo.missingCount}
        totalSlides={missingInfo.totalSlides}
        onComplete={handleRegenerateComplete}
      />
    </Dialog>
  );
}
