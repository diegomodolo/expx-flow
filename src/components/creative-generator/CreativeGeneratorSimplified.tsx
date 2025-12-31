import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { useVisualCreatives } from "@/hooks/useVisualCreatives";
import { useFacebookPages } from "@/hooks/useFacebookPages";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Loader2, 
  Check,
  Wand2,
  ChevronsUpDown,
  FileText,
  Layers,
} from "lucide-react";
import { NewPostModal } from "@/components/scheduling/NewPostModal";
import { ReferenceSelectionDialog } from "@/components/clients/ReferenceSelectionDialog";
import { CreativePreviewCard } from "./CreativePreviewCard";
import { VideoCreativePreviewCard } from "./VideoCreativePreviewCard";
import { CarouselPreviewCard } from "./CarouselPreviewCard";
import { ImportFromPlanDialog } from "@/components/content-planner/ImportFromPlanDialog";
import { ContentPlanPost } from "@/hooks/useContentPlans";
import { CreativeInputCard, CreativeInputData, CREATIVE_TYPES, VIDEO_TYPES, MediaType } from "./CreativeInputCard";
import { CarouselSlide } from "./CarouselSlideEditor";

const MAX_VARIATIONS = 12;
const MAX_REFERENCES = 12;

interface GeneratedCreative {
  id: string;
  imageUrl?: string;
  images?: string[]; // Para carrossel
  videoUrl?: string;
  caption: string;
  type: string;
  typeName: string;
  theme: string;
  copyText: string;
  mediaType: MediaType;
}

const createDefaultCreativeInput = (): CreativeInputData => ({
  theme: "",
  copyText: "",
  referenceFile: undefined,
  referenceUrl: undefined,
  mediaType: "image",
  creativeType: "instagram_feed",
  slides: [
    { headline: "", description: "" },
    { headline: "", description: "" },
  ],
  videoSettings: {
    duration: 5,
    model: "veo-2.0",
    noTextInVideo: false,
    videoType: "video_reels",
  },
});

