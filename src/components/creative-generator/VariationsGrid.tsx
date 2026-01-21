import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Download, RefreshCw, Save, Loader2, Check, X, ZoomIn, ArrowLeftRight } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { BeforeAfterComparison } from "./BeforeAfterComparison";

export interface GeneratedVariation {
  id: string;
  imageUrl: string;
  format: string;
  variationIndex: number;
  selected: boolean;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

interface VariationsGridProps {
  variations: GeneratedVariation[];
  onToggleSelect: (id: string) => void;
  onRegenerate: (id: string) => void;
  onDownloadSelected: () => void;
  onSaveSelected: () => void;
  isRegenerating?: string | null;
  baseImage?: string;
  generatingCount?: number;
  totalToGenerate?: number;
}

export function VariationsGrid({
  variations,
  onToggleSelect,
  onRegenerate,
  onDownloadSelected,
  onSaveSelected,
  isRegenerating,
  baseImage,
  generatingCount = 0,
  totalToGenerate = 0,
}: VariationsGridProps) {
  const [compareVariation, setCompareVariation] = useState<GeneratedVariation | null>(null);
  
  const selectedCount = variations.filter((v) => v.selected && v.status === 'success').length;
  const successCount = variations.filter((v) => v.status === 'success').length;
  const generatingNow = variations.filter((v) => v.status === 'generating').length;
  const completedCount = variations.filter((v) => v.status === 'success' || v.status === 'error').length;
  
  const isGenerating = totalToGenerate > 0 && completedCount < totalToGenerate;
  const progressPercent = totalToGenerate > 0 ? (completedCount / totalToGenerate) * 100 : 0;

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'instagram_story':
      case 'story':
        return 'Story';
      case 'instagram_feed':
      case 'feed':
        return 'Feed';
      case 'instagram_reels':
      case 'reels':
        return 'Reels';
      default:
        return format;
    }
  };

  const getStatusIcon = (status: GeneratedVariation['status']) => {
    switch (status) {
      case 'generating':
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <X className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (variations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Progress Bar - Only show when generating */}
      {isGenerating && (
        <div className="bg-muted/50 rounded-lg p-4 space-y-2 border">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Gerando variações...
            </span>
            <span className="text-muted-foreground">
              {completedCount} de {totalToGenerate} concluídas
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {generatingNow > 0 && `${generatingNow} em processamento... `}
            Aguarde enquanto a IA cria suas variações.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Variações Geradas ({successCount})
          {selectedCount > 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">
              • {selectedCount} selecionadas
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadSelected}
            disabled={selectedCount === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar ({selectedCount})
          </Button>
          <Button
            size="sm"
            onClick={onSaveSelected}
            disabled={selectedCount === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Selecionados
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {variations.map((variation) => (
          <Card
            key={variation.id}
            className={`relative overflow-hidden transition-all ${
              variation.selected ? 'ring-2 ring-primary' : ''
            } ${variation.status === 'error' ? 'opacity-60' : ''}`}
          >
            {/* Status Badge */}
            <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
              <Badge variant="secondary" className="text-xs">
                {getFormatLabel(variation.format)}
              </Badge>
              {getStatusIcon(variation.status)}
            </div>

            {/* Checkbox */}
            {variation.status === 'success' && (
              <div className="absolute top-2 right-2 z-10">
                <Checkbox
                  checked={variation.selected}
                  onCheckedChange={() => onToggleSelect(variation.id)}
                  className="bg-background/80 backdrop-blur-sm"
                />
              </div>
            )}

            {/* Image Container */}
            <div
              className={`aspect-square bg-muted flex items-center justify-center ${
                variation.format === 'instagram_story' || variation.format === 'story' ? 'aspect-[9/16]' : ''
              }`}
            >
              {variation.status === 'generating' ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-xs">Gerando...</span>
                </div>
              ) : variation.status === 'error' ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground p-4">
                  <X className="w-8 h-8 text-destructive" />
                  <span className="text-xs text-center">{variation.error || 'Erro ao gerar'}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRegenerate(variation.id)}
                    disabled={isRegenerating === variation.id}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Tentar novamente
                  </Button>
                </div>
              ) : variation.status === 'success' ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <div className="relative w-full h-full cursor-pointer group">
                      <img
                        src={variation.imageUrl}
                        alt={`Variação ${variation.variationIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-0">
                    <DialogTitle className="sr-only">Preview da variação</DialogTitle>
                    <img
                      src={variation.imageUrl}
                      alt={`Variação ${variation.variationIndex + 1}`}
                      className="w-full h-auto"
                    />
                  </DialogContent>
                </Dialog>
              ) : (
                <div className="text-muted-foreground text-sm">Aguardando...</div>
              )}
            </div>

            {/* Actions */}
            {variation.status === 'success' && (
              <div className="p-2 flex justify-center gap-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRegenerate(variation.id)}
                  disabled={isRegenerating === variation.id}
                  title="Regenerar"
                >
                  {isRegenerating === variation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                {baseImage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCompareVariation(variation)}
                    title="Comparar com original"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Before/After Comparison Dialog */}
      {baseImage && compareVariation && (
        <BeforeAfterComparison
          open={!!compareVariation}
          onOpenChange={(open) => !open && setCompareVariation(null)}
          beforeImage={baseImage}
          afterImage={compareVariation.imageUrl}
          beforeLabel="Imagem Original"
          afterLabel={`Variação ${compareVariation.variationIndex + 1}`}
        />
      )}
    </div>
  );
}
