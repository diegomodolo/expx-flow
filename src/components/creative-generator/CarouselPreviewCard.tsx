import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  Download,
  Save,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Função para determinar aspect ratio baseado no tipo de criativo
function getAspectRatioClass(typeKey: string): string {
  const aspectRatioMap: Record<string, string> = {
    'instagram_feed': 'aspect-[3/4]',
    'facebook_feed': 'aspect-[3/4]',
    'linkedin_post': 'aspect-[3/4]',
    'instagram_story': 'aspect-[9/16]',
    'instagram_reels': 'aspect-[9/16]',
    'facebook_story': 'aspect-[9/16]',
    'whatsapp_status': 'aspect-[9/16]',
    'tiktok_video': 'aspect-[9/16]',
    'youtube_thumbnail': 'aspect-video',
    'twitter_post': 'aspect-video',
    'banner_horizontal': 'aspect-[32/10]',
    'banner_vertical': 'aspect-[1/2]',
  };
  return aspectRatioMap[typeKey] || 'aspect-[3/4]';
}

interface CarouselPreviewCardProps {
  images: string[];
  caption: string;
  typeName: string;
  typeKey: string;
  clientId: string;
  clientName: string;
  clientAvatar?: string;
  isRegenerating?: boolean;
  onCaptionChange: (newCaption: string) => void;
  onDownloadAll: () => void;
  onDownloadSlide: (index: number) => void;
  onSave: () => void;
  onSchedule: () => void;
  onRegenerate: () => void;
}

export function CarouselPreviewCard({
  images,
  caption,
  typeName,
  typeKey,
  clientId,
  clientName,
  clientAvatar,
  isRegenerating,
  onCaptionChange,
  onDownloadAll,
  onDownloadSlide,
  onSave,
  onSchedule,
  onRegenerate,
}: CarouselPreviewCardProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [editedCaption, setEditedCaption] = useState(caption);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const handleCaptionSave = () => {
    onCaptionChange(editedCaption);
    setIsEditingCaption(false);
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(caption);
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={clientAvatar} />
            <AvatarFallback className="text-xs">
              {clientName.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{clientName}</p>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                <Layers className="w-2.5 h-2.5 mr-1" />
                {typeName}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {images.length} slides
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Preview */}
      <div className="relative">
        {images.length > 0 && (
          <>
            <div className={`relative bg-muted ${getAspectRatioClass(typeKey)}`}>
              <img
                src={images[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Navigation arrows */}
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full opacity-80 hover:opacity-100"
                onClick={handlePrevSlide}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full opacity-80 hover:opacity-100"
                onClick={handleNextSlide}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Slide indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      idx === currentSlide ? "bg-white" : "bg-white/50"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="p-2 border-t bg-muted/30">
              <div className="flex gap-1 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={cn(
                      "shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-colors",
                      idx === currentSlide
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/50"
                    )}
                  >
                    <img
                      src={img}
                      alt={`Thumb ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Caption */}
      <CardContent className="p-3 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Legenda</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCaption}
              className="h-6 px-2"
            >
              <Copy className="w-3 h-3 mr-1" />
              <span className="text-xs">Copiar</span>
            </Button>
          </div>

          {isEditingCaption ? (
            <div className="space-y-2">
              <Textarea
                value={editedCaption}
                onChange={(e) => setEditedCaption(e.target.value)}
                rows={3}
                className="text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCaptionSave} className="flex-1">
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditingCaption(false);
                    setEditedCaption(caption);
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <p
              className="text-sm cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
              onClick={() => setIsEditingCaption(true)}
            >
              {caption || "Clique para adicionar legenda..."}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadAll}
            className="w-full"
          >
            <Download className="w-3 h-3 mr-1" />
            Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownloadSlide(currentSlide)}
            className="w-full"
          >
            <Download className="w-3 h-3 mr-1" />
            Slide {currentSlide + 1}
          </Button>
          <Button variant="outline" size="sm" onClick={onSave} className="w-full">
            <Save className="w-3 h-3 mr-1" />
            Salvar
          </Button>
          <Button variant="outline" size="sm" onClick={onSchedule} className="w-full">
            <Calendar className="w-3 h-3 mr-1" />
            Agendar
          </Button>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="w-full"
        >
          {isRegenerating ? (
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          Regenerar Carrossel
        </Button>
      </CardContent>
    </Card>
  );
}
