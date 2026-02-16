import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, Copy, Ghost } from "lucide-react";
import { useState } from "react";

export type FlowActionType = "move" | "copy" | "ghost";

interface FlowEdgeActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actionType: FlowActionType) => void;
  sourceName?: string;
  targetName?: string;
}

const actionOptions: { value: FlowActionType; label: string; description: string; icon: typeof ArrowRight }[] = [
  {
    value: "move",
    label: "Mover Tarefa",
    description: "A tarefa será movida para o quadro destino. Não ficará cópia no quadro original.",
    icon: ArrowRight,
  },
  {
    value: "copy",
    label: "Criar Cópia",
    description: "Uma cópia vinculada será criada no quadro destino. A tarefa original permanece no quadro de origem.",
    icon: Copy,
  },
  {
    value: "ghost",
    label: "Fantasma",
    description: "A tarefa será movida, mas um indicador fantasma permanece no quadro original. Quando retornar, o fantasma desaparece.",
    icon: Ghost,
  },
];

export function FlowEdgeActionModal({ isOpen, onClose, onConfirm, sourceName, targetName }: FlowEdgeActionModalProps) {
  const [selected, setSelected] = useState<FlowActionType>("move");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipo de Ação do Fluxo</DialogTitle>
          {sourceName && targetName && (
            <p className="text-sm text-muted-foreground mt-1">
              De <strong>{sourceName}</strong> para <strong>{targetName}</strong>
            </p>
          )}
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={(v) => setSelected(v as FlowActionType)} className="space-y-3 mt-2">
          {actionOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected === opt.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={opt.value} className="mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{opt.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </div>
              </label>
            );
          })}
        </RadioGroup>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { onConfirm(selected); onClose(); }}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
