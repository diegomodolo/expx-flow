import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  StudioProject,
  StudioSlide,
  FontPair,
  ImageMode,
  FONT_PAIR_LABELS,
} from "./types";

const ACCENT_COLORS = [
  "#FFD700",
  "#FF4444",
  "#4488FF",
  "#44DD88",
  "#FF8844",
  "#AA44FF",
  "#FF44AA",
  "#44DDFF",
];

const IMAGE_MODES: Array<{ value: ImageMode; label: string }> = [
  { value: "none", label: "Sem imagens" },
  { value: "background", label: "Imagem de fundo" },
  { value: "grid", label: "Grade de imagens" },
  { value: "both", label: "Intercalar ambas" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  project: StudioProject;
  onSlidesRegenerated: (slides: StudioSlide[]) => void;
  onProjectPatched: (patch: Partial<StudioProject>) => void;
}

export function RegenerateModal({
  open,
  onOpenChange,
  project,
  onSlidesRegenerated,
  onProjectPatched,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [slidesCount, setSlidesCount] = useState(6);
  const [imageMode, setImageMode] = useState<ImageMode>("background");
  const [fontPair, setFontPair] = useState<FontPair>("space_inter");
  const [accentColor, setAccentColor] = useState("#FFD700");
  const [isGenerating, setIsGenerating] = useState(false);

  // Inicializa com os dados atuais do projeto
  useEffect(() => {
    if (open) {
      setPrompt(project.prompt ?? "");
      setSlidesCount(project.slides_count ?? 6);
      setImageMode((project.image_mode as ImageMode) ?? "background");
      setFontPair((project.font_pair as FontPair) ?? "space_inter");
      setAccentColor(project.accent_color ?? "#FFD700");
    }
  }, [open, project]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva o tema do carrossel antes de gerar");
      return;
    }
    setIsGenerating(true);
    try {
      // 1. Atualiza o projeto com as novas configs
      const projectPatch: Partial<StudioProject> = {
        prompt,
        slides_count: slidesCount,
        image_mode: imageMode,
        font_pair: fontPair,
        accent_color: accentColor,
        status: "generating",
      };
      const { error: patchError } = await supabase
        .from("carousel_studio_projects")
        .update(projectPatch)
        .eq("id", project.id);
      if (patchError) throw patchError;

      // 2. Chama a edge function de geração de slides
      const { data, error } = await supabase.functions.invoke(
        "generate-carousel-caption",
        {
          body: {
            project_id: project.id,
            prompt,
            slides_count: slidesCount,
            image_mode: imageMode,
            font_pair: fontPair,
            accent_color: accentColor,
            regenerate_all: true,
          },
        },
      );

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Falha ao gerar");

      // 3. Busca os slides atualizados
      const { data: newSlides, error: slidesError } = await supabase
        .from("carousel_studio_slides")
        .select("*")
        .eq("project_id", project.id)
        .order("slide_number");
      if (slidesError) throw slidesError;

      onProjectPatched({ ...projectPatch, status: "ready" });
      onSlidesRegenerated(newSlides as StudioSlide[]);

      toast.success("Carrossel regenerado com sucesso!");
      onOpenChange(false);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao regenerar carrossel");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Regenerar Carrossel com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Prompt */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tema / Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o tema do carrossel, público-alvo, tom de voz..."
              className="min-h-[100px] text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Edite o prompt original ou reescreva para mudar o conteúdo gerado.
            </p>
          </div>

          {/* Nº de slides */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Número de slides</Label>
              <span className="text-sm text-muted-foreground font-medium">
                {slidesCount}
              </span>
            </div>
            <Slider
              min={3}
              max={12}
              step={1}
              value={[slidesCount]}
              onValueChange={([v]) => setSlidesCount(v)}
            />
          </div>

          {/* Modo de imagem */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Modo de imagem</Label>
            <div className="grid grid-cols-2 gap-2">
              {IMAGE_MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setImageMode(m.value)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    imageMode === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fonte */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Par de fontes</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FONT_PAIR_LABELS) as FontPair[]).map((fp) => (
                <button
                  key={fp}
                  onClick={() => setFontPair(fp)}
                  className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                    fontPair === fp
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {FONT_PAIR_LABELS[fp].title} + {FONT_PAIR_LABELS[fp].subtitle}
                </button>
              ))}
            </div>
          </div>

          {/* Cor de destaque */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cor de destaque</Label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    accentColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-8 h-8 rounded-full cursor-pointer border border-border"
                title="Cor personalizada"
              />
            </div>
          </div>

          {/* Botão */}
          <Button
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar novamente
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Os textos dos slides atuais serão substituídos pelo novo conteúdo
            gerado.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
