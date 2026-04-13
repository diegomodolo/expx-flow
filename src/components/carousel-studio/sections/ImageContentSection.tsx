import React, { useRef, useState } from "react";
import { X, Upload, Sparkles } from "lucide-react";
import { SidebarSection } from "../SidebarSection";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  StudioSlide,
  StudioProject,
  ContentImageLayout,
  ContentImagePosition,
} from "../types";

const BUCKET = "visual-creatives";

async function uploadImageFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `carousel-content/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

interface Props {
  slide: StudioSlide;
  project: StudioProject;
  onChange: (patch: Partial<StudioSlide>) => void;
}

const LAYOUTS: Array<{ value: ContentImageLayout; label: string }> = [
  { value: "1_thumb_16_9", label: "1 thumbnail (16:9)" },
  { value: "1_square", label: "1 quadrada" },
  { value: "2_vertical", label: "2 verticais" },
  { value: "2_thumb_16_9", label: "2 thumbnails (16:9)" },
  { value: "4_square_2x2", label: "4 quadradas (2×2)" },
];

const POSITIONS: Array<{ value: ContentImagePosition; label: string }> = [
  { value: "above_title", label: "Acima do cabeçalho" },
  { value: "between", label: "Após 1º parágrafo" },
  { value: "below_subtitle", label: "Abaixo do texto" },
];

/** Quantas imagens o layout espera */
function layoutSlotCount(layout: ContentImageLayout): number {
  if (layout === "2_vertical" || layout === "2_thumb_16_9") return 2;
  if (layout === "4_square_2x2") return 4;
  return 1;
}

/** Aspect ratio de cada slot */
function layoutAspect(layout: ContentImageLayout): string {
  if (layout === "1_thumb_16_9" || layout === "2_thumb_16_9") return "16/9";
  if (layout === "2_vertical") return "9/16";
  return "1/1";
}

export function ImageContentSection({ slide, project, onChange }: Props) {
  const fileRefs = useRef<Map<number, HTMLInputElement>>(new Map());
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);

  const urls: string[] = (slide.content_image_urls ?? "")
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);

  const layout = slide.content_image_layout ?? "1_thumb_16_9";
  const position = slide.content_image_position ?? "below_subtitle";
  const radius = slide.content_image_radius ?? 12;
  const width = slide.content_image_width ?? 100;
  const gap = slide.content_image_gap ?? 12;
  const slotCount = layoutSlotCount(layout);
  const enabled = urls.length > 0;

  const setUrls = (next: string[]) => {
    onChange({ content_image_urls: next.filter(Boolean).join(",") || null });
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = "";
    setUploadingSlot(index);
    try {
      const url = await uploadImageFile(file);
      const next = [...urls];
      next[index] = url;
      setUrls(next);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao fazer upload da imagem");
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleRemove = (index: number) => {
    const next = [...urls];
    next.splice(index, 1);
    setUrls(next);
  };

  const handleGenerateAI = async (index: number) => {
    const prompt = [
      slide.headline,
      slide.subtitle,
      slide.visual_description,
      project.prompt,
    ]
      .filter(Boolean)
      .join(" — ");

    if (!prompt.trim()) {
      toast.error("Adicione um texto ao slide antes de gerar imagem com IA");
      return;
    }

    toast.info("Gerando imagem com IA...");
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-image-ai",
        {
          body: {
            prompt,
            company_id: project.company_id,
            client_id: project.client_id,
            style: project.image_style ?? "cinematic photography",
            background_only: false,
          },
        },
      );
      if (error) throw error;
      if (!data?.success || !data?.image_url)
        throw new Error(data?.error || "Imagem não gerada");

      const next = [...urls];
      next[index] = data.image_url;
      setUrls(next);
      toast.success("Imagem gerada!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao gerar imagem");
    }
  };

  const aspect = layoutAspect(layout);

  return (
    <SidebarSection title="Imagem de Conteúdo">
      {/* Toggle enable */}
      <div className="flex items-center gap-2">
        <Switch
          checked={enabled}
          onCheckedChange={(v) => {
            if (!v) setUrls([]);
          }}
        />
        <Label className="text-xs text-muted-foreground">
          Exibir imagem no slide
        </Label>
      </div>

      {/* Layout selector */}
      <div className="grid grid-cols-1 gap-1">
        {LAYOUTS.map((l) => (
          <button
            key={l.value}
            onClick={() => onChange({ content_image_layout: l.value })}
            className={`px-3 py-1.5 rounded text-xs text-left transition-colors ${
              layout === l.value
                ? "bg-primary text-white"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Posição */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">
          Posição das imagens
        </Label>
        <div className="grid grid-cols-1 gap-1">
          {POSITIONS.map((p) => (
            <button
              key={p.value}
              onClick={() => onChange({ content_image_position: p.value })}
              className={`px-3 py-1.5 rounded text-xs text-left transition-colors ${
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

      {/* Slots de imagem */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground block">
          {slotCount === 1 ? "Imagem" : `Imagens (${slotCount})`} (
          {aspect.replace("/", ":")} )
        </Label>

        <div
          className={`grid gap-2 ${slotCount === 4 ? "grid-cols-2" : slotCount === 2 ? "grid-cols-2" : "grid-cols-1"}`}
        >
          {Array.from({ length: slotCount }).map((_, i) => {
            const url = urls[i] ?? null;
            return (
              <div key={i} className="relative group">
                <input
                  ref={(el) => {
                    if (el) fileRefs.current.set(i, el);
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, i)}
                />

                {uploadingSlot === i ? (
                  <div
                    className="w-full bg-muted/30 border border-border rounded flex items-center justify-center"
                    style={{ aspectRatio: aspect, borderRadius: radius }}
                  >
                    <span className="text-[10px] text-muted-foreground animate-pulse">
                      Enviando...
                    </span>
                  </div>
                ) : url ? (
                  <div className="relative">
                    <img
                      src={url}
                      alt=""
                      className="w-full object-cover rounded"
                      style={{
                        aspectRatio: aspect,
                        borderRadius: radius,
                      }}
                    />
                    <button
                      onClick={() => handleRemove(i)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="w-full bg-muted/30 border border-dashed border-border rounded flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-colors"
                    style={{ aspectRatio: aspect, borderRadius: radius }}
                    onClick={() => fileRefs.current.get(i)?.click()}
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">
                      Adicionar
                    </span>
                  </div>
                )}

                {/* Botão IA */}
                <button
                  onClick={() => handleGenerateAI(i)}
                  className="mt-1 w-full py-1 rounded border border-border text-[10px] text-muted-foreground hover:bg-muted/50 flex items-center justify-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  Gerar com IA
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controles visuais */}
      <div className="border-t border-border pt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">Largura</Label>
            <span className="text-xs text-muted-foreground">{width}%</span>
          </div>
          <Slider
            min={20}
            max={100}
            step={2}
            value={[width]}
            onValueChange={([v]) => onChange({ content_image_width: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">
              Arredondamento
            </Label>
            <span className="text-xs text-muted-foreground">{radius}px</span>
          </div>
          <Slider
            min={0}
            max={80}
            step={4}
            value={[radius]}
            onValueChange={([v]) => onChange({ content_image_radius: v })}
          />
        </div>

        {slotCount > 1 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs text-muted-foreground">
                Espaço entre imagens
              </Label>
              <span className="text-xs text-muted-foreground">{gap}px</span>
            </div>
            <Slider
              min={0}
              max={48}
              step={4}
              value={[gap]}
              onValueChange={([v]) => onChange({ content_image_gap: v })}
            />
          </div>
        )}
      </div>
    </SidebarSection>
  );
}
