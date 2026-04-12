import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { CarouselStyle } from "./types";

interface Props {
  style: CarouselStyle;
  onStyleChange: (s: CarouselStyle) => void;
  slideIndex: number;
  slidesTotal: number;
  onPrev: () => void;
  onNext: () => void;
  onOpenCaption: () => void;
}

export function StudioTopBar({
  style,
  onStyleChange,
  slideIndex,
  slidesTotal,
  onPrev,
  onNext,
  onOpenCaption,
}: Props) {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-white/10 bg-[#111] flex-shrink-0">
      <div className="flex gap-1">
        {(["minimalist", "profile"] as CarouselStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => onStyleChange(s)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              style === s
                ? "bg-primary text-white"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {s === "minimalist" ? "Minimalista" : "Profile"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-white/60 text-sm">
        <button
          onClick={onPrev}
          disabled={slideIndex === 0}
          className="disabled:opacity-30 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        Slide {slideIndex + 1} de {slidesTotal}
        <button
          onClick={onNext}
          disabled={slideIndex === slidesTotal - 1}
          className="disabled:opacity-30 hover:text-white transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-white/60 text-xs hover:text-white"
        onClick={onOpenCaption}
      >
        <FileText className="w-4 h-4 mr-1" />
        Gerar Legenda
      </Button>
    </div>
  );
}
