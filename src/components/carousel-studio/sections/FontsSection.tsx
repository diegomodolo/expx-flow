import React, { useCallback, useState } from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Copy } from "lucide-react";
import {
  StudioSlide,
  StudioProject,
  FontPair,
  FONT_PAIR_LABELS,
} from "../types";

interface Props {
  slide: StudioSlide;
  slides: StudioSlide[];
  project: StudioProject;
  onSlideChange: (patch: Partial<StudioSlide>) => void;
  onProjectChange: (patch: Partial<StudioProject>) => void;
  onSlidesBatchChange: (ids: string[], patch: Partial<StudioSlide>) => void;
  applyToNext: boolean;
  onApplyToNextChange: (v: boolean) => void;
}

const FONT_PAIRS = Object.keys(FONT_PAIR_LABELS) as FontPair[];

const HIGHLIGHT_COLORS = [
  "#FFD700",
  "#FF4444",
  "#4488FF",
  "#44DD88",
  "#FF8844",
  "#AA44FF",
  "#FF44AA",
  "#44DDFF",
];

const HIGHLIGHT_WEIGHTS = [
  { value: "400", label: "Regular" },
  { value: "600", label: "Semi" },
  { value: "700", label: "Bold" },
  { value: "900", label: "Black" },
];

/** Strip **…** markers, return array of { word, highlighted } */
function tokenizeHeadline(
  headline: string,
): Array<{ word: string; highlighted: boolean }> {
  // Split preserving **...** groups as single tokens
  const parts = headline.split(/(\*\*[^*]+\*\*)/g);
  const tokens: Array<{ word: string; highlighted: boolean }> = [];
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      // Inside **...** — each word is highlighted
      const inner = part.slice(2, -2);
      const words = inner.split(/\s+/).filter(Boolean);
      for (const w of words) tokens.push({ word: w, highlighted: true });
    } else {
      const words = part.split(/\s+/).filter(Boolean);
      for (const w of words) tokens.push({ word: w, highlighted: false });
    }
  }
  return tokens;
}

/** Rebuild headline string from tokens, merging consecutive highlighted words into one **group** */
function buildHeadline(
  tokens: Array<{ word: string; highlighted: boolean }>,
): string {
  const parts: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].highlighted) {
      const group: string[] = [];
      while (i < tokens.length && tokens[i].highlighted) {
        group.push(tokens[i].word);
        i++;
      }
      parts.push(`**${group.join(" ")}**`);
    } else {
      parts.push(tokens[i].word);
      i++;
    }
  }
  return parts.join(" ");
}

