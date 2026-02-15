import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Crown, Shield, Wrench, Trash2 } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { SquadAgentNodeData } from "./SquadAgentNode";

interface SquadNodeEditPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<SquadAgentNodeData>) => void;
  onDelete: (id: string) => void;
}

export function SquadNodeEditPanel({ node, isOpen, onClose, onSave, onDelete }: SquadNodeEditPanelProps) {
  const [role, setRole] = useState<string>("executor");
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (node) {
      const d = node.data as SquadAgentNodeData;
      setRole(d.role || "executor");
      setInstructions(d.squad_instructions || "");
    }
  }, [node]);

  if (!node) return null;
  const nodeData = node.data as SquadAgentNodeData;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurar Agente</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div>
            <Label className="text-muted-foreground text-xs">Agente</Label>
            <p className="font-medium">{nodeData.label}</p>
            {nodeData.description && (
              <p className="text-sm text-muted-foreground">{nodeData.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Papel na Squad</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span>Líder</span>
                  </div>
                </SelectItem>
                <SelectItem value="manager">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    <span>Gerente</span>
                  </div>
                </SelectItem>
                <SelectItem value="executor">
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-green-500" />
                    <span>Executor</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Instruções para esta Squad</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Instruções específicas para o comportamento deste agente dentro da squad..."
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Estas instruções serão adicionadas ao prompt do agente quando executado pela squad.
            </p>
          </div>
        </div>

        <SheetFooter className="flex justify-between">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onDelete(node.id);
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Remover
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onSave(node.id, {
                  role: role as any,
                  squad_instructions: instructions,
                });
                onClose();
              }}
            >
              Salvar
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
