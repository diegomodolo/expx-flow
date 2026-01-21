import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, Calendar, Save, Loader2, Check, X, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

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
}

export function VariationsGrid({
  variations,
  onToggleSelect,
  onRegenerate,
  onDownloadSelected,
  onSaveSelected,
  isRegenerating,
}: VariationsGridProps) {
  const selectedCount = variations.filter((v) => v.selected && v.status === 'success').length;
  const successCount = variations.filter((v) => v.status === 'success').length;

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'instagram_story':
        return 'Story';
      case 'instagram_feed':
        return 'Feed';
      case 'instagram_reels':
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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Variações Geradas ({successCount})
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
                variation.format === 'instagram_story' ? 'aspect-[9/16]' : ''
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
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl p-0">
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
                >
                  {isRegenerating === variation.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
