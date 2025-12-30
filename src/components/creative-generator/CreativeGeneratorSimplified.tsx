import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/hooks/useClients";
import { useCompany } from "@/contexts/CompanyContext";
import { useVisualCreatives } from "@/hooks/useVisualCreatives";
import { useFacebookPages } from "@/hooks/useFacebookPages";
import { supabase } from "@/integrations/supabase/client";
import { 
  Sparkles, 
  Loader2, 
  ChevronDown, 
  ImagePlus, 
  X,
  Check,
  Wand2,
  ChevronsUpDown,
  Instagram,
  Megaphone,
  FileText
} from "lucide-react";
import { NewPostModal } from "@/components/scheduling/NewPostModal";
import { ReferenceSelectionDialog } from "@/components/clients/ReferenceSelectionDialog";
import { CreativePreviewCard } from "./CreativePreviewCard";
import { ImportFromPlanDialog } from "@/components/content-planner/ImportFromPlanDialog";
import { ContentPlanPost } from "@/hooks/useContentPlans";

// Tipos de criativos disponíveis
// Instagram Feed e Facebook Feed agora usam proporção 3:4 (1080x1440)
const CREATIVE_TYPES = [
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
  { id: "banner_vertical", name: "Banner Vertical", dimensions: "600x1200", aspectRatio: "1:2" },
  { id: "twitter_post", name: "Twitter/X Post", dimensions: "1200x675", aspectRatio: "16:9" },
];

const MAX_VARIATIONS = 12;
const MAX_REFERENCES = 12;

interface GeneratedCreative {
  id: string;
  imageUrl: string;
  caption: string;
  type: string;
  typeName: string;
  theme: string;
  copyText: string;
}

interface CreativeInput {
  theme: string;
  copyText: string;
}

