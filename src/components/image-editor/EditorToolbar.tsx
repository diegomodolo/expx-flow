import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Undo2,
  Redo2,
  Type,
  Square,
  Circle,
  Minus,
  ArrowRight,
  ImagePlus,
  Heading1,
  Heading2,
  AlignLeft,
  Quote,
} from 'lucide-react';
import { CanvasElement } from './hooks/useImageEditor';
import { ElementProperties } from './ElementProperties';

interface EditorToolbarProps {
  onAddElement: (type: CanvasElement['type'], config?: Partial<CanvasElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedElement: CanvasElement | null;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddElement,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedElement,
  onUpdateElement,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      onAddElement('image', {
        content: reader.result as string,
        width: 150,
        height: 150,
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const textPresets = [
    { label: 'Título', icon: Heading1, config: { styles: { fontSize: 32, fontWeight: 'bold' }, content: 'Título' } },
    { label: 'Subtítulo', icon: Heading2, config: { styles: { fontSize: 24, fontWeight: '600' }, content: 'Subtítulo' } },
    { label: 'Corpo', icon: AlignLeft, config: { styles: { fontSize: 16, fontWeight: 'normal' }, content: 'Texto do corpo' } },
    { label: 'Citação', icon: Quote, config: { styles: { fontSize: 18, fontWeight: '500', fontFamily: 'Georgia' }, content: '"Citação aqui"' } },
  ];

  const shapePresets = [
    { label: 'Retângulo', icon: Square, config: { styles: { shapeType: 'rectangle' as const } } },
    { label: 'Círculo', icon: Circle, config: { styles: { shapeType: 'circle' as const } } },
    { label: 'Linha', icon: Minus, config: { styles: { shapeType: 'line' as const }, height: 20 } },
    { label: 'Seta', icon: ArrowRight, config: { styles: { shapeType: 'arrow' as const }, height: 30 } },
  ];

  return (
    <div className="w-[240px] bg-card border-r border-border flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <h3 className="text-sm font-medium text-foreground mb-3">Ferramentas</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            className="flex-1"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            className="flex-1"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {/* Element Properties Panel */}
        {selectedElement && (
          <>
            <ElementProperties
              element={selectedElement}
              onUpdate={onUpdateElement}
            />
            <Separator className="my-2" />
          </>
        )}

        <div className="p-3 space-y-4">
          {/* Texto */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Texto</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {textPresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex flex-col items-center gap-1"
                  onClick={() => onAddElement('text', preset.config)}
                >
                  <preset.icon className="h-4 w-4" />
                  <span className="text-xs">{preset.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Elementos/Formas */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Square className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Elementos</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {shapePresets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 flex flex-col items-center gap-1"
                  onClick={() => onAddElement('shape', preset.config)}
                >
                  <preset.icon className="h-4 w-4" />
                  <span className="text-xs">{preset.label}</span>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Imagens */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ImagePlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Imagens</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-4 w-4 mr-2" />
              Adicionar Imagem
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
