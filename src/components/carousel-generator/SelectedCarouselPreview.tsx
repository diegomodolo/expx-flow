import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RefreshCw, X, Play } from "lucide-react";
import { SelectedCarousel } from "./InstagramCarouselSelector";

interface SelectedCarouselPreviewProps {
  carousel: SelectedCarousel;
  onChangeClick: () => void;
  onRemove: () => void;
}

export function SelectedCarouselPreview({
  carousel,
  onChangeClick,
  onRemove,
}: SelectedCarouselPreviewProps) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Carrossel de Referência</span>
        <span className="text-xs text-muted-foreground">
          {carousel.children.length} slides
        </span>
      </div>

      {/* Horizontal slides preview */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-2 pb-2">
          {carousel.children.map((child, index) => (
            <div
              key={child.id}
              className="relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border"
            >
              {child.media_type === "VIDEO" ? (
                <div className="relative w-full h-full">
                  <img
                    src={child.thumbnail_url || child.media_url}
                    alt={`Slide ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white" />
                  </div>
                </div>
              ) : (
                <img
                  src={child.media_url}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              {/* Slide number badge */}
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Caption preview */}
      {carousel.caption && (
        <p className="text-xs text-muted-foreground line-clamp-2">
          {carousel.caption}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onChangeClick}
          className="flex-1"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Trocar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-destructive hover:text-destructive"
        >
          <X className="w-3 h-3 mr-1" />
          Remover
        </Button>
      </div>
    </div>
  );
}
