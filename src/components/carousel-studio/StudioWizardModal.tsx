// src/components/carousel-studio/StudioWizardModal.tsx
import React, { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  CarouselStyle,
  FontPair,
  ImageMode,
  WizardConfig,
  FONT_PAIR_LABELS,
} from "./types";
import {
  Sparkles,
  PenLine,
  ChevronLeft,
  Globe,
  Loader2,
  ChevronsUpDown,
  Check,
  User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useClients } from "@/hooks/useClients";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onComplete: (config: WizardConfig) => void;
  isCreating: boolean;
}

const STEPS = 4;

const DEFAULT_CONFIG: WizardConfig = {
  style: "minimalist",
  useAI: true,
  prompt: "",
  referenceImages: [],
  slidesCount: 6,
  imageMode: "grid",
  generateAIImages: true,
  imageStyle: "",
  instagramHandle: "",
  fontPair: "space_inter",
  accentColor: "#FFD700",
  clientId: null,
};

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
  { value: "background", label: "Só imagem de fundo" },
  { value: "grid", label: "Só grade de imagens" },
  { value: "both", label: "Intercalar ambas" },
];

export function StudioWizardModal({
  open,
  onOpenChange,
  onComplete,
  isCreating,
}: Props) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>(DEFAULT_CONFIG);
  const [urlInput, setUrlInput] = useState("");
  const [isAnalyzingUrl, setIsAnalyzingUrl] = useState(false);
  const [urlRationale, setUrlRationale] = useState<string | null>(null);
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const { clients, loading: loadingClients } = useClients();

  const update = (patch: Partial<WizardConfig>) =>
    setConfig((c) => ({ ...c, ...patch }));

  const canAdvance = () => {
    if (step === 3 && config.useAI && !config.prompt.trim()) return false;
    return true;
  };

  const handleNext = () => {
    if (step === 2 && !config.useAI) {
      // Criação manual: pula para passo 4
      setStep(4);
      return;
    }
    if (step === STEPS) {
      onComplete(config);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 4 && !config.useAI) {
      setStep(2);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  };

  const handleAnalyzeUrl = async () => {
    if (!urlInput.trim()) return;
    setIsAnalyzingUrl(true);
    setUrlRationale(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "analyze-carousel-from-url",
        { body: { url: urlInput.trim() } },
      );
      if (error) throw error;
      if (!data?.success)
        throw new Error(data?.error || "Erro ao analisar URL");

      const s = data.suggestion;
      update({
        prompt: s.prompt,
        slidesCount: s.slidesCount,
        imageMode: s.imageMode as ImageMode,
        imageStyle: s.imageStyle,
      });
      setUrlRationale(s.rationale);
      setUrlInput("");
      toast.success(`Conteúdo de "${data.pageTitle}" analisado com sucesso!`);
    } catch (err: unknown) {
      toast.error((err as Error).message || "Erro ao analisar URL");
    } finally {
      setIsAnalyzingUrl(false);
    }
  };

  const handleSelectClient = (clientId: string | null) => {
    setClientPickerOpen(false);
    if (!clientId) {
      update({ clientId: null });
      return;
    }
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    const patch: Partial<WizardConfig> = { clientId };

    // Instagram handle
    if (client.instagram_account?.username) {
      patch.instagramHandle = client.instagram_account.username;
    }

    // Cor de destaque: usa a cor da equipe
    if (client.team?.color) {
      patch.accentColor = client.team.color;
    }

    update(patch);
  };

  const handleReset = () => {
    setStep(1);
    setConfig(DEFAULT_CONFIG);
    setUrlInput("");
    setUrlRationale(null);
    setClientPickerOpen(false);
  };

  React.useEffect(() => {
    if (!open) handleReset();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Indicador de progresso */}
        <div className="flex justify-center gap-2 pt-6">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i + 1 <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="px-8 py-6">
          {/* Passo 1: Estilo */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Escolha o Estilo</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Como você quer que seus posts apareçam
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    [
                      "minimalist",
                      "Minimalista",
                      "Texto em destaque, overlays cinematográficos, tipografia bold",
                    ],
                    [
                      "profile",
                      "Profile (Twitter)",
                      "Estética de screenshot de tweet. Limpo, focado em texto",
                    ],
                  ] as const
                ).map(([value, label, desc]) => (
                  <button
                    key={value}
                    onClick={() => update({ style: value })}
                    className={`p-4 rounded-xl border-2 transition-colors text-left relative ${
                      config.style === value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {config.style === value && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs">
                        ✓
                      </div>
                    )}
                    <div className="w-full h-20 bg-muted rounded-lg mb-3 flex items-center justify-center text-muted-foreground">
                      {value === "minimalist" ? "▬" : "▤"}
                    </div>
                    <div className="font-semibold text-sm">{label}</div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Passo 2: Modo */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Como deseja começar?</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Deixe a IA fazer o trabalho pesado ou comece do zero
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => update({ useAI: true })}
                  className={`p-6 rounded-xl border-2 transition-colors text-center ${
                    config.useAI
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <div className="font-semibold">Usar IA</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    Dê um tópico e criamos slides com conteúdo, layout e imagens
                    automaticamente
                  </div>
                </button>
                <button
                  onClick={() => update({ useAI: false })}
                  className={`p-6 rounded-xl border-2 transition-colors text-center ${
                    !config.useAI
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <PenLine className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <div className="font-semibold">Criação Manual</div>
                  <div className="text-muted-foreground text-xs mt-1">
                    Comece do zero. Adicione slides, escreva textos e faça
                    upload de imagens
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Passo 3: Configurar IA */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Configurar IA</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Diga sobre o que é o conteúdo e como quer o carrossel
                </p>
              </div>

              {/* Campo URL para análise automática */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  IMPORTAR CONTEÚDO DE UMA URL (OPCIONAL)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAnalyzeUrl()}
                    placeholder="https://..."
                    className="text-sm flex-1"
                    disabled={isAnalyzingUrl}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAnalyzeUrl}
                    disabled={!urlInput.trim() || isAnalyzingUrl}
                    className="shrink-0 gap-1"
                  >
                    {isAnalyzingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    {isAnalyzingUrl ? "Analisando..." : "Analisar"}
                  </Button>
                </div>
                {urlRationale && (
                  <div className="flex items-start gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-primary leading-relaxed">
                      {urlRationale}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  SOBRE O QUE É O CONTEÚDO?
                </Label>
                <Textarea
                  value={config.prompt}
                  onChange={(e) => update({ prompt: e.target.value })}
                  className="min-h-[80px] resize-none"
                  placeholder="Ex: 5 prompts ultra realistas para foto de perfil com IA..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  NÚMERO DE SLIDES
                </Label>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => update({ slidesCount: n })}
                      className={`py-2 rounded text-sm transition-colors ${
                        config.slidesCount === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  IMAGENS NO CARROSSEL
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {IMAGE_MODES.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => update({ imageMode: m.value })}
                      className={`py-2 px-3 rounded text-xs transition-colors ${
                        config.imageMode === m.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {config.imageMode !== "none" && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="gen-ai-imgs"
                    checked={config.generateAIImages}
                    onCheckedChange={(v) => update({ generateAIImages: !!v })}
                  />
                  <Label
                    htmlFor="gen-ai-imgs"
                    className="text-xs text-muted-foreground cursor-pointer"
                  >
                    Gerar imagens com IA (Nano Banana Pro)
                  </Label>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  ESTILO DAS IMAGENS (OPCIONAL)
                </Label>
                <Input
                  value={config.imageStyle}
                  onChange={(e) => update({ imageStyle: e.target.value })}
                  className="text-sm"
                  placeholder="Ex: pessoas realistas, fundo claro, foco no rosto..."
                />
              </div>
            </div>
          )}

          {/* Passo 4: Personalizar */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="text-center">
                <h2 className="text-2xl font-bold">Personalizar</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Identidade visual do seu carrossel
                </p>
              </div>

              {/* Seletor de cliente */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3" />
                  CLIENTE (OPCIONAL)
                </Label>
                <Popover
                  open={clientPickerOpen}
                  onOpenChange={setClientPickerOpen}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between text-sm h-9"
                      disabled={loadingClients}
                    >
                      <span className="truncate">
                        {config.clientId
                          ? (clients.find((c) => c.id === config.clientId)
                              ?.name ?? "Cliente selecionado")
                          : "Selecionar cliente..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." />
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-52 overflow-y-auto">
                        {config.clientId && (
                          <CommandItem
                            value="__none__"
                            onSelect={() => handleSelectClient(null)}
                            className="text-muted-foreground text-xs"
                          >
                            Remover seleção
                          </CommandItem>
                        )}
                        {clients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => handleSelectClient(client.id)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                config.clientId === client.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {(client.instagram_account?.profile_picture_url ||
                              client.avatar) && (
                              <img
                                src={
                                  client.instagram_account
                                    ?.profile_picture_url || client.avatar
                                }
                                className="w-5 h-5 rounded-full object-cover mr-2 shrink-0"
                                alt=""
                              />
                            )}
                            <span className="truncate flex-1">
                              {client.name}
                            </span>
                            {client.team?.color && (
                              <span
                                className="w-3 h-3 rounded-full shrink-0 ml-2"
                                style={{
                                  backgroundColor: client.team.color,
                                }}
                              />
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                {/* Preview do cliente selecionado */}
                {config.clientId &&
                  (() => {
                    const c = clients.find((cl) => cl.id === config.clientId);
                    if (!c) return null;
                    return (
                      <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                        {(c.instagram_account?.profile_picture_url ||
                          c.avatar) && (
                          <img
                            src={
                              c.instagram_account?.profile_picture_url ||
                              c.avatar
                            }
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                            alt=""
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium truncate">
                            {c.name}
                          </div>
                          {c.instagram_account?.username && (
                            <div className="text-xs text-muted-foreground truncate">
                              @{c.instagram_account.username}
                            </div>
                          )}
                        </div>
                        {c.team?.color && (
                          <div className="flex items-center gap-1 shrink-0">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: c.team.color }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  @ DO INSTAGRAM (OPCIONAL)
                </Label>
                <Input
                  value={config.instagramHandle}
                  onChange={(e) => update({ instagramHandle: e.target.value })}
                  className="text-sm"
                  placeholder="@seuperfil"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  COMBINAÇÃO DE FONTES
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FONT_PAIR_LABELS) as FontPair[]).map((pair) => {
                    const labels = FONT_PAIR_LABELS[pair];
                    return (
                      <button
                        key={pair}
                        onClick={() => update({ fontPair: pair })}
                        className={`p-3 rounded border text-left transition-colors ${
                          config.fontPair === pair
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="text-sm font-bold text-foreground">
                          {labels.title}
                        </div>
                        <div className="text-xs text-muted-foreground italic">
                          {labels.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  COR DE DESTAQUE (PALAVRAS EM EVIDÊNCIA)
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => update({ accentColor: color })}
                      className={`w-7 h-7 rounded-full border-2 transition-colors ${
                        config.accentColor === color
                          ? "border-foreground"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Input
                  value={config.accentColor}
                  onChange={(e) => update({ accentColor: e.target.value })}
                  className="text-sm font-mono"
                  placeholder="#FFD700 ou vazio para nenhuma"
                />
              </div>
            </div>
          )}
        </div>

        {/* Navegação */}
        <div className="flex items-center justify-between px-8 pb-6">
          {step > 1 ? (
            <Button
              variant="ghost"
              onClick={handleBack}
              className="text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
            </Button>
          ) : (
            <div />
          )}

          <Button
            onClick={handleNext}
            disabled={!canAdvance() || isCreating}
            className="px-8"
          >
            {step === STEPS
              ? isCreating
                ? "Criando..."
                : "⚙ Gerar carrossel"
              : "Continuar →"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
