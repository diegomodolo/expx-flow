import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus, ChevronRight, ChevronLeft, ChevronsLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVEL_COLORS = [
  'hsl(var(--primary))',           // 0 - primary
  'hsl(142, 71%, 45%)',            // 1 - green
  'hsl(32, 95%, 44%)',             // 2 - orange
  'hsl(263, 70%, 50%)',            // 3 - purple
  'hsl(340, 82%, 52%)',            // 4 - pink
  'hsl(199, 89%, 48%)',            // 5 - cyan
];

const LEVEL_BG = [
  'hsl(var(--primary) / 0.08)',
  'hsl(142, 71%, 45%, 0.08)',
  'hsl(32, 95%, 44%, 0.08)',
  'hsl(263, 70%, 50%, 0.08)',
  'hsl(340, 82%, 52%, 0.08)',
  'hsl(199, 89%, 48%, 0.08)',
];

interface MindMapNodeData {
  label: string;
  level: number;
  collapsed?: boolean;
  childCount?: number;
  hasLeftChildren?: boolean;
  hasRightChildren?: boolean;
  onAddChild?: (nodeId: string, direction?: 'left' | 'right') => void;
  onLabelChange?: (nodeId: string, label: string) => void;
  onToggleCollapse?: (nodeId: string) => void;
  [key: string]: unknown;
}

function MindMapNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MindMapNodeData;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nodeData.label);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [editSize, setEditSize] = useState<{ width: number; height: number } | null>(null);
  const level = nodeData.level || 0;
  const borderColor = LEVEL_COLORS[level % LEVEL_COLORS.length];
  const bgColor = LEVEL_BG[level % LEVEL_BG.length];
  const isCollapsed = nodeData.collapsed || false;
  const childCount = nodeData.childCount || 0;
  const hasLeftChildren = nodeData.hasLeftChildren || false;
  const hasRightChildren = nodeData.hasRightChildren || false;

  useEffect(() => {
    setText(nodeData.label);
  }, [nodeData.label]);

  const startEditing = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setEditSize({ width: rect.width, height: rect.height });
    }
    setEditing(true);
  }, []);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const finishEditing = useCallback(() => {
    setEditing(false);
    setEditSize(null);
    if (text.trim() && text !== nodeData.label) {
      nodeData.onLabelChange?.(id, text.trim());
    } else {
      setText(nodeData.label);
    }
  }, [text, nodeData.label, nodeData.onLabelChange, id]);

  const isRoot = level === 0;

  // Determine which add buttons to show
  // Root: show both sides always
  // Non-root: show on the side that doesn't have children, or both if no children
  const showAddRight = isRoot || !hasRightChildren || !hasLeftChildren;
  const showAddLeft = isRoot;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative group transition-all duration-150',
        selected && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
      )}
      style={{
        borderRadius: isRoot ? '20px' : '12px',
        border: `2px solid ${borderColor}`,
        background: bgColor,
        padding: isRoot ? '14px 28px' : '8px 18px',
        minWidth: editing ? (editSize?.width || (isRoot ? 160 : 100)) : (isRoot ? 160 : 100),
        minHeight: editing ? (editSize?.height || undefined) : undefined,
        maxWidth: editing ? undefined : 300,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={() => !editing && startEditing()}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />

      {editing ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={finishEditing}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEditing(); }
            if (e.key === 'Escape') { setText(nodeData.label); setEditing(false); setEditSize(null); }
          }}
          className="bg-transparent border-none outline-none text-center w-full text-foreground resize overflow-auto"
          style={{
            fontSize: isRoot ? 16 : 13,
            fontWeight: isRoot ? 600 : 500,
            minHeight: editSize ? editSize.height - (isRoot ? 28 : 16) : 20,
            minWidth: editSize ? editSize.width - (isRoot ? 56 : 36) : 80,
          }}
        />
      ) : (
        <span
          className="text-foreground select-none block text-center whitespace-pre-wrap"
          style={{ fontSize: isRoot ? 16 : 13, fontWeight: isRoot ? 600 : 500 }}
        >
          {nodeData.label}
        </span>
      )}

      {/* Collapse/Expand badge - always visible when node has children */}
      {childCount > 0 && !editing && (
        <>
          {hasRightChildren && (
            <button
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border transition-all hover:scale-125 z-30"
              style={{
                right: '-14px',
                background: isCollapsed ? borderColor : 'hsl(var(--card))',
                borderColor: borderColor,
                color: isCollapsed ? 'white' : borderColor,
              }}
              onClick={e => {
                e.stopPropagation();
                nodeData.onToggleCollapse?.(id);
              }}
              title={isCollapsed ? `Expandir (${childCount})` : 'Colapsar'}
            >
              {isCollapsed ? (
                <span className="text-[9px] font-bold">{childCount}</span>
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          {hasLeftChildren && !hasRightChildren && (
            <button
              className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center shadow-sm border transition-all hover:scale-125 z-30"
              style={{
                left: '-14px',
                background: isCollapsed ? borderColor : 'hsl(var(--card))',
                borderColor: borderColor,
                color: isCollapsed ? 'white' : borderColor,
              }}
              onClick={e => {
                e.stopPropagation();
                nodeData.onToggleCollapse?.(id);
              }}
              title={isCollapsed ? `Expandir (${childCount})` : 'Colapsar'}
            >
              {isCollapsed ? (
                <span className="text-[9px] font-bold">{childCount}</span>
              ) : (
                <ChevronLeft className="w-3 h-3" />
              )}
            </button>
          )}
        </>
      )}

      {/* Add child buttons - shown on hover, positioned OUTSIDE the collapse button */}
      {hovered && !editing && !isCollapsed && (
        <>
          <button
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 z-20"
            style={{
              background: borderColor,
              color: 'white',
              right: childCount > 0 && hasRightChildren ? '-44px' : '-14px',
            }}
            onClick={e => {
              e.stopPropagation();
              nodeData.onAddChild?.(id, 'right');
            }}
            title="Adicionar à direita"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {showAddLeft && (
            <button
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 z-20"
            style={{
              background: borderColor,
              color: 'white',
              left: childCount > 0 && hasLeftChildren ? '-44px' : '-14px',
              }}
              onClick={e => {
                e.stopPropagation();
                nodeData.onAddChild?.(id, 'left');
              }}
              title="Adicionar à esquerda"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default memo(MindMapNodeComponent);
