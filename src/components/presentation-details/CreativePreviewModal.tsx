import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  Image,
  Film,
  LayoutGrid,
  Square,
  Calendar,
  Target,
  Hash,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ExtendedPresentationCreative } from "@/hooks/usePresentationMeetings";

interface CreativePreviewModalProps {
  creative: ExtendedPresentationCreative | null;
  onClose: () => void;
}

const CREATIVE_TYPE_LABELS: Record<string, string> = {
  post_unico: "Post Único",
  carrossel: "Carrossel",
  reels: "Reels",
  stories: "Stories",
};

const CREATIVE_TYPE_ICONS: Record<string, React.ElementType> = {
  post_unico: Image,
  carrossel: LayoutGrid,
  reels: Film,
  stories: Square,
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  approved: { label: "Aprovado", color: "bg-green-500 text-white" },
  rejected: { label: "Reprovado", color: "bg-red-500 text-white" },
  resubmitted: { label: "Reenviado", color: "bg-yellow-500 text-white" },
  scheduled: { label: "Agendado", color: "bg-blue-500 text-white" },
};

export function CreativePreviewModal({ creative, onClose }: CreativePreviewModalProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  if (!creative) return null;

  const media = creative.creative_media || [];
  const currentMedia = media[currentMediaIndex];
  const TypeIcon = CREATIVE_TYPE_ICONS[creative.creative_type] || Image;
  const statusConfig = STATUS_LABELS[creative.current_status] || STATUS_LABELS.pending;

  const goNext = () => {
    setCurrentMediaIndex((prev) => (prev + 1) % media.length);
  };

  const goPrev = () => {
    setCurrentMediaIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <Dialog open={!!creative} onOpenChange={() => { onClose(); setCurrentMediaIndex(0); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          {/* Media Section */}
          <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] md:min-h-[500px]">
            {currentMedia ? (
              currentMedia.media_type === 'video' ? (
                <video
                  src={currentMedia.media_url}
                  className="max-w-full max-h-full object-contain"
                  controls
                  autoPlay
                  muted
                />
              ) : (
                <img
                  src={currentMedia.media_url}
                  alt={creative.headline || 'Creative'}
                  className="max-w-full max-h-full object-contain"
                />
              )
            ) : (
              <div className="flex items-center justify-center">
                <TypeIcon className="w-24 h-24 text-muted-foreground" />
              </div>
            )}

            {/* Navigation arrows */}
            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={goPrev}
                >
                  <ChevronLeft className="w-6 h-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full"
                  onClick={goNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </Button>

                {/* Dots indicator */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {media.map((_, idx) => (
                    <button
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        idx === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      onClick={() => setCurrentMediaIndex(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Info Section */}
          <div className="w-full md:w-80 flex flex-col bg-background">
            <DialogHeader className="p-4 border-b">
              <div className="flex items-center gap-2 mb-2">
                <TypeIcon className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {CREATIVE_TYPE_LABELS[creative.creative_type]}
                </span>
                <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
              </div>
              <DialogTitle className="text-left">
                {creative.headline || `Criativo ${creative.order_index + 1}`}
              </DialogTitle>
              {creative.subheadline && (
                <p className="text-sm text-muted-foreground text-left">{creative.subheadline}</p>
              )}
            </DialogHeader>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Schedule */}
                {creative.scheduled_date && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      Data de Publicação
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">
                      {format(new Date(creative.scheduled_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {creative.scheduled_time && ` às ${creative.scheduled_time}`}
                    </p>
                  </div>
                )}

                {/* Objective */}
                {creative.objective && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Target className="w-4 h-4 text-muted-foreground" />
                      Objetivo
                    </div>
                    <p className="text-sm text-muted-foreground pl-6">{creative.objective}</p>
                  </div>
                )}

                {/* Caption */}
                {creative.caption && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Legenda
                    </div>
                    <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                      {creative.caption}
                    </p>
                  </div>
                )}

                {/* Hashtags */}
                {creative.hashtags && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Hash className="w-4 h-4 text-muted-foreground" />
                      Hashtags
                    </div>
                    <p className="text-sm text-blue-500 pl-6">{creative.hashtags}</p>
                  </div>
                )}

                {/* Manager approval */}
                {creative.manager_approved_at && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-600 font-medium">
                      Aprovado pelo Gestor
                    </p>
                    <p className="text-xs text-green-600/70">
                      {format(new Date(creative.manager_approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
