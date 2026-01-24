import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";

interface CarouselSlide {
  slide_number: number;
  headline: string;
  body_text: string;
  image_url?: string;
}

interface GeneratedSlideEditCardProps {
  slide: CarouselSlide;
  onEditClick: () => void;
  isEditing?: boolean;
}

export function GeneratedSlideEditCard({
  slide,
  onEditClick,
  isEditing = false,
}: GeneratedSlideEditCardProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {/* Image container with 4:5 aspect ratio */}
      <div className="relative aspect-[4/5] rounded-md overflow-hidden border bg-muted">
        {slide.image_url ? (
          <img
            src={slide.image_url}
            alt={`Slide ${slide.slide_number}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-[10px] text-muted-foreground">Sem imagem</p>
          </div>
        )}

        {/* Slide number badge */}
        <div className="absolute top-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
          {slide.slide_number}
        </div>

        {/* Loading overlay */}
        {isEditing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Edit button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onEditClick}
        disabled={isEditing}
        className="h-7 text-xs w-full gap-1"
      >
        <Pencil className="w-3 h-3" />
        Editar
      </Button>
    </div>
  );
}
