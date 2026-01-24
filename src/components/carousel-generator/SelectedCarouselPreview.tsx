import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RefreshCw, X, Play, Sparkles, Loader2 } from "lucide-react";
import { SelectedCarousel } from "./InstagramCarouselSelector";
import { SlideContentCard, SlideContent } from "./SlideContentCard";

interface SelectedCarouselPreviewProps {
  carousel: SelectedCarousel;
  onChangeClick: () => void;
  onRemove: () => void;
  slideContents?: SlideContent[] | null;
  onSlideContentChange?: (index: number, content: SlideContent) => void;
  onGenerateContentClick?: () => void;
  isAnalyzing?: boolean;
}

export function SelectedCarouselPreview({
  carousel,
  onChangeClick,
  onRemove,
  slideContents,
  onSlideContentChange,
  onGenerateContentClick,
  isAnalyzing = false,
}: SelectedCarouselPreviewProps) {
  const hasGeneratedContent = slideContents && slideContents.length > 0;

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Carrossel de Referência</span>
        <span className="text-xs text-muted-foreground">
          {carousel.children.length} slides
        </span>
      </div>

      {/* Horizontal slides preview with content cards below each */}
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-2">
          {carousel.children.map((child, index) => {
            const content = slideContents?.[index];
            
            if (hasGeneratedContent && content && onSlideContentChange) {
              return (
                <SlideContentCard
                  key={child.id}
                  imageUrl={child.media_url}
                  mediaType={child.media_type}
                  thumbnailUrl={child.thumbnail_url}
                  content={content}
                  onContentChange={(updated) => onSlideContentChange(index, updated)}
                />
              );
            }

            // Original image-only view (larger images - 120px)
            return (
              <div
                key={child.id}
                className="relative flex-shrink-0 w-[120px] h-[120px] rounded-md overflow-hidden border"
              >
                {child.media_type === "VIDEO" ? (
                  <div className="relative w-full h-full">
                    <img
                      src={child.thumbnail_url || child.media_url}
                      alt={`Slide ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-6 h-6 text-white" />
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
                <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            );
          })}
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
      <div className="flex flex-wrap gap-2">
        {onGenerateContentClick && (
          <Button
            type="button"
            variant={hasGeneratedContent ? "outline" : "default"}
            size="sm"
            onClick={onGenerateContentClick}
            disabled={isAnalyzing}
            className="flex-1 min-w-[140px]"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1" />
                {hasGeneratedContent ? "Regenerar Conteúdo" : "Gerar Conteúdo com IA"}
              </>
            )}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onChangeClick}
          disabled={isAnalyzing}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Trocar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          disabled={isAnalyzing}
          className="text-destructive hover:text-destructive"
        >
          <X className="w-3 h-3 mr-1" />
          Remover
        </Button>
      </div>
    </div>
  );
}
