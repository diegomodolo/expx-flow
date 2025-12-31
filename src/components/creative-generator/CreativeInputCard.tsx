import React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Image,
  Layers,
  Video,
  Sparkles,
  Loader2,
  ImagePlus,
  Instagram,
  X,
  ChevronDown,
} from "lucide-react";
import { CarouselSlideEditor, CarouselSlide } from "./CarouselSlideEditor";
import { cn } from "@/lib/utils";

// Tipos de criativos disponíveis (formatos/plataformas)
export const CREATIVE_TYPES = [
  { id: "instagram_feed", name: "Instagram Feed", dimensions: "1080x1440", aspectRatio: "3:4" },
  { id: "instagram_story", name: "Instagram Story", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "instagram_reels", name: "Instagram Reels", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "facebook_feed", name: "Facebook Feed", dimensions: "1080x1440", aspectRatio: "3:4" },
  { id: "facebook_story", name: "Facebook Story", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "whatsapp_status", name: "WhatsApp Status", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "linkedin_post", name: "LinkedIn Post", dimensions: "1080x1440", aspectRatio: "3:4" },
  { id: "youtube_thumbnail", name: "YouTube Thumbnail", dimensions: "1280x720", aspectRatio: "16:9" },
  { id: "tiktok_video", name: "TikTok", dimensions: "1080x1920", aspectRatio: "9:16" },
  { id: "banner_horizontal", name: "Banner Horizontal", dimensions: "1920x600", aspectRatio: "32:10" },
  { id: "twitter_post", name: "Twitter/X Post", dimensions: "1200x675", aspectRatio: "16:9" },
];

// Tipos de vídeo disponíveis
export const VIDEO_TYPES = [
  { id: "video_reels", name: "Instagram Reels", aspectRatio: "9:16", duration: 5 },
  { id: "video_tiktok", name: "TikTok", aspectRatio: "9:16", duration: 5 },
  { id: "video_shorts", name: "YouTube Shorts", aspectRatio: "9:16", duration: 8 },
  { id: "video_feed", name: "Feed Horizontal", aspectRatio: "16:9", duration: 5 },
  { id: "video_square", name: "Vídeo Quadrado", aspectRatio: "1:1", duration: 5 },
];

export type MediaType = "image" | "carousel" | "video";

export interface CreativeInputData {
  theme: string;
  copyText: string;
  referenceFile?: File;
  referenceUrl?: string;
  mediaType: MediaType;
  creativeType: string;
  // Carrossel
  slides: CarouselSlide[];
  // Vídeo
  videoSettings: {
    duration: number;
    model: "veo-2.0" | "veo-3.1";
    noTextInVideo: boolean;
    videoType: string;
  };
}

interface CreativeInputCardProps {
  index: number;
  data: CreativeInputData;
  onChange: (index: number, data: Partial<CreativeInputData>) => void;
  onGenerateThemeWithAI?: () => void;
  onGenerateCopyWithAI?: () => void;
  onGenerateSlideWithAI?: (slideIndex: number, field: 'headline' | 'description') => void;
  onSelectReference?: () => void;
  onRemoveReference?: () => void;
  onGenerateSingle?: () => void;
  isGeneratingTheme?: boolean;
  isGeneratingCopy?: boolean;
  isGeneratingSingle?: boolean;
  generatingSlideField?: { index: number; field: 'headline' | 'description' } | null;
  hasClientBriefing?: boolean;
  selectedClientId?: string;
  companyId?: string;
}

