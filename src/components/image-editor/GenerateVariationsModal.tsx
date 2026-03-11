import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface GenerateVariationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentImageUrl: string;
  onVariationsGenerated: (urls: string[]) => void;
  clientId?: string;
  companyId: string;
}

export const GenerateVariationsModal: React.FC<GenerateVariationsModalProps> = ({
  open,
  onOpenChange,
  currentImageUrl,
  onVariationsGenerated,
  clientId,
  companyId,
}) => {
  const [quantity, setQuantity] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCount, setGeneratedCount] = useState(0);
  const [options, setOptions] = useState({
    varyComposition: true,
    alterColorPalette: false,
    varyBackground: false,
    changePoseExpression: false,
  });

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedCount(0);
    const generatedUrls: string[] = [];

    try {
      for (let i = 0; i < quantity; i++) {
        const { data, error } = await supabase.functions.invoke(
          'generate-creative-variations',
          {
            body: {
              baseImage: currentImageUrl,
              text: '',
              designGuidance: 'Crie uma variação visual mantendo a essência, os textos e a identidade do criativo original. A variação deve parecer uma versão alternativa do mesmo anúncio.',
              variationOptions: options,
              format: '1:1',
              variationIndex: i,
              modelType: 'flash',
              clientId: clientId || undefined,
              companyId: companyId || undefined,
            },
          }
        );

        if (error) throw error;

        if (data?.imageUrl) {
          generatedUrls.push(data.imageUrl);
          setGeneratedCount(prev => prev + 1);
        }
      }

      if (generatedUrls.length > 0) {
        onVariationsGenerated(generatedUrls);
        toast({
          title: 'Variações geradas!',
          description: `${generatedUrls.length} variação(ões) adicionada(s) ao editor.`,
        });
        onOpenChange(false);
      }
    } catch (error: unknown) {
      console.error('Error generating variations:', error);
      toast({
        title: 'Erro ao gerar variações',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
      setGeneratedCount(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Variações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Preview */}
          <div className="flex justify-center">
            <img
              src={currentImageUrl}
              alt="Imagem base"
              className="max-h-32 rounded-lg border border-border object-contain"
              crossOrigin="anonymous"
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <Label>Quantidade de variações</Label>
            <Input
              type="number"
              min={1}
              max={6}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(6, Math.max(1, Number(e.target.value))))}
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>O que variar</Label>
            <div className="space-y-2">
              {[
                { key: 'varyComposition', label: 'Composição (posição dos elementos)' },
                { key: 'alterColorPalette', label: 'Paleta de cores' },
                { key: 'varyBackground', label: 'Fundo / cenário' },
                { key: 'changePoseExpression', label: 'Pose / expressão da pessoa' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={key}
                    checked={options[key as keyof typeof options]}
                    onCheckedChange={(checked) =>
                      setOptions(prev => ({ ...prev, [key]: !!checked }))
                    }
                  />
                  <label htmlFor={key} className="text-sm cursor-pointer">
                    {label}
                  </label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Os textos da imagem original serão sempre preservados na variação.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Gerando {generatedCount}/{quantity}...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Gerar {quantity} Variações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
