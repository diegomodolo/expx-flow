import { useEffect, useState, useCallback } from "react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { Star, StarOff, Share2, MoreHorizontal } from "lucide-react";
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

interface WorkspaceEditorProps {
  document: WorkspaceDocument | null;
}

const EMOJI_OPTIONS = ['📄', '📝', '📋', '📌', '💡', '🎯', '🚀', '✨', '📊', '📈', '🔖', '📂'];

export function WorkspaceEditor({ document }: WorkspaceEditorProps) {
  const { updateDocument, toggleFavorite } = useWorkspaceDocuments();
  const [title, setTitle] = useState(document?.title || '');
  const [shareOpen, setShareOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Create editor with initial content
  const editor = useCreateBlockNote({
    initialContent: document?.content?.length > 0 ? document.content : undefined,
  });

  // Update editor content when document changes
  useEffect(() => {
    if (document && editor) {
      setTitle(document.title);
      if (document.content && document.content.length > 0) {
        editor.replaceBlocks(editor.document, document.content);
      } else {
        editor.replaceBlocks(editor.document, []);
      }
    }
  }, [document?.id]);

  // Debounced save for content changes
  const saveContent = useCallback(async () => {
    if (!document) return;
    const content = editor.document;
    await updateDocument.mutateAsync({ id: document.id, content });
  }, [document, editor, updateDocument]);

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
        <div className="w-full h-full py-4 px-6">
          <BlockNoteView 
            editor={editor} 
            onChange={saveContent}
            theme="light"
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