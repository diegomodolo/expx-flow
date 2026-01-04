import { useState, useEffect, useCallback, useRef } from "react";
import { ContentPlanPost, ContentPlanSlide, useContentPlans } from "@/hooks/useContentPlans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Image,
  Film,
  Layers,
  Plus,
  GripVertical,
  Loader2,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContentPlanPostCardProps {
  post: ContentPlanPost;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (data: Partial<ContentPlanPost>) => void;
  onDelete: () => void;
  onRefetch: () => void;
  clientBriefing?: string;
  validationErrors?: {
    [field: string]: string | undefined;
  };
}

const postTypeConfig = {
  estatico: { label: "Estático", icon: Image, color: "bg-blue-100 text-blue-700" },
  carrossel: { label: "Carrossel", icon: Layers, color: "bg-purple-100 text-purple-700" },
  reels: { label: "Reels", icon: Film, color: "bg-pink-100 text-pink-700" },
};

// Custom hook for debounced updates
function useDebouncedField(
  initialValue: string,
  onUpdate: (value: string) => void,
  delay: number = 500
) {
  const [localValue, setLocalValue] = useState(initialValue);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Sync with external value when it changes
  useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onUpdate(value);
    }, delay);
  }, [onUpdate, delay]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [localValue, handleChange] as const;
}

