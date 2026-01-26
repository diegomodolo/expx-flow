import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ChevronLeft, ChevronRight, Plus, ZoomIn, ZoomOut } from 'lucide-react';
import { CanvasElement } from './hooks/useImageEditor';
import { ElementWrapper } from './elements/ElementWrapper';
import { TextElement } from './elements/TextElement';
import { ShapeElement } from './elements/ShapeElement';
import { ImageElement } from './elements/ImageElement';

interface EditorCanvasProps {
  images: string[];
  currentImageIndex: number;
  elements: CanvasElement[];
  selectedElementId: string | null;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onImageChange: (index: number) => void;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  images,
  currentImageIndex,
  elements,
  selectedElementId,
  zoom,
  onZoomChange,
  onImageChange,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  canvasRef,
}) => {
  const currentImage = images[currentImageIndex];
  const hasMultipleImages = images.length > 1;

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.canvas === 'true') {
      onSelectElement(null);
    }
  };

  const renderElement = (element: CanvasElement) => {
    switch (element.type) {
      case 'text':
        return (
          <TextElement
            element={element}
            isSelected={element.id === selectedElementId}
            onUpdate={(updates) => onUpdateElement(element.id, updates)}
          />
        );
      case 'shape':
        return <ShapeElement element={element} />;
      case 'image':
        return <ImageElement element={element} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-muted/30 overflow-hidden">
      {/* Canvas Area */}
      <div 
        className="flex-1 flex items-center justify-center p-4 overflow-auto"
        onClick={handleCanvasClick}
        data-canvas="true"
      >
        <div
          ref={canvasRef}
          id="editor-canvas"
          className="relative bg-black shadow-2xl"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out',
          }}
          data-canvas="true"
        >
          {/* Background Image */}
          {currentImage && (
            <img
              src={currentImage}
              alt="Canvas background"
              className="max-w-[600px] max-h-[600px] object-contain pointer-events-none"
              crossOrigin="anonymous"
              data-canvas="true"
            />
          )}

          {/* Canvas Elements */}
          {elements.map((element) => (
            <ElementWrapper
              key={element.id}
              id={element.id}
              x={element.x}
              y={element.y}
              width={element.width}
              height={element.height}
              rotation={element.rotation}
              isSelected={element.id === selectedElementId}
              onSelect={() => onSelectElement(element.id)}
              onUpdate={(updates) => onUpdateElement(element.id, updates)}
              onDelete={() => onDeleteElement(element.id)}
            >
              {renderElement(element)}
            </ElementWrapper>
          ))}
        </div>
      </div>

      {/* Navigation for multiple images */}
      {hasMultipleImages && (
        <div className="flex items-center justify-center gap-2 py-3 border-t border-border bg-card">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onImageChange(currentImageIndex - 1)}
            disabled={currentImageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => onImageChange(idx)}
                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                  idx === currentImageIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => onImageChange(currentImageIndex + 1)}
            disabled={currentImageIndex === images.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="flex items-center justify-center gap-3 py-3 border-t border-border bg-card px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onZoomChange(zoom - 0.1)}
          disabled={zoom <= 0.25}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <div className="w-48 flex items-center gap-3">
          <Slider
            value={[zoom * 100]}
            min={25}
            max={200}
            step={5}
            onValueChange={([value]) => onZoomChange(value / 100)}
          />
          <span className="text-xs text-muted-foreground w-12 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onZoomChange(zoom + 0.1)}
          disabled={zoom >= 2}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
