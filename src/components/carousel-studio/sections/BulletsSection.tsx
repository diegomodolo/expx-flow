import React, { useState } from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Circle,
  Square,
  Minus,
  ArrowRight,
  Check,
  Star,
  Ban,
  Plus,
  Trash2,
} from "lucide-react";
import {
  StudioSlide,
  StudioProject,
  BulletIcon,
  TextPosition,
  TextAlignment,
} from "../types";

interface Props {
  slide: StudioSlide;
  project: StudioProject;
  onChange: (patch: Partial<StudioSlide>) => void;
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

const ICONS: Array<{
  value: BulletIcon;
  label: string;
  Icon: React.ElementType;
}> = [
  { value: "none", label: "Sem", Icon: Ban },
  { value: "circle", label: "Círculo", Icon: Circle },
  { value: "square", label: "Quadrado", Icon: Square },
  { value: "dash", label: "Traço", Icon: Minus },
  { value: "arrow", label: "Seta", Icon: ArrowRight },
  { value: "check", label: "Check", Icon: Check },
  { value: "star", label: "Estrela", Icon: Star },
];

function parseBullets(json: string | null): string[] {
  if (!json) return [""];
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) return parsed.length > 0 ? parsed : [""];
  } catch {
    // ignore
  }
  return [""];
}

function serializeBullets(items: string[]): string {
  return JSON.stringify(items);
}

