import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateStageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, color?: string) => Promise<void>;
}

const COLOR_PALETTE = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Roxo", value: "#a855f7" },
  { name: "Amarelo", value: "#eab308" },
  { name: "Vermelho", value: "#ef4444" },
  { name: "Laranja", value: "#f97316" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Índigo", value: "#6366f1" },
];

export function CreateStageDialog({ isOpen, onClose, onCreate }: CreateStageDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate(name.trim(), color);
      setName("");
      setColor("#3b82f6");
      onClose();
    } catch (error) {
      console.error("Error creating stage:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setName("");
    setColor("#3b82f6");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Coluna</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome da Coluna</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lead Novo"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Cor da Coluna</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_PALETTE.map((colorOption) => (
                <button
                  key={colorOption.value}
                  type="button"
                  onClick={() => setColor(colorOption.value)}
                  className="w-10 h-10 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: colorOption.value,
                    borderColor: color === colorOption.value ? "#000" : "transparent",
                  }}
                  title={colorOption.name}
                />
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Você poderá configurar eventos e automações após criar a coluna.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? "Criando..." : "Criar Coluna"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
