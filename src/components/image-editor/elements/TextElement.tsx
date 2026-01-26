import React, { useState, useRef, useEffect } from 'react';
import { CanvasElement } from '../hooks/useImageEditor';

interface TextElementProps {
  element: CanvasElement;
  isSelected: boolean;
  onUpdate: (updates: Partial<CanvasElement>) => void;
}

export const TextElement: React.FC<TextElementProps> = ({
  element,
  isSelected,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ content: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
    }
    e.stopPropagation();
  };

  const styles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: element.styles.fontSize,
    fontWeight: element.styles.fontWeight,
    fontFamily: element.styles.fontFamily,
    color: element.styles.color,
    backgroundColor: element.styles.backgroundColor,
    textAlign: element.styles.textAlign,
    opacity: element.styles.opacity,
    borderRadius: element.styles.borderRadius,
    display: 'flex',
    alignItems: 'center',
    justifyContent: element.styles.textAlign === 'center' ? 'center' : 
                    element.styles.textAlign === 'right' ? 'flex-end' : 'flex-start',
    padding: '8px 12px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    wordBreak: 'break-word',
  };

  if (isEditing) {
    return (
      <textarea
        ref={inputRef}
        value={element.content}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="resize-none border-none outline-none bg-transparent"
        style={{
          ...styles,
          cursor: 'text',
        }}
      />
    );
  }

  return (
    <div
      style={styles}
      onDoubleClick={handleDoubleClick}
      className="cursor-move"
    >
      <span className="pointer-events-none">{element.content || 'Clique duplo para editar'}</span>
    </div>
  );
};
