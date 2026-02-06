import { useEffect, useState, useCallback, useRef, KeyboardEvent } from "react";
import { Star, StarOff, Share2, MoreHorizontal, Plus, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaceDocuments } from "@/hooks/useWorkspaceDocuments";
import { WorkspaceShareDialog } from "./WorkspaceShareDialog";
import type { WorkspaceDocument } from "@/types/workspace";
import { cn } from "@/lib/utils";
import { SlashCommandMenu } from "./SlashCommandMenu";

interface WorkspaceEditorProps {
  document: WorkspaceDocument | null;
}

interface Block {
  id: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bullet' | 'numbered' | 'todo' | 'quote' | 'divider';
  content: string;
  checked?: boolean;
}

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📌', '💡', '🎯', '🚀', '✨', '📊', '📈', '🔖', '📂'];

const createBlock = (type: Block['type'] = 'paragraph', content: string = ''): Block => ({
  id: crypto.randomUUID(),
  type,
  content,
  checked: type === 'todo' ? false : undefined,
});

export function WorkspaceEditor({ document }: WorkspaceEditorProps) {
  const { updateDocument, toggleFavorite } = useWorkspaceDocuments();
  const [title, setTitle] = useState(document?.title || '');
  const [blocks, setBlocks] = useState<Block[]>([createBlock()]);
  const [shareOpen, setShareOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 });
  const [slashFilter, setSlashFilter] = useState('');
  const blockRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  // Parse content to blocks
  const parseContentToBlocks = useCallback((content: any): Block[] => {
    if (!content) return [createBlock()];
    
    // If it's already in our block format
    if (Array.isArray(content) && content[0]?.type && content[0]?.id) {
      return content;
    }
    
    // If it's a string, parse line by line
    if (typeof content === 'string') {
      const lines = content.split('\n').filter(l => l.trim());
      if (lines.length === 0) return [createBlock()];
      return lines.map(line => createBlock('paragraph', line));
    }
    
    // If it's BlockNote format, convert
    if (Array.isArray(content)) {
      const parsedBlocks: Block[] = [];
      content.forEach((block: any) => {
        if (block.content && Array.isArray(block.content)) {
          const text = block.content.map((c: any) => c.text || '').join('');
          let type: Block['type'] = 'paragraph';
          if (block.type === 'heading') {
            type = block.props?.level === 1 ? 'heading1' : block.props?.level === 2 ? 'heading2' : 'heading3';
          } else if (block.type === 'bulletListItem') {
            type = 'bullet';
          } else if (block.type === 'numberedListItem') {
            type = 'numbered';
          } else if (block.type === 'checkListItem') {
            type = 'todo';
          }
          parsedBlocks.push(createBlock(type, text));
        }
      });
      return parsedBlocks.length > 0 ? parsedBlocks : [createBlock()];
    }
    
    return [createBlock()];
  }, []);

  // Update content when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setBlocks(parseContentToBlocks(document.content));
    }
  }, [document?.id, parseContentToBlocks]);

  // Debounced save
  const saveContent = useCallback(async (newBlocks: Block[]) => {
    if (!document) return;
    setIsSaving(true);
    try {
      await updateDocument.mutateAsync({ id: document.id, content: newBlocks as any });
    } finally {
      setIsSaving(false);
    }
  }, [document, updateDocument]);

  // Auto-save
  useEffect(() => {
    if (!document) return;
    const timer = setTimeout(() => {
      saveContent(blocks);
    }, 1000);
    return () => clearTimeout(timer);
  }, [blocks, document, saveContent]);

  // Save title on blur
  const handleTitleBlur = async () => {
    if (!document || title === document.title) return;
    await updateDocument.mutateAsync({ id: document.id, title: title || 'Sem título' });
  };

  // Handle icon change
  const handleIconChange = async (icon: string) => {
    if (!document) return;
    await updateDocument.mutateAsync({ id: document.id, icon });
    setShowEmojiPicker(false);
  };

  // Handle favorite toggle
  const handleToggleFavorite = () => {
    if (!document) return;
    toggleFavorite.mutate({ id: document.id, isFavorite: !document.is_favorite });
  };

  // Block operations
  const updateBlock = (id: string, updates: Partial<Block>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const addBlockAfter = (afterId: string, type: Block['type'] = 'paragraph') => {
    const newBlock = createBlock(type);
    setBlocks(prev => {
      const index = prev.findIndex(b => b.id === afterId);
      const newBlocks = [...prev];
      newBlocks.splice(index + 1, 0, newBlock);
      return newBlocks;
    });
    setTimeout(() => {
      blockRefs.current[newBlock.id]?.focus();
    }, 0);
    return newBlock.id;
  };

  const deleteBlock = (id: string) => {
    if (blocks.length <= 1) return;
    const index = blocks.findIndex(b => b.id === id);
    const prevBlock = blocks[index - 1];
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (prevBlock) {
      setTimeout(() => {
        const el = blockRefs.current[prevBlock.id];
        if (el) {
          el.focus();
          // Move cursor to end
          const range = window.document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          const sel = window.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>, block: Block) => {
    const el = blockRefs.current[block.id];
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (slashMenuOpen) {
        return; // Let SlashCommandMenu handle it
      }
      addBlockAfter(block.id);
    }
    
    if (e.key === 'Backspace' && block.content === '' && blocks.length > 1) {
      e.preventDefault();
      deleteBlock(block.id);
    }
    
    if (e.key === 'ArrowUp' && el) {
      const selection = window.getSelection();
      if (selection && selection.anchorOffset === 0) {
        const index = blocks.findIndex(b => b.id === block.id);
        if (index > 0) {
          e.preventDefault();
          blockRefs.current[blocks[index - 1].id]?.focus();
        }
      }
    }
    
    if (e.key === 'ArrowDown' && el) {
      const selection = window.getSelection();
      if (selection && selection.anchorOffset === block.content.length) {
        const index = blocks.findIndex(b => b.id === block.id);
        if (index < blocks.length - 1) {
          e.preventDefault();
          blockRefs.current[blocks[index + 1].id]?.focus();
        }
      }
    }
  };

  const handleInput = (blockId: string, e: React.FormEvent<HTMLElement>) => {
    const content = (e.target as HTMLElement).textContent || '';
    
    // Check for slash command
    if (content.endsWith('/')) {
      const el = blockRefs.current[blockId];
      if (el) {
        const rect = el.getBoundingClientRect();
        setSlashMenuPosition({ 
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX
        });
        setSlashMenuOpen(true);
        setSlashFilter('');
        setActiveBlockId(blockId);
      }
    } else if (slashMenuOpen && content.includes('/')) {
      const slashIndex = content.lastIndexOf('/');
      setSlashFilter(content.substring(slashIndex + 1));
    } else {
      setSlashMenuOpen(false);
    }
    
    updateBlock(blockId, { content });
  };

  const handleSlashCommand = (type: Block['type']) => {
    if (!activeBlockId) return;
    
    // Remove the slash command from content
    const block = blocks.find(b => b.id === activeBlockId);
    if (block) {
      const slashIndex = block.content.lastIndexOf('/');
      const newContent = block.content.substring(0, slashIndex);
      updateBlock(activeBlockId, { type, content: newContent });
      
      setTimeout(() => {
        blockRefs.current[activeBlockId]?.focus();
      }, 0);
    }
    
    setSlashMenuOpen(false);
    setSlashFilter('');
  };

  const getBlockStyles = (type: Block['type']) => {
    switch (type) {
      case 'heading1':
        return 'text-3xl font-bold';
      case 'heading2':
        return 'text-2xl font-semibold';
      case 'heading3':
        return 'text-xl font-medium';
      case 'quote':
        return 'border-l-4 border-primary pl-4 italic text-muted-foreground';
      default:
        return 'text-base';
    }
  };

  const getBlockPrefix = (block: Block, index: number) => {
    switch (block.type) {
      case 'bullet':
        return <span className="mr-2 text-muted-foreground">•</span>;
      case 'numbered':
        const numIndex = blocks.slice(0, index).filter(b => b.type === 'numbered').length + 1;
        return <span className="mr-2 text-muted-foreground min-w-[20px]">{numIndex}.</span>;
      case 'todo':
        return (
          <input
            type="checkbox"
            checked={block.checked}
            onChange={(e) => updateBlock(block.id, { checked: e.target.checked })}
            className="mr-2 h-4 w-4 rounded border-muted-foreground"
          />
        );
      default:
        return null;
    }
  };

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-lg">Selecione um documento</p>
          <p className="text-sm mt-1">ou crie um novo para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Document Header */}
      <div className="border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          {/* Icon with picker */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-2xl hover:bg-muted p-1 rounded"
            >
              {document.icon}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-1 bg-popover border rounded-md shadow-lg p-2 z-50 grid grid-cols-6 gap-1">
                {EMOJI_OPTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleIconChange(emoji)}
                    className="text-xl p-1 hover:bg-muted rounded"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Sem título"
            className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto"
          />

          {/* Saving indicator */}
          {isSaving && (
            <span className="text-xs text-muted-foreground">Salvando...</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
            className="h-8 w-8"
          >
            {document.is_favorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShareOpen(true)}
            className="h-8 w-8"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4 mr-2" />
                Compartilhar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-4">
          {blocks.map((block, index) => (
            <div 
              key={block.id} 
              className="group flex items-start gap-1 py-1 relative"
            >
              {/* Block controls */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity absolute -left-16 top-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => addBlockAfter(block.id)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 cursor-grab"
                >
                  <GripVertical className="h-3 w-3" />
                </Button>
              </div>

              {/* Block content */}
              <div className="flex items-start flex-1">
                {getBlockPrefix(block, index)}
                
                {block.type === 'divider' ? (
                  <hr className="w-full border-t border-border my-2" />
                ) : (
                  <div
                    ref={(el) => { blockRefs.current[block.id] = el; }}
                    contentEditable
                    suppressContentEditableWarning
                    className={cn(
                      "flex-1 outline-none min-h-[24px] leading-relaxed",
                      getBlockStyles(block.type),
                      block.type === 'todo' && block.checked && "line-through text-muted-foreground"
                    )}
                    onInput={(e) => handleInput(block.id, e)}
                    onKeyDown={(e) => handleKeyDown(e, block)}
                    onFocus={() => setActiveBlockId(block.id)}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                    data-placeholder={index === 0 && block.content === '' ? "Digite '/' para ver comandos..." : ''}
                  />
                )}
              </div>
            </div>
          ))}
          
          {/* Click area to add new block */}
          <div 
            className="min-h-[200px] cursor-text"
            onClick={() => {
              const lastBlock = blocks[blocks.length - 1];
              if (lastBlock.content !== '') {
                addBlockAfter(lastBlock.id);
              } else {
                blockRefs.current[lastBlock.id]?.focus();
              }
            }}
          />
        </div>
      </div>

      {/* Slash Command Menu */}
      <SlashCommandMenu
        open={slashMenuOpen}
        onClose={() => setSlashMenuOpen(false)}
        onSelect={handleSlashCommand}
        position={slashMenuPosition}
        filter={slashFilter}
      />

      {/* Share Dialog */}
      <WorkspaceShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        resourceType="document"
        resourceId={document.id}
        resourceName={document.title}
      />

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: var(--muted-foreground);
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}