import React, { useRef } from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImageIcon, Clipboard } from "lucide-react";
import { StudioSlide } from "../types";

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
  onGenerateAIImage: () => void;
  isGeneratingImage: boolean;
}

export function BackgroundSection({
  slide,
  onChange,
  onGenerateAIImage,
  isGeneratingImage,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) =>
      onChange({ bg_image_url: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            handleFile(new File([blob], "pasted.png", { type }));
            return;
          }
        }
      }
    } catch {
      // clipboard sem permissão — silencioso
    }
  };

  return (
    <SidebarSection title="Imagem de Fundo" defaultOpen>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {slide.bg_image_url && (
        <img
          src={slide.bg_image_url}
          className="w-full h-24 object-cover rounded-md mb-2"
          alt="fundo"
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => fileRef.current?.click()}
        >
          <ImageIcon className="w-3 h-3 mr-1" /> Upload
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={handlePaste}
        >
          <Clipboard className="w-3 h-3 mr-1" /> Colar
        </Button>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={onGenerateAIImage}
        disabled={isGeneratingImage}
      >
        {isGeneratingImage ? "Gerando..." : "✨ Gerar com IA"}
      </Button>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Posição X: {slide.bg_position_x}%
        </Label>
        <Slider
          value={[slide.bg_position_x]}
          onValueChange={([v]) => onChange({ bg_position_x: v })}
          min={0}
          max={100}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Posição Y: {slide.bg_position_y}%
        </Label>
        <Slider
          value={[slide.bg_position_y]}
          onValueChange={([v]) => onChange({ bg_position_y: v })}
          min={0}
          max={100}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Zoom: {slide.bg_zoom}%
        </Label>
        <Slider
          value={[slide.bg_zoom]}
          onValueChange={([v]) => onChange({ bg_zoom: v })}
          min={50}
          max={200}
          step={1}
        />
      </div>
    </SidebarSection>
  );
}
