import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
import { ContentPlanPost, ContentPlanSlide, useContentPlans } from "@/hooks/useContentPlans";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { SendPostsToPresentationDialog } from "./SendPostsToPresentationDialog";
import { ReelsVideoGenerator } from "./ReelsVideoGenerator";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Sparkles,
  Image,
  Images,
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
  Presentation,
  Pencil,
} from "lucide-react";
import { ImageEditorModal } from "@/components/image-editor/ImageEditorModal";
import { ReelsCoverSection } from "@/components/shared/ReelsCoverSection";
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
  forceCollapsed?: boolean;
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
  postId: string;
  clientId?: string;
  hasCreativeFactory?: boolean;
  clientBriefing?: string;
  postObjective?: string;
  postHeadline?: string;
  allSlides: ContentPlanSlide[];
  onUpdateSlide: (slideId: string, data: Partial<ContentPlanSlide>) => void;
  onDeleteSlide: (slideId: string) => void;
  onGenerateWithAI: (slideId: string, field: "headline" | "content", slideIndex: number) => void;
  generatingSlideField: { slideId: string; field: string } | null;
  onRefetch: () => void;
}

function SlideCard({
  slide,
  slideIndex,
  postId,
  clientId,
  hasCreativeFactory,
  clientBriefing,
  postObjective,
  postHeadline,
  allSlides,
  onUpdateSlide,
  onDeleteSlide,
  onGenerateWithAI,
  generatingSlideField,
  onRefetch,
}: SlideCardProps) {
  const [localHeadline, setLocalHeadline] = useState(slide.headline || "");
  const [localContent, setLocalContent] = useState(slide.content || "");
  const [generatingImage, setGeneratingImage] = useState(false);
  const [showExtraPromptDialog, setShowExtraPromptDialog] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [useCurrentImageAsReference, setUseCurrentImageAsReference] = useState(false);
  const [additionalImageToMerge, setAdditionalImageToMerge] = useState<string | null>(null);
  const [uploadingAdditionalImage, setUploadingAdditionalImage] = useState(false);
  const additionalImageInputRef = useRef<HTMLInputElement>(null);
  const headlineTimeoutRef = useRef<NodeJS.Timeout>();
  const contentTimeoutRef = useRef<NodeJS.Timeout>();
  const { activeCompany } = useCompany();

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

  const handleImageUploaded = async (url: string) => {
    await onUpdateSlide(slide.id, { image_url: url });
    onRefetch();
    toast.success('Imagem do slide enviada!');
  };

  const handleRemoveImage = async () => {
    await onUpdateSlide(slide.id, { image_url: null });
    onRefetch();
    toast.success('Imagem do slide removida');
  };

  const handleGenerateSlideImage = async () => {
    if (!clientId || !activeCompany?.company_id) {
      toast.error("Informações do cliente não disponíveis");
      return;
    }

    setGeneratingImage(true);
    setShowExtraPromptDialog(false);

    try {
      // Texto que DEVE aparecer na imagem (headline + content do slide)
      const approvedText = [localHeadline, localContent].filter(Boolean).join('\n');
      
      // Se usar imagem atual como referência, priorizar ela
      let referenceImages: string[] = [];
      
      if (useCurrentImageAsReference && slide.image_url) {
        // Usar a imagem atual do slide como referência principal
        referenceImages = [slide.image_url];
      } else {
        // Comportamento original: usar slides anteriores para consistência
        const previousSlidesWithImages = allSlides
          .slice(0, slideIndex)
          .filter(s => s.image_url)
          .map(s => s.image_url as string);
        
        referenceImages = previousSlidesWithImages.length > 0 
          ? [previousSlidesWithImages[previousSlidesWithImages.length - 1]]
          : [];
      }
      
      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          clientId: clientId,
          companyId: activeCompany.company_id,
          creativeType: 'instagram_feed',
          theme: localHeadline || postHeadline || 'Slide de Carrossel',
          approvedText: approvedText || undefined,
          extraPrompt: extraPrompt.trim() || undefined,
          references: referenceImages,
          additionalImageToMerge: additionalImageToMerge || undefined,
          context: {
            title: localHeadline,
            description: localContent,
            contextOnly: {
              slideIndex: slideIndex + 1,
              totalSlides: allSlides.length,
              postObjective: postObjective,
              isSlideReference: referenceImages.length > 0 && !useCurrentImageAsReference,
              isEditingExisting: useCurrentImageAsReference,
              hasMergeImage: !!additionalImageToMerge,
            },
          },
        },
      });

      if (error) throw error;

      if (data?.imageUrl) {
        await onUpdateSlide(slide.id, { image_url: data.imageUrl });
        onRefetch();
        toast.success('Imagem do slide gerada com sucesso!');
        setExtraPrompt("");
        setUseCurrentImageAsReference(false);
        setAdditionalImageToMerge(null);
      } else {
        throw new Error('Nenhuma imagem foi gerada');
      }
    } catch (error: any) {
      console.error('Error generating slide image:', error);
      toast.error('Erro ao gerar imagem: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGeneratingImage(false);
    }
  };

  return (
    <>
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
        
        <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-3">
          {/* Slide Image Section */}
          <div className="space-y-2">
            {slide.image_url ? (
              <div className="relative group">
                <div 
                  className="aspect-[4/5] w-full rounded-lg overflow-hidden bg-muted border cursor-pointer"
                  onClick={() => setShowImagePreview(true)}
                >
                  <img
                    src={slide.image_url}
                    alt={`Slide ${slideIndex + 1}`}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => { e.stopPropagation(); handleRemoveImage(); }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="aspect-[4/5] w-full rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Image className="w-6 h-6" />
                <span className="text-xs">Sem imagem</span>
              </div>
            )}
            
            <div className="flex gap-1">
              <ImageUploader
                bucket="client-media"
                folder={`content-plans/${postId}/slides`}
                currentImageUrl={slide.image_url || undefined}
                onImageUploaded={handleImageUploaded}
                onImageRemoved={handleRemoveImage}
                className="flex-1"
                compact
              />
              {hasCreativeFactory && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1 text-xs h-7"
                  onClick={() => setShowExtraPromptDialog(true)}
                  disabled={generatingImage}
                >
                  {generatingImage ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3" />
                  )}
                  Gerar
                </Button>
              )}
              {slide.image_url && clientId && activeCompany?.company_id && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7 relative z-10 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log("Edit button clicked");
                    setShowImageEditor(true);
                  }}
                >
                  <Pencil className="w-3 h-3" />
                  Editar
                </Button>
              )}
            </div>
          </div>
          
          {/* Slide Text Fields */}
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
                rows={3}
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
        </div>
      </Card>

      {/* Extra Prompt Dialog for Slide Image Generation */}
      <AlertDialog open={showExtraPromptDialog} onOpenChange={setShowExtraPromptDialog}>
        <AlertDialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Gerar Imagem do Slide {slideIndex + 1}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adicione instruções extras para a IA ou deixe em branco para gerar com as configurações padrão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Opção de usar imagem atual como referência */}
            {slide.image_url && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <Switch 
                  checked={useCurrentImageAsReference}
                  onCheckedChange={setUseCurrentImageAsReference}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">Usar imagem atual como referência</p>
                  <p className="text-xs text-muted-foreground">
                    A IA vai editar esta imagem baseada nas suas instruções
                  </p>
                </div>
                {useCurrentImageAsReference && (
                  <div className="w-12 h-12 rounded border overflow-hidden flex-shrink-0">
                    <img src={slide.image_url} alt="Referência" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}
            
            {/* Seção de imagem adicional para mesclagem */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Imagem para incorporar (opcional)</span>
              </div>
              {additionalImageToMerge ? (
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-lg border overflow-hidden">
                    <img src={additionalImageToMerge} alt="Imagem adicional" className="w-full h-full object-cover" />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); setAdditionalImageToMerge(null); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); additionalImageInputRef.current?.click(); }}
                >
                  {uploadingAdditionalImage ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">
                        Clique para adicionar uma imagem que será incorporada ao criativo
                      </span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={additionalImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error('Imagem muito grande. Máximo: 5MB');
                    return;
                  }
                  
                  setUploadingAdditionalImage(true);
                  try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `content-plans/${postId}/merge-ref-${Date.now()}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('client-media')
                      .upload(fileName, file);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                      .from('client-media')
                      .getPublicUrl(fileName);
                    
                    setAdditionalImageToMerge(publicUrl);
                    toast.success('Imagem carregada!');
                  } catch (error: any) {
                    console.error('Error uploading image:', error);
                    toast.error('Erro ao carregar imagem');
                  } finally {
                    setUploadingAdditionalImage(false);
                    e.target.value = '';
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                💡 Ex: screenshot de sistema, logo, foto de produto para inserir no criativo
              </p>
            </div>
            
            <Textarea
              placeholder={additionalImageToMerge 
                ? "Ex: Coloque esta imagem na tela do tablet, substitua o fundo por esta imagem..." 
                : useCurrentImageAsReference 
                  ? "Ex: Mude a cor do fundo para azul, ajuste o contraste..." 
                  : "Ex: Use cores mais vibrantes, estilo minimalista..."
              }
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              className="min-h-[80px]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExtraPrompt("");
              setUseCurrentImageAsReference(false);
              setAdditionalImageToMerge(null);
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateSlideImage}
              disabled={generatingImage}
              className="gap-2"
            >
              {generatingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Gerar Imagem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Instagram Preview Modal for Slide */}
      <InstagramPostPreviewModal
        open={showImagePreview}
        onOpenChange={setShowImagePreview}
        imageUrl={slide.image_url || ''}
        caption={`${localHeadline}\n\n${localContent}`.trim()}
      />

      {/* Image Editor Modal */}
      {slide.image_url && clientId && activeCompany?.company_id && (
        <ImageEditorModal
          open={showImageEditor}
          onOpenChange={setShowImageEditor}
          images={[slide.image_url]}
          onSave={async (newImages) => {
            if (newImages[0] && newImages[0] !== slide.image_url) {
              await onUpdateSlide(slide.id, { image_url: newImages[0] });
              onRefetch();
              toast.success('Imagem do slide atualizada!');
            }
          }}
          clientId={clientId}
          companyId={activeCompany.company_id}
        />
      )}
    </>
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
  forceCollapsed,
}, ref) => {
  const [isExpanded, setIsExpanded] = useState(forceCollapsed !== undefined ? !forceCollapsed : false);
  
  // Sync with forceCollapsed prop
  useEffect(() => {
    if (forceCollapsed !== undefined) {
      setIsExpanded(!forceCollapsed);
    }
  }, [forceCollapsed]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [generatingCreative, setGeneratingCreative] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showExtraPromptDialog, setShowExtraPromptDialog] = useState(false);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [showSendToPresentationDialog, setShowSendToPresentationDialog] = useState(false);
  const [generatingAllSlides, setGeneratingAllSlides] = useState(false);
  const [allSlidesProgress, setAllSlidesProgress] = useState({ current: 0, total: 0 });
  const [showAllSlidesPromptDialog, setShowAllSlidesPromptDialog] = useState(false);
  const [allSlidesExtraPrompt, setAllSlidesExtraPrompt] = useState("");
  const [useCurrentImageAsReference, setUseCurrentImageAsReference] = useState(false);
  const [additionalImageToMerge, setAdditionalImageToMerge] = useState<string | null>(null);
  const [uploadingAdditionalImage, setUploadingAdditionalImage] = useState(false);
  const [showImageEditorModal, setShowImageEditorModal] = useState(false);
  const additionalImageInputRef = useRef<HTMLInputElement>(null);
  
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
          clientId,
          useCustomSystemPrompt: true,
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
    const baseContext = `
${post.objective ? `Objetivo do post: ${post.objective}` : ""}
${post.headline ? `Headline: ${post.headline}` : ""}
${post.subheadline ? `Subheadline: ${post.subheadline}` : ""}`.trim();

    const prompts: Record<string, string> = {
      headline: `${baseContext ? `Contexto:\n${baseContext}\n\n` : ""}Gere APENAS UMA headline impactante e concisa para este post, alinhada com o objetivo. NÃO inclua numeração, variações, opções ou formatação. NÃO use asteriscos ou emojis. Responda SOMENTE com o texto da headline.`,
      subheadline: `${baseContext ? `Contexto:\n${baseContext}\n\n` : ""}Gere APENAS UMA subheadline que complemente a headline acima e reforce o objetivo. Mantenha o mesmo tom e linguagem. NÃO inclua formatação, numeração ou opções. Responda SOMENTE com o texto.`,
      caption: `${baseContext ? `Contexto:\n${baseContext}\n\n` : ""}Gere APENAS UMA legenda completa para este post, alinhada com o objetivo, headline e subheadline acima. Inclua: texto engajador, call-to-action e hashtags relevantes (mínimo 10 hashtags). NÃO inclua variações ou opções. Responda SOMENTE com a legenda.`,
      objective: "Gere APENAS o objetivo do post em uma frase direta e concisa. NÃO inclua títulos, justificativas ou formatação. Exemplo: 'Aumentar o engajamento e educar o público sobre finanças pessoais'. Responda SOMENTE com a frase do objetivo.",
      script: `${baseContext ? `Contexto:\n${baseContext}\n\n` : ""}Gere um roteiro curto para Reels (15-30s). Formato: CENA 1 (Xs): [ação] - "fala". Máximo 4 cenas. Seja direto.`,
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
      
      // Construir contexto dos slides anteriores
      const previousSlidesContext = post.slides
        ?.filter((_, idx) => idx < slideIndex)
        .map((s, idx) => `Slide ${idx + 1}: Título: "${s.headline || '(vazio)'}" | Conteúdo: "${s.content || '(vazio)'}"`)
        .join('\n') || '';

      const systemPrompt = `Você é um copywriter profissional especializado em carrosséis do Instagram.
Contexto do cliente: ${clientBriefing}
${post.objective ? `Objetivo do post: ${post.objective}` : ""}
${post.headline ? `Headline principal do carrossel: ${post.headline}` : ""}
${post.subheadline ? `Subheadline do carrossel: ${post.subheadline}` : ""}
${post.caption ? `Legenda do carrossel: ${post.caption}` : ""}

SLIDES ANTERIORES:
${previousSlidesContext || "(Este é o primeiro slide)"}

Este é o slide ${slideIndex + 1} de ${totalSlides} slides.
${slide?.headline && field === 'content' ? `Título deste slide: ${slide.headline}` : ""}

IMPORTANTE: Mantenha consistência narrativa com os slides anteriores. Não repita informações.

Responda APENAS com o texto solicitado, sem explicações adicionais.`;

      const prompts: Record<string, string> = {
        headline: `Gere um título curto e impactante para o slide ${slideIndex + 1} de ${totalSlides}. Máximo 5-7 palavras.`,
        content: `Gere o conteúdo para o slide ${slideIndex + 1} de ${totalSlides}. Máximo 2-3 frases concisas.`,
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
          useCustomSystemPrompt: true,
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
    setShowExtraPromptDialog(false);
    
    try {
      // Texto que DEVE aparecer na imagem (apenas headline + subheadline)
      const approvedText = [post.headline, post.subheadline].filter(Boolean).join('\n');
      
      // Se usar imagem atual como referência, enviar a URL
      const references = useCurrentImageAsReference && post.image_url 
        ? [post.image_url] 
        : [];
      
      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          clientId: clientId,
          companyId: activeCompany.company_id,
          creativeType: 'instagram_feed',
          theme: post.headline || post.objective || 'Post Estático',
          approvedText: approvedText || undefined,
          extraPrompt: extraPrompt.trim() || undefined,
          references: references.length > 0 ? references : undefined,
          additionalImageToMerge: additionalImageToMerge || undefined,
          context: {
            title: post.headline,
            description: post.subheadline,
            // Estes campos são APENAS para contexto da IA, NÃO devem aparecer na imagem
            contextOnly: {
              objective: post.objective,
              caption: post.caption,
              isEditingExisting: useCurrentImageAsReference, // Flag para modo de edição
              hasMergeImage: !!additionalImageToMerge,
            },
          },
        },
      });
      
      if (error) throw error;
      
      if (data?.imageUrl) {
        await onUpdate({ image_url: data.imageUrl });
        onRefetch();
        toast.success(useCurrentImageAsReference ? 'Imagem editada com sucesso!' : 'Criativo gerado com sucesso!');
        setExtraPrompt(""); // Limpar instruções após sucesso
        setUseCurrentImageAsReference(false); // Resetar estado
        setAdditionalImageToMerge(null); // Resetar imagem adicional
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
  
  // Abre modal de instruções extras para gerar nova imagem
  const handleOpenExtraPromptDialog = () => {
    setShowExtraPromptDialog(true);
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

  // Gerar todas as imagens dos slides do carrossel sequencialmente
  const handleGenerateAllSlideImages = async () => {
    if (!clientId || !activeCompany?.company_id || !post.slides) {
      toast.error("Informações do cliente ou slides não disponíveis");
      return;
    }

    const slidesWithoutImages = post.slides.filter(s => !s.image_url);
    if (slidesWithoutImages.length === 0) {
      toast.info("Todos os slides já possuem imagens");
      return;
    }

    setGeneratingAllSlides(true);
    setShowAllSlidesPromptDialog(false);
    setAllSlidesProgress({ current: 0, total: slidesWithoutImages.length });

    try {
      // Pegar a lista atualizada de slides
      let currentSlides = [...(post.slides || [])];
      
      for (let i = 0; i < post.slides.length; i++) {
        const slide = post.slides[i];
        
        // Pular slides que já têm imagem
        if (slide.image_url) continue;

        // Atualizar progresso
        const slidesGenerated = currentSlides.filter(s => s.image_url).length - post.slides.filter(s => s.image_url).length;
        setAllSlidesProgress({ current: slidesGenerated + 1, total: slidesWithoutImages.length });

        // Buscar o último slide com imagem para usar como referência
        const lastSlideWithImage = currentSlides
          .slice(0, i)
          .reverse()
          .find(s => s.image_url);
        
        const referenceImages = lastSlideWithImage?.image_url 
          ? [lastSlideWithImage.image_url] 
          : [];

        const approvedText = [slide.headline, slide.content].filter(Boolean).join('\n');

        const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
          body: {
            clientId: clientId,
            companyId: activeCompany.company_id,
            creativeType: 'instagram_feed',
            theme: slide.headline || post.headline || 'Slide de Carrossel',
            approvedText: approvedText || undefined,
            extraPrompt: allSlidesExtraPrompt.trim() || undefined,
            references: referenceImages,
            context: {
              title: slide.headline,
              description: slide.content,
              contextOnly: {
                slideIndex: i + 1,
                totalSlides: post.slides.length,
                postObjective: post.objective,
                isSlideReference: referenceImages.length > 0,
              },
            },
          },
        });

        if (error) throw error;

        if (data?.imageUrl) {
          await updateSlide.mutateAsync({
            id: slide.id,
            image_url: data.imageUrl
          });
          // Atualizar lista local com a nova imagem
          currentSlides = currentSlides.map(s => 
            s.id === slide.id ? { ...s, image_url: data.imageUrl } : s
          );
        }
      }

      onRefetch();
      toast.success(`${slidesWithoutImages.length} imagens geradas com sucesso!`);
      setAllSlidesExtraPrompt("");
    } catch (error: any) {
      console.error('Error generating all slide images:', error);
      toast.error('Erro ao gerar imagens: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setGeneratingAllSlides(false);
      setAllSlidesProgress({ current: 0, total: 0 });
    }
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
              <>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Aprovado
                </Badge>
                {clientId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Enviar para Apresentação"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSendToPresentationDialog(true);
                    }}
                  >
                    <Presentation className="w-4 h-4" />
                  </Button>
                )}
              </>
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
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowImageEditorModal(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenExtraPromptDialog();
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
                          </>
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
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <Label className="text-base font-semibold">Slides do Carrossel</Label>
                    <div className="flex gap-2">
                      {hasCreativeFactory && post.slides && post.slides.some(s => !s.image_url) && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="gap-1"
                          onClick={() => setShowAllSlidesPromptDialog(true)}
                          disabled={generatingAllSlides}
                        >
                          {generatingAllSlides ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {allSlidesProgress.current}/{allSlidesProgress.total}
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-3 h-3" />
                              <Images className="w-3 h-3" />
                              Gerar Todas
                            </>
                          )}
                        </Button>
                      )}
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
                  </div>

                  {post.slides && post.slides.length > 0 ? (
                    <div className="space-y-3">
                      {post.slides.map((slide, slideIndex) => (
                        <SlideCard
                          key={slide.id}
                          slide={slide}
                          slideIndex={slideIndex}
                          postId={post.id}
                          clientId={clientId}
                          hasCreativeFactory={hasCreativeFactory}
                          clientBriefing={clientBriefing}
                          postObjective={post.objective || undefined}
                          postHeadline={post.headline || undefined}
                          allSlides={post.slides || []}
                          onUpdateSlide={handleUpdateSlide}
                          onDeleteSlide={handleDeleteSlide}
                          onGenerateWithAI={handleGenerateSlideWithAI}
                          generatingSlideField={generatingSlideField}
                          onRefetch={onRefetch}
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
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
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

                  {/* Reels Video Generator */}
                  {clientId && activeCompany?.company_id && (
                    <ReelsVideoGenerator
                      postId={post.id}
                      clientId={clientId}
                      companyId={activeCompany.company_id}
                      script={scriptField.value}
                      headline={headlineField.value}
                      subheadline={subheadlineField.value}
                      uploadedVideoUrl={post.reels_uploaded_video_url}
                      onUploadedVideoChange={(url) => {
                        onUpdate({ reels_uploaded_video_url: url });
                        onRefetch();
                      }}
                    />
                  )}

                  {/* Reels Cover */}
                  <ReelsCoverSection
                    coverUrl={post.reels_cover_url || null}
                    onCoverChange={(url) => {
                      onUpdate({ reels_cover_url: url });
                      onRefetch();
                    }}
                    clientId={clientId}
                    companyId={activeCompany?.company_id}
                    headline={headlineField.value}
                    subheadline={subheadlineField.value}
                    objective={objectiveField.value}
                    script={scriptField.value}
                    uploadBucket="client-media"
                    uploadFolder={`content-plans/${post.id}/covers`}
                    hasCreativeFactory={hasCreativeFactory}
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

      {/* Extra Prompt Dialog for Generate New */}
      <AlertDialog open={showExtraPromptDialog} onOpenChange={(open) => {
        setShowExtraPromptDialog(open);
        if (!open) {
          setExtraPrompt("");
          setUseCurrentImageAsReference(false);
          setAdditionalImageToMerge(null);
        }
      }}>
        <AlertDialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              {useCurrentImageAsReference ? 'Editar Imagem com IA' : 'Gerar Nova Imagem'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {useCurrentImageAsReference 
                ? 'Descreva as alterações que deseja fazer na imagem atual.'
                : 'Adicione instruções extras para a IA ou deixe em branco para gerar com as configurações padrão.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            {/* Opção de usar imagem atual como referência */}
            {post.image_url && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <Switch 
                  checked={useCurrentImageAsReference}
                  onCheckedChange={setUseCurrentImageAsReference}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Usar imagem atual como referência</p>
                  <p className="text-xs text-muted-foreground">
                    A IA vai editar a imagem existente baseada nas suas instruções
                  </p>
                </div>
                {useCurrentImageAsReference && (
                  <div className="w-12 h-12 rounded border overflow-hidden flex-shrink-0">
                    <img src={post.image_url} alt="Referência" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}
            
            {/* Seção de imagem adicional para mesclagem */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Imagem para incorporar (opcional)</span>
              </div>
              {additionalImageToMerge ? (
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-lg border overflow-hidden">
                    <img src={additionalImageToMerge} alt="Imagem adicional" className="w-full h-full object-cover" />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5"
                    onClick={(e) => { e.stopPropagation(); setAdditionalImageToMerge(null); }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={(e) => { e.stopPropagation(); additionalImageInputRef.current?.click(); }}
                >
                  {uploadingAdditionalImage ? (
                    <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground text-center">
                        Clique para adicionar uma imagem que será incorporada ao criativo
                      </span>
                    </>
                  )}
                </div>
              )}
              <input
                ref={additionalImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  if (file.size > 5 * 1024 * 1024) {
                    toast.error('Imagem muito grande. Máximo: 5MB');
                    return;
                  }
                  
                  setUploadingAdditionalImage(true);
                  try {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `content-plans/${post.id}/merge-ref-${Date.now()}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                      .from('client-media')
                      .upload(fileName, file);
                    
                    if (uploadError) throw uploadError;
                    
                    const { data: { publicUrl } } = supabase.storage
                      .from('client-media')
                      .getPublicUrl(fileName);
                    
                    setAdditionalImageToMerge(publicUrl);
                    toast.success('Imagem carregada!');
                  } catch (error: any) {
                    console.error('Error uploading image:', error);
                    toast.error('Erro ao carregar imagem');
                  } finally {
                    setUploadingAdditionalImage(false);
                    e.target.value = '';
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                💡 Ex: screenshot de sistema, logo, foto de produto para inserir no criativo
              </p>
            </div>
            
            <Textarea
              placeholder={additionalImageToMerge 
                ? "Ex: Coloque esta imagem na tela do tablet, substitua o fundo por esta imagem..." 
                : useCurrentImageAsReference 
                  ? "Ex: Mude a cor do botão de azul para vermelho, adicione mais contraste, remova o texto..." 
                  : "Ex: Use cores mais vibrantes, adicione elementos de tecnologia, estilo minimalista..."
              }
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              className="min-h-[100px]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setExtraPrompt("");
              setUseCurrentImageAsReference(false);
              setAdditionalImageToMerge(null);
            }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateCreative}
              disabled={generatingCreative}
              className="gap-2"
            >
              {generatingCreative ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {useCurrentImageAsReference ? 'Editar Imagem' : 'Gerar Imagem'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generate All Slides Dialog */}
      <AlertDialog open={showAllSlidesPromptDialog} onOpenChange={setShowAllSlidesPromptDialog}>
        <AlertDialogContent className="max-w-md" onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              <Images className="w-5 h-5 text-primary" />
              Gerar Todas as Imagens
            </AlertDialogTitle>
            <AlertDialogDescription>
              Gere imagens para todos os slides sem imagem. Cada slide usará o anterior como referência para manter consistência visual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Instruções extras para todas as imagens (opcional)..."
              value={allSlidesExtraPrompt}
              onChange={(e) => setAllSlidesExtraPrompt(e.target.value)}
              className="min-h-[80px]"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAllSlidesExtraPrompt("")}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGenerateAllSlideImages}
              disabled={generatingAllSlides}
              className="gap-2"
            >
              {generatingAllSlides ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Gerar Imagens
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send to Presentation Dialog */}
      {clientId && (
        <SendPostsToPresentationDialog
          open={showSendToPresentationDialog}
          onOpenChange={setShowSendToPresentationDialog}
          clientId={clientId}
          posts={[{
            id: post.id,
            image_url: post.image_url,
            headline: post.headline,
            subheadline: post.subheadline,
            caption: post.caption,
            post_type: post.post_type,
            slides: post.slides,
            reels_uploaded_video_url: post.reels_uploaded_video_url,
            reels_cover_url: post.reels_cover_url,
          }]}
        />
      )}

      {/* Image Editor Modal */}
      {post.image_url && clientId && activeCompany?.company_id && (
        <ImageEditorModal
          open={showImageEditorModal}
          onOpenChange={setShowImageEditorModal}
          images={[post.image_url]}
          onSave={(newImages) => {
            if (newImages[0] && newImages[0] !== post.image_url) {
              onUpdate({ image_url: newImages[0] });
              onRefetch();
            }
          }}
          clientId={clientId}
          companyId={activeCompany.company_id}
        />
      )}
    </>
  );
});

ContentPlanPostCard.displayName = "ContentPlanPostCard";
