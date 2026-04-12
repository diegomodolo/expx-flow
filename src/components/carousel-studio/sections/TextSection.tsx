import React from "react";
import { SidebarSection } from "../SidebarSection";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StudioSlide, TextPosition, TextAlignment } from "../types";
import { Sparkles } from "lucide-react";

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
  onGenerateContent: () => void;
  isGenerating: boolean;
}

const POSITIONS: Array<{ value: TextPosition; label: string }> = [
  { value: "top_left", label: "↖" },
  { value: "top_center", label: "↑" },
  { value: "top_right", label: "↗" },
  { value: "mid_left", label: "←" },
  { value: "center", label: "·" },
  { value: "mid_right", label: "→" },
  { value: "bottom_left", label: "↙" },
  { value: "bottom_center", label: "↓" },
  { value: "bottom_right", label: "↘" },
];

export function TextSection({
  slide,
  onChange,
  onGenerateContent,
  isGenerating,
}: Props) {
  return (
    <SidebarSection title="Título & Subtítulo" defaultOpen>
      <div>
        <Label className="text-xs text-white/60 mb-2 block">
          Posição do texto
        </Label>
        <div className="grid grid-cols-3 gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ text_position: p.value })}
              className={`h-8 rounded text-sm transition-colors ${
                slide.text_position === p.value
                  ? "bg-primary text-white"
                  : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1">
        {(["left", "center", "right"] as TextAlignment[]).map((a) => (
          <button
            key={a}
            onClick={() => onChange({ text_alignment: a })}
            className={`flex-1 py-1 rounded text-xs transition-colors ${
              slide.text_alignment === a
                ? "bg-primary text-white"
                : "bg-white/5 text-white/50"
            }`}
          >
            {a === "left" ? "ESQ" : a === "center" ? "CTR" : "DIR"}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-white/60">Título</Label>
        <Textarea
          value={slide.headline ?? ""}
          onChange={(e) => onChange({ headline: e.target.value })}
          className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
          placeholder="Título do slide..."
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-white/60">Subtítulo</Label>
        <Textarea
          value={slide.subtitle ?? ""}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
          placeholder="Subtítulo..."
        />
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={onGenerateContent}
        disabled={isGenerating}
      >
        <Sparkles className="w-3 h-3 mr-1" />
        {isGenerating ? "Gerando..." : "Gerar conteúdo deste slide com IA"}
      </Button>
    </SidebarSection>
  );
}
