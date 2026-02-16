import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus } from 'lucide-react';
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
  onAddChild?: (nodeId: string) => void;
  onLabelChange?: (nodeId: string, label: string) => void;
  [key: string]: unknown;
}

function MindMapNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as MindMapNodeData;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(nodeData.label);
  const [hovered, setHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const level = nodeData.level || 0;
  const borderColor = LEVEL_COLORS[level % LEVEL_COLORS.length];
  const bgColor = LEVEL_BG[level % LEVEL_BG.length];

  useEffect(() => {
    setText(nodeData.label);
  }, [nodeData.label]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const finishEditing = useCallback(() => {
    setEditing(false);
    if (text.trim() && text !== nodeData.label) {
      nodeData.onLabelChange?.(id, text.trim());
    } else {
      setText(nodeData.label);
    }
  }, [text, nodeData.label, nodeData.onLabelChange, id]);

  const isRoot = level === 0;

  return (
    <div
      className={cn(
        'relative group transition-all duration-150',
        selected && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
      )}
      style={{
        borderRadius: isRoot ? '20px' : '12px',
        border: `2px solid ${borderColor}`,
        background: bgColor,
        padding: isRoot ? '14px 28px' : '8px 18px',
        minWidth: isRoot ? 160 : 100,
      maxWidth: 300,
    }}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onDoubleClick={() => setEditing(true)}
  >
    <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
    <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
    <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />
    <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-muted-foreground/40 !border-none" />

    {editing ? (
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => {
          setText(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        onBlur={finishEditing}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finishEditing(); }
          if (e.key === 'Escape') { setText(nodeData.label); setEditing(false); }
        }}
        className="bg-transparent border-none outline-none text-center w-full text-foreground resize-none overflow-hidden"
        style={{ fontSize: isRoot ? 16 : 13, fontWeight: isRoot ? 600 : 500, minHeight: 20 }}
        rows={1}
      />
    ) : (
      <span
        className="text-foreground select-none block text-center whitespace-pre-wrap"
        style={{ fontSize: isRoot ? 16 : 13, fontWeight: isRoot ? 600 : 500 }}
      >
          {nodeData.label}
        </span>
      )}

      {/* Add child button */}
      {hovered && !editing && (
        <button
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110"
          style={{ background: borderColor, color: 'white' }}
          onClick={e => {
            e.stopPropagation();
            nodeData.onAddChild?.(id);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default memo(MindMapNodeComponent);
