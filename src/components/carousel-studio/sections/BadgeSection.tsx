import React, { useRef } from "react";
import { X, CopyCheck } from "lucide-react";
import { SidebarSection } from "../SidebarSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  StudioSlide,
  StudioProject,
  BadgePosition,
  BadgeHandlePosition,
} from "../types";

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

const HANDLE_POSITIONS: Array<{ value: BadgeHandlePosition; label: string }> = [
  { value: "above", label: "Cima" },
  { value: "left", label: "Esq" },
  { value: "right", label: "Dir" },
  { value: "below", label: "Baixo" },
];

const FONT_WEIGHTS: Array<{ value: string; label: string }> = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "600", label: "Semi" },
  { value: "700", label: "Bold" },
  { value: "900", label: "Black" },
];

interface Props {
  slide: StudioSlide;
  slides: StudioSlide[];
  project: StudioProject;
  onChange: (patch: Partial<StudioSlide>) => void;
  onProjectChange: (patch: Partial<StudioProject>) => void;
  onSlidesBatchChange: (ids: string[], patch: Partial<StudioSlide>) => void;
  clientBadgeUrl?: string | null;
  /** Nome do cliente selecionado para usar como sugestão */
  clientName?: string | null;
}

export function BadgeSection({
  slide,
  slides,
  project,
  onChange,
  onProjectChange,
  onSlidesBatchChange,
  clientBadgeUrl,
  clientName,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const effectiveBadgeUrl = slide.badge_photo_url || clientBadgeUrl || null;
  const badgePosition = slide.badge_position ?? "top_right";
  const badgeSize = slide.badge_size ?? 80;
  const badgeOffsetX = slide.badge_offset_x ?? 24;
  const badgeOffsetY = slide.badge_offset_y ?? 24;
  const handleEnabled = slide.badge_handle_enabled ?? true;
  const handlePosition = slide.badge_handle_position ?? "below";
  const handleFontSize = slide.badge_handle_font_size ?? 28;
  const nameEnabled = slide.badge_name_enabled ?? false;
  const nameText = slide.badge_name_text ?? "";
  const nameFontSize = slide.badge_name_font_size ?? 32;
  const nameFontWeight = slide.badge_name_font_weight ?? "600";
  const nameLineHeight = slide.badge_name_line_height ?? 4;

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

          {/* Preview + botões */}
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
            {slide.badge_photo_url && (
              <button
                className="p-2 border border-border rounded text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => onChange({ badge_photo_url: null })}
                title="Remover foto"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Posição do badge */}
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

          {/* Tamanho do badge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">
                Tamanho do badge
              </Label>
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

          {/* Padding do badge */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">
                Padding horizontal
              </Label>
              <span className="text-xs text-muted-foreground">
                {badgeOffsetX}px
              </span>
            </div>
            <Slider
              min={0}
              max={120}
              step={4}
              value={[badgeOffsetX]}
              onValueChange={([v]) => onChange({ badge_offset_x: v })}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">
                Padding vertical
              </Label>
              <span className="text-xs text-muted-foreground">
                {badgeOffsetY}px
              </span>
            </div>
            <Slider
              min={0}
              max={120}
              step={4}
              value={[badgeOffsetY]}
              onValueChange={([v]) => onChange({ badge_offset_y: v })}
            />
          </div>

          {/* ── Nome do perfil ─────────────────────────── */}
          <div className="border-t border-border pt-2 space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={nameEnabled}
                onCheckedChange={(v) => {
                  const patch: Partial<StudioSlide> = { badge_name_enabled: v };
                  // Pré-preenche com nome do cliente se ainda não tem texto
                  if (v && !nameText && clientName) {
                    patch.badge_name_text = clientName;
                  }
                  onChange(patch);
                }}
              />
              <Label className="text-xs text-muted-foreground">
                Exibir nome do perfil
              </Label>
            </div>

            {nameEnabled && (
              <>
                <Input
                  value={nameText}
                  onChange={(e) =>
                    onChange({ badge_name_text: e.target.value })
                  }
                  placeholder={clientName ?? "Nome do perfil..."}
                  className="h-8 text-xs"
                />

                <div className="flex items-center justify-between">
                  <Label className="text-xs text-muted-foreground">
                    Tamanho da fonte
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {nameFontSize}px
                  </span>
                </div>
                <Slider
                  min={16}
                  max={72}
                  step={2}
                  value={[nameFontSize]}
                  onValueChange={([v]) => onChange({ badge_name_font_size: v })}
                />

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Peso da fonte
                  </Label>
                  <div className="grid grid-cols-5 gap-1">
                    {FONT_WEIGHTS.map((w) => (
                      <button
                        key={w.value}
                        onClick={() =>
                          onChange({ badge_name_font_weight: w.value })
                        }
                        className={`h-7 rounded text-xs transition-colors ${
                          nameFontWeight === w.value
                            ? "bg-primary text-white"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                        style={{ fontWeight: w.value }}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Espaçamento nome/@
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {nameLineHeight}px
                    </span>
                  </div>
                  <Slider
                    min={-20}
                    max={48}
                    step={1}
                    value={[nameLineHeight]}
                    onValueChange={([v]) =>
                      onChange({ badge_name_line_height: v })
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* ── @handle ────────────────────────────────── */}
          <div className="border-t border-border pt-2 space-y-3">
            <div className="flex items-center gap-2">
              <Switch
                checked={handleEnabled}
                onCheckedChange={(v) => onChange({ badge_handle_enabled: v })}
              />
              <Label className="text-xs text-muted-foreground">
                Exibir @perfil
              </Label>
            </div>

            {handleEnabled && (
              <>
                {/* Texto do @handle */}
                <Input
                  value={project.instagram_handle ?? ""}
                  onChange={(e) =>
                    onProjectChange({ instagram_handle: e.target.value })
                  }
                  placeholder="@seu.perfil"
                  className="h-8 text-xs font-mono"
                />

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Posição do texto
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {HANDLE_POSITIONS.map((p) => (
                      <button
                        key={p.value}
                        onClick={() =>
                          onChange({ badge_handle_position: p.value })
                        }
                        className={`h-7 rounded text-xs transition-colors ${
                          handlePosition === p.value
                            ? "bg-primary text-white"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Tamanho da fonte @
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {handleFontSize}px
                    </span>
                  </div>
                  <Slider
                    min={16}
                    max={60}
                    step={2}
                    value={[handleFontSize]}
                    onValueChange={([v]) =>
                      onChange({ badge_handle_font_size: v })
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* Aplicar para todos os slides */}
          <div className="border-t border-border pt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const allIds = slides
                  .filter((s) => s.id !== slide.id)
                  .map((s) => s.id);
                if (allIds.length === 0) return;
                const patch: Partial<StudioSlide> = {
                  badge_enabled: slide.badge_enabled,
                  badge_photo_url: slide.badge_photo_url,
                  badge_position: slide.badge_position,
                  badge_size: slide.badge_size,
                  badge_handle_enabled: slide.badge_handle_enabled,
                  badge_handle_position: slide.badge_handle_position,
                  badge_handle_font_size: slide.badge_handle_font_size,
                  badge_name_enabled: slide.badge_name_enabled,
                  badge_name_text: slide.badge_name_text,
                  badge_name_font_size: slide.badge_name_font_size,
                  badge_name_font_weight: slide.badge_name_font_weight,
                  badge_name_line_height: slide.badge_name_line_height,
                };
                onSlidesBatchChange(allIds, patch);
              }}
            >
              <CopyCheck className="w-3 h-3 mr-1" />
              Aplicar para todos os slides
            </Button>
          </div>
        </>
      )}
    </SidebarSection>
  );
}