export function FontsSection({
  slide,
  slides,
  project,
  onSlideChange,
  onProjectChange,
  onSlidesBatchChange,
  applyToNext,
  onApplyToNextChange,
}: Props) {
  const [customHighlightColor, setCustomHighlightColor] = useState(
    slide.highlight_color ?? project.accent_color,
  );

  const subsequentIds = useCallback((): string[] => {
    const idx = slides.findIndex((s) => s.id === slide.id);
    return slides.slice(idx + 1).map((s) => s.id);
  }, [slides, slide.id]);

  const handleChange = useCallback(
    (patch: Partial<StudioSlide>) => {
      onSlideChange(patch);
      if (applyToNext) {
        const ids = subsequentIds();
        if (ids.length > 0) onSlidesBatchChange(ids, patch);
      }
    },
    [applyToNext, onSlideChange, onSlidesBatchChange, subsequentIds],
  );

  // Toggle highlight on a specific word index in the headline
  const toggleWordHighlight = useCallback(
    (wordIndex: number) => {
      const headline = slide.headline ?? "";
      const tokens = tokenizeHeadline(headline);
      if (wordIndex >= tokens.length) return;
      tokens[wordIndex] = {
        ...tokens[wordIndex],
        highlighted: !tokens[wordIndex].highlighted,
      };
      handleChange({ headline: buildHeadline(tokens) });
    },
    [slide.headline, handleChange],
  );

  const tokens = tokenizeHeadline(slide.headline ?? "");
  const hasHighlights = tokens.some((t) => t.highlighted);
  const activeHighlightColor = slide.highlight_color ?? project.accent_color;
  const activeHighlightWeight = slide.highlight_weight ?? null;

  const handleCopyLayout = () => {
    const allOtherIds = slides
      .filter((s) => s.id !== slide.id)
      .map((s) => s.id);
    if (allOtherIds.length === 0) return;
    const patch: Partial<StudioSlide> = {
      font_size_title: slide.font_size_title,
      font_size_subtitle: slide.font_size_subtitle,
      line_spacing: slide.line_spacing,
      line_spacing_subtitle: slide.line_spacing_subtitle,
      title_subtitle_gap: slide.title_subtitle_gap,
      text_position: slide.text_position,
      text_alignment: slide.text_alignment,
      text_padding_x: slide.text_padding_x,
      text_padding_y: slide.text_padding_y,
      highlight_weight: slide.highlight_weight,
      highlight_color: slide.highlight_color,
    };
    onSlidesBatchChange(allOtherIds, patch);
  };

  return (
    <SidebarSection title="Fontes">
      {/* Par de fontes */}
      <div className="grid grid-cols-2 gap-2">
        {FONT_PAIRS.map((pair) => {
          const labels = FONT_PAIR_LABELS[pair];
          const isSelected = project.font_pair === pair;
          return (
            <button
              key={pair}
              onClick={() => onProjectChange({ font_pair: pair })}
              className={`p-2 rounded border text-left transition-colors ${
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
            </button>
          );
        })}
      </div>

      {/* Tamanhos */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Tamanho título: {slide.font_size_title}px
        </Label>
        <Slider
          value={[slide.font_size_title]}
          onValueChange={([v]) => handleChange({ font_size_title: v })}
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
          onValueChange={([v]) => handleChange({ font_size_subtitle: v })}
          min={12}
          max={60}
          step={1}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Espaçamento título: {slide.line_spacing}%
        </Label>
        <Slider
          value={[slide.line_spacing]}
          onValueChange={([v]) => handleChange({ line_spacing: v })}
          min={50}
          max={200}
          step={5}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Espaçamento subtítulo:{" "}
          {slide.line_spacing_subtitle ?? slide.line_spacing}%
        </Label>
        <Slider
          value={[slide.line_spacing_subtitle ?? slide.line_spacing]}
          onValueChange={([v]) => handleChange({ line_spacing_subtitle: v })}
          min={50}
          max={200}
          step={5}
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">
          Espaço título → subtítulo: {slide.title_subtitle_gap ?? 12}px
        </Label>
        <Slider
          value={[slide.title_subtitle_gap ?? 12]}
          onValueChange={([v]) => handleChange({ title_subtitle_gap: v })}
          min={0}
          max={120}
          step={2}
        />
      </div>

      {/* ── Destaque de Palavra ── */}
      {tokens.length > 0 && (
        <div className="border-t border-border pt-3 space-y-3">
          <Label className="text-xs font-medium block">
            Destaque de Palavra
          </Label>

          {/* Chips de palavras */}
          <div className="flex flex-wrap gap-1.5">
            {tokens.map((t, i) => (
              <button
                key={i}
                onClick={() => toggleWordHighlight(i)}
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                  t.highlighted
                    ? "text-white shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                }`}
                style={
                  t.highlighted
                    ? { backgroundColor: activeHighlightColor }
                    : undefined
                }
              >
                {t.word}
              </button>
            ))}
          </div>

          {hasHighlights && (
            <>
              {/* Paleta de cores */}
              <div className="flex flex-wrap gap-1.5">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setCustomHighlightColor(color);
                      handleChange({ highlight_color: color });
                    }}
                    className={`w-7 h-7 rounded border-2 transition-all ${
                      activeHighlightColor === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Cor customizada */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customHighlightColor}
                  onChange={(e) => setCustomHighlightColor(e.target.value)}
                  onBlur={() =>
                    handleChange({ highlight_color: customHighlightColor })
                  }
                  className="w-7 h-7 rounded cursor-pointer border border-border p-0.5 bg-background shrink-0"
                />
                <span className="text-xs text-muted-foreground font-mono flex-1">
                  {customHighlightColor.toUpperCase()}
                </span>
                <div
                  className="w-7 h-7 rounded border border-border shrink-0"
                  style={{ backgroundColor: activeHighlightColor }}
                />
              </div>

              {/* Peso do destaque */}
              <div className="grid grid-cols-4 gap-1">
                {HIGHLIGHT_WEIGHTS.map((w) => (
                  <button
                    key={w.value}
                    onClick={() =>
                      handleChange({
                        highlight_weight:
                          activeHighlightWeight === w.value ? null : w.value,
                      })
                    }
                    className={`h-7 rounded text-xs transition-colors ${
                      activeHighlightWeight === w.value
                        ? "bg-primary text-white"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    }`}
                    style={{ fontWeight: w.value }}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Aplicar nos slides seguintes */}
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

      {/* Copiar layout */}
      <button
        onClick={handleCopyLayout}
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded border border-border text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <Copy className="w-3 h-3" />
        Copiar layout
      </button>
    </SidebarSection>
  );
}
