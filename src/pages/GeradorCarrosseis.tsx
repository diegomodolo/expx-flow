import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Layers, Sparkles, History, Home, BookOpen, Scale, Camera, ListChecks, Instagram, Wand2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import { ClientSearchCombobox } from "@/components/generators/ClientSearchCombobox";
import { CarouselGenerationProgressModal } from "@/components/generators/CarouselGenerationProgressModal";
import { CarouselType } from "@/hooks/useCarouselGenerationStream";
import { CarouselHistoryList } from "@/components/carousel-generator/CarouselHistoryList";
import { InstagramCarouselSelector, SelectedCarousel } from "@/components/carousel-generator/InstagramCarouselSelector";
import { SelectedCarouselPreview } from "@/components/carousel-generator/SelectedCarouselPreview";
import { ThemeSelectorModal } from "@/components/carousel-generator/ThemeSelectorModal";
import { SlideContent } from "@/components/carousel-generator/SlideContentCard";
import { VisualVariationOptionsCard, VisualVariationOptions, defaultVisualVariations } from "@/components/carousel-generator/VisualVariationOptions";
import { GeneratedCarouselPreview } from "@/components/carousel-generator/GeneratedCarouselPreview";
import { supabase } from "@/integrations/supabase/client";

type GenerationMode = "scratch" | "fromExample";

const CAROUSEL_TYPES: Array<{
  value: CarouselType;
  label: string;
  description: string;
  icon: typeof BookOpen;
}> = [
  {
    value: "tutorial",
    label: "Tutorial / Passo a Passo",
    description: "Ensine algo valioso em etapas claras",
    icon: BookOpen,
  },
  {
    value: "comparison",
    label: "Nós vs. Eles",
    description: "Compare sua solução com alternativas",
    icon: Scale,
  },
  {
    value: "behind_scenes",
    label: "Bastidores",
    description: "Mostre os bastidores do produto/empresa",
    icon: Camera,
  },
  {
    value: "curated_list",
    label: "Lista Curada",
    description: "Compile dicas, recursos ou ferramentas",
    icon: ListChecks,
  },
];

