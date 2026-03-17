import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Plus, ZoomIn, ZoomOut, X, Sparkles } from "lucide-react";
import { CanvasElement } from "./hooks/useImageEditor";
import { ElementWrapper } from "./elements/ElementWrapper";
import { TextElement } from "./elements/TextElement";
import { ShapeElement } from "./elements/ShapeElement";
import { ImageElement } from "./elements/ImageElement";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { GenerateVariationsModal } from "./GenerateVariationsModal";

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
  onAddImage?: (url: string) => void;
  onRemoveImage?: (index: number) => void;
  clientId?: string;
  companyId?: string;
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
  onAddImage,
  onRemoveImage,
  clientId,
  companyId,
}) => {
  const currentImage = images[currentImageIndex];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [variationsOpen, setVariationsOpen] = useState(false);

  const handleCanvasClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).dataset.canvas === "true") {
      onSelectElement(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onAddImage) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        onAddImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const renderElement = (element: CanvasElement) => {
    switch (element.type) {
      case "text":
        return (
          <TextElement
            element={element}
            isSelected={element.id === selectedElementId}
            onUpdate={(updates) => onUpdateElement(element.id, updates)}
          />
        );
      case "shape":
        return <ShapeElement element={element} />;
      case "image":
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
            transformOrigin: "center center",
            transition: "transform 0.1s ease-out",
          }}
          data-canvas="true"
        >
          {currentImage && (
            <img
              src={currentImage}
              alt="Canvas background"
              className="max-w-[600px] max-h-[600px] object-contain pointer-events-none"
              crossOrigin="anonymous"
              data-canvas="true"
            />
          )}

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

      {/* Thumbnail Strip */}
      <div className="border-t border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <ScrollArea className="flex-1">
            <div className="flex items-center gap-2">
              {images.map((img, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "relative group shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 cursor-pointer transition-all",
                    idx === currentImageIndex
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-border hover:border-muted-foreground",
                  )}
                  onClick={() => onImageChange(idx)}
                >
                  <img
                    src={img}
                    alt={`Imagem ${idx + 1}`}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                  {onRemoveImage && images.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveImage(idx);
                      }}
                      className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center bg-black/60 text-white">
                    {idx + 1}
                  </span>
                </div>
              ))}

              {/* Add Image Button */}
              {onAddImage && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="shrink-0 w-14 h-14 rounded-md border-2 border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary hover:bg-muted/50 transition-colors"
                >
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              )}

              {/* Generate Variations Button */}
              {currentImage && companyId && (
                <button
                  onClick={() => setVariationsOpen(true)}
                  className="shrink-0 h-14 px-3 rounded-md border-2 border-dashed border-primary/40 flex items-center gap-1.5 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary whitespace-nowrap">
                    Variações
                  </span>
                </button>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center justify-center gap-3 py-2 border-t border-border bg-card px-4">
        <Button
          aria-label="Botão de ação complementar"
          variant="ghost"
          size="icon"
          onClick={() => onZoomChange(zoom - 0.1)}
          disabled={zoom <= 0.25}
          className="h-7 w-7"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <div className="w-36 flex items-center gap-2">
          <Slider
            value={[zoom * 100]}
            min={25}
            max={200}
            step={5}
            onValueChange={([value]) => onZoomChange(value / 100)}
          />
          <span className="text-xs text-muted-foreground w-10 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <Button
          aria-label="Botão de ação complementar"
          variant="ghost"
          size="icon"
          onClick={() => onZoomChange(zoom + 0.1)}
          disabled={zoom >= 2}
          className="h-7 w-7"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Variations Modal */}
      <GenerateVariationsModal
        open={variationsOpen}
        onOpenChange={setVariationsOpen}
        currentImageUrl={currentImage}
        onVariationsGenerated={(urls) => {
          urls.forEach((url) => onAddImage?.(url));
        }}
        clientId={clientId}
        companyId={companyId || ""}
      />
    </div>
  );
};
