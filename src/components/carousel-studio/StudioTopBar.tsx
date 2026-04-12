import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { CarouselStyle } from "./types";

interface Props {
  style: CarouselStyle;
  onStyleChange: (s: CarouselStyle) => void;
  slideIndex: number;
  slidesTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenCaption: () => void;
  onOpenRegenerate: () => void;
}

export function StudioTopBar({
  style,
  onStyleChange,
  slideIndex,
  slidesTotal,
  onPrev,
  onNext,
  onOpenCaption,
  onOpenRegenerate,
}: Props) {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-card flex-shrink-0">
      <div className="flex gap-1">
        {(["minimalist", "profile"] as CarouselStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => onStyleChange(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              style === s
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {s === "minimalist" ? "Minimalista" : "Profile"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <button
          onClick={onPrev}
          disabled={slideIndex === 0}
          className="disabled:opacity-30 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        Slide {slideIndex + 1} de {slidesTotal}
        <button
          onClick={onNext}
          disabled={slideIndex === slidesTotal - 1}
          className="disabled:opacity-30 hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={onOpenRegenerate}
        >
          <Sparkles className="w-4 h-4 mr-1" />
          Prompt IA
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs hover:text-foreground"
          onClick={onOpenCaption}
        >
          <FileText className="w-4 h-4 mr-1" />
          Legenda
        </Button>
      </div>
    </div>
  );
}