export function BulletsSection({ slide, project, onChange }: Props) {
  const enabled = slide.bullets_enabled ?? false;
  const bullets = parseBullets(slide.bullets_json);
  const icon = slide.bullet_icon ?? "circle";
  const iconColor = slide.bullet_icon_color ?? project.accent_color;
  const iconSize = slide.bullet_icon_size ?? 16;
  const boxEnabled = slide.bullet_box_enabled ?? false;
  const boxColor = slide.bullet_box_color ?? project.accent_color;
  const boxRadius = slide.bullet_box_radius ?? 6;
  const boxPadX = slide.bullet_box_padding_x ?? 12;
  const boxPadY = slide.bullet_box_padding_y ?? 6;
  const fontSize = slide.bullet_font_size ?? 24;
  const lineHeight = slide.bullet_line_height ?? 1.4;
  const gap = slide.bullet_gap ?? 12;
  const position = slide.bullet_position ?? "mid_left";
  const alignment = slide.bullet_alignment ?? "left";
  const padX = slide.bullet_padding_x ?? 64;
  const padY = slide.bullet_padding_y ?? 64;

  const [localIconColor, setLocalIconColor] = useState(iconColor);
  const [localBoxColor, setLocalBoxColor] = useState(boxColor);

  const updateBullets = (items: string[]) => {
    onChange({ bullets_json: serializeBullets(items) });
  };

  const addItem = () => updateBullets([...bullets, ""]);

  const removeItem = (i: number) => {
    const next = bullets.filter((_, idx) => idx !== i);
    updateBullets(next.length > 0 ? next : [""]);
  };

  const updateItem = (i: number, value: string) => {
    const next = [...bullets];
    next[i] = value;
    updateBullets(next);
  };

  return (
    <SidebarSection title="Bullet Points">
      {/* Toggle habilitar */}
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          Habilitar bullets
        </Label>
        <Switch
          checked={enabled}
          onCheckedChange={(v) => onChange({ bullets_enabled: v })}
        />
      </div>

      {enabled && (
        <>
          {/* Lista de items */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Itens</Label>
            {bullets.map((item, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  value={item}
                  onChange={(e) => updateItem(i, e.target.value)}
                  className="bg-background border-border text-foreground text-xs h-8 flex-1"
                  placeholder={`Item ${i + 1}...`}
                />
                <button
                  onClick={() => removeItem(i)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  disabled={bullets.length === 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7 gap-1"
              onClick={addItem}
            >
              <Plus className="w-3 h-3" />
              Adicionar item
            </Button>
          </div>

          {/* Icone */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Ícone</Label>
            <div className="grid grid-cols-4 gap-1">
              {ICONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onChange({ bullet_icon: value })}
                  className={`h-8 rounded flex items-center justify-center transition-colors ${
                    icon === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Cor e tamanho do icone */}
          {icon !== "none" && (
            <>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Cor do ícone
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={localIconColor}
                    onChange={(e) => setLocalIconColor(e.target.value)}
                    onBlur={() =>
                      onChange({ bullet_icon_color: localIconColor })
                    }
                    className="w-7 h-7 rounded cursor-pointer border border-border p-0.5 bg-background shrink-0"
                  />
                  <span className="text-xs text-muted-foreground font-mono flex-1">
                    {localIconColor.toUpperCase()}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs text-muted-foreground">
                    Tamanho do ícone
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {iconSize}px
                  </span>
                </div>
                <Slider
                  min={8}
                  max={48}
                  step={2}
                  value={[iconSize]}
                  onValueChange={([v]) => onChange({ bullet_icon_size: v })}
                />
              </div>
            </>
          )}

          {/* Caixa individual */}
          <div className="border-t border-border pt-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Caixa individual
              </Label>
              <Switch
                checked={boxEnabled}
                onCheckedChange={(v) => onChange({ bullet_box_enabled: v })}
              />
            </div>

            {boxEnabled && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Cor da caixa
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localBoxColor}
                      onChange={(e) => setLocalBoxColor(e.target.value)}
                      onBlur={() =>
                        onChange({ bullet_box_color: localBoxColor })
                      }
                      className="w-7 h-7 rounded cursor-pointer border border-border p-0.5 bg-background shrink-0"
                    />
                    <span className="text-xs text-muted-foreground font-mono flex-1">
                      {localBoxColor.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Arredondamento
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {boxRadius}px
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={40}
                    step={2}
                    value={[boxRadius]}
                    onValueChange={([v]) => onChange({ bullet_box_radius: v })}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Padding horizontal
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {boxPadX}px
                    </span>
                  </div>
                  <Slider
                    min={4}
                    max={48}
                    step={2}
                    value={[boxPadX]}
                    onValueChange={([v]) =>
                      onChange({ bullet_box_padding_x: v })
                    }
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Padding vertical
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      {boxPadY}px
                    </span>
                  </div>
                  <Slider
                    min={2}
                    max={32}
                    step={2}
                    value={[boxPadY]}
                    onValueChange={([v]) =>
                      onChange({ bullet_box_padding_y: v })
                    }
                  />
                </div>
              </>
            )}
          </div>

          {/* Tipografia */}
          <div className="border-t border-border pt-2 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Tamanho da fonte
                </Label>
                <span className="text-xs text-muted-foreground">
                  {fontSize}px
                </span>
              </div>
              <Slider
                min={12}
                max={64}
                step={2}
                value={[fontSize]}
                onValueChange={([v]) => onChange({ bullet_font_size: v })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Line height
                </Label>
                <span className="text-xs text-muted-foreground">
                  {lineHeight.toFixed(1)}
                </span>
              </div>
              <Slider
                min={1}
                max={2.5}
                step={0.1}
                value={[lineHeight]}
                onValueChange={([v]) => onChange({ bullet_line_height: v })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Espaço entre itens
                </Label>
                <span className="text-xs text-muted-foreground">{gap}px</span>
              </div>
              <Slider
                min={0}
                max={64}
                step={4}
                value={[gap]}
                onValueChange={([v]) => onChange({ bullet_gap: v })}
              />
            </div>
          </div>

          {/* Posicao e alinhamento */}
          <div className="border-t border-border pt-2 space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">
                Posição
              </Label>
              <div className="grid grid-cols-3 gap-1">
                {POSITIONS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => onChange({ bullet_position: p.value })}
                    className={`h-8 rounded text-sm transition-colors ${
                      position === p.value
                        ? "bg-primary text-white"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
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
                  onClick={() => onChange({ bullet_alignment: a })}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${
                    alignment === a
                      ? "bg-primary text-white"
                      : "bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {a === "left" ? "ESQ" : a === "center" ? "CTR" : "DIR"}
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Margem horizontal
                </Label>
                <span className="text-xs text-muted-foreground">{padX}px</span>
              </div>
              <Slider
                min={0}
                max={300}
                step={4}
                value={[padX]}
                onValueChange={([v]) => onChange({ bullet_padding_x: v })}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Margem vertical
                </Label>
                <span className="text-xs text-muted-foreground">{padY}px</span>
              </div>
              <Slider
                min={0}
                max={400}
                step={4}
                value={[padY]}
                onValueChange={([v]) => onChange({ bullet_padding_y: v })}
              />
            </div>
          </div>
        </>
      )}
    </SidebarSection>
  );
}
