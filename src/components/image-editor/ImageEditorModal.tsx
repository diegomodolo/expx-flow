import React, { useRef, useState, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EditorHeader } from './EditorHeader';
import { EditorToolbar } from './EditorToolbar';
import { EditorCanvas } from './EditorCanvas';
import { EditorAIChat } from './EditorAIChat';
import { useImageEditor } from './hooks/useImageEditor';
import { exportAndUpload, downloadCanvas } from './utils/canvasExport';
import { toast } from '@/hooks/use-toast';
import { Orientation } from './OrientationSelector';

interface ImageEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: string[];
  onSave: (newImages: string[]) => void;
  clientId: string;
  companyId: string;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  open,
  onOpenChange,
  images,
  onSave,
  clientId,
  companyId,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const {
    state,
    getCurrentElements,
    addElement,
    updateElement,
    removeElement,
    selectElement,
    undo,
    redo,
    canUndo,
    canRedo,
    setZoom,
    setCurrentImage,
    updateImage,
    addAIMessage,
    setProcessingAI,
    setOrientation,
  } = useImageEditor({ initialImages: images });

  const handleOrientationChange = useCallback((orientation: Orientation) => {
    setOrientation(orientation.id);
  }, [setOrientation]);

  const handleExport = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsExporting(true);
    try {
      await downloadCanvas(canvasRef.current, `creative-${Date.now()}.png`);
      toast({
        title: 'Download concluído',
        description: 'A imagem foi baixada com sucesso.',
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erro no download',
        description: 'Não foi possível baixar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleFinalize = useCallback(async () => {
    if (!canvasRef.current) return;

    setIsFinalizing(true);
    try {
      const exportedUrls: string[] = [];

      for (let i = 0; i < state.images.length; i++) {
        // Check if this image has overlay elements (text, shapes, etc.)
        const imageElements = state.elements[i] || [];
        const hasOverlayElements = imageElements.length > 0;

        if (hasOverlayElements && i === state.currentImageIndex) {
          // Has elements and is the current image: export canvas with overlays
          const url = await exportAndUpload(canvasRef.current);
          exportedUrls.push(url);
        } else {
          // No elements OR not current image: use the state URL directly
          // This captures AI-edited images that are already saved in storage
          exportedUrls.push(state.images[i]);
        }
      }

      onSave(exportedUrls);
      toast({
        title: 'Imagem salva',
        description: 'O criativo foi atualizado com sucesso.',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Finalize error:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizing(false);
    }
  }, [state.images, state.elements, state.currentImageIndex, onSave, onOpenChange]);

  const handleSendMessage = useCallback((content: string, imageUrl?: string) => {
    addAIMessage({
      role: 'user',
      content,
      imageUrl,
    });
  }, [addAIMessage]);

  const handleImageGenerated = useCallback((newImageUrl: string) => {
    updateImage(state.currentImageIndex, newImageUrl);
    addAIMessage({
      role: 'assistant',
      content: 'Imagem atualizada!',
      imageUrl: newImageUrl,
    });
  }, [state.currentImageIndex, updateImage, addAIMessage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 gap-0 flex flex-col overflow-hidden"
        hideCloseButton
      >
        <EditorHeader
          onClose={() => onOpenChange(false)}
          onExport={handleExport}
          onFinalize={handleFinalize}
          isExporting={isExporting}
          isFinalizing={isFinalizing}
        />

        <div className="flex flex-1 overflow-hidden">
          <EditorToolbar
            onAddElement={addElement}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            selectedElement={getCurrentElements().find(el => el.id === state.selectedElementId) || null}
            onUpdateElement={updateElement}
            companyId={companyId}
            orientation={state.orientation}
            onOrientationChange={handleOrientationChange}
          />

          <EditorCanvas
            images={state.images}
            currentImageIndex={state.currentImageIndex}
            elements={getCurrentElements()}
            selectedElementId={state.selectedElementId}
            zoom={state.zoom}
            onZoomChange={setZoom}
            onImageChange={setCurrentImage}
            onSelectElement={selectElement}
            onUpdateElement={updateElement}
            onDeleteElement={removeElement}
            canvasRef={canvasRef}
          />

          <EditorAIChat
            messages={state.aiChatMessages}
            isProcessing={state.isProcessingAI}
            currentImageUrl={state.images[state.currentImageIndex]}
            onSendMessage={handleSendMessage}
            onImageGenerated={handleImageGenerated}
            clientId={clientId}
            companyId={companyId}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
