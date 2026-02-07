import React, { useRef, useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Crop,
} from 'lucide-react';
import { CanvasElement } from './hooks/useImageEditor';
import { ElementProperties } from './ElementProperties';
import { ElementLibrary } from './ElementLibrary';
import { OrientationSelector, Orientation, ORIENTATIONS } from './OrientationSelector';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface EditorToolbarProps {
  onAddElement: (type: CanvasElement['type'], config?: Partial<CanvasElement>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedElement: CanvasElement | null;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  companyId?: string;
  orientation?: string;
  onOrientationChange?: (orientation: Orientation) => void;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50 transition-colors">
        {isOpen ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-5 pt-1.5">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onAddElement,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedElement,
  onUpdateElement,
  companyId,
  orientation = 'post',
  onOrientationChange,
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
    { label: 'Título', size: 32, weight: 'bold' },
    { label: 'Subtítulo', size: 24, weight: '600' },
    { label: 'Corpo', size: 16, weight: 'normal' },
    { label: 'Citação', size: 18, weight: '500' },
  ];

  const shapePresets = [
    { label: 'Retângulo', icon: Square, type: 'rectangle' as const },
    { label: 'Círculo', icon: Circle, type: 'circle' as const },
    { label: 'Linha', icon: Minus, type: 'line' as const },
    { label: 'Seta', icon: ArrowRight, type: 'arrow' as const },
  ];

  const handleOrientationChange = (newOrientation: Orientation) => {
    onOrientationChange?.(newOrientation);
  };

  return (
    <div className="w-56 bg-card border-r border-border flex flex-col h-full">
      {/* Header with undo/redo */}
      <div className="p-2 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Ferramentas</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onUndo}
            disabled={!canUndo}
            className="h-6 w-6"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRedo}
            disabled={!canRedo}
            className="h-6 w-6"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Orientation Section */}
          <CollapsibleSection title="Orientação" icon={Crop} defaultOpen>
            <OrientationSelector
              selected={orientation}
              onSelect={handleOrientationChange}
            />
          </CollapsibleSection>

          <Separator className="my-2" />

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

          {/* Text Section */}
          <CollapsibleSection title="Texto" icon={Type}>
            <div className="space-y-1">
              {textPresets.map((preset) => (
                <button
                  key={preset.label}
                  className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => onAddElement('text', {
                    content: preset.label,
                    styles: { fontSize: preset.size, fontWeight: preset.weight }
                  })}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Shapes Section */}
          <CollapsibleSection title="Formas" icon={Square}>
            <div className="grid grid-cols-2 gap-1">
              {shapePresets.map((preset) => (
                <button
                  key={preset.label}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => onAddElement('shape', {
                    styles: { shapeType: preset.type },
                    height: preset.type === 'line' ? 20 : preset.type === 'arrow' ? 30 : undefined,
                  })}
                >
                  <preset.icon className="h-3.5 w-3.5" />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </CollapsibleSection>

          {/* Images Section */}
          <CollapsibleSection title="Imagens" icon={ImagePlus}>
            <button
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
              <span>Adicionar imagem</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </CollapsibleSection>

          {/* Element Library */}
          {companyId && (
            <>
              <Separator className="my-2" />
              <ElementLibrary
                companyId={companyId}
                onAddElement={onAddElement}
              />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
