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
import {
  Check,
  ChevronsUpDown,
  Sparkles,
  RefreshCw,
  Wand2,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClients, Client } from "@/hooks/useClients";
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
  const { clients, loading: loadingClients } = useClients();

  const [prompt, setPrompt] = useState("");
  const [slidesCount, setSlidesCount] = useState(6);
  const [imageMode, setImageMode] = useState<ImageMode>("background");
  const [fontPair, setFontPair] = useState<FontPair>("space_inter");
  const [accentColor, setAccentColor] = useState("#FFD700");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const selectedClient: Client | null =
    clients.find((c) => c.id === selectedClientId) ?? null;

  // Inicializa com os dados atuais do projeto
  useEffect(() => {
    if (open) {
      setPrompt(project.prompt ?? "");
      setSlidesCount(project.slides_count ?? 6);
      setImageMode((project.image_mode as ImageMode) ?? "background");
      setFontPair((project.font_pair as FontPair) ?? "space_inter");
      setAccentColor(project.accent_color ?? "#FFD700");
      setSelectedClientId(project.client_id ?? null);
    }
  }, [open, project]);

  const handleGeneratePrompt = async () => {
    if (!selectedClient) {
      toast.error("Selecione um cliente antes de gerar o prompt");
      return;
    }

    setIsGeneratingPrompt(true);
    try {
      // Monta contexto do briefing do cliente
      const briefingParts: string[] = [];
      if (selectedClient.name)
        briefingParts.push(`Cliente: ${selectedClient.name}`);
      if (selectedClient.sector)
        briefingParts.push(`Setor: ${selectedClient.sector}`);
      if (selectedClient.product_name)
        briefingParts.push(`Produto/Serviço: ${selectedClient.product_name}`);
      if (selectedClient.target_audience)
        briefingParts.push(`Público-alvo: ${selectedClient.target_audience}`);
      if (selectedClient.voice_tone)
        briefingParts.push(`Tom de voz: ${selectedClient.voice_tone}`);
      if (selectedClient.objectives)
        briefingParts.push(`Objetivos: ${selectedClient.objectives}`);
      if (selectedClient.ai_briefing)
        briefingParts.push(`Briefing completo: ${selectedClient.ai_briefing}`);

      if (briefingParts.length === 0) {
        toast.error("Este cliente não possui dados de briefing cadastrados");
        return;
      }

      const briefingContext = briefingParts.join("\n");

      const { data, error } = await supabase.functions.invoke("ai-gateway", {
        body: {
          messages: [
            {
              role: "user",
              content: `Com base no briefing do cliente abaixo, crie um prompt detalhado para gerar um carrossel de Instagram com ${slidesCount} slides.\n\nO prompt deve descrever: tema principal, ângulo de abordagem, tom de voz, público-alvo e objetivo de conversão. Deve ser específico e orientado a resultados. Responda APENAS com o prompt, sem introdução ou explicação.\n\n${briefingContext}`,
            },
          ],
          model: "claude-haiku-4-5-20251001",
          max_tokens: 400,
        },
      });

      if (error) throw error;

      const generated =
        data?.content?.[0]?.text ||
        data?.choices?.[0]?.message?.content ||
        null;

      if (!generated) throw new Error("Resposta vazia da IA");

      setPrompt(generated.trim());
      toast.success("Prompt gerado com base no briefing do cliente");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao gerar prompt");
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva o tema do carrossel antes de gerar");
      return;
    }
    setIsGenerating(true);
    try {
      const projectPatch: Partial<StudioProject> = {
        prompt,
        slides_count: slidesCount,
        image_mode: imageMode,
        font_pair: fontPair,
        accent_color: accentColor,
        status: "generating",
        ...(selectedClientId !== undefined && { client_id: selectedClientId }),
      };
      const { error: patchError } = await supabase
        .from("carousel_studio_projects")
        .update(projectPatch)
        .eq("id", project.id);
      if (patchError) throw patchError;

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
          {/* Cliente */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Cliente</Label>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between text-sm h-9"
                  disabled={loadingClients}
                >
                  <span className="truncate">
                    {selectedClient
                      ? selectedClient.name
                      : "Selecionar cliente..."}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                  <CommandGroup className="max-h-56 overflow-y-auto">
                    {selectedClientId && (
                      <CommandItem
                        value="__none__"
                        onSelect={() => {
                          setSelectedClientId(null);
                          setClientPickerOpen(false);
                        }}
                        className="text-muted-foreground text-xs"
                      >
                        Remover seleção
                      </CommandItem>
                    )}
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          setSelectedClientId(client.id);
                          setClientPickerOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedClientId === client.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="truncate">{client.name}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedClient && (
              <div className="flex items-center gap-2 px-1">
                {(selectedClient.instagram_account?.profile_picture_url ||
                  selectedClient.avatar) && (
                  <img
                    src={
                      selectedClient.instagram_account?.profile_picture_url ||
                      selectedClient.avatar
                    }
                    className="w-6 h-6 rounded-full object-cover shrink-0"
                    alt=""
                  />
                )}
                <span className="text-xs text-muted-foreground truncate">
                  {selectedClient.product_name || selectedClient.sector || ""}
                </span>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Tema / Prompt</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary gap-1 px-2"
                onClick={handleGeneratePrompt}
                disabled={isGeneratingPrompt || !selectedClient}
                title={
                  selectedClient
                    ? "Gerar prompt com base no briefing do cliente"
                    : "Selecione um cliente primeiro"
                }
              >
                {isGeneratingPrompt ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Wand2 className="w-3 h-3" />
                )}
                {isGeneratingPrompt ? "Gerando..." : "Gerar pelo briefing"}
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Descreva o tema do carrossel, público-alvo, tom de voz..."
              className="min-h-[100px] text-sm resize-none"
            />
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
