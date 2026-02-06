import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceFolders } from "@/hooks/useWorkspaceFolders";
import type { WorkspaceFolder } from "@/types/workspace";

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📚', '📖', '🎯', '💼', '🏠', '🔒', '⭐', '🚀', '💡'];

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingFolder?: WorkspaceFolder | null;
  parentId?: string | null;
}

export function CreateFolderDialog({ 
  open, 
  onOpenChange, 
  editingFolder,
  parentId 
}: CreateFolderDialogProps) {
  const { createFolder, updateFolder } = useWorkspaceFolders();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');

  useEffect(() => {
    if (editingFolder) {
      setName(editingFolder.name);
      setIcon(editingFolder.icon);
    } else {
      setName('');
      setIcon('📁');
    }
  }, [editingFolder, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    if (editingFolder) {
      await updateFolder.mutateAsync({
        id: editingFolder.id,
        name: name.trim(),
        icon,
      });
    } else {
      await createFolder.mutateAsync({
        name: name.trim(),
        icon,
        parentId,
      });
    }

    onOpenChange(false);
    setName('');
    setIcon('📁');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingFolder ? 'Renomear pasta' : 'Nova pasta'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {FOLDER_ICONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`p-2 text-xl rounded-md transition-colors ${
                      icon === emoji 
                        ? 'bg-primary/20 ring-2 ring-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="folder-name">Nome da pasta</Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome da pasta"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createFolder.isPending || updateFolder.isPending}
            >
              {editingFolder ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
