import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Check, Loader2 } from 'lucide-react';

interface EditorHeaderProps {
  onClose: () => void;
  onExport: () => void;
  onFinalize: () => void;
  isExporting: boolean;
  isFinalizing: boolean;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({
  onClose,
  onExport,
  onFinalize,
  isExporting,
  isFinalizing,
}) => {
  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground">Editor de Criativos</h2>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onExport}
          disabled={isExporting || isFinalizing}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Baixar
        </Button>
        <Button
          onClick={onFinalize}
          disabled={isExporting || isFinalizing}
        >
          {isFinalizing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Check className="h-4 w-4 mr-2" />
          )}
          Finalizar
        </Button>
      </div>
    </div>
  );
};
