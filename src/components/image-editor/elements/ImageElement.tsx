import React from 'react';
import { CanvasElement } from '../hooks/useImageEditor';

interface ImageElementProps {
  element: CanvasElement;
}

export const ImageElement: React.FC<ImageElementProps> = ({ element }) => {
  const { content, styles } = element;

  if (!content) {
    return (
      <div 
        className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs"
        style={{ 
          borderRadius: styles.borderRadius,
          opacity: styles.opacity,
        }}
      >
        Imagem
      </div>
    );
  }

  return (
    <img
      src={content}
      alt="Overlay"
      className="w-full h-full object-cover pointer-events-none"
      style={{
        borderRadius: styles.borderRadius,
        opacity: styles.opacity,
      }}
      crossOrigin="anonymous"
    />
  );
};
