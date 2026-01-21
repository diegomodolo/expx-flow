import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Upload, Image, Loader2, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VariationOptionsCard, VariationOptions } from "./VariationOptionsCard";
import { VariationsGrid, GeneratedVariation } from "./VariationsGrid";

export function CreativeVariationGenerator() {
  // Form state
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [baseImageFile, setBaseImageFile] = useState<File | null>(null);
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

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [variations, setVariations] = useState<GeneratedVariation[]>([]);
  const [isRegenerating, setIsRegenerating] = useState<string | null>(null);

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
      setBaseImage(event.target?.result as string);
      setBaseImageFile(file);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImage = useCallback(() => {
    setBaseImage(null);
    setBaseImageFile(null);
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

    // Create placeholder variations
    const placeholders: GeneratedVariation[] = [];
    selectedFormats.forEach((format) => {
      for (let i = 0; i < quantity; i++) {
        placeholders.push({
          id: `${format}-${i}`,
          imageUrl: "",
          format,
          variationIndex: i,
          selected: true,
          status: "pending",
        });
      }
    });
    setVariations(placeholders);

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

  const canGenerate = baseImage && selectedFormats.length > 0 && !isGenerating;

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Column - Input */}
        <div className="space-y-4">
          {/* Image Upload */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                Foto Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              {baseImage ? (
                <div className="relative">
                  <img
                    src={baseImage}
                    alt="Base"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para fazer upload
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PNG, JPG até 10MB
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

          {/* Text Overlay */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Texto na Imagem</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Transforme sua vida com nosso método exclusivo"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                rows={3}
              />
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
      />
    </div>
  );
}
