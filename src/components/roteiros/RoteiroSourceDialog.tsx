import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Youtube, Globe, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RoteiroSource = 
  | { type: 'scratch' }
  | { type: 'youtube'; url: string }
  | { type: 'url'; url: string };

interface RoteiroSourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (source: RoteiroSource) => void;
  loading?: boolean;
}

const sources = [
  {
    type: 'scratch' as const,
    label: 'Novo do zero',
    description: 'Criar um roteiro em branco',
    icon: FileText,
  },
  {
    type: 'youtube' as const,
    label: 'Baseado em vídeo',
    description: 'Gerar a partir de um vídeo do YouTube',
    icon: Youtube,
  },
  {
    type: 'url' as const,
    label: 'Baseado em URL',
    description: 'Gerar a partir de um site ou artigo',
    icon: Globe,
  },
];

export function RoteiroSourceDialog({ open, onOpenChange, onSelect, loading }: RoteiroSourceDialogProps) {
  const [selected, setSelected] = useState<'scratch' | 'youtube' | 'url'>('scratch');
  const [inputUrl, setInputUrl] = useState('');

  const handleContinue = () => {
    if (selected === 'scratch') {
      onSelect({ type: 'scratch' });
    } else if (selected === 'youtube') {
      if (!inputUrl.trim()) return;
      onSelect({ type: 'youtube', url: inputUrl.trim() });
    } else {
      if (!inputUrl.trim()) return;
      onSelect({ type: 'url', url: inputUrl.trim() });
    }
  };

  const needsUrl = selected === 'youtube' || selected === 'url';
  const canContinue = selected === 'scratch' || inputUrl.trim().length > 0;

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelected('scratch');
      setInputUrl('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Como deseja criar o roteiro?</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {sources.map((source) => {
            const Icon = source.icon;
            const isSelected = selected === source.type;
            return (
              <button
                key={source.type}
                type="button"
                onClick={() => {
                  setSelected(source.type);
                  setInputUrl('');
                }}
                className={cn(
                  'w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-muted-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className={cn(
                  'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                  isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{source.label}</p>
                  <p className="text-xs text-muted-foreground">{source.description}</p>
                </div>
              </button>
            );
          })}

          {needsUrl && (
            <div className="pt-2">
              <Label>{selected === 'youtube' ? 'URL do vídeo do YouTube' : 'URL do site ou artigo'}</Label>
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder={selected === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://exemplo.com/artigo'}
                className="mt-1.5"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleContinue} disabled={!canContinue || loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
