import React, { useRef } from "react";
import { SidebarSection } from "../SidebarSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { StudioSlide, BadgePosition } from "../types";

const POSITIONS: Array<{ value: BadgePosition; label: string }> = [
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

interface Props {
  slide: StudioSlide;
  onChange: (patch: Partial<StudioSlide>) => void;
  /** URL de fallback: foto de perfil do cliente selecionado no projeto */
  clientBadgeUrl?: string | null;
}

export function BadgeSection({ slide, onChange, clientBadgeUrl }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Usa foto específica do slide se disponível, senão cai no cliente selecionado
  const effectiveBadgeUrl = slide.badge_photo_url || clientBadgeUrl || null;
  const badgePosition = slide.badge_position ?? "top_right";
  const badgeSize = slide.badge_size ?? 80;

  return (
    <SidebarSection title="Badge de Perfil">
      <div className="flex items-center gap-2">
        <Switch
          checked={slide.badge_enabled}
          onCheckedChange={(v) => onChange({ badge_enabled: v })}
        />
        <Label className="text-xs text-muted-foreground">Exibir badge</Label>
      </div>

      {slide.badge_enabled && (
        <>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (ev) =>
                onChange({ badge_photo_url: ev.target?.result as string });
              reader.readAsDataURL(file);
            }}
          />

          {/* Preview + botão */}
          <div className="flex items-center gap-3">
            {effectiveBadgeUrl && (
              <div className="flex flex-col items-center gap-1">
                <img
                  src={effectiveBadgeUrl}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  alt="badge"
                />
                {!slide.badge_photo_url && clientBadgeUrl && (
                  <span className="text-[10px] text-muted-foreground">
                    do cliente
                  </span>
                )}
              </div>
            )}
            <button
              className="flex-1 py-2 border border-border rounded text-xs text-muted-foreground hover:bg-muted/50"
              onClick={() => fileRef.current?.click()}
            >
              {effectiveBadgeUrl ? "Trocar foto" : "Adicionar foto"}
            </button>
          </div>

          {/* Posição */}
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">
              Posição do badge
            </Label>
            <div className="grid grid-cols-3 gap-1">
              {POSITIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => onChange({ badge_position: p.value })}
                  className={`h-8 rounded text-sm transition-colors ${
                    badgePosition === p.value
                      ? "bg-primary text-white"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tamanho */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">Tamanho</Label>
              <span className="text-xs text-muted-foreground">
                {badgeSize}px
              </span>
            </div>
            <Slider
              min={40}
              max={200}
              step={4}
              value={[badgeSize]}
              onValueChange={([v]) => onChange({ badge_size: v })}
            />
          </div>
        </>
      )}
    </SidebarSection>
  );
}
