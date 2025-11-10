import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { CRMBoard } from "@/hooks/useCRMBoards";

interface EditBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  board: CRMBoard | null;
  onUpdate: (boardId: string, updates: { name?: string; description?: string | null }) => Promise<void>;
  onDelete: (boardId: string) => Promise<void>;
  isUpdating: boolean;
  isDeleting: boolean;
}

export function EditBoardDialog({
  isOpen,
  onClose,
  board,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
}: EditBoardDialogProps) {
  const [name, setName] = useState(board?.name || "");
  const [description, setDescription] = useState(board?.description || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    if (!board || !name.trim()) return;
    
    await onUpdate(board.id, {
      name: name.trim(),
      description: description.trim() || null,
    });
    
    onClose();
  };

  const handleDelete = async () => {
    if (!board) return;
    
    try {
      await onDelete(board.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      setShowDeleteConfirm(false);
    }
  };

  if (!board) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Configurações do Quadro
              {board.is_default && (
                <Badge variant="secondary">Padrão</Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="board-name">Nome do Quadro *</Label>
              <Input
                id="board-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pipeline de Vendas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board-description">Descrição</Label>
              <Textarea
                id="board-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o propósito deste quadro..."
                rows={3}
              />
            </div>

            {!board.is_default && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deletando..." : "Deletar Quadro"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Esta ação não pode ser desfeita. Todos os leads serão movidos para o quadro padrão.
                </p>
              </div>
            )}

            {board.is_default && (
              <p className="text-sm text-muted-foreground text-center pt-4 border-t border-border">
                O quadro padrão não pode ser deletado
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!name.trim() || isUpdating}
            >
              {isUpdating ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O quadro "{board.name}" será deletado permanentemente 
              e todos os leads serão movidos para o quadro padrão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Deletar Quadro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
