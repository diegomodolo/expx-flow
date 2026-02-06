import { useEffect, useState, useCallback } from "react";
import { Star, StarOff, Share2, MoreHorizontal, Bold, Italic, List, ListOrdered, Heading1, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";

interface WorkspaceEditorProps {
  document: WorkspaceDocument | null;
}

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📌', '💡', '🎯', '🚀', '✨', '📊', '📈', '🔖', '📂'];

export function WorkspaceEditor({ document }: WorkspaceEditorProps) {
  const { updateDocument, toggleFavorite } = useWorkspaceDocuments();
  const [title, setTitle] = useState(document?.title || '');
  const [content, setContent] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Update content when document changes
  useEffect(() => {
    if (document) {
      setTitle(document.title);
      // Handle content - it could be string or BlockNote format
      if (typeof document.content === 'string') {
        setContent(document.content);
      } else if (Array.isArray(document.content)) {
        // Convert BlockNote format to plain text
        const textContent = document.content
          .map((block: any) => {
            if (block.content && Array.isArray(block.content)) {
              return block.content.map((c: any) => c.text || '').join('');
            }
            return '';
          })
          .join('\n');
        setContent(textContent);
      } else {
        setContent('');
      }
    }
  }, [document?.id]);

  // Debounced save for content changes
  const saveContent = useCallback(async (newContent: string) => {
    if (!document) return;
    setIsSaving(true);
    try {
      await updateDocument.mutateAsync({ id: document.id, content: newContent });
    } finally {
      setIsSaving(false);
    }
  }, [document, updateDocument]);

  // Debounce content save
  useEffect(() => {
    if (!document) return;
    const timer = setTimeout(() => {
      if (content !== document.content) {
        saveContent(content);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [content, document, saveContent]);

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

  // Text formatting helpers
  const insertText = (before: string, after: string = '') => {
    const textarea = window.document.getElementById('editor-content') as HTMLTextAreaElement;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, end + before.length);
    }, 0);
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

      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center gap-1">
        <Toggle size="sm" onClick={() => insertText('**', '**')} aria-label="Negrito">
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => insertText('*', '*')} aria-label="Itálico">
          <Italic className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Toggle size="sm" onClick={() => insertText('# ')} aria-label="Título 1">
          <Heading1 className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => insertText('## ')} aria-label="Título 2">
          <Heading2 className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Toggle size="sm" onClick={() => insertText('- ')} aria-label="Lista">
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onClick={() => insertText('1. ')} aria-label="Lista numerada">
          <ListOrdered className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto py-8 px-4 h-full">
          <Textarea
            id="editor-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Comece a escrever..."
            className="min-h-full w-full border-none shadow-none focus-visible:ring-0 resize-none text-base leading-relaxed"
            style={{ minHeight: 'calc(100vh - 300px)' }}
          />
        </div>
      </div>

      {/* Share Dialog */}
      <WorkspaceShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        resourceType="document"
        resourceId={document.id}
        resourceName={document.title}
      />
    </div>
  );
}