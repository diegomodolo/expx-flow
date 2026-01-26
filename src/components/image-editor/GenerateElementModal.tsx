import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface GenerateElementModalProps {
  companyId: string;
  onClose: () => void;
  onElementGenerated: (element: any) => void;
}

const CATEGORIES = [
  { value: 'dispositivos', label: 'Dispositivos' },
  { value: 'icones', label: 'Ícones' },
  { value: 'objetos', label: 'Objetos' },
  { value: 'decorativos', label: 'Decorativos' },
  { value: 'custom', label: 'Personalizado' },
];

export const GenerateElementModal: React.FC<GenerateElementModalProps> = ({
  companyId,
  onClose,
  onElementGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const [generatedElement, setGeneratedElement] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Por favor, descreva o elemento que deseja gerar.');
      return;
    }
    if (!name.trim()) {
      setError('Por favor, dê um nome para o elemento.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('generate-element', {
        body: {
          prompt: prompt.trim(),
          companyId,
          name: name.trim(),
          category,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Erro ao gerar elemento');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.element) {
        setGeneratedPreview(data.imageUrl);
        setGeneratedElement(data.element);
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (err) {
      console.error('Generate error:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar elemento');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = () => {
    if (generatedElement) {
      onElementGenerated(generatedElement);
    }
  };

  const handleReset = () => {
    setGeneratedPreview(null);
    setGeneratedElement(null);
    setPrompt('');
    setName('');
    setError(null);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Elemento com IA
          </DialogTitle>
          <DialogDescription>
            Descreva o elemento que você quer criar. A IA irá gerar uma imagem isolada com fundo transparente.
          </DialogDescription>
        </DialogHeader>

        {!generatedPreview ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Elemento</Label>
              <Input
                id="name"
                placeholder="Ex: Tablet Moderno"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isGenerating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="prompt">Descrição</Label>
              <Textarea
                id="prompt"
                placeholder="Ex: Um tablet moderno com tela brilhante, estilo minimalista, perspectiva isométrica"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={isGenerating}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-md">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="relative aspect-square max-w-[200px] mx-auto rounded-lg border border-border overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHJlY3QgZmlsbD0iI2YwZjBmMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIi8+PHJlY3QgZmlsbD0iI2UwZTBlMCIgeD0iMTAiIHk9IjAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjxyZWN0IGZpbGw9IiNlMGUwZTAiIHg9IjAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiLz48cmVjdCBmaWxsPSIjZjBmMGYwIiB4PSIxMCIgeT0iMTAiIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNncmlkKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')]">
              <img
                src={generatedPreview}
                alt="Elemento gerado"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-center">
              <p className="font-medium">{name}</p>
              <p className="text-sm text-muted-foreground">{prompt}</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {!generatedPreview ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                Cancelar
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleReset}>
                Gerar outro
              </Button>
              <Button onClick={handleConfirm}>
                <Check className="mr-2 h-4 w-4" />
                Adicionar à Biblioteca
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
