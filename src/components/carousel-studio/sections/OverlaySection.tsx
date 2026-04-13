import React, { useState } from "react";
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

const PRESET_COLORS = [
  "#000000",
  "#1a1a2e",
  "#0f3460",
  "#16213e",
  "#1b1b2f",
  "#2c003e",
  "#ffffff",
  "#c9a84c",
];

export function OverlaySection({ slide, onChange }: Props) {
  const activeColor = slide.overlay_color ?? "#000000";
  const [localColor, setLocalColor] = useState(activeColor);

  return (
    <SidebarSection title="Sombra / Overlay">
      <Select
        value={slide.overlay_style}
        onValueChange={(v) => onChange({ overlay_style: v as OverlayStyle })}
      >
        <SelectTrigger className="bg-background border-border text-foreground text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Nenhum</SelectItem>
          <SelectItem value="base">Base</SelectItem>
          <SelectItem value="base_strong">Base Forte</SelectItem>
          <SelectItem value="top_strong">Topo Forte</SelectItem>
          <SelectItem value="left">Esquerda</SelectItem>
          <SelectItem value="left_strong">Esquerda Forte</SelectItem>
          <SelectItem value="right">Direita</SelectItem>
          <SelectItem value="right_strong">Direita Forte</SelectItem>
        </SelectContent>
      </Select>

      {slide.overlay_style !== "none" && (
        <>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
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

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Cor do overlay
            </Label>
            <div className="flex flex-wrap gap-1 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  title={c}
                  onClick={() => {
                    setLocalColor(c);
                    onChange({ overlay_color: c });
                  }}
                  className={`w-6 h-6 rounded border-2 transition-transform ${
                    activeColor === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={localColor}
                onChange={(e) => setLocalColor(e.target.value)}
                onBlur={() => onChange({ overlay_color: localColor })}
                className="w-7 h-7 rounded cursor-pointer border border-border p-0.5 bg-background shrink-0"
              />
              <span className="text-xs text-muted-foreground font-mono flex-1">
                {localColor.toUpperCase()}
              </span>
            </div>
          </div>
        </>
      )}
    </SidebarSection>
  );
}
