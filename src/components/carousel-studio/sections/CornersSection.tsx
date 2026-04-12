import React from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudioSlide, CornerStyle } from "../types";

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function CornersSection({ slide, onChange }: Props) {
  return (
    <SidebarSection title="Cantos (Decorativos)">
      <Select
        value={slide.corner_style}
        onValueChange={(v) => onChange({ corner_style: v as CornerStyle })}
      >
        <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          <SelectItem value="grid">Grade</SelectItem>
          <SelectItem value="dots">Bolinhas</SelectItem>
          <SelectItem value="horizontal_lines">Linhas horizontais</SelectItem>
          <SelectItem value="diagonal_lines">Linhas diagonais</SelectItem>
          <SelectItem value="diagonal_shadow">Sombra diagonal</SelectItem>
        </SelectContent>
      </Select>

      <div className="space-y-2">
        <Label className="text-xs text-white/60">
          Opacidade: {slide.corner_opacity}%
        </Label>
        <Slider
          value={[slide.corner_opacity]}
          onValueChange={([v]) => onChange({ corner_opacity: v })}
          min={0}
          max={100}
          step={1}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={slide.glass_enabled}
          onCheckedChange={(v) => onChange({ glass_enabled: v })}
        />
        <Label className="text-xs text-white/60">Estilo glass</Label>
      </div>

      {slide.glass_enabled && (
        <div className="space-y-2">
          <Label className="text-xs text-white/60">
            Arredondamento: {slide.glass_radius}px
          </Label>
          <Slider
            value={[slide.glass_radius]}
            onValueChange={([v]) => onChange({ glass_radius: v })}
            min={0}
            max={40}
            step={1}
          />
        </div>
      )}
    </SidebarSection>
  );
}