export function CreativeGeneratorSimplified() {
  const { toast } = useToast();
  const { clients } = useClients();
  const { activeCompany } = useCompany();
  const { createCreative } = useVisualCreatives();
  const { pages, instagramAccounts } = useFacebookPages();

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [creativeInputs, setCreativeInputs] = useState<CreativeInputData[]>([createDefaultCreativeInput()]);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [referenceDialogForCreativeIndex, setReferenceDialogForCreativeIndex] = useState<number | null>(null);
  const [generatingThemeIndex, setGeneratingThemeIndex] = useState<number | null>(null);
  const [generatingCopyIndex, setGeneratingCopyIndex] = useState<number | null>(null);
  const [generatingSlideField, setGeneratingSlideField] = useState<{ creativeIndex: number; slideIndex: number; field: 'headline' | 'description' } | null>(null);

  // Video generation hook
  const videoGeneration = useVideoGeneration();

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreative[]>([]);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0, currentType: "" });

  // Modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedCreativeForSchedule, setSelectedCreativeForSchedule] = useState<GeneratedCreative | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Derived state
  const selectedClient = useMemo(() => 
    clients?.find(c => c.id === selectedClientId), 
    [clients, selectedClientId]
  );

  const activeClients = useMemo(() => 
    (clients?.filter(c => !c.is_canceled) || []).sort((a, b) => a.name.localeCompare(b.name)), 
    [clients]
  );

  // Update inputs array when quantity changes
  useEffect(() => {
    setCreativeInputs(prev => {
      if (prev.length < quantity) {
        const newInputs = [...prev];
        for (let i = prev.length; i < quantity; i++) {
          newInputs.push(createDefaultCreativeInput());
        }
        return newInputs;
      } else if (prev.length > quantity) {
        return prev.slice(0, quantity);
      }
      return prev;
    });
  }, [quantity]);

  const validInputs = creativeInputs.filter(input => input.theme.trim());
  const canGenerate = selectedClientId && validInputs.length > 0;

  const handleInputChange = (index: number, data: Partial<CreativeInputData>) => {
    setCreativeInputs(prev => {
      const newInputs = [...prev];
      newInputs[index] = { ...newInputs[index], ...data };
      return newInputs;
    });
  };

  const handleReferenceUrlChange = (index: number, url: string | undefined) => {
    setCreativeInputs(prev => {
      const newInputs = [...prev];
      newInputs[index] = { ...newInputs[index], referenceUrl: url, referenceFile: undefined };
      return newInputs;
    });
  };

  const removeCreativeReference = (index: number) => {
    setCreativeInputs(prev => {
      const newInputs = [...prev];
      newInputs[index] = { ...newInputs[index], referenceFile: undefined, referenceUrl: undefined };
      return newInputs;
    });
  };

  // Import posts from content plan
  const handleImportFromPlan = (posts: ContentPlanPost[]) => {
    if (posts.length === 0) return;

    setQuantity(posts.length);

    const newInputs = posts.map((post): CreativeInputData => {
      const themeParts = [post.headline, post.subheadline, post.caption].filter(Boolean);
      const isCarousel = post.post_type === "carrossel";
      
      return {
        theme: themeParts.join("\n\n") || post.objective || "",
        copyText: post.headline || "",
        mediaType: isCarousel ? "carousel" : "image",
        creativeType: "instagram_feed",
        slides: isCarousel 
          ? [
              { headline: post.headline || "", description: post.subheadline || "" },
              { headline: "", description: "" },
            ]
          : [{ headline: "", description: "" }, { headline: "", description: "" }],
        videoSettings: {
          duration: 5,
          model: "veo-2.0",
          noTextInVideo: false,
          videoType: "video_reels",
        },
      };
    });
    setCreativeInputs(newInputs);

    toast({
      title: "Posts importados!",
      description: `${posts.length} post(s) importados do planejamento`,
    });
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleGenerateThemeWithAI = async (index: number) => {
    if (!selectedClient?.ai_briefing) {
      toast({
        title: "Briefing não disponível",
        description: "Este cliente não possui briefing de IA cadastrado.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingThemeIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke('generate-creative-suggestions', {
        body: {
          clientId: selectedClientId,
          companyId: activeCompany?.company_id,
          briefing: selectedClient.ai_briefing,
          type: 'theme',
          creativeTypes: [creativeInputs[index].creativeType]
        }
      });

      if (error) throw error;
      if (data?.theme) {
        handleInputChange(index, { theme: data.theme });
        toast({ title: "Tema gerado com IA!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar tema",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingThemeIndex(null);
    }
  };

  const handleGenerateCopyWithAI = async (index: number) => {
    const theme = creativeInputs[index]?.theme;
    if (!selectedClient?.ai_briefing && !theme) {
      toast({
        title: "Informações insuficientes",
        description: "Preencha o tema ou selecione um cliente com briefing de IA.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingCopyIndex(index);
    try {
      const { data, error } = await supabase.functions.invoke('generate-creative-suggestions', {
        body: {
          clientId: selectedClientId,
          companyId: activeCompany?.company_id,
          briefing: selectedClient?.ai_briefing,
          theme: theme,
          type: 'copy',
          creativeTypes: [creativeInputs[index].creativeType]
        }
      });

      if (error) throw error;
      if (data?.copy) {
        handleInputChange(index, { copyText: data.copy });
        toast({ title: "Texto gerado com IA!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao gerar texto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingCopyIndex(null);
    }
  };

  // Gerar headline ou descrição de slide do carrossel com IA
  const handleGenerateSlideWithAI = async (creativeIndex: number, slideIndex: number, field: 'headline' | 'description') => {
    const creativeInput = creativeInputs[creativeIndex];
    const theme = creativeInput?.theme;
    
    if (!selectedClient?.ai_briefing && !theme) {
      toast({
        title: "Informações insuficientes",
        description: "Preencha o tema ou selecione um cliente com briefing de IA.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingSlideField({ creativeIndex, slideIndex, field });
    
    try {
      const slides = creativeInput.slides || [];
      const totalSlides = slides.length;
      
      const { data, error } = await supabase.functions.invoke('generate-creative-suggestions', {
        body: {
          clientId: selectedClientId,
          companyId: activeCompany?.company_id,
          briefing: selectedClient?.ai_briefing,
          theme: theme,
          type: field === 'headline' ? 'carousel_headline' : 'carousel_description',
          slideNumber: slideIndex + 1,
          totalSlides: totalSlides,
          existingSlides: slides.map((s, idx) => ({
            slideNumber: idx + 1,
            headline: s.headline,
            description: s.description,
          })),
          creativeTypes: [creativeInput.creativeType]
        }
      });

      if (error) throw error;
      
      if (data?.text) {
        const newSlides = [...slides];
        newSlides[slideIndex] = { ...newSlides[slideIndex], [field]: data.text };
        handleInputChange(creativeIndex, { slides: newSlides });
        toast({ title: `${field === 'headline' ? 'Headline' : 'Descrição'} gerada com IA!` });
      }
    } catch (error: any) {
      toast({
        title: `Erro ao gerar ${field === 'headline' ? 'headline' : 'descrição'}`,
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGeneratingSlideField(null);
    }
  };

  // Gerar imagem única
  const generateImage = async (input: CreativeInputData, index: number): Promise<GeneratedCreative | null> => {
    const typeInfo = CREATIVE_TYPES.find(t => t.id === input.creativeType);
    
    let creativeReferences: string[] = [];
    if (input.referenceFile) {
      const base64 = await convertFileToBase64(input.referenceFile);
      creativeReferences = [base64];
    } else if (input.referenceUrl) {
      creativeReferences = [input.referenceUrl];
    }

    const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
      body: {
        creativeType: input.creativeType,
        clientId: selectedClientId,
        theme: input.theme,
        companyId: activeCompany?.company_id,
        references: creativeReferences,
        approvedText: input.copyText || undefined,
        generateCaption: true,
        context: {
          title: input.theme,
          description: input.theme,
          objective: "engajamento",
          targetAudience: selectedClient?.target_audience || "",
          imageCopy: input.copyText,
          suggestedCaption: ""
        }
      }
    });

    if (error) throw error;

    if (data?.imageUrl) {
      return {
        id: `image-${index}-${Date.now()}`,
        imageUrl: data.imageUrl,
        caption: data.caption || data.suggestedCaption || "",
        type: input.creativeType,
        typeName: typeInfo?.name || input.creativeType,
        theme: input.theme,
        copyText: input.copyText,
        mediaType: "image"
      };
    }
    return null;
  };

  // Gerar carrossel (múltiplas imagens com consistência visual)
  const generateCarousel = async (input: CreativeInputData, index: number): Promise<GeneratedCreative | null> => {
    const typeInfo = CREATIVE_TYPES.find(t => t.id === input.creativeType);
    const slides = input.slides || [];
    
    let creativeReferences: string[] = [];
    if (input.referenceFile) {
      const base64 = await convertFileToBase64(input.referenceFile);
      creativeReferences = [base64];
    } else if (input.referenceUrl) {
      creativeReferences = [input.referenceUrl];
    }

    // Gerar todas as imagens do carrossel
    const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
      body: {
        creativeType: input.creativeType,
        clientId: selectedClientId,
        theme: input.theme,
        companyId: activeCompany?.company_id,
        references: creativeReferences,
        approvedText: input.copyText || undefined,
        generateCaption: true,
        isCarousel: true,
        slides: slides.map((slide, idx) => ({
          slideNumber: idx + 1,
          totalSlides: slides.length,
          headline: slide.headline,
          description: slide.description,
        })),
        context: {
          title: input.theme,
          description: input.theme,
          objective: "engajamento",
          targetAudience: selectedClient?.target_audience || "",
          imageCopy: input.copyText,
          suggestedCaption: ""
        }
      }
    });

    if (error) throw error;

    if (data?.images && data.images.length > 0) {
      return {
        id: `carousel-${index}-${Date.now()}`,
        images: data.images,
        caption: data.caption || data.suggestedCaption || "",
        type: input.creativeType,
        typeName: typeInfo?.name || input.creativeType,
        theme: input.theme,
        copyText: input.copyText,
        mediaType: "carousel"
      };
    } else if (data?.imageUrl) {
      // Fallback se a edge function não suportar carrossel ainda
      return {
        id: `carousel-${index}-${Date.now()}`,
        images: [data.imageUrl],
        caption: data.caption || data.suggestedCaption || "",
        type: input.creativeType,
        typeName: typeInfo?.name || input.creativeType,
        theme: input.theme,
        copyText: input.copyText,
        mediaType: "carousel"
      };
    }
    return null;
  };

  // Gerar vídeo
  const generateVideo = async (input: CreativeInputData, index: number): Promise<void> => {
    const videoType = VIDEO_TYPES.find(t => t.id === input.creativeType);
    
    await videoGeneration.startGeneration({
      clientId: selectedClientId,
      companyId: activeCompany?.company_id || "",
      theme: input.theme,
      creativeType: input.creativeType,
      aspectRatio: videoType?.aspectRatio || '9:16',
      duration: input.videoSettings?.duration || 5,
      model: input.videoSettings?.model || "veo-2.0",
      noTextInVideo: input.videoSettings?.noTextInVideo || false,
      clientName: selectedClient?.name,
      title: input.theme,
      description: input.copyText || input.theme,
    });
  };

  // Gerar todos os criativos
  const handleGenerateAll = async () => {
    if (!canGenerate || !activeCompany?.company_id) return;

    setIsGenerating(true);
    setGeneratedCreatives([]);
    
    const totalToGenerate = validInputs.length;
    setGenerationProgress({ current: 0, total: totalToGenerate, currentType: "" });

    const newCreatives: GeneratedCreative[] = [];
    let hasVideo = false;

    try {
      for (let i = 0; i < validInputs.length; i++) {
        const input = validInputs[i];
        const originalIndex = creativeInputs.indexOf(input);
        
        setGenerationProgress(prev => ({ 
          ...prev, 
          current: i + 1,
          currentType: input.mediaType === "image" ? "Imagem" : input.mediaType === "carousel" ? "Carrossel" : "Vídeo"
        }));

        try {
          if (input.mediaType === "image") {
            const creative = await generateImage(input, originalIndex);
            if (creative) {
              newCreatives.push(creative);
              setGeneratedCreatives([...newCreatives]);
            }
          } else if (input.mediaType === "carousel") {
            const creative = await generateCarousel(input, originalIndex);
            if (creative) {
              newCreatives.push(creative);
              setGeneratedCreatives([...newCreatives]);
            }
          } else if (input.mediaType === "video") {
            // Vídeos são gerados de forma assíncrona
            await generateVideo(input, originalIndex);
            hasVideo = true;
          }
        } catch (itemError: any) {
          console.error(`Erro ao gerar criativo ${i + 1}:`, itemError);
          toast({
            title: `Erro no criativo ${i + 1}`,
            description: itemError.message,
            variant: "destructive",
          });
        }
      }

      const imageCount = newCreatives.filter(c => c.mediaType === "image").length;
      const carouselCount = newCreatives.filter(c => c.mediaType === "carousel").length;
      
      let description = "";
      if (imageCount > 0) description += `${imageCount} imagem(ns)`;
      if (carouselCount > 0) description += `${description ? ", " : ""}${carouselCount} carrossel(éis)`;
      if (hasVideo) description += `${description ? " e " : ""}1 vídeo em processamento`;

      if (description) {
        toast({
          title: "Geração concluída!",
          description,
        });
      }

    } catch (error: any) {
      console.error('Erro ao gerar criativos:', error);
      toast({
        title: "Erro na geração",
        description: error.message || "Não foi possível gerar os criativos.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0, currentType: "" });
    }
  };

  const handleDownload = async (creative: GeneratedCreative) => {
    try {
      if (creative.imageUrl) {
        const response = await fetch(creative.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `criativo-${creative.type}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      toast({ title: "Download iniciado" });
    } catch (error) {
      toast({ title: "Erro no download", variant: "destructive" });
    }
  };

  const handleDownloadCarouselAll = async (creative: GeneratedCreative) => {
    if (!creative.images) return;
    
    try {
      for (let i = 0; i < creative.images.length; i++) {
        const response = await fetch(creative.images[i]);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carrossel-${creative.type}-slide${i + 1}-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
      toast({ title: "Download de todos os slides iniciado" });
    } catch (error) {
      toast({ title: "Erro no download", variant: "destructive" });
    }
  };

  const handleDownloadCarouselSlide = async (creative: GeneratedCreative, slideIndex: number) => {
    if (!creative.images || !creative.images[slideIndex]) return;
    
    try {
      const response = await fetch(creative.images[slideIndex]);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carrossel-${creative.type}-slide${slideIndex + 1}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: `Download do slide ${slideIndex + 1} iniciado` });
    } catch (error) {
      toast({ title: "Erro no download", variant: "destructive" });
    }
  };

  const handleSave = async (creative: GeneratedCreative) => {
    if (!selectedClient || !activeCompany?.company_id) return;

    try {
      await createCreative({
        company_id: activeCompany.company_id,
        client_id: selectedClientId,
        client_name: selectedClient.name,
        creative_type: creative.type,
        theme: creative.theme,
        title: creative.theme,
        description: creative.theme,
        objective: "engajamento",
        target_audience: selectedClient.target_audience || "",
        copy_text: creative.copyText,
        caption: creative.caption,
        image_url: creative.imageUrl || creative.images?.[0],
        media_type: "image", // Carrossel é salvo como imagem no banco
        status: 'completed'
      });
    } catch (error) {
      // Toast já exibido pelo hook
    }
  };

  const handleCaptionChange = (creativeId: string, newCaption: string) => {
    setGeneratedCreatives(prev =>
      prev.map(c => c.id === creativeId ? { ...c, caption: newCaption } : c)
    );
    toast({ title: "Legenda atualizada!" });
  };

  const handleSchedule = (creative: GeneratedCreative) => {
    setSelectedCreativeForSchedule(creative);
    setShowScheduleModal(true);
  };

  const handleRegenerate = async (creative: GeneratedCreative, extraPrompt?: string) => {
    setIsGenerating(true);
    
    try {
      const themeWithExtras = extraPrompt 
        ? `${creative.theme}\n\nInstruções adicionais do usuário: ${extraPrompt}`
        : creative.theme;

      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          creativeType: creative.type,
          clientId: selectedClientId,
          theme: themeWithExtras,
          companyId: activeCompany?.company_id,
          references: [],
          approvedText: creative.copyText || undefined,
          generateCaption: true,
          extraPrompt: extraPrompt || undefined,
          context: {
            title: creative.theme,
            description: extraPrompt 
              ? `${creative.theme} - ${extraPrompt}`
              : `${creative.theme} - Nova versão regenerada`,
            objective: "engajamento",
            targetAudience: selectedClient?.target_audience || "",
            imageCopy: creative.copyText,
            suggestedCaption: ""
          }
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedCreatives(prev => 
          prev.map(c => c.id === creative.id 
            ? { ...c, imageUrl: data.imageUrl, caption: data.caption || data.suggestedCaption || "" }
            : c
          )
        );
        toast({ title: "Criativo regenerado!" });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao regenerar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Contagem por tipo
  const counts = useMemo(() => {
    const result = { image: 0, carousel: 0, video: 0 };
    validInputs.forEach(input => {
      result[input.mediaType]++;
    });
    return result;
  }, [validInputs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna Esquerda - Configurações */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Configurar Criativos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clientSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedClient ? (
                      <div className="flex items-center gap-2">
                        <span>{selectedClient.name}</span>
                        {selectedClient.ai_briefing && (
                          <Badge variant="secondary" className="text-xs">IA</Badge>
                        )}
                      </div>
                    ) : (
                      "Pesquisar cliente..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar cliente..." />
                    <CommandList>
                      <CommandEmpty>Nenhum cliente encontrado.</CommandEmpty>
                      <CommandGroup>
                        {activeClients.map((client) => (
                          <CommandItem
                            key={client.id}
                            value={client.name}
                            onSelect={() => {
                              setSelectedClientId(client.id);
                              setClientSearchOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${
                                selectedClientId === client.id ? "opacity-100" : "opacity-0"
                              }`}
                            />
                            <span>{client.name}</span>
                            {client.ai_briefing && (
                              <Badge variant="secondary" className="ml-2 text-xs">IA</Badge>
                            )}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Botão Importar do Planejamento */}
              {selectedClientId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 gap-2"
                  onClick={() => setShowImportDialog(true)}
                >
                  <FileText className="w-4 h-4" />
                  Importar do Planejamento
                </Button>
              )}
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label>Quantidade de criativos: {quantity}</Label>
              <Slider
                value={[quantity]}
                onValueChange={([val]) => setQuantity(val)}
                min={1}
                max={MAX_VARIATIONS}
                step={1}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Configure cada criativo individualmente abaixo
              </p>
            </div>

            {/* Cards de Criativo */}
            <div className="space-y-2">
              <Label>Configuração de cada criativo</Label>
              <ScrollArea className={quantity > 2 ? "h-[500px] pr-4" : ""}>
                <div className="space-y-3">
                  {creativeInputs.map((input, index) => (
                    <CreativeInputCard
                      key={index}
                      index={index}
                      data={input}
                      onChange={handleInputChange}
                      onGenerateThemeWithAI={() => handleGenerateThemeWithAI(index)}
                      onGenerateCopyWithAI={() => handleGenerateCopyWithAI(index)}
                      onGenerateSlideWithAI={(slideIndex, field) => handleGenerateSlideWithAI(index, slideIndex, field)}
                      onSelectReference={() => {
                        setReferenceDialogForCreativeIndex(index);
                        setShowReferenceDialog(true);
                      }}
                      onRemoveReference={() => removeCreativeReference(index)}
                      isGeneratingTheme={generatingThemeIndex === index}
                      isGeneratingCopy={generatingCopyIndex === index}
                      generatingSlideField={
                        generatingSlideField?.creativeIndex === index 
                          ? { index: generatingSlideField.slideIndex, field: generatingSlideField.field }
                          : null
                      }
                      hasClientBriefing={!!selectedClient?.ai_briefing}
                      selectedClientId={selectedClientId}
                      companyId={activeCompany?.company_id}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Resumo */}
            {validInputs.length > 0 && (
              <div className="p-3 bg-muted/30 rounded-lg border space-y-2">
                <p className="text-sm font-medium">Resumo da geração:</p>
                <div className="flex flex-wrap gap-2">
                  {counts.image > 0 && (
                    <Badge variant="secondary">{counts.image} Imagem(ns)</Badge>
                  )}
                  {counts.carousel > 0 && (
                    <Badge variant="secondary">
                      <Layers className="w-3 h-3 mr-1" />
                      {counts.carousel} Carrossel(éis)
                    </Badge>
                  )}
                  {counts.video > 0 && (
                    <Badge variant="secondary">{counts.video} Vídeo(s)</Badge>
                  )}
                </div>
              </div>
            )}

            {/* Botão Gerar */}
            <Button
              onClick={handleGenerateAll}
              disabled={!canGenerate || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando {generationProgress.current}/{generationProgress.total} ({generationProgress.currentType})...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar {validInputs.length} Criativo(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Coluna Direita - Resultados */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Criativos Gerados</h3>
        
        {/* Video Preview (se houver vídeo em geração) */}
        {videoGeneration.isGenerating && (
          <VideoCreativePreviewCard
            videoUrl={videoGeneration.state.videoUrl}
            status={videoGeneration.state.status}
            progress={videoGeneration.state.progress}
            error={videoGeneration.state.error}
            theme={creativeInputs.find(i => i.mediaType === "video")?.theme}
            typeName={VIDEO_TYPES.find(t => t.id === creativeInputs.find(i => i.mediaType === "video")?.creativeType)?.name}
            duration={creativeInputs.find(i => i.mediaType === "video")?.videoSettings?.duration}
            aspectRatio={VIDEO_TYPES.find(t => t.id === creativeInputs.find(i => i.mediaType === "video")?.creativeType)?.aspectRatio}
            onRegenerate={() => {
              const videoInput = creativeInputs.find(i => i.mediaType === "video");
              if (videoInput) {
                generateVideo(videoInput, creativeInputs.indexOf(videoInput));
              }
            }}
            onSave={async () => {
              if (videoGeneration.state.videoUrl && selectedClient) {
                const videoInput = creativeInputs.find(i => i.mediaType === "video");
                await createCreative({
                  company_id: activeCompany?.company_id || '',
                  client_id: selectedClientId,
                  client_name: selectedClient.name,
                  creative_type: videoInput?.creativeType || "video_reels",
                  theme: videoInput?.theme || '',
                  title: videoInput?.theme || '',
                  description: videoInput?.theme || '',
                  objective: 'engajamento',
                  target_audience: selectedClient.target_audience || '',
                  copy_text: videoInput?.copyText || '',
                  video_url: videoGeneration.state.videoUrl,
                  media_type: 'video',
                  video_duration_seconds: videoInput?.videoSettings?.duration || 5,
                  status: 'completed'
                });
                toast({ title: 'Vídeo salvo no histórico!' });
              }
            }}
            isRegenerating={videoGeneration.isGenerating}
          />
        )}

        {/* Estado vazio */}
        {generatedCreatives.length === 0 && !isGenerating && !videoGeneration.isGenerating && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Os criativos gerados aparecerão aqui</p>
              <p className="text-sm">Configure as opções ao lado e clique em "Gerar"</p>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isGenerating && generatedCreatives.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="font-medium">Gerando criativos...</p>
              <p className="text-sm text-muted-foreground">
                {generationProgress.current} de {generationProgress.total} - {generationProgress.currentType}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Criativos gerados */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generatedCreatives.map((creative) => (
            creative.mediaType === "carousel" ? (
              <CarouselPreviewCard
                key={creative.id}
                images={creative.images || []}
                caption={creative.caption}
                typeName={creative.typeName}
                typeKey={creative.type}
                clientId={selectedClient?.id || ""}
                clientName={selectedClient?.name || "Cliente"}
                clientAvatar={selectedClient?.avatar || undefined}
                isRegenerating={isGenerating}
                onCaptionChange={(newCaption) => handleCaptionChange(creative.id, newCaption)}
                onDownloadAll={() => handleDownloadCarouselAll(creative)}
                onDownloadSlide={(idx) => handleDownloadCarouselSlide(creative, idx)}
                onSave={() => handleSave(creative)}
                onSchedule={() => handleSchedule(creative)}
                onRegenerate={() => handleRegenerate(creative)}
              />
            ) : (
              <CreativePreviewCard
                key={creative.id}
                imageUrl={creative.imageUrl || ""}
                caption={creative.caption}
                typeName={creative.typeName}
                typeKey={creative.type}
                clientId={selectedClient?.id || ""}
                clientName={selectedClient?.name || "Cliente"}
                clientAvatar={selectedClient?.avatar || undefined}
                isRegenerating={isGenerating}
                onCaptionChange={(newCaption) => handleCaptionChange(creative.id, newCaption)}
                onDownload={() => handleDownload(creative)}
                onSave={() => handleSave(creative)}
                onSchedule={() => handleSchedule(creative)}
                onRegenerate={(extraPrompt) => handleRegenerate(creative, extraPrompt)}
              />
            )
          ))}
        </div>
      </div>

      {/* Modal de Agendamento */}
      {selectedCreativeForSchedule && (
        <NewPostModal
          open={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setSelectedCreativeForSchedule(null);
          }}
          pages={pages}
          instagramAccounts={instagramAccounts}
          initialMediaUrls={
            selectedCreativeForSchedule.images 
              ? selectedCreativeForSchedule.images 
              : selectedCreativeForSchedule.imageUrl 
                ? [selectedCreativeForSchedule.imageUrl] 
                : []
          }
          initialCaption={selectedCreativeForSchedule.caption}
          initialClientId={selectedClientId}
        />
      )}

      {/* Dialog de seleção de referências */}
      {selectedClientId && activeCompany?.company_id && (
        <ReferenceSelectionDialog
          open={showReferenceDialog}
          onOpenChange={(open) => {
            setShowReferenceDialog(open);
            if (!open) setReferenceDialogForCreativeIndex(null);
          }}
          clientId={selectedClientId}
          companyId={activeCompany.company_id}
          onSelect={(urls) => {
            if (referenceDialogForCreativeIndex !== null && urls.length > 0) {
              handleReferenceUrlChange(referenceDialogForCreativeIndex, urls[0]);
              setReferenceDialogForCreativeIndex(null);
            }
          }}
          maxSelections={1}
        />
      )}

      {/* Dialog de importar do planejamento */}
      {selectedClientId && (
        <ImportFromPlanDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          clientId={selectedClientId}
          onImport={handleImportFromPlan}
        />
      )}
    </div>
  );
}
