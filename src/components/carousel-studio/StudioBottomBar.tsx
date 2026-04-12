import React from "react";
import { Button } from "@/components/ui/button";
import { Archive, ZoomIn, ZoomOut } from "lucide-react";

const ZOOM_STEPS = [25, 33, 40, 50, 60, 75, 100];

interface Props {
  generationProgress: { current: number; total: number } | null;
  onDownloadZip: () => void;
  isExporting: boolean;
  exportProgress: number;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function StudioBottomBar({
  generationProgress,
  onDownloadZip,
  isExporting,
  exportProgress,
  zoom,
  onZoomChange,
}: Props) {
  const zoomPct = Math.round(zoom * 100);

  const zoomOut = () => {
    const prev = ZOOM_STEPS.filter((s) => s < zoomPct).at(-1);
    if (prev) onZoomChange(prev / 100);
  };

  const zoomIn = () => {
    const next = ZOOM_STEPS.find((s) => s > zoomPct);
    if (next) onZoomChange(next / 100);
  };

  return (
    <div className="h-12 flex items-center justify-between px-4 border-t border-border bg-card flex-shrink-0">
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {generationProgress && (
          <>
            <span>
              Slide {generationProgress.current} de {generationProgress.total} —
              gerando imagem
            </span>
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${(generationProgress.current / generationProgress.total) * 100}%`,
                }}
              />
            </div>
          </>
        )}
        {isExporting && (
          <>
            <span>Exportando ZIP... {exportProgress}%</span>
            <div className="w-32 h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Controle de zoom */}
        <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden">
          <button
            className="px-2 h-7 text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
            onClick={zoomOut}
            disabled={zoomPct <= ZOOM_STEPS[0]}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="w-12 text-center text-xs text-foreground select-none">
            {zoomPct}%
          </span>
          <button
            className="px-2 h-7 text-muted-foreground hover:bg-muted/50 disabled:opacity-30 transition-colors"
            onClick={zoomIn}
            disabled={zoomPct >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onDownloadZip}
          disabled={isExporting}
        >
          <Archive className="w-4 h-4 mr-1" />
          ZIP
        </Button>
      </div>
    </div>
  );
}
