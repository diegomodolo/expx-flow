import React from 'react';
import { CanvasElement } from '../hooks/useImageEditor';

interface ShapeElementProps {
  element: CanvasElement;
}

const getGradientDirection = (direction: CanvasElement['styles']['fadeDirection']): string => {
  switch (direction) {
    case 'to-right':
      return 'to right';
    case 'to-left':
      return 'to left';
    case 'to-bottom':
      return 'to bottom';
    case 'to-top':
      return 'to top';
    case 'to-bottom-right':
      return 'to bottom right';
    case 'to-bottom-left':
      return 'to bottom left';
    case 'to-top-right':
      return 'to top right';
    case 'to-top-left':
      return 'to top left';
    default:
      return 'to right';
  }
};

export const ShapeElement: React.FC<ShapeElementProps> = ({ element }) => {
  const { styles } = element;

  // Build background style - either solid color or gradient
  const getBackgroundStyle = (): string | undefined => {
    if (styles.fadeEnabled && styles.fadeDirection) {
      const startColor = styles.backgroundColor || '#8B5CF6';
      const endColor = styles.fadeEndColor || 'transparent';
      const direction = getGradientDirection(styles.fadeDirection);
      return `linear-gradient(${direction}, ${startColor}, ${endColor})`;
    }
    return styles.backgroundColor;
  };

  const backgroundStyle = getBackgroundStyle();
  const isGradient = styles.fadeEnabled && styles.fadeDirection;

  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    ...(isGradient 
      ? { background: backgroundStyle } 
      : { backgroundColor: backgroundStyle }
    ),
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
            ...(isGradient 
              ? { background: backgroundStyle } 
              : { backgroundColor: styles.backgroundColor || styles.borderColor }
            ),
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
              ...(isGradient 
                ? { background: backgroundStyle } 
                : { backgroundColor: styles.backgroundColor || styles.borderColor }
              ),
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