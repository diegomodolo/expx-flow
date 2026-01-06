import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
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
import { InstagramPostPreviewModal } from "@/components/instagram/InstagramPostPreviewModal";
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
  Upload,
  Wand2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageUploader } from "@/components/ui/image-uploader";
import { useCompany } from "@/contexts/CompanyContext";

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
  onHasChangesChange?: (postId: string, hasChanges: boolean) => void;
  clientId?: string;
  hasCreativeFactory?: boolean;
}

export interface ContentPlanPostCardRef {
  getPendingChanges: () => { postId: string; data: Partial<ContentPlanPost> } | null;
  resetChanges: () => void;
}

const postTypeConfig = {
  estatico: { label: "Estático", icon: Image, color: "bg-blue-100 text-blue-700" },
  carrossel: { label: "Carrossel", icon: Layers, color: "bg-purple-100 text-purple-700" },
  reels: { label: "Reels", icon: Film, color: "bg-pink-100 text-pink-700" },
};

// Custom hook for local field state without auto-save
function useLocalField(initialValue: string) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [hasChanges, setHasChanges] = useState(false);
  const initialRef = useRef(initialValue);

  // Only sync with external value when the post id changes (initial load)
  // We track this by comparing with the initial ref
  useEffect(() => {
    // Only reset if the initial value actually changed from a different source
    // (e.g., AI generation or post reload)
    if (initialValue !== initialRef.current) {
      setLocalValue(initialValue);
      initialRef.current = initialValue;
      setHasChanges(false);
    }
  }, [initialValue]);

  const handleChange = useCallback((value: string) => {
    setLocalValue(value);
    setHasChanges(value !== initialRef.current);
  }, []);

  const resetChanges = useCallback(() => {
    initialRef.current = localValue;
    setHasChanges(false);
  }, [localValue]);

  const forceSync = useCallback((value: string) => {
    setLocalValue(value);
    initialRef.current = value;
    setHasChanges(false);
  }, []);

  return { value: localValue, setValue: handleChange, hasChanges, resetChanges, forceSync };
}

// SlideCard component with debounced inputs to prevent lag
interface SlideCardProps {
  slide: ContentPlanSlide;
  slideIndex: number;
  onUpdateSlide: (slideId: string, data: Partial<ContentPlanSlide>) => void;
  onDeleteSlide: (slideId: string) => void;
  onGenerateWithAI: (slideId: string, field: "headline" | "content", slideIndex: number) => void;
  generatingSlideField: { slideId: string; field: string } | null;
}

