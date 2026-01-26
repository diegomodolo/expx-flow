import React from 'react';
import { CanvasElement } from '../hooks/useImageEditor';

interface ShapeElementProps {
  element: CanvasElement;
}

export const ShapeElement: React.FC<ShapeElementProps> = ({ element }) => {
  const { styles } = element;

  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    backgroundColor: styles.backgroundColor,
    borderColor: styles.borderColor,
    borderWidth: styles.borderWidth,
    borderStyle: 'solid',
    opacity: styles.opacity,
  };

  switch (styles.shapeType) {
    case 'circle':
      return (
        <div
          style={{
            ...baseStyles,
            borderRadius: '50%',
          }}
        />
      );

    case 'line':
      return (
        <div
          style={{
            width: '100%',
            height: '4px',
            backgroundColor: styles.backgroundColor || styles.borderColor,
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            opacity: styles.opacity,
          }}
        />
      );

    case 'arrow':
      return (
        <div className="relative w-full h-full flex items-center">
          <div
            style={{
              flex: 1,
              height: '4px',
              backgroundColor: styles.backgroundColor || styles.borderColor,
              opacity: styles.opacity,
            }}
          />
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '10px solid transparent',
              borderBottom: '10px solid transparent',
              borderLeft: `15px solid ${styles.backgroundColor || styles.borderColor}`,
              opacity: styles.opacity,
            }}
          />
        </div>
      );

    case 'rectangle':
    default:
      return (
        <div
          style={{
            ...baseStyles,
            borderRadius: styles.borderRadius,
          }}
        />
      );
  }
};
