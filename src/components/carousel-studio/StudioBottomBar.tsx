import React from "react";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";

interface Props {
  generationProgress: { current: number; total: number } | null;
  onDownloadZip: () => void;
  isExporting: boolean;
  exportProgress: number;
}

export function StudioBottomBar({
  generationProgress,
  onDownloadZip,
  isExporting,
  exportProgress,
}: Props) {
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
  );
}
