import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SlideImageEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slideNumber: number;
  currentImageUrl: string;
  carouselId: string;
  clientId: string;
  companyId: string;
  onImageUpdated: (newImageUrl: string) => void;
}

export function SlideImageEditModal({
  open,
  onOpenChange,
  slideNumber,
  currentImageUrl,
  carouselId,
  clientId,
  companyId,
  onImageUpdated,
}: SlideImageEditModalProps) {
  const [prompt, setPrompt] = useState("");
  const [useAsReference, setUseAsReference] = useState(true);
  const [additionalImageUrl, setAdditionalImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 10MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `temp-merge/${companyId}/${clientId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("visual-creatives")
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("visual-creatives").getPublicUrl(path);
      if (data?.publicUrl) {
        setAdditionalImageUrl(data.publicUrl);
        toast.success("Imagem carregada com sucesso");
      }
    } catch (err: any) {
      console.error("Error uploading image:", err);
      toast.error("Erro ao carregar imagem");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveAdditionalImage = () => {
    setAdditionalImageUrl(null);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Descreva o que deseja alterar na imagem");
      return;
    }

    setIsGenerating(true);
    try {
      // Build references array
      const references: string[] = [];
      if (useAsReference && currentImageUrl) {
        references.push(currentImageUrl);
      }

      // Call generate-visual-creative edge function
      const { data, error } = await supabase.functions.invoke("generate-visual-creative", {
        body: {
          clientId,
          companyId,
          references,
          additionalImageToMerge: additionalImageUrl,
          extraPrompt: prompt,
          aspectRatio: "4:5",
          outputFormat: "png",
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.imageUrl) throw new Error("Nenhuma imagem foi gerada");

      // Update the carousel slide in the database
      const { data: carouselData, error: fetchError } = await supabase
        .from("carousel_generation_queue")
        .select("slides")
        .eq("id", carouselId)
        .single();

      if (fetchError) throw fetchError;

      const slides = Array.isArray(carouselData.slides)
        ? carouselData.slides
        : JSON.parse(carouselData.slides as string);

      // Update the specific slide
      const slideIndex = slideNumber - 1;
      if (slides[slideIndex]) {
        slides[slideIndex].image_url = data.imageUrl;

        const { error: updateError } = await supabase
          .from("carousel_generation_queue")
          .update({
            slides,
            cover_image_url: slideIndex === 0 ? data.imageUrl : undefined,
          })
          .eq("id", carouselId);

        if (updateError) throw updateError;
      }

      onImageUpdated(data.imageUrl);
      toast.success("Imagem atualizada com sucesso!");
      
      // Reset and close
      setPrompt("");
      setAdditionalImageUrl(null);
      setUseAsReference(true);
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error generating image:", err);
      toast.error(err?.message || "Erro ao gerar imagem");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            Editar Slide {slideNumber}
          </DialogTitle>
          <DialogDescription>
            Descreva as alterações desejadas para gerar uma nova imagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Image Preview */}
          {currentImageUrl && (
            <div className="relative w-full max-w-[200px] mx-auto">
              <div className="relative aspect-[4/5] rounded-lg overflow-hidden border bg-muted">
                <img
                  src={currentImageUrl}
                  alt={`Slide ${slideNumber}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1">
                Imagem atual
              </p>
            </div>
          )}

          {/* Use as Reference Switch */}
          <div className="flex items-center justify-between">
            <Label htmlFor="use-reference" className="text-sm">
              Usar imagem atual como referência
            </Label>
            <Switch
              id="use-reference"
              checked={useAsReference}
              onCheckedChange={setUseAsReference}
            />
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            {useAsReference
              ? "A IA vai editar a imagem atual, preservando o layout"
              : "A IA vai criar uma imagem totalmente nova"}
          </p>

          {/* Additional Image Upload */}
          <div className="space-y-2">
            <Label className="text-sm">Imagem para incorporar (opcional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {additionalImageUrl ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                <img
                  src={additionalImageUrl}
                  alt="Imagem adicional"
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-5 w-5"
                  onClick={handleRemoveAdditionalImage}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Carregar imagem
                  </>
                )}
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Ex: screenshot de tela, logo, foto de produto
            </p>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="edit-prompt" className="text-sm">
              Descreva a alteração *
            </Label>
            <Textarea
              id="edit-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Mude a cor de fundo para azul, coloque o produto na mão da pessoa..."
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Editar Imagem
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