export function CreativeGeneratorSimplified() {
  const { toast } = useToast();
  const { clients } = useClients();
  const { activeCompany } = useCompany();
  const { createCreative } = useVisualCreatives();
  const { pages, instagramAccounts } = useFacebookPages();

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["instagram_feed"]);
  const [quantity, setQuantity] = useState(1);
  const [creativeInputs, setCreativeInputs] = useState<CreativeInput[]>([{ theme: "", copyText: "" }]);
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [showReferences, setShowReferences] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [showReferenceDialog, setShowReferenceDialog] = useState(false);
  const [generatingThemeIndex, setGeneratingThemeIndex] = useState<number | null>(null);
  const [generatingCopyIndex, setGeneratingCopyIndex] = useState<number | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCreatives, setGeneratedCreatives] = useState<GeneratedCreative[]>([]);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });

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
          newInputs.push({ theme: "", copyText: "" });
        }
        return newInputs;
      } else if (prev.length > quantity) {
        return prev.slice(0, quantity);
      }
      return prev;
    });
  }, [quantity]);

  const canGenerate = selectedClientId && selectedTypes.length > 0 && creativeInputs.some(input => input.theme.trim());

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes(prev => {
      if (prev.includes(typeId)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== typeId);
      }
      return [...prev, typeId];
    });
  };

  const handleInputChange = (index: number, field: 'theme' | 'copyText', value: string) => {
    setCreativeInputs(prev => {
      const newInputs = [...prev];
      newInputs[index] = { ...newInputs[index], [field]: value };
      return newInputs;
    });
  };

  const handleReferenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => f.type.startsWith('image/'));
    const totalRefs = referenceUrls.length + referenceFiles.length;
    const remaining = MAX_REFERENCES - totalRefs;
    setReferenceFiles(prev => [...prev, ...validFiles.slice(0, remaining)]);
  };

  const removeReferenceFile = (index: number) => {
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeReferenceUrl = (index: number) => {
    setReferenceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleReferenceSelect = (urls: string[]) => {
    const totalRefs = referenceUrls.length + referenceFiles.length;
    const remaining = MAX_REFERENCES - totalRefs;
    setReferenceUrls(prev => [...prev, ...urls.slice(0, remaining)]);
  };

  const totalReferences = referenceUrls.length + referenceFiles.length;

  // Import posts from content plan
  const handleImportFromPlan = (posts: ContentPlanPost[]) => {
    if (posts.length === 0) return;

    // Set quantity to match imported posts
    setQuantity(posts.length);

    // Map posts to creative inputs
    // theme (descrição) = headline + subheadline + caption compilados
    // copyText (texto da imagem) = headline
    const newInputs = posts.map((post) => {
      const themeParts = [
        post.headline,
        post.subheadline,
        post.caption
      ].filter(Boolean);
      
      return {
        theme: themeParts.join("\n\n") || post.objective || "",
        copyText: post.headline || "",
      };
    });
    setCreativeInputs(newInputs);

    // Determine creative types based on post types
    const hasCarousel = posts.some((p) => p.post_type === "carrossel");
    if (hasCarousel) {
      setSelectedTypes(["instagram_feed"]);
    }

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
          creativeTypes: selectedTypes
        }
      });

      if (error) throw error;
      if (data?.theme) {
        handleInputChange(index, 'theme', data.theme);
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
          creativeTypes: selectedTypes
        }
      });

      if (error) throw error;
      if (data?.copy) {
        handleInputChange(index, 'copyText', data.copy);
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

  const handleGenerate = async () => {
    if (!canGenerate || !activeCompany?.company_id) return;

    setIsGenerating(true);
    setGeneratedCreatives([]);
    
    // Count only inputs with theme filled
    const validInputs = creativeInputs.filter(input => input.theme.trim());
    const totalToGenerate = selectedTypes.length * validInputs.length;
    setGenerationProgress({ current: 0, total: totalToGenerate });

    try {
      const fileBase64 = await Promise.all(
        referenceFiles.map(f => convertFileToBase64(f))
      );
      const allReferences = [...fileBase64, ...referenceUrls];

      const newCreatives: GeneratedCreative[] = [];

      for (const typeId of selectedTypes) {
        const typeInfo = CREATIVE_TYPES.find(t => t.id === typeId)!;
        
        for (let i = 0; i < validInputs.length; i++) {
          const input = validInputs[i];
          if (!input.theme.trim()) continue;

          setGenerationProgress(prev => ({ ...prev, current: prev.current + 1 }));

          // Use specific reference for this creative if available
          const creativeReferences = allReferences.length > i 
            ? [allReferences[i]] 
            : allReferences.slice(0, 3);

          const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
            body: {
              creativeType: typeId,
              clientId: selectedClientId,
              theme: input.theme,
              companyId: activeCompany.company_id,
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
            newCreatives.push({
              id: `${typeId}-${i}-${Date.now()}`,
              imageUrl: data.imageUrl,
              caption: data.caption || data.suggestedCaption || "",
              type: typeId,
              typeName: typeInfo.name,
              theme: input.theme,
              copyText: input.copyText
            });
            setGeneratedCreatives([...newCreatives]);
          }
        }
      }

      toast({
        title: "Criativos gerados!",
        description: `${newCreatives.length} criativo(s) gerado(s) com sucesso.`,
      });

    } catch (error: any) {
      console.error('Erro ao gerar criativos:', error);
      toast({
        title: "Erro na geração",
        description: error.message || "Não foi possível gerar os criativos.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ current: 0, total: 0 });
    }
  };

  const handleDownload = async (creative: GeneratedCreative) => {
    try {
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
      
      toast({ title: "Download iniciado" });
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
        image_url: creative.imageUrl,
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
      const fileBase64 = await Promise.all(
        referenceFiles.map(f => convertFileToBase64(f))
      );
      const allReferences = [...fileBase64, ...referenceUrls];

      // Combinar tema original com instruções extras
      const themeWithExtras = extraPrompt 
        ? `${creative.theme}\n\nInstruções adicionais do usuário: ${extraPrompt}`
        : creative.theme;

      const { data, error } = await supabase.functions.invoke('generate-visual-creative', {
        body: {
          creativeType: creative.type,
          clientId: selectedClientId,
          theme: themeWithExtras,
          companyId: activeCompany?.company_id,
          references: allReferences.slice(0, 3),
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Coluna Esquerda - Configurações */}
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Configurar Criativo
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

            {/* Tipos de Criativo */}
            <div className="space-y-2">
              <Label>Tipo de Criativo * (clique para selecionar múltiplos)</Label>
              <div className="flex flex-wrap gap-2">
                {CREATIVE_TYPES.map(type => (
                  <Badge
                    key={type.id}
                    variant={selectedTypes.includes(type.id) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => handleTypeToggle(type.id)}
                  >
                    {selectedTypes.includes(type.id) && <Check className="w-3 h-3 mr-1" />}
                    {type.name}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selecionados: {selectedTypes.map(t => CREATIVE_TYPES.find(ct => ct.id === t)?.name).join(", ")}
              </p>
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
                Total a gerar: {selectedTypes.length * quantity} ({selectedTypes.length} tipo(s) × {quantity} criativo(s))
              </p>
            </div>

            {/* Campos por criativo */}
            <div className="space-y-4">
              <Label>Configuração de cada criativo</Label>
              <ScrollArea className={quantity > 3 ? "h-[400px] pr-4" : ""}>
                <div className="space-y-4">
                  {creativeInputs.map((input, index) => (
                    <Card key={index} className="p-4 bg-muted/30">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Criativo {index + 1}</span>
                        </div>
                        
                        {/* Tema */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Tema / Descrição *</Label>
                            {selectedClient?.ai_briefing && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleGenerateThemeWithAI(index)}
                                disabled={generatingThemeIndex === index}
                                className="h-6 text-xs px-2"
                              >
                                {generatingThemeIndex === index ? (
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
                            value={input.theme}
                            onChange={(e) => handleInputChange(index, 'theme', e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        </div>

                        {/* Texto na imagem */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Texto na Imagem (opcional)</Label>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateCopyWithAI(index)}
                              disabled={generatingCopyIndex === index || (!selectedClient?.ai_briefing && !input.theme)}
                              className="h-6 text-xs px-2"
                            >
                              {generatingCopyIndex === index ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                              )}
                              IA
                            </Button>
                          </div>
                          <Input
                            placeholder="Ex: 50% OFF, Compre Agora, etc."
                            value={input.copyText}
                            onChange={(e) => handleInputChange(index, 'copyText', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Referências Visuais (colapsável) */}
            <Collapsible open={showReferences} onOpenChange={setShowReferences}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <ImagePlus className="w-4 h-4" />
                    Referências Visuais ({totalReferences}/{MAX_REFERENCES})
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showReferences ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4 space-y-4">
                {/* Imagens selecionadas */}
                <div className="flex flex-wrap gap-2">
                  {/* Arquivos locais */}
                  {referenceFiles.map((file, idx) => (
                    <div key={`file-${idx}`} className="relative w-16 h-16">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Ref ${idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <span className="absolute bottom-0 left-0 bg-black/60 text-white text-[10px] px-1 rounded-br-lg rounded-tl-lg">
                        {idx + 1}
                      </span>
                      <button
                        onClick={() => removeReferenceFile(idx)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* URLs do Instagram/Campanhas */}
                  {referenceUrls.map((url, idx) => (
                    <div key={`url-${idx}`} className="relative w-16 h-16">
                      <img
                        src={url}
                        alt={`Ref ${referenceFiles.length + idx + 1}`}
                        className="w-full h-full object-cover rounded-lg border"
                      />
                      <Badge variant="secondary" className="absolute top-0 left-0 text-[8px] px-0.5 py-0 rounded-br-lg rounded-tl-lg">
                        <Instagram className="w-2 h-2" />
                      </Badge>
                      <span className="absolute bottom-0 left-0 bg-black/60 text-white text-[10px] px-1 rounded-br-lg rounded-tl-lg">
                        {referenceFiles.length + idx + 1}
                      </span>
                      <button
                        onClick={() => removeReferenceUrl(idx)}
                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {/* Botão para adicionar arquivo */}
                  {totalReferences < MAX_REFERENCES && (
                    <label className="w-16 h-16 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                      <ImagePlus className="w-5 h-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleReferenceUpload}
                      />
                    </label>
                  )}
                </div>
                
                {/* Botões para buscar do Instagram/Campanhas */}
                {selectedClientId && activeCompany?.company_id && totalReferences < MAX_REFERENCES && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReferenceDialog(true)}
                      className="flex-1"
                    >
                      <Instagram className="w-4 h-4 mr-2" />
                      Buscar do Instagram
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReferenceDialog(true)}
                      className="flex-1"
                    >
                      <Megaphone className="w-4 h-4 mr-2" />
                      Buscar das Campanhas
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  Adicione até {MAX_REFERENCES} imagens de referência. Cada referência pode ser usada para um criativo específico.
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Botão Gerar */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Gerando {generationProgress.current}/{generationProgress.total}...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar {selectedTypes.length * creativeInputs.filter(i => i.theme.trim()).length} Criativo(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Coluna Direita - Resultados */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Criativos Gerados</h3>
        
        {generatedCreatives.length === 0 && !isGenerating && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Os criativos gerados aparecerão aqui</p>
              <p className="text-sm">Configure as opções ao lado e clique em "Gerar"</p>
            </CardContent>
          </Card>
        )}

        {isGenerating && generatedCreatives.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="font-medium">Gerando criativos...</p>
              <p className="text-sm text-muted-foreground">
                {generationProgress.current} de {generationProgress.total}
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {generatedCreatives.map((creative) => (
            <CreativePreviewCard
              key={creative.id}
              imageUrl={creative.imageUrl}
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
          initialMediaUrls={[selectedCreativeForSchedule.imageUrl]}
          initialCaption={selectedCreativeForSchedule.caption}
          initialClientId={selectedClientId}
        />
      )}

      {/* Dialog de seleção de referências do Instagram/Campanhas */}
      {selectedClientId && activeCompany?.company_id && (
        <ReferenceSelectionDialog
          open={showReferenceDialog}
          onOpenChange={setShowReferenceDialog}
          clientId={selectedClientId}
          companyId={activeCompany.company_id}
          onSelect={handleReferenceSelect}
          maxSelections={MAX_REFERENCES - totalReferences}
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
