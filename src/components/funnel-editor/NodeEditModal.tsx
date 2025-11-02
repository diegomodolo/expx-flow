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
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { CustomNodeData } from "./CustomNode";

interface NodeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: Node | null;
  onSave: (id: string, label: string, description: string) => void;
}

export function NodeEditModal({ isOpen, onClose, node, onSave }: NodeEditModalProps) {
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (node) {
      const nodeData = node.data as CustomNodeData;
      setLabel(nodeData.label || "");
      setDescription(nodeData.description || "");
    }
  }, [node]);

  const handleSave = () => {
    if (node && label.trim()) {
      onSave(node.id, label, description);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Bloco</DialogTitle>
          <DialogDescription>
            Personalize o nome e a descrição deste bloco no funil.
          </DialogDescription>
        </DialogHeader>

        {node?.type === "group" && (
          <div className="mb-2 p-3 bg-primary/10 border border-primary/20 rounded-md">
            <div className="flex items-center gap-2 text-primary">
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">
                Editando Container/Grupo
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="label">Nome do Bloco</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Digite o nome do bloco"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione uma descrição para este bloco"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!label.trim()}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
