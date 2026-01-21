import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, Image, Loader2, Sparkles, X, ScanText, Layers, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VariationOptionsCard, VariationOptions } from "./VariationOptionsCard";
import { VariationsGrid, GeneratedVariation } from "./VariationsGrid";
import { Label } from "@/components/ui/label";

export function CreativeVariationGenerator() {
  // Form state
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
  const [personImage, setPersonImage] = useState<string | null>(null);
  const [personImageFile, setPersonImageFile] = useState<File | null>(null);
  const [textOverlay, setTextOverlay] = useState("");
  const [designGuidance, setDesignGuidance] = useState("");
  const [variationOptions, setVariationOptions] = useState<VariationOptions>({
    changePoseExpression: true,
    varyComposition: true,
    alterColorPalette: false,
    varyBackground: true,
  });
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["instagram_feed"]);
  const [quantity, setQuantity] = useState(4);
  const [accumulateMode, setAccumulateMode] = useState(true);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [totalToGenerate, setTotalToGenerate] = useState(0);

  const extractTextFromImage = useCallback(async (imageBase64: string) => {
    setIsExtractingText(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-image-text", {
        body: { imageBase64 },
      });

      if (error) {
        console.error("Error extracting text:", error);
        return;
      }

      if (data?.hasText && data?.text) {
        setTextOverlay(data.text);
        toast.success("Texto extraído da imagem automaticamente!");
      }
    } catch (err) {
      console.error("Error extracting text:", err);
    } finally {
      setIsExtractingText(false);
    }
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setBaseImage(imageData);
      setBaseImageFile(file);
      
      // Auto-extract text from image
      extractTextFromImage(imageData);
    };
    reader.readAsDataURL(file);
  }, [extractTextFromImage]);

  const removeImage = useCallback(() => {
    setBaseImage(null);
    setBaseImageFile(null);
    setTextOverlay("");
  }, []);

  const handlePersonImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setPersonImage(imageData);
      setPersonImageFile(file);
    };
    reader.readAsDataURL(file);
  }, []);

  const removePersonImage = useCallback(() => {
    setPersonImage(null);
    setPersonImageFile(null);
  }, []);

  const generateVariations = async () => {
    if (!baseImage) {
      toast.error("Por favor, faça upload de uma imagem base");
      return;
    }

    if (selectedFormats.length === 0) {
      toast.error("Selecione pelo menos um formato");
      return;
    }

    setIsGenerating(true);

    // Create placeholder variations with unique IDs
    const timestamp = Date.now();
    const placeholders: GeneratedVariation[] = [];
    selectedFormats.forEach((format) => {
      for (let i = 0; i < quantity; i++) {
        placeholders.push({
          id: `${format}-${timestamp}-${i}`,
          imageUrl: "",
          format,
          variationIndex: i,
          selected: true,
          status: "pending",
        });
      }
    });

    // Set total to generate for progress bar
    setTotalToGenerate(placeholders.length);

    // Either replace or accumulate variations
    if (accumulateMode) {
      // Limit to max 24 variations when accumulating
      const currentSuccessful = variations.filter(v => v.status === 'success');
      const maxToKeep = Math.max(0, 24 - placeholders.length);
      const keptVariations = currentSuccessful.slice(-maxToKeep);
      setVariations([...keptVariations, ...placeholders]);
    } else {
      setVariations(placeholders);
    }

    try {
      // Generate each variation sequentially to avoid rate limits
      for (let i = 0; i < placeholders.length; i++) {
        const placeholder = placeholders[i];
        
        // Update status to generating
        setVariations((prev) =>
          prev.map((v) =>
            v.id === placeholder.id ? { ...v, status: "generating" as const } : v
          )
        );

        try {
          const { data, error } = await supabase.functions.invoke(
            "generate-creative-variations",
            {
              body: {
                baseImage,
                personImage: personImage || undefined,
                text: textOverlay,
                designGuidance,
                variationOptions,
                format: placeholder.format,
                variationIndex: placeholder.variationIndex,
              },
            }
          );

          if (error) throw error;

          if (data?.imageUrl) {
            setVariations((prev) =>
              prev.map((v) =>
                v.id === placeholder.id
                  ? { ...v, imageUrl: data.imageUrl, status: "success" as const }
                  : v
              )
            );
          } else {
            throw new Error("Nenhuma imagem gerada");
          }
        } catch (err: any) {
          console.error(`Error generating variation ${placeholder.id}:`, err);
          setVariations((prev) =>
            prev.map((v) =>
              v.id === placeholder.id
                ? { ...v, status: "error" as const, error: err.message }
                : v
            )
          );
        }

        // Small delay between generations to avoid rate limits
        if (i < placeholders.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      toast.success("Variações geradas com sucesso!");
    } catch (error: any) {
      console.error("Error generating variations:", error);
      toast.error("Erro ao gerar variações: " + error.message);
    } finally {
      setIsGenerating(false);
      setTotalToGenerate(0);
    }
  };

  const handleToggleSelect = (id: string) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, selected: !v.selected } : v))
    );
  };

  const handleRegenerate = async (id: string) => {
    const variation = variations.find((v) => v.id === id);
    if (!variation || !baseImage) return;

    setIsRegenerating(id);
    setVariations((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: "generating" as const } : v))
    );

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-creative-variations",
        {
          body: {
            baseImage,
            personImage: personImage || undefined,
            text: textOverlay,
            designGuidance,
            variationOptions,
            format: variation.format,
            variationIndex: variation.variationIndex,
          },
        }
      );

      if (error) throw error;

      if (data?.imageUrl) {
        setVariations((prev) =>
          prev.map((v) =>
            v.id === id
              ? { ...v, imageUrl: data.imageUrl, status: "success" as const, error: undefined }
              : v
          )
        );
        toast.success("Variação regenerada!");
      }
    } catch (err: any) {
      console.error(`Error regenerating variation ${id}:`, err);
      setVariations((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, status: "error" as const, error: err.message } : v
        )
      );
      toast.error("Erro ao regenerar: " + err.message);
    } finally {
      setIsRegenerating(null);
    }
  };

  const handleDownloadSelected = async () => {
    const selected = variations.filter((v) => v.selected && v.status === "success");
    
    for (const variation of selected) {
      try {
        const response = await fetch(variation.imageUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `variacao-${variation.format}-${variation.variationIndex + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Error downloading:", error);
      }
    }
    
    toast.success(`${selected.length} imagens baixadas!`);
  };

  const handleSaveSelected = async () => {
    const selected = variations.filter((v) => v.selected && v.status === "success");
    toast.success(`${selected.length} variações salvas no histórico!`);
    // TODO: Implement saving to database
  };

  const handleClearVariations = () => {
    setVariations([]);
    toast.info("Variações limpas");
  };

  const canGenerate = baseImage && selectedFormats.length > 0 && !isGenerating;
  const successfulCount = variations.filter(v => v.status === 'success').length;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="space-y-4">
          {/* Image Uploads - Two columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Base Image Upload */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  Foto Base (Criativo)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {baseImage ? (
                  <div className="relative">
                    <img
                      src={baseImage}
                      alt="Base"
                      className="w-full h-36 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={removeImage}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center px-2">
                      Upload do criativo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Person Image Upload */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Foto da Pessoa
                  <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {personImage ? (
                  <div className="relative">
                    <img
                      src={personImage}
                      alt="Person"
                      className="w-full h-36 object-cover rounded-lg"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={removePersonImage}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                    <User className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground text-center px-2">
                      Foto limpa para melhor reconhecimento
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePersonImageUpload}
                    />
                  </label>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Text Overlay */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Texto na Imagem
                {isExtractingText && (
                  <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                    <ScanText className="w-3 h-3 animate-pulse" />
                    Extraindo texto...
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Transforme sua vida com nosso método exclusivo"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                rows={3}
                disabled={isExtractingText}
              />
              {isExtractingText && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Analisando imagem para extrair texto...
                </p>
              )}
            </CardContent>
          </Card>

          {/* Design Guidance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Orientação de Design</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Fundo gradiente azul escuro, tipografia bold branca, estilo moderno e clean"
                value={designGuidance}
                onChange={(e) => setDesignGuidance(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Options */}
        <div className="space-y-4">
          {/* Variation Options */}
          <VariationOptionsCard
            options={variationOptions}
            onChange={setVariationOptions}
          />

          {/* Format Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Formatos</CardTitle>
            </CardHeader>
            <CardContent>
              <ToggleGroup
                type="multiple"
                value={selectedFormats}
                onValueChange={setSelectedFormats}
                className="justify-start flex-wrap"
              >
                <ToggleGroupItem value="instagram_feed" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Feed (1:1)
                </ToggleGroupItem>
                <ToggleGroupItem value="instagram_story" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Story (9:16)
                </ToggleGroupItem>
                <ToggleGroupItem value="instagram_reels" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Reels (9:16)
                </ToggleGroupItem>
              </ToggleGroup>
            </CardContent>
          </Card>

          {/* Quantity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Quantidade por Formato: {quantity}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Slider
                value={[quantity]}
                onValueChange={([value]) => setQuantity(value)}
                min={1}
                max={8}
                step={1}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Total: {quantity * selectedFormats.length} variações
              </p>
            </CardContent>
          </Card>

          {/* Accumulate Mode Toggle */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <Label htmlFor="accumulate-mode" className="cursor-pointer">
                    Acumular variações
                  </Label>
                </div>
                <Switch
                  id="accumulate-mode"
                  checked={accumulateMode}
                  onCheckedChange={setAccumulateMode}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {accumulateMode 
                  ? "Novas variações serão adicionadas às existentes (máx. 24)"
                  : "Novas variações substituirão as anteriores"
                }
              </p>
              {successfulCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearVariations}
                  className="mt-2 text-xs h-7"
                >
                  Limpar todas ({successfulCount})
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            onClick={generateVariations}
            disabled={!canGenerate}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando Variações...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar {quantity * selectedFormats.length} Variações
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Generated Variations Grid */}
      <VariationsGrid
        variations={variations}
        onToggleSelect={handleToggleSelect}
        onRegenerate={handleRegenerate}
        onDownloadSelected={handleDownloadSelected}
        onSaveSelected={handleSaveSelected}
        isRegenerating={isRegenerating}
        baseImage={baseImage || undefined}
        totalToGenerate={totalToGenerate}
      />
    </div>
  );
}
