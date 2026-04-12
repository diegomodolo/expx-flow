import React from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  StudioSlide,
  StudioProject,
  FontPair,
  FONT_PAIR_LABELS,
} from "../types";

interface Props {
  slide: StudioSlide;
  project: StudioProject;
  onSlideChange: (patch: Partial<StudioSlide>) => void;
  applyToNext: boolean;
  onApplyToNextChange: (v: boolean) => void;
}

const FONT_PAIRS = Object.keys(FONT_PAIR_LABELS) as FontPair[];

export function FontsSection({
  slide,
  project,
  onSlideChange,
  applyToNext,
  onApplyToNextChange,
}: Props) {
  return (
    <SidebarSection title="Fontes">
      <div className="grid grid-cols-2 gap-2">
        {FONT_PAIRS.map((pair) => {
          const labels = FONT_PAIR_LABELS[pair];
          const isSelected = project.font_pair === pair;
          return (
            <div
              key={pair}
              className={`p-2 rounded border cursor-pointer transition-colors ${
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="text-foreground text-xs font-bold">
                {labels.title}
              </div>
              <div className="text-muted-foreground text-xs italic">
                {labels.subtitle}
              </div>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Tamanho título: {slide.font_size_title}px
        </Label>
        <Slider
          value={[slide.font_size_title]}
          onValueChange={([v]) => onSlideChange({ font_size_title: v })}
          min={16}
          max={120}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Tamanho subtítulo: {slide.font_size_subtitle}px
        </Label>
        <Slider
          value={[slide.font_size_subtitle]}
          onValueChange={([v]) => onSlideChange({ font_size_subtitle: v })}
          min={12}
          max={60}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Espaçamento: {slide.line_spacing}%
        </Label>
        <Slider
          value={[slide.line_spacing]}
          onValueChange={([v]) => onSlideChange({ line_spacing: v })}
          min={100}
          max={200}
          step={5}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="apply-to-next"
          checked={applyToNext}
          onCheckedChange={(v) => onApplyToNextChange(!!v)}
        />
        <Label
          htmlFor="apply-to-next"
          className="text-xs text-muted-foreground cursor-pointer"
        >
          Aplicar configurações no próximo slide
        </Label>
      </div>
    </SidebarSection>
  );
}