export function ContentPlanPostCard({
  post,
  index,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onRefetch,
  clientBriefing,
  validationErrors,
}: ContentPlanPostCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  
  const { addSlide, updateSlide, deleteSlide } = useContentPlans();

  // Debounced fields
  const [objective, setObjective] = useDebouncedField(
    post.objective || "",
    (value) => onUpdate({ objective: value })
  );
  const [headline, setHeadline] = useDebouncedField(
    post.headline || "",
    (value) => onUpdate({ headline: value })
  );
  const [subheadline, setSubheadline] = useDebouncedField(
    post.subheadline || "",
    (value) => onUpdate({ subheadline: value })
  );
  const [caption, setCaption] = useDebouncedField(
    post.caption || "",
    (value) => onUpdate({ caption: value })
  );
  const [script, setScript] = useDebouncedField(
    typeof post.script === "string" ? post.script : JSON.stringify(post.script || "", null, 2),
    (value) => onUpdate({ script: value })
  );

  const typeConfig = postTypeConfig[post.post_type];
  const TypeIcon = typeConfig.icon;

  const handleGenerateWithAI = async (field: "headline" | "subheadline" | "caption" | "objective" | "script") => {
    if (!clientBriefing) {
      toast.error("Este cliente não possui briefing de IA configurado");
      return;
    }

    setGeneratingField(field);
    try {
      const systemPrompt = `Você é um copywriter profissional especializado em redes sociais. 
Contexto do cliente: ${clientBriefing}
Tipo de post: ${typeConfig.label}
${post.objective ? `Objetivo do post: ${post.objective}` : ""}
${post.headline ? `Headline atual: ${post.headline}` : ""}

Responda APENAS com o texto solicitado, sem explicações adicionais.`;

      const { data, error } = await supabase.functions.invoke("content-plan-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: getAIPrompt(field, post),
            },
          ],
          systemPrompt,
        },
      });

      if (error) throw error;

      const content = data.content || data.message || "";
      onUpdate({ [field]: content });
      
      // Update local state immediately
      if (field === "objective") setObjective(content);
      if (field === "headline") setHeadline(content);
      if (field === "subheadline") setSubheadline(content);
      if (field === "caption") setCaption(content);
      if (field === "script") setScript(content);
      
      toast.success(`${field} gerado com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao gerar conteúdo: " + error.message);
    } finally {
      setGeneratingField(null);
    }
  };

  const getAIPrompt = (field: string, post: ContentPlanPost) => {
    const prompts: Record<string, string> = {
      headline: "Gere uma headline impactante para este post de redes sociais. Seja criativo, conciso e use linguagem que engaje o público.",
      subheadline: "Gere uma subheadline complementar à headline que reforce a mensagem principal.",
      caption: "Gere uma legenda completa para este post incluindo: texto engajador, call-to-action e hashtags relevantes (mínimo 10 hashtags).",
      objective: "Sugira um objetivo estratégico claro para este post (ex: gerar leads, aumentar engajamento, educar o público).",
      script: `Gere um roteiro completo para um Reels do Instagram com duração de 15-30 segundos. 
Inclua:
- CENA 1, CENA 2, etc. com descrição visual
- Texto/fala para cada cena
- Sugestão de música/áudio
- Timing aproximado de cada cena
Seja criativo e engajador!`,
    };
    return prompts[field] || "";
  };

  // State for generating slide fields
  const [generatingSlideField, setGeneratingSlideField] = useState<{slideId: string, field: string} | null>(null);

  const handleGenerateSlideWithAI = async (slideId: string, field: "headline" | "content", slideIndex: number) => {
    if (!clientBriefing) {
      toast.error("Este cliente não possui briefing de IA configurado");
      return;
    }

    setGeneratingSlideField({ slideId, field });
    try {
      const slide = post.slides?.find(s => s.id === slideId);
      const totalSlides = post.slides?.length || 1;
      
      const systemPrompt = `Você é um copywriter profissional especializado em carrosséis do Instagram.
Contexto do cliente: ${clientBriefing}
${post.objective ? `Objetivo do post: ${post.objective}` : ""}
${post.headline ? `Headline do carrossel: ${post.headline}` : ""}

Este é o slide ${slideIndex + 1} de ${totalSlides} slides.
${slide?.headline ? `Título atual do slide: ${slide.headline}` : ""}
${slide?.content ? `Conteúdo atual do slide: ${slide.content}` : ""}

Responda APENAS com o texto solicitado, sem explicações adicionais.`;

      const prompts: Record<string, string> = {
        headline: `Gere um título curto e impactante para o slide ${slideIndex + 1} de ${totalSlides} do carrossel. 
O título deve ser chamativo, ter no máximo 5-7 palavras e manter coerência com os outros slides.`,
        content: `Gere o conteúdo/texto para o slide ${slideIndex + 1} de ${totalSlides} do carrossel.
O conteúdo deve:
- Ser conciso (2-3 frases no máximo)
- Complementar o título do slide
- Manter o fluxo narrativo do carrossel
- Agregar valor ao leitor`,
      };

      const { data, error } = await supabase.functions.invoke("content-plan-chat", {
        body: {
          messages: [
            {
              role: "user",
              content: prompts[field],
            },
          ],
          systemPrompt,
        },
      });

      if (error) throw error;

      const content = data.content || data.message || "";
      await handleUpdateSlide(slideId, { [field]: content });
      onRefetch();
      
      toast.success(`${field === "headline" ? "Título" : "Conteúdo"} do slide gerado com sucesso!`);
    } catch (error: any) {
      toast.error("Erro ao gerar conteúdo: " + error.message);
    } finally {
      setGeneratingSlideField(null);
    }
  };

  const handleAddSlide = async () => {
    const maxOrder = post.slides?.reduce((max, s) => Math.max(max, s.order_index), -1) ?? -1;
    await addSlide.mutateAsync({
      post_id: post.id,
      order_index: maxOrder + 1,
    });
    onRefetch();
  };

  const handleUpdateSlide = async (slideId: string, data: Partial<ContentPlanSlide>) => {
    await updateSlide.mutateAsync({ id: slideId, ...data });
  };

  const handleDeleteSlide = async (slideId: string) => {
    await deleteSlide.mutateAsync(slideId);
    onRefetch();
  };

  return (
    <>
      <Card
        className={`transition-all ${isActive ? "ring-2 ring-primary" : ""}`}
        onClick={onSelect}
      >
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <div className="cursor-grab text-muted-foreground">
              <GripVertical className="w-4 h-4" />
            </div>
            
            <Badge className={typeConfig.color}>
              <TypeIcon className="w-3 h-3 mr-1" />
              {typeConfig.label}
            </Badge>

            <span className="text-sm font-medium text-muted-foreground">
              Post {index + 1}
            </span>

            {/* Review Status Badge */}
            {post.review_status === "approved" && (
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Aprovado
              </Badge>
            )}
            {post.review_status === "rejected" && (
              <Badge className="bg-red-500/10 text-red-600 border-red-500/20 gap-1">
                <XCircle className="w-3 h-3" />
                Reprovado
              </Badge>
            )}

            <div className="flex-1" />

            <Select
              value={post.post_type}
              onValueChange={(v: "estatico" | "carrossel" | "reels") => onUpdate({ post_type: v })}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="estatico">Estático</SelectItem>
                <SelectItem value="carrossel">Carrossel</SelectItem>
                <SelectItem value="reels">Reels</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="p-4 space-y-4">
              {/* Review Feedback Alert */}
              {post.review_status === "rejected" && post.review_feedback && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-600">Feedback do revisor:</p>
                      <p className="text-sm text-red-600/80 mt-1">{post.review_feedback}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Post Image */}
              {post.image_url && (
                <div className="space-y-2">
                  <Label>Imagem do Criativo</Label>
                  <div className="aspect-[3/4] max-w-[200px] rounded-lg overflow-hidden bg-muted border">
                    <img
                      src={post.image_url}
                      alt="Imagem do post"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Objective */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={validationErrors?.objective ? "text-destructive" : ""}>
                    Objetivo
                    {validationErrors?.objective && (
                      <span className="ml-2 text-xs font-normal">⚠️ Erro encontrado</span>
                    )}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleGenerateWithAI("objective")}
                    disabled={generatingField === "objective"}
                  >
                    {generatingField === "objective" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    IA
                  </Button>
                </div>
                <Input
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="Ex: Gerar leads, aumentar engajamento..."
                  className={validationErrors?.objective ? "border-destructive ring-destructive/20 ring-2" : ""}
                />
                {validationErrors?.objective && (
                  <p className="text-xs text-destructive">{validationErrors.objective}</p>
                )}
              </div>

              {/* Headline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={validationErrors?.headline ? "text-destructive" : ""}>
                    Headline
                    {validationErrors?.headline && (
                      <span className="ml-2 text-xs font-normal">⚠️ Erro encontrado</span>
                    )}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleGenerateWithAI("headline")}
                    disabled={generatingField === "headline"}
                  >
                    {generatingField === "headline" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    IA
                  </Button>
                </div>
                <Input
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Título principal do post"
                  className={validationErrors?.headline ? "border-destructive ring-destructive/20 ring-2" : ""}
                />
                {validationErrors?.headline && (
                  <p className="text-xs text-destructive">{validationErrors.headline}</p>
                )}
              </div>

              {/* Subheadline */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={validationErrors?.subheadline ? "text-destructive" : ""}>
                    Subheadline
                    {validationErrors?.subheadline && (
                      <span className="ml-2 text-xs font-normal">⚠️ Erro encontrado</span>
                    )}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleGenerateWithAI("subheadline")}
                    disabled={generatingField === "subheadline"}
                  >
                    {generatingField === "subheadline" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    IA
                  </Button>
                </div>
                <Input
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  placeholder="Subtítulo complementar"
                  className={validationErrors?.subheadline ? "border-destructive ring-destructive/20 ring-2" : ""}
                />
                {validationErrors?.subheadline && (
                  <p className="text-xs text-destructive">{validationErrors.subheadline}</p>
                )}
              </div>

              {/* Caption */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className={validationErrors?.caption ? "text-destructive" : ""}>
                    Legenda
                    {validationErrors?.caption && (
                      <span className="ml-2 text-xs font-normal">⚠️ Erro encontrado</span>
                    )}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleGenerateWithAI("caption")}
                    disabled={generatingField === "caption"}
                  >
                    {generatingField === "caption" ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    IA
                  </Button>
                </div>
                <Textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Legenda completa com hashtags..."
                  rows={4}
                  className={validationErrors?.caption ? "border-destructive ring-destructive/20 ring-2" : ""}
                />
                <div className="flex items-center justify-between">
                  {caption && (
                    <p className="text-xs text-muted-foreground">
                      {caption.length} caracteres
                    </p>
                  )}
                </div>
                {validationErrors?.caption && (
                  <p className="text-xs text-destructive">{validationErrors.caption}</p>
                )}
              </div>

              {/* Carousel Slides */}
              {post.post_type === "carrossel" && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Slides do Carrossel</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={handleAddSlide}
                    >
                      <Plus className="w-3 h-3" />
                      Slide
                    </Button>
                  </div>

                  {post.slides && post.slides.length > 0 ? (
                    <div className="space-y-3">
                      {post.slides.map((slide, slideIndex) => (
                        <Card key={slide.id} className="p-3 bg-muted/30">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">
                              Slide {slideIndex + 1}
                            </Badge>
                            <div className="flex-1" />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => handleDeleteSlide(slide.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Input
                                value={slide.headline || ""}
                                onChange={(e) =>
                                  handleUpdateSlide(slide.id, { headline: e.target.value })
                                }
                                placeholder="Título do slide"
                                className="h-8 text-sm flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => handleGenerateSlideWithAI(slide.id, "headline", slideIndex)}
                                disabled={generatingSlideField?.slideId === slide.id && generatingSlideField?.field === "headline"}
                              >
                                {generatingSlideField?.slideId === slide.id && generatingSlideField?.field === "headline" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-start gap-1">
                              <Textarea
                                value={slide.content || ""}
                                onChange={(e) =>
                                  handleUpdateSlide(slide.id, { content: e.target.value })
                                }
                                placeholder="Conteúdo do slide"
                                rows={2}
                                className="text-sm flex-1"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={() => handleGenerateSlideWithAI(slide.id, "content", slideIndex)}
                                disabled={generatingSlideField?.slideId === slide.id && generatingSlideField?.field === "content"}
                              >
                                {generatingSlideField?.slideId === slide.id && generatingSlideField?.field === "content" ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Adicione slides ao carrossel
                    </p>
                  )}
                </div>
              )}

              {/* Reels Script */}
              {post.post_type === "reels" && (
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <Label>Roteiro do Reels</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleGenerateWithAI("script")}
                      disabled={generatingField === "script"}
                    >
                      {generatingField === "script" ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      IA
                    </Button>
                  </div>
                  <Textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    placeholder="Descreva o roteiro do vídeo..."
                    rows={6}
                  />
                </div>
              )}

              {/* Scheduled Date */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data Prevista
                </Label>
                <Input
                  type="date"
                  value={post.scheduled_date || ""}
                  onChange={(e) => onUpdate({ scheduled_date: e.target.value })}
                />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir post?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O post será removido permanentemente do planejamento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
