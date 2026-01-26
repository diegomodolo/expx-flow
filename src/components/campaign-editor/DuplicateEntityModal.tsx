import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface DuplicateEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: {
    id: string;
    name: string;
    type: "campaign" | "adset" | "ad";
  };
  onDuplicate: (newName: string) => Promise<void>;
  loading: boolean;
}

export function DuplicateEntityModal({
  isOpen,
  onClose,
  entity,
  onDuplicate,
  loading,
}: DuplicateEntityModalProps) {
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNewName(`${entity.name} - Cópia`);
    }
  }, [isOpen, entity.name]);

  const getTitle = () => {
    switch (entity.type) {
      case "campaign":
        return "Duplicar Campanha";
      case "adset":
        return "Duplicar Conjunto de Anúncios";
      case "ad":
        return "Duplicar Criativo";
      default:
        return "Duplicar";
    }
  };

  const getDescription = () => {
    switch (entity.type) {
      case "campaign":
        return "Será criada uma cópia completa da campanha com todos os conjuntos de anúncios e criativos.";
      case "adset":
        return "Será criado um novo conjunto de anúncios com as mesmas configurações e criativos.";
      case "ad":
        return "Será criado um novo criativo com as mesmas configurações no mesmo conjunto de anúncios.";
      default:
        return "Será criada uma cópia deste item.";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await onDuplicate(newName.trim());
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getTitle()}</DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newName">Nome da cópia</Label>
              <Input
                id="newName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Digite o nome da cópia"
                disabled={loading}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !newName.trim()}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Duplicando...
                </>
              ) : (
                "Duplicar"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
