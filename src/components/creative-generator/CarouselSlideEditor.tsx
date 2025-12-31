import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface CarouselSlide {
  headline: string;
  description: string;
}

interface CarouselSlideEditorProps {
  slides: CarouselSlide[];
  onChange: (slides: CarouselSlide[]) => void;
  minSlides?: number;
  maxSlides?: number;
}

export function CarouselSlideEditor({
  slides,
  onChange,
  minSlides = 2,
  maxSlides = 10,
}: CarouselSlideEditorProps) {
  const handleSlideChange = (index: number, field: keyof CarouselSlide, value: string) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    onChange(newSlides);
  };

  const handleAddSlide = () => {
    if (slides.length >= maxSlides) return;
    onChange([...slides, { headline: "", description: "" }]);
  };

  const handleRemoveSlide = (index: number) => {
    if (slides.length <= minSlides) return;
    onChange(slides.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Slides do Carrossel ({slides.length}/{maxSlides})
        </Label>
        {slides.length < maxSlides && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSlide}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar Slide
          </Button>
        )}
      </div>

      <ScrollArea className={slides.length > 3 ? "h-[280px]" : ""}>
        <div className="space-y-3 pr-2">
          {slides.map((slide, index) => (
            <Card key={index} className="p-3 bg-background/50 border">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      Slide {index + 1}
                    </span>
                  </div>
                  {slides.length > minSlides && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSlide(index)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Headline *</Label>
                  <Input
                    placeholder="Ex: 50% OFF"
                    value={slide.headline}
                    onChange={(e) => handleSlideChange(index, "headline", e.target.value)}
                    className="text-sm h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    placeholder="Ex: Aproveite a promoção por tempo limitado"
                    value={slide.description}
                    onChange={(e) => handleSlideChange(index, "description", e.target.value)}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <p className="text-xs text-muted-foreground">
        Configure o conteúdo de cada slide. Mínimo {minSlides}, máximo {maxSlides} slides.
      </p>
    </div>
  );
}