export function CreativeInputCard({
  index,
  data,
  onChange,
  onGenerateThemeWithAI,
  onGenerateCopyWithAI,
  onGenerateSlideWithAI,
  onSelectReference,
  onRemoveReference,
  onGenerateSingle,
  isGeneratingTheme,
  isGeneratingCopy,
  isGeneratingSingle,
  generatingSlideField,
  hasClientBriefing,
  selectedClientId,
  companyId,
}: CreativeInputCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const handleMediaTypeChange = (mediaType: MediaType) => {
    const updates: Partial<CreativeInputData> = { mediaType };
    
    // Ajustar tipo de criativo padrão baseado no tipo de mídia
    if (mediaType === "video") {
      updates.creativeType = "video_reels";
    } else if (mediaType === "carousel") {
      updates.creativeType = "instagram_feed";
      // Inicializar slides se não existirem
      if (!data.slides || data.slides.length < 2) {
        updates.slides = [
          { headline: "", description: "" },
          { headline: "", description: "" },
        ];
      }
    } else {
      updates.creativeType = "instagram_feed";
    }
    
    onChange(index, updates);
  };

  const handleReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onChange(index, { referenceFile: file, referenceUrl: undefined });
    }
  };

  const getMediaTypeBadge = () => {
    switch (data.mediaType) {
      case "image":
        return (
          <Badge variant="secondary" className="gap-1">
            <Image className="w-3 h-3" /> Imagem
          </Badge>
        );
      case "carousel":
        return (
          <Badge variant="secondary" className="gap-1">
            <Layers className="w-3 h-3" /> Carrossel
          </Badge>
        );
      case "video":
        return (
          <Badge variant="secondary" className="gap-1">
            <Video className="w-3 h-3" /> Vídeo
          </Badge>
        );
    }
  };

  const getCreativeTypeLabel = () => {
    if (data.mediaType === "video") {
      return VIDEO_TYPES.find((t) => t.id === data.creativeType)?.name || data.creativeType;
    }
    return CREATIVE_TYPES.find((t) => t.id === data.creativeType)?.name || data.creativeType;
  };

  return (
    <Card className="border overflow-hidden">
      {/* Header */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="p-3 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Criativo {index + 1}</span>
              {getMediaTypeBadge()}
              <Badge variant="outline" className="text-xs">
                {getCreativeTypeLabel()}
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 space-y-4">
            {/* Tipo de Mídia */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Tipo de Mídia *</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={data.mediaType === "image" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMediaTypeChange("image")}
                  className="w-full"
                >
                  <Image className="w-3 h-3 mr-1" />
                  Imagem
                </Button>
                <Button
                  type="button"
                  variant={data.mediaType === "carousel" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMediaTypeChange("carousel")}
                  className="w-full"
                >
                  <Layers className="w-3 h-3 mr-1" />
                  Carrossel
                </Button>
                <Button
                  type="button"
                  variant={data.mediaType === "video" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleMediaTypeChange("video")}
                  className="w-full"
                >
                  <Video className="w-3 h-3 mr-1" />
                  Vídeo
                </Button>
              </div>
            </div>

            {/* Tipo de Criativo / Formato */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Formato / Plataforma *</Label>
              <Select
                value={data.creativeType}
                onValueChange={(value) => onChange(index, { creativeType: value })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione o formato" />
                </SelectTrigger>
                <SelectContent>
                  {data.mediaType === "video"
                    ? VIDEO_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.aspectRatio})
                        </SelectItem>
                      ))
                    : CREATIVE_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.dimensions})
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tema / Descrição */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Tema / Descrição *</Label>
                {hasClientBriefing && onGenerateThemeWithAI && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onGenerateThemeWithAI}
                    disabled={isGeneratingTheme}
                    className="h-6 text-xs px-2"
                  >
                    {isGeneratingTheme ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 mr-1" />
                    )}
                    IA
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="Ex: Promoção de Black Friday com 50% de desconto"
                value={data.theme}
                onChange={(e) => onChange(index, { theme: e.target.value })}
                rows={2}
                className="text-sm"
              />
            </div>

            {/* Texto na Imagem (apenas para imagem e carrossel) */}
            {data.mediaType !== "video" && (
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">
                    {data.mediaType === "carousel"
                      ? "Texto Principal (usado em todos os slides)"
                      : "Texto na Imagem (opcional)"}
                  </Label>
                  {onGenerateCopyWithAI && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onGenerateCopyWithAI}
                      disabled={isGeneratingCopy || (!hasClientBriefing && !data.theme)}
                      className="h-6 text-xs px-2"
                    >
                      {isGeneratingCopy ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 mr-1" />
                      )}
                      IA
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Ex: 50% OFF, Compre Agora, etc."
                  value={data.copyText}
                  onChange={(e) => onChange(index, { copyText: e.target.value })}
                  className="text-sm h-9"
                />
              </div>
            )}

            {/* Carrossel - Slides */}
            {data.mediaType === "carousel" && (
              <CarouselSlideEditor
                slides={data.slides || []}
                onChange={(slides) => onChange(index, { slides })}
                onGenerateSlideWithAI={onGenerateSlideWithAI}
                generatingSlideField={generatingSlideField}
                hasClientBriefing={hasClientBriefing}
                theme={data.theme}
              />
            )}

            {/* Vídeo - Configurações */}
            {data.mediaType === "video" && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium">Configurações de Vídeo</span>
                  <Badge variant="secondary" className="text-[10px]">Google Veo</Badge>
                </div>

                {/* Duração */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Duração: {data.videoSettings?.duration || 5} segundos
                  </Label>
                  <Slider
                    value={[data.videoSettings?.duration || 5]}
                    onValueChange={([val]) =>
                      onChange(index, {
                        videoSettings: { ...data.videoSettings, duration: val },
                      })
                    }
                    min={5}
                    max={8}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Modelo */}
                <div className="space-y-1">
                  <Label className="text-xs">Modelo de IA</Label>
                  <Select
                    value={data.videoSettings?.model || "veo-2.0"}
                    onValueChange={(v) =>
                      onChange(index, {
                        videoSettings: {
                          ...data.videoSettings,
                          model: v as "veo-2.0" | "veo-3.1",
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="veo-2.0">Veo 2.0 (Recomendado)</SelectItem>
                      <SelectItem value="veo-3.1">Veo 3.1 (Áudio incluído)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sem texto/logo */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`noText-${index}`}
                    checked={data.videoSettings?.noTextInVideo || false}
                    onCheckedChange={(checked) =>
                      onChange(index, {
                        videoSettings: {
                          ...data.videoSettings,
                          noTextInVideo: checked === true,
                        },
                      })
                    }
                  />
                  <Label htmlFor={`noText-${index}`} className="text-xs cursor-pointer">
                    Gerar vídeo sem texto/logo sobreposto
                  </Label>
                </div>
              </div>
            )}

            {/* Referência Visual (não para vídeo) */}
            {data.mediaType !== "video" && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">Referência Visual (opcional)</Label>
                <div className="flex items-center gap-2">
                  {data.referenceFile || data.referenceUrl ? (
                    <div className="relative w-12 h-12 shrink-0">
                      <img
                        src={
                          data.referenceFile
                            ? URL.createObjectURL(data.referenceFile)
                            : data.referenceUrl
                        }
                        alt="Referência"
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <button
                        onClick={onRemoveReference}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-12 h-12 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors shrink-0">
                      <ImagePlus className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReferenceFileChange}
                      />
                    </label>
                  )}

                  {selectedClientId &&
                    companyId &&
                    !data.referenceFile &&
                    !data.referenceUrl &&
                    onSelectReference && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onSelectReference}
                        className="h-8 text-xs px-3"
                      >
                        <Instagram className="w-3 h-3 mr-1" />
                        Buscar Referência
                      </Button>
                    )}
                </div>
              </div>
            )}

            {/* Botão Gerar Este Criativo */}
            {onGenerateSingle && data.theme.trim() && (
              <Button
                onClick={onGenerateSingle}
                disabled={isGeneratingSingle}
                size="sm"
                variant="secondary"
                className="w-full gap-2"
              >
                {isGeneratingSingle ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar Este Criativo
                  </>
                )}
              </Button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
