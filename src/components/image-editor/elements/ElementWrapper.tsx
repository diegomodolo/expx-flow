import React, { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Trash2 } from 'lucide-react';

interface ElementWrapperProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: { x?: number; y?: number; width?: number; height?: number; rotation?: number }) => void;
  onDelete: () => void;
  children: React.ReactNode;
}

export const ElementWrapper: React.FC<ElementWrapperProps> = ({
  id,
  x,
  y,
  width,
  height,
  rotation,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  children,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0, elementX: 0, elementY: 0, width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    
    if ((e.target as HTMLElement).dataset.handle) return;
    
    setIsDragging(true);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: x,
      elementY: y,
      width,
      height,
    };
  }, [x, y, width, height, onSelect]);

  const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    onSelect();
    setIsResizing(true);
    setResizeHandle(handle);
    startPos.current = {
      x: e.clientX,
      y: e.clientY,
      elementX: x,
      elementY: y,
      width,
      height,
    };
  }, [x, y, width, height, onSelect]);

  React.useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      if (isDragging) {
        onUpdate({
          x: startPos.current.elementX + deltaX,
          y: startPos.current.elementY + deltaY,
        });
      } else if (isResizing && resizeHandle) {
        let newWidth = startPos.current.width;
        let newHeight = startPos.current.height;
        let newX = startPos.current.elementX;
        let newY = startPos.current.elementY;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(50, startPos.current.width + deltaX);
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(50, startPos.current.width - deltaX);
          newX = startPos.current.elementX + deltaX;
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(30, startPos.current.height + deltaY);
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(30, startPos.current.height - deltaY);
          newY = startPos.current.elementY + deltaY;
        }

        onUpdate({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, resizeHandle, onUpdate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onDelete();
    }
  }, [onDelete]);

  return (
    <div
      ref={elementRef}
      data-element-id={id}
      className={cn(
        "absolute cursor-move select-none",
        isSelected && "ring-2 ring-primary ring-offset-1"
      )}
      style={{
        left: x,
        top: y,
        width,
        height,
        transform: `rotate(${rotation}deg)`,
        zIndex: isSelected ? 100 : 10,
      }}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {children}
      
      {isSelected && (
        <>
          {/* Resize handles */}
          {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => (
            <div
              key={handle}
              data-handle={handle}
              className={cn(
                "absolute w-3 h-3 bg-primary border-2 border-background rounded-sm",
                handle === 'nw' && "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize",
                handle === 'ne' && "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize",
                handle === 'sw' && "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize",
                handle === 'se' && "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize",
                handle === 'n' && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-n-resize",
                handle === 's' && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-s-resize",
                handle === 'e' && "top-1/2 right-0 translate-x-1/2 -translate-y-1/2 cursor-e-resize",
                handle === 'w' && "top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 cursor-w-resize"
              )}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
          
          {/* Delete button */}
          <button
            className="absolute -top-8 right-0 p-1 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
};