function SlideCard({
  slide,
  slideIndex,
  onUpdateSlide,
  onDeleteSlide,
  onGenerateWithAI,
  generatingSlideField,
}: SlideCardProps) {
  const [localHeadline, setLocalHeadline] = useState(slide.headline || "");
  const [localContent, setLocalContent] = useState(slide.content || "");
  const headlineTimeoutRef = useRef<NodeJS.Timeout>();
  const contentTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync with external values when they change (e.g., after AI generation)
  useEffect(() => {
    setLocalHeadline(slide.headline || "");
  }, [slide.headline]);

  useEffect(() => {
    setLocalContent(slide.content || "");
  }, [slide.content]);

  const handleHeadlineChange = useCallback((value: string) => {
    setLocalHeadline(value);
    if (headlineTimeoutRef.current) {
      clearTimeout(headlineTimeoutRef.current);
    }
    headlineTimeoutRef.current = setTimeout(() => {
      onUpdateSlide(slide.id, { headline: value });
    }, 500);
  }, [slide.id, onUpdateSlide]);

  const handleContentChange = useCallback((value: string) => {
    setLocalContent(value);
    if (contentTimeoutRef.current) {
      clearTimeout(contentTimeoutRef.current);
    }
    contentTimeoutRef.current = setTimeout(() => {
      onUpdateSlide(slide.id, { content: value });
    }, 500);
  }, [slide.id, onUpdateSlide]);

  useEffect(() => {
    return () => {
      if (headlineTimeoutRef.current) clearTimeout(headlineTimeoutRef.current);
      if (contentTimeoutRef.current) clearTimeout(contentTimeoutRef.current);
    };
  }, []);

  return (
    <Card className="p-3 bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-xs">
          Slide {slideIndex + 1}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-destructive"
          onClick={() => onDeleteSlide(slide.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Input
            value={localHeadline}
            onChange={(e) => handleHeadlineChange(e.target.value)}
            placeholder="Título do slide"
            className="h-8 text-sm flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onGenerateWithAI(slide.id, "headline", slideIndex)}
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
            value={localContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Conteúdo do slide"
            rows={2}
            className="text-sm flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => onGenerateWithAI(slide.id, "content", slideIndex)}
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
  );
}

export const ContentPlanPostCard = forwardRef<ContentPlanPostCardRef, ContentPlanPostCardProps>(({
  post,
  index,
  isActive,
  onSelect,
  onUpdate,
  onDelete,
  onRefetch,
  clientBriefing,
  validationErrors,
  onHasChangesChange,
  clientId,
  hasCreativeFactory,
}, ref) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [generatingCreative, setGeneratingCreative] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  const { activeCompany } = useCompany();
  const { addSlide, updateSlide, deleteSlide } = useContentPlans();

  // Local field state without auto-save
  const objectiveField = useLocalField(post.objective || "");
  const headlineField = useLocalField(post.headline || "");
  const subheadlineField = useLocalField(post.subheadline || "");
  const captionField = useLocalField(post.caption || "");
  const scriptField = useLocalField(
    typeof post.script === "string" ? post.script : JSON.stringify(post.script || "", null, 2)
  );

  // Check if there are any unsaved changes
  const hasUnsavedChanges = 
    objectiveField.hasChanges || 
    headlineField.hasChanges || 
    subheadlineField.hasChanges || 
    captionField.hasChanges || 
    scriptField.hasChanges;

  // Notify parent about changes
  useEffect(() => {
    onHasChangesChange?.(post.id, hasUnsavedChanges);
  }, [hasUnsavedChanges, post.id, onHasChangesChange]);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    getPendingChanges: () => {
      if (!hasUnsavedChanges) return null;
      return {
        postId: post.id,
        data: {
          objective: objectiveField.value,
          headline: headlineField.value,
          subheadline: subheadlineField.value,
          caption: captionField.value,
          script: scriptField.value,
        },
      };
    },
    resetChanges: () => {
      objectiveField.resetChanges();
      headlineField.resetChanges();
      subheadlineField.resetChanges();
      captionField.resetChanges();
      scriptField.resetChanges();
    },
  }), [hasUnsavedChanges, post.id, objectiveField, headlineField, subheadlineField, captionField, scriptField]);

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
      
      // Update local state and mark as having changes
      if (field === "objective") objectiveField.forceSync(content);
      if (field === "headline") headlineField.forceSync(content);
      if (field === "subheadline") subheadlineField.forceSync(content);
      if (field === "caption") captionField.forceSync(content);
      if (field === "script") scriptField.forceSync(content);
      
      // Also save to database immediately for AI-generated content
      await onUpdate({ [field]: content });
      
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

  // Handle generate creative from factory
  const handleGenerateCreative = async () => {
    if (!clientId || !activeCompany?.company_id) {
      toast.error("Informações do cliente não disponíveis");
      return;
    }

    setGeneratingCreative(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          clientId: clientId,
          companyId: activeCompany.company_id,
          creativeType: 'instagram_feed',
          theme: post.headline || post.objective || 'Post Estático',
          context: {
            title: post.headline,
            description: post.subheadline,
            copy: post.caption,
            objective: post.objective,
          },
        },
      });
      
      if (error) throw error;
      
      if (data?.imageUrl) {
        await onUpdate({ image_url: data.imageUrl });
        onRefetch();
        toast.success('Criativo gerado com sucesso!');
      } else {
        throw new Error('Nenhuma imagem foi gerada');
      }
    } catch (error: any) {
      console.error('Error generating creative:', error);
      toast.error('Erro ao gerar criativo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGeneratingCreative(false);
    }
  };

  const handleImageUploaded = async (url: string) => {
    await onUpdate({ image_url: url });
    onRefetch();
    toast.success('Imagem enviada com sucesso!');
  };

  const handleRemoveImage = async () => {
    await onUpdate({ image_url: null });
    onRefetch();
    toast.success('Imagem removida');
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

            {/* Unsaved Changes Indicator */}
            {hasUnsavedChanges && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                <AlertCircle className="w-3 h-3" />
                Não salvo
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

              {/* Post Image - Upload and Generate for Static Posts */}
              {post.post_type === "estatico" && (
                <div className="space-y-3">
                  <Label>Imagem do Post</Label>
                  
                  {post.image_url ? (
                    <div className="flex gap-4">
                      <div className="relative group">
                        <div 
                          className="aspect-[3/4] w-[160px] rounded-lg overflow-hidden bg-muted border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowImagePreview(true);
                          }}
                        >
                          <img
                            src={post.image_url}
                            alt="Imagem do post"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveImage();
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-2">
                        <ImageUploader
                          bucket="client-media"
                          folder={`content-plans/${post.id}`}
                          currentImageUrl={post.image_url}
                          onImageUploaded={handleImageUploaded}
                          onImageRemoved={handleRemoveImage}
                          className="w-full"
                        />
                        {hasCreativeFactory && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateCreative();
                            }}
                            disabled={generatingCreative}
                          >
                            {generatingCreative ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wand2 className="w-4 h-4" />
                            )}
                            Gerar Nova
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <ImageUploader
                        bucket="client-media"
                        folder={`content-plans/${post.id}`}
                        onImageUploaded={handleImageUploaded}
                        onImageRemoved={handleRemoveImage}
                        className="flex-1"
                      />
                      {hasCreativeFactory && (
                        <Button
                          variant="secondary"
                          className="gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateCreative();
                          }}
                          disabled={generatingCreative}
                        >
                          {generatingCreative ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                          Gerar com Fábrica
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Post Image for non-static posts (read-only) */}
              {post.post_type !== "estatico" && post.image_url && (
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
                  value={objectiveField.value}
                  onChange={(e) => objectiveField.setValue(e.target.value)}
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
                  value={headlineField.value}
                  onChange={(e) => headlineField.setValue(e.target.value)}
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
                  value={subheadlineField.value}
                  onChange={(e) => subheadlineField.setValue(e.target.value)}
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
                  value={captionField.value}
                  onChange={(e) => captionField.setValue(e.target.value)}
                  placeholder="Legenda completa com hashtags..."
                  rows={4}
                  className={validationErrors?.caption ? "border-destructive ring-destructive/20 ring-2" : ""}
                />
                <div className="flex items-center justify-between">
                  {captionField.value && (
                    <p className="text-xs text-muted-foreground">
                      {captionField.value.length} caracteres
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
                        <SlideCard
                          key={slide.id}
                          slide={slide}
                          slideIndex={slideIndex}
                          onUpdateSlide={handleUpdateSlide}
                          onDeleteSlide={handleDeleteSlide}
                          onGenerateWithAI={handleGenerateSlideWithAI}
                          generatingSlideField={generatingSlideField}
                        />
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
                    value={scriptField.value}
                    onChange={(e) => scriptField.setValue(e.target.value)}
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

      {/* Instagram Preview Modal */}
      <InstagramPostPreviewModal
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
        imageUrl={post.image_url || ''}
        caption={captionField.value || post.caption || ''}
      />

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
});

ContentPlanPostCard.displayName = "ContentPlanPostCard";
