import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

  const companyId = activeCompany?.company_id;

  const [activeTab, setActiveTab] = useState("generate");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [carouselType, setCarouselType] = useState<CarouselType>("tutorial");
  const [slidesCount, setSlidesCount] = useState(8);
  const [theme, setTheme] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  
  // New states for generation mode
  const [generationMode, setGenerationMode] = useState<GenerationMode>("scratch");
  const [selectedCarousel, setSelectedCarousel] = useState<SelectedCarousel | null>(null);
  const [isCarouselSelectorOpen, setIsCarouselSelectorOpen] = useState(false);

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

  const canGenerate = !!selectedClientId && !!companyId && !!user?.id &&
    (generationMode === "scratch" || (generationMode === "fromExample" && selectedCarousel));

  // Extract reference images from selected carousel
  const referenceCarouselImages = useMemo(() => {
    if (!selectedCarousel || generationMode !== "fromExample") return undefined;
    return selectedCarousel.children
      .filter((c) => c.media_type === "IMAGE")
      .map((c) => c.media_url);
  }, [selectedCarousel, generationMode]);

  const handleGenerate = () => {
    if (!canGenerate) {
      if (generationMode === "fromExample" && !selectedCarousel) {
        toast.error("Selecione um carrossel de referência para continuar");
      } else {
        toast.error("Selecione um cliente para continuar");
      }
      return;
    }
    setIsModalOpen(true);
  };

  const handleGenerationFinished = () => {
    // Refresh history when generation completes
    setHistoryKey((prev) => prev + 1);
  };

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    // Reset selected carousel when client changes
    setSelectedCarousel(null);
  };

  const handleGenerationModeChange = (mode: GenerationMode) => {
    setGenerationMode(mode);
    if (mode === "scratch") {
      setSelectedCarousel(null);
    }
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

                  {/* Carousel Type */}
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

                  {/* Generation Mode - NEW */}
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

                  {/* Instagram Carousel Selector - Shows when mode is fromExample */}
                  {generationMode === "fromExample" && selectedClient?.instagram_account?.instagram_id && (
                    <div className="space-y-2">
                      <Label>Carrossel de Referência *</Label>
                      {selectedCarousel ? (
                        <SelectedCarouselPreview
                          carousel={selectedCarousel}
                          onChangeClick={() => setIsCarouselSelectorOpen(true)}
                          onRemove={() => setSelectedCarousel(null)}
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

                  {/* Slides Count */}
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

              {/* Preview/Info Card */}
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
            carouselType={carouselType}
            referenceCarouselImages={referenceCarouselImages}
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
            onSelect={(carousel) => setSelectedCarousel(carousel)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
