import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { CarouselType, PreGeneratedSlide, VisualVariations, useCarouselGenerationStream } from "@/hooks/useCarouselGenerationStream";

type SlideProgress = {
  slide_number: number;
  headline: string;
  status: "pending" | "generating" | "done" | "error";
  imageUrl?: string;
  errorMessage?: string;
};

export function CarouselGenerationProgressModal({
  open,
  onOpenChange,
  clientId,
  companyId,
  userId,
  carouselType,
  referenceCarouselImages,
  preGeneratedSlides,
  visualVariations,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  companyId: string;
  userId: string;
  carouselType?: CarouselType;
  referenceCarouselImages?: string[];
  preGeneratedSlides?: PreGeneratedSlide[];
  visualVariations?: VisualVariations;
  onFinished: () => void;
}) {
  const { isGenerating, start, cancel } = useCarouselGenerationStream();

  // Ref para prevenir re-execução da geração quando props mudam durante o processo
  const hasStartedRef = useRef(false);

  const [carouselId, setCarouselId] = useState<string | null>(null);
  const [pickedType, setPickedType] = useState<CarouselType | null>(null);
  const [slidesTotal, setSlidesTotal] = useState(0);
  const [slides, setSlides] = useState<SlideProgress[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const progressPct = useMemo(() => {
    if (!slidesTotal) return 0;
    const doneCount = slides.filter((s) => s.status === "done").length;
    return Math.round((doneCount / slidesTotal) * 100);
  }, [slides, slidesTotal]);

  useEffect(() => {
    if (!open) {
      // Reset completo quando fecha
      hasStartedRef.current = false;
      cancel();
      setCarouselId(null);
      setPickedType(null);
      setSlidesTotal(0);
      setSlides([]);
      setActiveIndex(0);
      setIsDone(false);
      return;
    }

    // GUARD: Se já iniciou, não inicia novamente (previne re-execução por mudança de props)
    if (hasStartedRef.current) {
      console.log("[CarouselGenerationProgressModal] Already started, skipping re-execution...");
      return;
    }

    // Marca como iniciado ANTES de chamar start
    hasStartedRef.current = true;

    // Debug log to verify props being passed
    console.log("[CarouselGenerationProgressModal] Starting with:", {
      clientId,
      companyId,
      carouselType: carouselType || "NOT PROVIDED",
      referenceCarouselImages: referenceCarouselImages?.length || 0,
      preGeneratedSlides: preGeneratedSlides?.length || 0,
      visualVariations: visualVariations || "NOT PROVIDED",
    });

    // Start on open
    start({
      clientId,
      companyId,
      userId,
      carouselType,
      referenceCarouselImages,
      preGeneratedSlides,
      visualVariations,
      onEvent: (ev) => {
        if (ev.type === "started") {
          setCarouselId(ev.carousel_id);
          setPickedType(ev.carousel_type);
          setSlidesTotal(ev.slides_total);
          setSlides(
            ev.slides.map((s) => ({
              slide_number: s.slide_number,
              headline: s.headline,
              status: "pending",
            }))
          );
          setActiveIndex(0);
          return;
        }

        if (ev.type === "slide_start") {
          setSlides((prev) =>
            prev.map((s, idx) => (idx === ev.index - 1 ? { ...s, status: "generating" } : s))
          );
          setActiveIndex(Math.max(0, ev.index - 1));
          return;
        }

        if (ev.type === "slide_done") {
          setSlides((prev) =>
            prev.map((s, idx) =>
              idx === ev.index - 1 ? { ...s, status: "done", imageUrl: ev.image_url } : s
            )
          );
          return;
        }

        if (ev.type === "slide_error") {
          setSlides((prev) =>
            prev.map((s, idx) =>
              idx === ev.index - 1
                ? { ...s, status: "error", errorMessage: ev.message }
                : s
            )
          );
          return;
        }

        if (ev.type === "completed") {
          setIsDone(true);
          toast.success("Carrossel gerado!");
          onFinished();
          return;
        }

        if (ev.type === "failed") {
          toast.error(ev.message || "Erro ao gerar carrossel");
          setIsDone(true);
          onFinished();
          return;
        }
      },
    }).catch((e: any) => {
      console.error(e);
      toast.error(e?.message || "Erro ao gerar carrossel");
      setIsDone(true);
    });
  }, [open, cancel, start, clientId, companyId, userId, carouselType, referenceCarouselImages, preGeneratedSlides, visualVariations, onFinished]);

  const activeSlide = slides[activeIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0" aria-describedby={undefined}>
        <VisuallyHidden>
          <DialogTitle>Gerando carrossel</DialogTitle>
        </VisuallyHidden>
        <div className="border-b p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Gerando carrossel</h2>
            <p className="text-sm text-muted-foreground">
              {pickedType ? (
                <>
                  Tipo: <span className="font-medium text-foreground">{pickedType}</span>
                </>
              ) : (
                "Preparando…"
              )}
              {carouselId ? (
                <>
                  {" "}• ID: <span className="font-mono text-xs">{carouselId}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">{progressPct}%</Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                cancel();
                onOpenChange(false);
              }}
            >
              {isGenerating && !isDone ? "Cancelar" : "Fechar"}
            </Button>
          </div>
        </div>

        <div className="p-4">
          {/* Progress bar */}
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-[width]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-0 border-t">
          {/* Left: steps list */}
          <div className="border-r p-4 overflow-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-2">
              {slides.length === 0 && (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              )}

              {slides.map((s, idx) => {
                const isActive = idx === activeIndex;
                const icon =
                  s.status === "done" ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : s.status === "error" ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                  ) : s.status === "generating" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
                  );

                return (
                  <button
                    key={s.slide_number}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full text-left rounded-lg border p-3 transition-colors",
                      isActive ? "bg-accent" : "bg-background hover:bg-muted"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{icon}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">Imagem {idx + 1}</p>
                          <Badge variant="outline" className="text-xs">
                            {s.status === "done"
                              ? "Gerada"
                              : s.status === "generating"
                              ? "Gerando"
                              : s.status === "error"
                              ? "Erro"
                              : "Fila"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{s.headline}</p>
                        {s.status === "error" && s.errorMessage && (
                          <p className="text-xs text-destructive mt-1 line-clamp-2">{s.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: live preview */}
          <div className="p-4 overflow-auto max-h-[calc(90vh-140px)]">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">
                  Preview • Imagem {activeIndex + 1}
                </h3>
                {activeSlide?.status === "generating" && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Gerando…
                  </div>
                )}
              </div>

              <div className="aspect-[3/4] rounded-xl border bg-muted overflow-hidden">
                {activeSlide?.imageUrl ? (
                  <img
                    src={activeSlide.imageUrl}
                    alt={`Preview da imagem ${activeIndex + 1} do carrossel`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <p className="text-sm font-medium">{activeSlide?.headline || "Aguardando…"}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {activeSlide?.status === "error"
                          ? "Falha ao gerar esta imagem. Você pode continuar e trocar depois."
                          : "Assim que a imagem for gerada, ela aparece aqui."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
