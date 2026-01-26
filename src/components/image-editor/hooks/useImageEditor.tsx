import { useState, useCallback } from 'react';

export interface CanvasElement {
  id: string;
  type: 'text' | 'shape' | 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content: string;
  styles: {
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    opacity?: number;
    textAlign?: 'left' | 'center' | 'right';
    shapeType?: 'rectangle' | 'circle' | 'line' | 'arrow';
  };
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

export interface ImageEditorState {
  images: string[];
  currentImageIndex: number;
  elements: CanvasElement[][];
  selectedElementId: string | null;
  zoom: number;
  history: CanvasElement[][][];
  historyIndex: number;
  aiChatMessages: AIMessage[];
  isProcessingAI: boolean;
}

interface UseImageEditorProps {
  initialImages: string[];
}

export function useImageEditor({ initialImages }: UseImageEditorProps) {
  const [state, setState] = useState<ImageEditorState>({
    images: initialImages,
    currentImageIndex: 0,
    elements: initialImages.map(() => []),
    selectedElementId: null,
    zoom: 1,
    history: [initialImages.map(() => [])],
    historyIndex: 0,
    aiChatMessages: [],
    isProcessingAI: false,
  });

  const getCurrentElements = useCallback(() => {
    return state.elements[state.currentImageIndex] || [];
  }, [state.elements, state.currentImageIndex]);

  const saveToHistory = useCallback((newElements: CanvasElement[][]) => {
    setState(prev => {
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newElements)));
      return {
        ...prev,
        elements: newElements,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  }, []);

  const addElement = useCallback((type: CanvasElement['type'], config?: Partial<CanvasElement>) => {
    const id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const defaultStyles: CanvasElement['styles'] = {
      fontSize: type === 'text' ? 24 : undefined,
      fontWeight: 'normal',
      fontFamily: 'Inter',
      color: '#FFFFFF',
      backgroundColor: type === 'shape' ? '#8B5CF6' : 'transparent',
      borderColor: '#8B5CF6',
      borderWidth: type === 'shape' ? 2 : 0,
      borderRadius: 4,
      opacity: 1,
      textAlign: 'center',
      shapeType: type === 'shape' ? 'rectangle' : undefined,
    };

    const newElement: CanvasElement = {
      id,
      type,
      x: 100,
      y: 100,
      width: type === 'text' ? 200 : type === 'image' ? 150 : 120,
      height: type === 'text' ? 50 : type === 'image' ? 150 : 80,
      rotation: 0,
      content: type === 'text' ? 'Novo texto' : '',
      styles: { ...defaultStyles, ...config?.styles },
      ...config,
    };

    setState(prev => {
      const newElements = [...prev.elements];
      newElements[prev.currentImageIndex] = [...(newElements[prev.currentImageIndex] || []), newElement];
      return {
        ...prev,
        elements: newElements,
        selectedElementId: id,
      };
    });

    saveToHistory(state.elements.map((els, i) => 
      i === state.currentImageIndex ? [...els, newElement] : els
    ));

    return id;
  }, [state.elements, state.currentImageIndex, saveToHistory]);

  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    setState(prev => {
      const newElements = prev.elements.map((slideElements, slideIndex) => {
        if (slideIndex !== prev.currentImageIndex) return slideElements;
        return slideElements.map(el => 
          el.id === id ? { ...el, ...updates, styles: { ...el.styles, ...updates.styles } } : el
        );
      });
      return { ...prev, elements: newElements };
    });
  }, []);

  const removeElement = useCallback((id: string) => {
    setState(prev => {
      const newElements = prev.elements.map((slideElements, slideIndex) => {
        if (slideIndex !== prev.currentImageIndex) return slideElements;
        return slideElements.filter(el => el.id !== id);
      });
      saveToHistory(newElements);
      return { 
        ...prev, 
        elements: newElements,
        selectedElementId: prev.selectedElementId === id ? null : prev.selectedElementId,
      };
    });
  }, [saveToHistory]);

  const selectElement = useCallback((id: string | null) => {
    setState(prev => ({ ...prev, selectedElementId: id }));
  }, []);

  const undo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex <= 0) return prev;
      const newIndex = prev.historyIndex - 1;
      return {
        ...prev,
        elements: JSON.parse(JSON.stringify(prev.history[newIndex])),
        historyIndex: newIndex,
        selectedElementId: null,
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState(prev => {
      if (prev.historyIndex >= prev.history.length - 1) return prev;
      const newIndex = prev.historyIndex + 1;
      return {
        ...prev,
        elements: JSON.parse(JSON.stringify(prev.history[newIndex])),
        historyIndex: newIndex,
        selectedElementId: null,
      };
    });
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom: Math.max(0.25, Math.min(2, zoom)) }));
  }, []);

  const setCurrentImage = useCallback((index: number) => {
    setState(prev => ({ 
      ...prev, 
      currentImageIndex: Math.max(0, Math.min(prev.images.length - 1, index)),
      selectedElementId: null,
    }));
  }, []);

  const updateImage = useCallback((index: number, newUrl: string) => {
    setState(prev => {
      const newImages = [...prev.images];
      newImages[index] = newUrl;
      return { ...prev, images: newImages };
    });
  }, []);

  const addAIMessage = useCallback((message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
    };
    setState(prev => ({
      ...prev,
      aiChatMessages: [...prev.aiChatMessages, newMessage],
    }));
    return newMessage.id;
  }, []);

  const setProcessingAI = useCallback((processing: boolean) => {
    setState(prev => ({ ...prev, isProcessingAI: processing }));
  }, []);

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  return {
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
  };
}
