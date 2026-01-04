import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, RefreshCw, ImageOff } from "lucide-react";
import { toast } from "sonner";

interface RegenerateCarouselModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carouselId: string;
  missingCount: number;
  totalSlides: number;
  onComplete: () => void;
}

type StreamEvent =
  | { type: "started"; carousel_id: string; missing_count: number; missing_indices: number[] }
  | { type: "slide_start"; index: number; total: number }
  | { type: "slide_done"; index: number; total: number; image_url: string }
  | { type: "slide_error"; index: number; total: number; message: string }
  | { type: "completed"; carousel_id: string; success: boolean }
  | { type: "failed"; message: string };

interface SlideProgress {
  index: number;
  status: "pending" | "generating" | "done" | "error";
  imageUrl?: string;
  error?: string;
}

export function RegenerateCarouselModal({
  open,
  onOpenChange,
  carouselId,
  missingCount,
  totalSlides,
  onComplete,
}: RegenerateCarouselModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [slides, setSlides] = useState<SlideProgress[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setIsGenerating(false);
      setSlides([]);
      setCurrentSlide(0);
      setCompleted(false);
      setError(null);
    }
  }, [open]);

  const startRegeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setCompleted(false);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-carousel-images`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ carousel_id: carouselId }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;

          try {
            const event: StreamEvent = JSON.parse(jsonStr);
            handleEvent(event);
          } catch {
            // Ignore parse errors
          }
        }
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      console.error("Regeneration error:", e);
      setError(e.message || "Erro ao regenerar imagens");
      setIsGenerating(false);
    }
  };

  const handleEvent = (event: StreamEvent) => {
    switch (event.type) {
      case "started":
        const initialSlides: SlideProgress[] = event.missing_indices.map((idx) => ({
          index: idx,
          status: "pending" as const,
        }));
        setSlides(initialSlides);
        break;

      case "slide_start":
        setCurrentSlide(event.index);
        setSlides((prev) =>
          prev.map((s) =>
            s.index === event.index ? { ...s, status: "generating" as const } : s
          )
        );
        break;

      case "slide_done":
        setSlides((prev) =>
          prev.map((s) =>
            s.index === event.index
              ? { ...s, status: "done" as const, imageUrl: event.image_url }
              : s
          )
        );
        break;

      case "slide_error":
        setSlides((prev) =>
          prev.map((s) =>
            s.index === event.index
              ? { ...s, status: "error" as const, error: event.message }
              : s
          )
        );
        break;

      case "completed":
        setCompleted(true);
        setIsGenerating(false);
        toast.success("Imagens regeneradas com sucesso!");
        onComplete();
        break;

      case "failed":
        setError(event.message);
        setIsGenerating(false);
        toast.error(`Erro: ${event.message}`);
        break;
    }
  };

  const handleClose = () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    onOpenChange(false);
  };

  const doneCount = slides.filter((s) => s.status === "done").length;
  const progress = slides.length > 0 ? (doneCount / slides.length) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageOff className="h-5 w-5 text-orange-500" />
            Regenerar Imagens Faltantes
          </DialogTitle>
          <DialogDescription>
            {missingCount} de {totalSlides} slides estão sem imagem
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isGenerating && !completed && !error && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Clique no botão abaixo para gerar as imagens que faltam neste carrossel.
              </p>
              <Button onClick={startRegeneration} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Iniciar Regeneração
              </Button>
            </div>
          )}

          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">
                  {doneCount} de {slides.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {slides.map((slide) => (
                  <div
                    key={slide.index}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <span className="text-sm">Slide {slide.index}</span>
                    {slide.status === "pending" && (
                      <Badge variant="secondary">Aguardando</Badge>
                    )}
                    {slide.status === "generating" && (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Gerando...
                      </Badge>
                    )}
                    {slide.status === "done" && (
                      <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/30">
                        <Check className="h-3 w-3" />
                        Concluído
                      </Badge>
                    )}
                    {slide.status === "error" && (
                      <Badge variant="destructive" className="gap-1">
                        <X className="h-3 w-3" />
                        Erro
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completed && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium">Regeneração Concluída!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as imagens foram geradas com sucesso.
              </p>
              <Button variant="outline" onClick={handleClose} className="mt-4">
                Fechar
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                <X className="h-6 w-6 text-destructive" />
              </div>
              <p className="font-medium text-destructive">Erro na Regeneração</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button variant="outline" onClick={handleClose}>
                  Fechar
                </Button>
                <Button onClick={startRegeneration}>
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