export default function GeradorCarrosseis() {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companyId = activeCompany?.company_id;

  const [activeTab, setActiveTab] = useState("generate");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [carouselType, setCarouselType] = useState<CarouselType>("tutorial");
  const [slidesCount, setSlidesCount] = useState(8);
  const [theme, setTheme] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  
  // States for generation mode
  const [generationMode, setGenerationMode] = useState<GenerationMode>("scratch");
  const [selectedCarousel, setSelectedCarousel] = useState<SelectedCarousel | null>(null);
  const [isCarouselSelectorOpen, setIsCarouselSelectorOpen] = useState(false);

  // States for AI content generation
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [themeSuggestions, setThemeSuggestions] = useState<string[]>([]);
  const [generatedSlideContents, setGeneratedSlideContents] = useState<SlideContent[] | null>(null);
  
  // Visual variation options state
  const [visualVariations, setVisualVariations] = useState<VisualVariationOptions>(defaultVisualVariations);

  // State for last generated carousel
  const [lastGeneratedCarouselId, setLastGeneratedCarouselId] = useState<string | null>(null);

  const { clients, loading: isLoadingClients } = useClients();

  const clientsForCombobox = useMemo(
    () => clients.map((c) => ({ id: c.id, name: c.name })),
    [clients]
  );

  // Get the selected client to access instagram_id
  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  // Determine if we can generate - require content when using example mode
  const canGenerate = !!selectedClientId && !!companyId && !!user?.id &&
    (generationMode === "scratch" || (generationMode === "fromExample" && selectedCarousel && generatedSlideContents && generatedSlideContents.length > 0));

  // Extract reference images from selected carousel
  const referenceCarouselImages = useMemo(() => {
    if (!selectedCarousel || generationMode !== "fromExample") return undefined;
    return selectedCarousel.children
      .filter((c) => c.media_type === "IMAGE")
      .map((c) => c.media_url);
  }, [selectedCarousel, generationMode]);

  const handleGenerate = () => {
    if (!canGenerate) {
      if (generationMode === "fromExample") {
        if (!selectedCarousel) {
          toast.error("Selecione um carrossel de referência para continuar");
        } else if (!generatedSlideContents || generatedSlideContents.length === 0) {
          toast.error("Gere o conteúdo com IA antes de criar o carrossel");
        }
      } else {
        toast.error("Selecione um cliente para continuar");
      }
      return;
    }
    setIsModalOpen(true);
  };

  const handleGenerationFinished = (carouselId?: string) => {
    // Invalidate the carousel history cache to force a refetch
    queryClient.invalidateQueries({ queryKey: ["carousel-history"] });
    
    // Also increment key as backup
    setHistoryKey((prev) => prev + 1);
    
    // Store the generated carousel ID to display it
    if (carouselId) {
      setLastGeneratedCarouselId(carouselId);
    }
    
    // Close the modal after a short delay to allow the user to see the success message
    setTimeout(() => {
      setIsModalOpen(false);
    }, 1500);
  };

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    // Reset selected carousel and content when client changes
    setSelectedCarousel(null);
    setGeneratedSlideContents(null);
    setThemeSuggestions([]);
    setVisualVariations(defaultVisualVariations);
  };

  const handleGenerationModeChange = (mode: GenerationMode) => {
    setGenerationMode(mode);
    if (mode === "scratch") {
      setSelectedCarousel(null);
      setGeneratedSlideContents(null);
      setThemeSuggestions([]);
      setVisualVariations(defaultVisualVariations);
    }
  };

  const handleCarouselSelect = (carousel: SelectedCarousel) => {
    setSelectedCarousel(carousel);
    // Reset generated content when carousel changes
    setGeneratedSlideContents(null);
    setThemeSuggestions([]);
    setVisualVariations(defaultVisualVariations);
  };

  const handleGenerateContentClick = async () => {
    if (!selectedCarousel || !selectedClientId) return;

    setIsAnalyzing(true);
    setIsThemeModalOpen(true);

    try {
      // Get image URLs from carousel children
      const images = selectedCarousel.children
        .filter((c) => c.media_type === "IMAGE" || c.thumbnail_url)
        .map((c) => c.media_type === "IMAGE" ? c.media_url : c.thumbnail_url!);

      // Call the analyze-carousel-slides function to get theme suggestions
      const { data, error } = await supabase.functions.invoke("analyze-carousel-slides", {
        body: { clientId: selectedClientId, images },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha ao analisar slides");

      setThemeSuggestions(data.themeSuggestions || []);
    } catch (err: any) {
      console.error("Error analyzing slides:", err);
      toast.error(err?.message || "Erro ao analisar imagens");
      setIsThemeModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleThemeSelect = async (selectedTheme: string) => {
    if (!selectedCarousel || !selectedClientId) return;

    setIsAnalyzing(true);

    try {
      const images = selectedCarousel.children
        .filter((c) => c.media_type === "IMAGE" || c.thumbnail_url)
        .map((c) => c.media_type === "IMAGE" ? c.media_url : c.thumbnail_url!);

      const { data, error } = await supabase.functions.invoke("analyze-carousel-slides", {
        body: { clientId: selectedClientId, images, selectedTheme },
      });

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "Falha ao gerar conteúdo");

      setGeneratedSlideContents(data.slideContents || []);
      setIsThemeModalOpen(false);
      toast.success("Conteúdo gerado com sucesso!");
    } catch (err: any) {
      console.error("Error generating content:", err);
      toast.error(err?.message || "Erro ao gerar conteúdo");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSlideContentChange = (index: number, content: SlideContent) => {
    if (!generatedSlideContents) return;
    const updated = [...generatedSlideContents];
    updated[index] = content;
    setGeneratedSlideContents(updated);
  };
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/geradores")}
            className="flex items-center gap-2 mb-4"
          >
            <Home className="w-4 h-4" />
            Voltar para Geradores
          </Button>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Gerador de Carrossel com IA</h1>
              <p className="text-muted-foreground">
                Crie carrosseis para Instagram de forma rápida e simplificada
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Gerar Novo
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="mt-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Form Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Configuração do Carrossel
                  </CardTitle>
                  <CardDescription>
                    Preencha as opções para gerar seu carrossel com IA
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Client Selector */}
                  <div className="space-y-2">
                    <Label>Cliente *</Label>
                    <ClientSearchCombobox
                      clients={clientsForCombobox}
                      value={selectedClientId}
                      onValueChange={handleClientChange}
                      placeholder="Selecione um cliente..."
                      className={isLoadingClients ? "opacity-50 pointer-events-none" : ""}
                    />
                  </div>

                  {/* Generation Mode - FIRST after client selector */}
                  <div className="space-y-3">
                    <Label>Modo de Geração</Label>
                    <RadioGroup
                      value={generationMode}
                      onValueChange={(v) => handleGenerationModeChange(v as GenerationMode)}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                    >
                      <Label
                        htmlFor="mode-scratch"
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          generationMode === "scratch"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        <RadioGroupItem
                          value="scratch"
                          id="mode-scratch"
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Wand2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Gerar do Zero</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Crie um carrossel totalmente novo com IA
                          </p>
                        </div>
                      </Label>

                      <Label
                        htmlFor="mode-fromExample"
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          generationMode === "fromExample"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        } ${!selectedClient?.instagram_account?.instagram_id ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <RadioGroupItem
                          value="fromExample"
                          id="mode-fromExample"
                          className="mt-0.5"
                          disabled={!selectedClient?.instagram_account?.instagram_id}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Copy className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-sm">Gerar a Partir de Exemplo</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedClient?.instagram_account?.instagram_id 
                              ? "Use um carrossel existente do Instagram como referência"
                              : "Cliente sem Instagram configurado"}
                          </p>
                        </div>
                      </Label>
                    </RadioGroup>
                  </div>

                  {/* Carousel Type - ONLY shows when "Gerar do Zero" */}
                  {generationMode === "scratch" && (
                    <div className="space-y-3">
                      <Label>Tipo de Carrossel</Label>
                      <RadioGroup
                        value={carouselType}
                        onValueChange={(v) => setCarouselType(v as CarouselType)}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                      >
                        {CAROUSEL_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <Label
                              key={type.value}
                              htmlFor={type.value}
                              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                carouselType === type.value
                                  ? "border-primary bg-primary/5"
                                  : "border-border hover:bg-muted"
                              }`}
                            >
                              <RadioGroupItem
                                value={type.value}
                                id={type.value}
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">{type.label}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {type.description}
                                </p>
                              </div>
                            </Label>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  )}

                  {/* Instagram Carousel Selector - Shows when mode is fromExample */}
                  {generationMode === "fromExample" && selectedClient?.instagram_account?.instagram_id && (
                    <div className="space-y-2">
                      <Label>Carrossel de Referência *</Label>
                      {selectedCarousel ? (
                        <SelectedCarouselPreview
                          carousel={selectedCarousel}
                          onChangeClick={() => setIsCarouselSelectorOpen(true)}
                          onRemove={() => {
                            setSelectedCarousel(null);
                            setGeneratedSlideContents(null);
                          }}
                          slideContents={generatedSlideContents}
                          onSlideContentChange={handleSlideContentChange}
                          onGenerateContentClick={handleGenerateContentClick}
                          isAnalyzing={isAnalyzing}
                        />
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-start gap-2 h-auto py-3"
                          onClick={() => setIsCarouselSelectorOpen(true)}
                        >
                          <Instagram className="w-4 h-4" />
                          Selecionar Carrossel do Instagram
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Visual Variation Options - Shows after content is generated in fromExample mode */}
                  {generationMode === "fromExample" && generatedSlideContents && generatedSlideContents.length > 0 && (
                    <VisualVariationOptionsCard
                      options={visualVariations}
                      onChange={setVisualVariations}
                    />
                  )}

                  {/* Slides Count - HIDDEN when using example mode */}
                  {generationMode === "scratch" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Número de Slides</Label>
                        <span className="text-sm font-medium text-primary">
                          {slidesCount} slides
                        </span>
                      </div>
                      <Slider
                        value={[slidesCount]}
                        onValueChange={([v]) => setSlidesCount(v)}
                        min={3}
                        max={10}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Recomendado: 6-8 slides para melhor engajamento
                      </p>
                    </div>
                  )}

                  {/* Theme/Orientation */}
                  <div className="space-y-2">
                    <Label>Tema / Orientação (opcional)</Label>
                    <Textarea
                      value={theme}
                      onChange={(e) => setTheme(e.target.value)}
                      placeholder="Ex: Foque em dicas de produtividade para empreendedores..."
                      className="min-h-[80px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe em branco para a IA escolher o tema baseado no briefing do cliente
                    </p>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={!canGenerate}
                    className="w-full"
                    size="lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Gerar Carrossel
                  </Button>
                </CardContent>
              </Card>

              {/* Preview/Info Card - Shows generated carousel or how-it-works */}
              {lastGeneratedCarouselId ? (
                <GeneratedCarouselPreview
                  carouselId={lastGeneratedCarouselId}
                  clientId={selectedClientId}
                  companyId={companyId || ""}
                  onClose={() => setLastGeneratedCarouselId(null)}
                  onViewDetails={() => {
                    // Navigate to the history tab to see details
                    setActiveTab("history");
                    setLastGeneratedCarouselId(null);
                  }}
                />
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Como Funciona</CardTitle>
                    <CardDescription>
                      Entenda o processo de geração de carrosseis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">1</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">Análise do Briefing</p>
                          <p className="text-xs text-muted-foreground">
                            A IA analisa o briefing do cliente para entender o negócio
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">2</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">Criação do Conteúdo</p>
                          <p className="text-xs text-muted-foreground">
                            Headlines e textos são criados para cada slide
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">3</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">Geração das Imagens</p>
                          <p className="text-xs text-muted-foreground">
                            Cada slide é renderizado com design profissional
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">4</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">Pronto para Publicar</p>
                          <p className="text-xs text-muted-foreground">
                            Baixe, agende ou publique diretamente
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <div className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium mb-2">💡 Dica</p>
                        <p className="text-xs text-muted-foreground">
                          Carrosseis com 6-8 slides têm melhor performance. 
                          Escolha o tipo que melhor se adequa ao objetivo: 
                          tutoriais para educar, comparações para converter, 
                          bastidores para humanizar.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <CarouselHistoryList key={historyKey} />
          </TabsContent>
        </Tabs>

        {/* Generation Modal */}
        {selectedClientId && companyId && user?.id && (
          <CarouselGenerationProgressModal
            open={isModalOpen}
            onOpenChange={setIsModalOpen}
            clientId={selectedClientId}
            companyId={companyId}
            userId={user.id}
            // Only pass carouselType when generating from scratch
            carouselType={generationMode === "scratch" ? carouselType : undefined}
            // Only pass references and pre-generated slides when generating from example
            referenceCarouselImages={generationMode === "fromExample" ? referenceCarouselImages : undefined}
            preGeneratedSlides={
              generationMode === "fromExample" && generatedSlideContents && generatedSlideContents.length > 0
                ? generatedSlideContents.map(s => ({
                    slideNumber: s.slideNumber,
                    type: s.type,
                    headline: s.headline,
                    bodyText: s.bodyText,
                    visualDescription: s.visualDescription,
                  }))
                : undefined
            }
            visualVariations={generationMode === "fromExample" ? visualVariations : undefined}
            onFinished={handleGenerationFinished}
          />
        )}

        {/* Instagram Carousel Selector Modal */}
        {selectedClient?.instagram_account?.instagram_id && (
          <InstagramCarouselSelector
            open={isCarouselSelectorOpen}
            onOpenChange={setIsCarouselSelectorOpen}
            clientId={selectedClientId}
            instagramId={selectedClient.instagram_account.instagram_id}
            onSelect={handleCarouselSelect}
          />
        )}

        {/* Theme Selector Modal */}
        <ThemeSelectorModal
          open={isThemeModalOpen}
          onOpenChange={setIsThemeModalOpen}
          themeSuggestions={themeSuggestions}
          isLoading={isAnalyzing}
          onSelectTheme={handleThemeSelect}
        />
      </div>
    </DashboardLayout>
  );
}
