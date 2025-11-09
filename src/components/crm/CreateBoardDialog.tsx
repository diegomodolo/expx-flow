import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateBoardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (boardData: { name: string; description?: string }) => Promise<void>;
}

export function CreateBoardDialog({ isOpen, onClose, onCreate }: CreateBoardDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setDescription("");
      onClose();
    } catch (error) {
      console.error("Error creating board:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Quadro</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="board-name">Nome do Quadro</Label>
            <Input
              id="board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Vendas, Pós-Venda, Suporte"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-description">Descrição (Opcional)</Label>
            <Textarea
              id="board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste quadro"
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
            <p>O quadro será criado com 4 colunas padrão:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Novo Lead</li>
              <li>Em Contato</li>
              <li>Qualificado</li>
              <li>Concluído</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? "Criando..." : "Criar Quadro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
