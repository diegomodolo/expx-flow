import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Crown, Shield, Wrench, Trash2, Pencil } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { SquadAgentNodeData } from "./SquadAgentNode";
import { EditAgentModal } from "./EditAgentModal";

interface SquadNodeEditPanelProps {
  node: Node | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, data: Partial<SquadAgentNodeData>) => void;
  onDelete: (id: string) => void;
  onRefreshNode?: (nodeId: string, updates: Partial<SquadAgentNodeData>) => void;
}

export function SquadNodeEditPanel({ node, isOpen, onClose, onSave, onDelete, onRefreshNode }: SquadNodeEditPanelProps) {
  const [role, setRole] = useState<string>("executor");
  const [instructions, setInstructions] = useState("");
  const [editAgentOpen, setEditAgentOpen] = useState(false);

  const handleAgentUpdated = useCallback(async () => {
    if (!node) return;
    const nd = node.data as SquadAgentNodeData;
    const { data } = await supabase
      .from("ia_agents")
      .select("agent_name, description")
      .eq("id", nd.agent_id)
      .single();
    if (data && onRefreshNode) {
      onRefreshNode(node.id, { label: data.agent_name, description: data.description || "" });
    }
  }, [node, onRefreshNode]);

  useEffect(() => {
    if (node) {
      const d = node.data as SquadAgentNodeData;
      setRole(d.role || "executor");
      setInstructions(d.squad_instructions || "");
    }
  }, [node]);

  const nodeData = node ? (node.data as SquadAgentNodeData) : null;

  if (!node || !nodeData) return null;

  return (
    <>
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Configurar Agente</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground text-xs">Agente</Label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setEditAgentOpen(true)}
              >
                <Pencil className="h-3 w-3 mr-1" />
                Editar Agente
              </Button>
            </div>
            <p className="font-medium mt-1">{nodeData.label}</p>
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

    <EditAgentModal
      open={editAgentOpen}
      onOpenChange={setEditAgentOpen}
      agentId={nodeData.agent_id}
      onAgentUpdated={handleAgentUpdated}
    />
    </>
  );
}
