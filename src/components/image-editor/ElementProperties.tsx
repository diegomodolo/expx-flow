import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CanvasElement } from './hooks/useImageEditor';
import { AlignLeft, AlignCenter, AlignRight, Blend } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ElementPropertiesProps {
  element: CanvasElement | null;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
}

const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS' },
  { value: 'Impact', label: 'Impact' },
  { value: 'Comic Sans MS', label: 'Comic Sans' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: '500', label: 'Médio' },
  { value: '600', label: 'Semibold' },
  { value: 'bold', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
];

const COLOR_PRESETS = [
  '#FFFFFF', '#000000', '#8B5CF6', '#3B82F6', '#10B981', 
  '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6',
];

const FADE_DIRECTION_OPTIONS = [
  { value: 'to-right', label: '→ Direita' },
  { value: 'to-left', label: '← Esquerda' },
  { value: 'to-bottom', label: '↓ Baixo' },
  { value: 'to-top', label: '↑ Cima' },
  { value: 'to-bottom-right', label: '↘ Diagonal ↘' },
  { value: 'to-bottom-left', label: '↙ Diagonal ↙' },
  { value: 'to-top-right', label: '↗ Diagonal ↗' },
  { value: 'to-top-left', label: '↖ Diagonal ↖' },
];

export const ElementProperties: React.FC<ElementPropertiesProps> = ({
  element,
  onUpdate,
}) => {
  if (!element) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Selecione um elemento para editar suas propriedades
      </div>
    );
  }

  const handleStyleUpdate = (styleUpdates: Partial<CanvasElement['styles']>) => {
    onUpdate(element.id, {
      styles: { ...element.styles, ...styleUpdates },
    });
  };

  if (element.type === 'text') {
    return (
      <div className="p-4 space-y-4">
        <h4 className="text-sm font-medium text-foreground">Propriedades do Texto</h4>
        
        {/* Font Family */}
        <div className="space-y-2">
          <Label className="text-xs">Fonte</Label>
          <Select
            value={element.styles.fontFamily || 'Inter'}
            onValueChange={(value) => handleStyleUpdate({ fontFamily: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value} className="text-xs">
                  <span style={{ fontFamily: font.value }}>{font.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Tamanho</Label>
            <span className="text-xs text-muted-foreground">{element.styles.fontSize || 24}px</span>
          </div>
          <Slider
            value={[element.styles.fontSize || 24]}
            min={8}
            max={120}
            step={1}
            onValueChange={([value]) => handleStyleUpdate({ fontSize: value })}
          />
        </div>

        {/* Font Weight */}
        <div className="space-y-2">
          <Label className="text-xs">Peso</Label>
          <Select
            value={element.styles.fontWeight || 'normal'}
            onValueChange={(value) => handleStyleUpdate({ fontWeight: value })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHT_OPTIONS.map((weight) => (
                <SelectItem key={weight.value} value={weight.value} className="text-xs">
                  {weight.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Text Color */}
        <div className="space-y-2">
          <Label className="text-xs">Cor do Texto</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.styles.color || '#FFFFFF'}
              onChange={(e) => handleStyleUpdate({ color: e.target.value })}
              className="w-10 h-8 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={element.styles.color || '#FFFFFF'}
              onChange={(e) => handleStyleUpdate({ color: e.target.value })}
              className="flex-1 h-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => handleStyleUpdate({ color })}
                className={cn(
                  "w-6 h-6 rounded border-2 transition-all",
                  element.styles.color === color ? "border-primary scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Background Color */}
        <div className="space-y-2">
          <Label className="text-xs">Cor de Fundo</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.styles.backgroundColor === 'transparent' ? '#000000' : (element.styles.backgroundColor || '#000000')}
              onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })}
              className="w-10 h-8 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={element.styles.backgroundColor || 'transparent'}
              onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })}
              className="flex-1 h-8 text-xs"
              placeholder="transparent"
            />
          </div>
        </div>

        {/* Text Alignment */}
        <div className="space-y-2">
          <Label className="text-xs">Alinhamento</Label>
          <div className="flex gap-1">
            {[
              { value: 'left' as const, icon: AlignLeft },
              { value: 'center' as const, icon: AlignCenter },
              { value: 'right' as const, icon: AlignRight },
            ].map(({ value, icon: Icon }) => (
              <Button
                key={value}
                variant={element.styles.textAlign === value ? 'secondary' : 'outline'}
                size="sm"
                className="flex-1 h-8"
                onClick={() => handleStyleUpdate({ textAlign: value })}
              >
                <Icon className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacidade</Label>
            <span className="text-xs text-muted-foreground">{Math.round((element.styles.opacity || 1) * 100)}%</span>
          </div>
          <Slider
            value={[(element.styles.opacity || 1) * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => handleStyleUpdate({ opacity: value / 100 })}
          />
        </div>
      </div>
    );
  }

  if (element.type === 'shape') {
    return (
      <div className="p-4 space-y-4">
        <h4 className="text-sm font-medium text-foreground">Propriedades da Forma</h4>
        
        {/* Background Color */}
        <div className="space-y-2">
          <Label className="text-xs">Cor de Preenchimento</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.styles.backgroundColor || '#8B5CF6'}
              onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })}
              className="w-10 h-8 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={element.styles.backgroundColor || '#8B5CF6'}
              onChange={(e) => handleStyleUpdate({ backgroundColor: e.target.value })}
              className="flex-1 h-8 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                onClick={() => handleStyleUpdate({ backgroundColor: color })}
                className={cn(
                  "w-6 h-6 rounded border-2 transition-all",
                  element.styles.backgroundColor === color ? "border-primary scale-110" : "border-transparent"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Border Color */}
        <div className="space-y-2">
          <Label className="text-xs">Cor da Borda</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={element.styles.borderColor || '#8B5CF6'}
              onChange={(e) => handleStyleUpdate({ borderColor: e.target.value })}
              className="w-10 h-8 p-1 cursor-pointer"
            />
            <Input
              type="text"
              value={element.styles.borderColor || '#8B5CF6'}
              onChange={(e) => handleStyleUpdate({ borderColor: e.target.value })}
              className="flex-1 h-8 text-xs"
            />
          </div>
        </div>

        {/* Border Width */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Espessura da Borda</Label>
            <span className="text-xs text-muted-foreground">{element.styles.borderWidth || 2}px</span>
          </div>
          <Slider
            value={[element.styles.borderWidth || 2]}
            min={0}
            max={20}
            step={1}
            onValueChange={([value]) => handleStyleUpdate({ borderWidth: value })}
          />
        </div>

        {/* Border Radius */}
        {element.styles.shapeType === 'rectangle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Arredondamento</Label>
              <span className="text-xs text-muted-foreground">{element.styles.borderRadius || 4}px</span>
            </div>
            <Slider
              value={[element.styles.borderRadius || 4]}
              min={0}
              max={50}
              step={1}
              onValueChange={([value]) => handleStyleUpdate({ borderRadius: value })}
            />
          </div>
        )}

        {/* Fade/Gradient Section */}
        <div className="space-y-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1.5">
              <Blend className="h-3.5 w-3.5" />
              Gradiente/Fade
            </Label>
            <Switch
              checked={element.styles.fadeEnabled || false}
              onCheckedChange={(checked) => handleStyleUpdate({ 
                fadeEnabled: checked,
                fadeDirection: checked ? (element.styles.fadeDirection || 'to-right') : undefined,
                fadeEndColor: checked ? (element.styles.fadeEndColor || 'transparent') : undefined,
              })}
            />
          </div>
          
          {element.styles.fadeEnabled && (
            <div className="space-y-3 pl-1">
              {/* Fade Direction */}
              <div className="space-y-2">
                <Label className="text-xs">Direção</Label>
                <Select
                  value={element.styles.fadeDirection || 'to-right'}
                  onValueChange={(value) => handleStyleUpdate({ 
                    fadeDirection: value as CanvasElement['styles']['fadeDirection'] 
                  })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FADE_DIRECTION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="text-xs">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* End Color */}
              <div className="space-y-2">
                <Label className="text-xs">Cor Final</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={element.styles.fadeEndColor === 'transparent' ? '#000000' : (element.styles.fadeEndColor || '#000000')}
                    onChange={(e) => handleStyleUpdate({ fadeEndColor: e.target.value })}
                    className="w-10 h-8 p-1 cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={element.styles.fadeEndColor || 'transparent'}
                    onChange={(e) => handleStyleUpdate({ fadeEndColor: e.target.value })}
                    className="flex-1 h-8 text-xs"
                    placeholder="transparent"
                  />
                </div>
                <button
                  onClick={() => handleStyleUpdate({ fadeEndColor: 'transparent' })}
                  className={cn(
                    "text-xs px-2 py-1 rounded border transition-all",
                    element.styles.fadeEndColor === 'transparent' 
                      ? "border-primary bg-primary/10 text-primary" 
                      : "border-border text-muted-foreground hover:border-primary"
                  )}
                >
                  Transparente
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Opacidade</Label>
            <span className="text-xs text-muted-foreground">{Math.round((element.styles.opacity || 1) * 100)}%</span>
          </div>
          <Slider
            value={[(element.styles.opacity || 1) * 100]}
            min={0}
            max={100}
            step={1}
            onValueChange={([value]) => handleStyleUpdate({ opacity: value / 100 })}
          />
        </div>
      </div>
    );
  }

  if (element.type === 'image') {
    return (
      <ImageProperties 
        element={element} 
        onUpdate={onUpdate}
        handleStyleUpdate={handleStyleUpdate}
      />
    );
  }

  return null;
};

// Separate component for image properties
const ImageProperties: React.FC<{
  element: CanvasElement;
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void;
  handleStyleUpdate: (styleUpdates: Partial<CanvasElement['styles']>) => void;
}> = ({ element, onUpdate, handleStyleUpdate }) => {
  return (
    <div className="p-4 space-y-4">
      <h4 className="text-sm font-medium text-foreground">Propriedades da Imagem</h4>

      {/* Border Radius */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Arredondamento</Label>
          <span className="text-xs text-muted-foreground">{element.styles.borderRadius || 0}px</span>
        </div>
        <Slider
          value={[element.styles.borderRadius || 0]}
          min={0}
          max={50}
          step={1}
          onValueChange={([value]) => handleStyleUpdate({ borderRadius: value })}
        />
      </div>

      {/* Opacity */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">Opacidade</Label>
          <span className="text-xs text-muted-foreground">{Math.round((element.styles.opacity || 1) * 100)}%</span>
        </div>
        <Slider
          value={[(element.styles.opacity || 1) * 100]}
          min={0}
          max={100}
          step={1}
          onValueChange={([value]) => handleStyleUpdate({ opacity: value / 100 })}
        />
      </div>
    </div>
  );
};
