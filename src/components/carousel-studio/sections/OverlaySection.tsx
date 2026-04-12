import React from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudioSlide, OverlayStyle } from "../types";

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function OverlaySection({ slide, onChange }: Props) {
  return (
    <SidebarSection title="Sombra / Overlay">
      <Select
        value={slide.overlay_style}
        onValueChange={(v) => onChange({ overlay_style: v as OverlayStyle })}
      >
        <SelectTrigger className="bg-white/5 border-white/10 text-white text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          <SelectItem value="base">Base</SelectItem>
          <SelectItem value="top_strong">Topo Forte</SelectItem>
          <SelectItem value="base_strong">Base Forte</SelectItem>
        </SelectContent>
      </Select>
      <div className="space-y-2">
        <Label className="text-xs text-white/60">
          Opacidade: {slide.overlay_opacity}%
        </Label>
        <Slider
          value={[slide.overlay_opacity]}
          onValueChange={([v]) => onChange({ overlay_opacity: v })}
          min={0}
          max={100}
          step={1}
        />
      </div>
    </SidebarSection>
  );
}
