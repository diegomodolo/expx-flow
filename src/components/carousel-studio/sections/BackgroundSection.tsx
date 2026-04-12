import React, { useRef } from "react";
import { SidebarSection } from "../SidebarSection";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ImageIcon, Clipboard, X } from "lucide-react";
import { StudioSlide, StudioProject } from "../types";

interface Props {
  slide: StudioSlide;
  slides: StudioSlide[];
  project: StudioProject;
  onChange: (patch: Partial<StudioSlide>) => void;
  onProjectChange: (patch: Partial<StudioProject>) => void;
  onSlidesBatchChange: (ids: string[], patch: Partial<StudioSlide>) => void;
  onGenerateAIImage: () => void;
  isGeneratingImage: boolean;
}

export function BackgroundSection({
  slide,
  slides,
  project,
  onChange,
  onProjectChange,
  onSlidesBatchChange,
  onGenerateAIImage,
  isGeneratingImage,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const sharedFileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File, shared = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result as string;
      if (shared) {
        onProjectChange({ shared_bg_image_url: url });
      } else {
        onChange({ bg_image_url: url });
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async (shared = false) => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            handleFile(new File([blob], "pasted.png", { type }), shared);
            return;
          }
        }
      }
    } catch {
      // clipboard sem permissão — silencioso
    }
  };

  const useShared = slide.use_shared_bg ?? false;
  const sharedBgUrl = project.shared_bg_image_url ?? null;

  // Quais slides estão usando a imagem compartilhada
  const sharedSlideIds = new Set(
    slides.filter((s) => s.use_shared_bg).map((s) => s.id),
  );

  const toggleSlideShared = (slideId: string) => {
    const on = !sharedSlideIds.has(slideId);
    onSlidesBatchChange([slideId], { use_shared_bg: on });
  };

  const toggleAllShared = () => {
    const allOn = slides.every((s) => s.use_shared_bg);
    onSlidesBatchChange(
      slides.map((s) => s.id),
      { use_shared_bg: !allOn },
    );
  };

  return (
    <SidebarSection title="Imagem de Fundo" defaultOpen>
      {/* ── Imagem individual ── */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      <div className="flex items-center gap-2 mb-1">
        <Switch
          checked={useShared}
          onCheckedChange={(v) => onChange({ use_shared_bg: v })}
        />
        <Label className="text-xs text-muted-foreground">
          {useShared ? "Usando imagem compartilhada" : "Imagem individual"}
        </Label>
      </div>

      {!useShared && (
        <>
          {slide.bg_image_url && (
            <img
              src={slide.bg_image_url}
              className="w-full h-24 object-cover rounded-md mb-2"
              alt="fundo"
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon className="w-3 h-3 mr-1" /> Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handlePaste(false)}
            >
              <Clipboard className="w-3 h-3 mr-1" /> Colar
            </Button>
          </div>
          {slide.bg_image_url && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-destructive hover:text-destructive"
              onClick={() => onChange({ bg_image_url: null })}
            >
              <X className="w-3 h-3 mr-1" /> Remover imagem
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onGenerateAIImage}
            disabled={isGeneratingImage}
          >
            {isGeneratingImage ? "Gerando..." : "✨ Gerar com IA"}
          </Button>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Posição X: {slide.bg_position_x}%
            </Label>
            <Slider
              value={[slide.bg_position_x]}
              onValueChange={([v]) => onChange({ bg_position_x: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Posição Y: {slide.bg_position_y}%
            </Label>
            <Slider
              value={[slide.bg_position_y]}
              onValueChange={([v]) => onChange({ bg_position_y: v })}
              min={0}
              max={100}
              step={1}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Zoom: {slide.bg_zoom}%
            </Label>
            <Slider
              value={[slide.bg_zoom]}
              onValueChange={([v]) => onChange({ bg_zoom: v })}
              min={50}
              max={200}
              step={1}
            />
          </div>
        </>
      )}

      {/* ── Imagem compartilhada ── */}
      <div className="border-t border-border pt-2 space-y-3">
        <Label className="text-xs font-medium block">
          Imagem Compartilhada (continuidade)
        </Label>

        <input
          ref={sharedFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) =>
            e.target.files?.[0] && handleFile(e.target.files[0], true)
          }
        />

        {sharedBgUrl && (
          <img
            src={sharedBgUrl}
            className="w-full h-24 object-cover rounded-md"
            alt="fundo compartilhado"
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => sharedFileRef.current?.click()}
          >
            <ImageIcon className="w-3 h-3 mr-1" />{" "}
            {sharedBgUrl ? "Trocar" : "Upload"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => handlePaste(true)}
          >
            <Clipboard className="w-3 h-3 mr-1" /> Colar
          </Button>
        </div>
        {sharedBgUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-destructive hover:text-destructive"
            onClick={() => onProjectChange({ shared_bg_image_url: null })}
          >
            <X className="w-3 h-3 mr-1" /> Remover imagem compartilhada
          </Button>
        )}

        {sharedBgUrl && (
          <>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              A imagem se estende horizontalmente pelos slides selecionados —
              cada slide exibe uma fatia contínua.
            </p>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Posição vertical: {project.shared_bg_position_y ?? 50}%
              </Label>
              <Slider
                value={[project.shared_bg_position_y ?? 50]}
                onValueChange={([v]) =>
                  onProjectChange({ shared_bg_position_y: v })
                }
                min={0}
                max={100}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Zoom: {project.shared_bg_zoom ?? 100}%
              </Label>
              <Slider
                value={[project.shared_bg_zoom ?? 100]}
                onValueChange={([v]) => onProjectChange({ shared_bg_zoom: v })}
                min={10}
                max={200}
                step={1}
              />
            </div>

            {/* Seleção de slides */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground">
                  Slides que usam esta imagem
                </Label>
                <button
                  className="text-[10px] text-primary hover:underline"
                  onClick={toggleAllShared}
                >
                  {slides.every((s) => s.use_shared_bg)
                    ? "Desmarcar todos"
                    : "Selecionar todos"}
                </button>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {slides.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleSlideShared(s.id)}
                    className={`h-7 rounded text-xs font-medium transition-colors ${
                      sharedSlideIds.has(s.id)
                        ? "bg-primary text-white"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                    }`}
                  >
                    {s.slide_number}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </SidebarSection>
  );
}
