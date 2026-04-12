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

// Bitmask: bit0=TL, bit1=TR, bit2=BL, bit3=BR
const CORNER_BITS = [
  { bit: 0, label: "↖" },
  { bit: 1, label: "↗" },
  { bit: 2, label: "↙" },
  { bit: 3, label: "↘" },
];

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
}

export function CornersSection({ slide, onChange }: Props) {
  const mask = slide.corner_mask ?? 15; // default: todos os cantos

  const toggleCorner = (bit: number) => {
    const newMask = mask ^ (1 << bit);
    onChange({ corner_mask: newMask });
  };

  return (
    <SidebarSection title="Cantos (Decorativos)">
      <Select
        value={slide.corner_style}
        onValueChange={(v) => onChange({ corner_style: v as CornerStyle })}
      >
        <SelectTrigger className="bg-background border-border text-foreground text-xs">
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

      {slide.corner_style !== "none" && (
        <>
          {/* Seleção de cantos */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Cantos ativos
            </Label>
            <div className="grid grid-cols-2 gap-1 w-24">
              {CORNER_BITS.map(({ bit, label }) => {
                const active = !!(mask & (1 << bit));
                return (
                  <button
                    key={bit}
                    onClick={() => toggleCorner(bit)}
                    className={`h-8 w-10 rounded text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
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
        </>
      )}

      <div className="flex items-center gap-2">
        <Switch
          checked={slide.glass_enabled}
          onCheckedChange={(v) => onChange({ glass_enabled: v })}
        />
        <Label className="text-xs text-muted-foreground">Estilo glass</Label>
      </div>

      {slide.glass_enabled && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
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
