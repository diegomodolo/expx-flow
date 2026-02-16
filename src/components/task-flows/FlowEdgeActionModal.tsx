import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Copy, Ghost, UserRound, Tag, CircleDot, Settings2 } from "lucide-react";
import { useState, useEffect } from "react";

export type FlowActionType = "move" | "copy" | "ghost";

export interface FlowEdgePropertyChanges {
  changeStatus?: boolean;
  newStatus?: string;
  changeResponsible?: boolean;
  newResponsibleUserId?: string;
  newResponsibleName?: string;
  changeClassificacao?: boolean;
  newClassificacaoId?: string;
  newClassificacaoName?: string;
}

export interface FlowEdgeData {
  actionType: FlowActionType;
  propertyChanges?: FlowEdgePropertyChanges;
}

interface Employee {
  user_id: string;
  name: string;
}

interface Classificacao {
  id: string;
  nome: string;
}

interface FlowEdgeActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (actionType: FlowActionType, propertyChanges?: FlowEdgePropertyChanges) => void;
  sourceName?: string;
  targetName?: string;
  defaultActionType?: FlowActionType;
  defaultPropertyChanges?: FlowEdgePropertyChanges;
  employees?: Employee[];
  classificacoes?: Classificacao[];
}

const actionOptions: { value: FlowActionType; label: string; description: string; icon: typeof ArrowRight }[] = [
  {
    value: "move",
    label: "Mover Tarefa",
    description: "A tarefa será movida para o quadro destino.",
    icon: ArrowRight,
  },
  {
    value: "copy",
    label: "Criar Cópia",
    description: "Uma cópia vinculada será criada no quadro destino.",
    icon: Copy,
  },
  {
    value: "ghost",
    label: "Fantasma",
    description: "A tarefa será movida, mas um indicador fantasma permanece no quadro original.",
    icon: Ghost,
  },
];

const statusOptions = [
  { value: "todo", label: "A Fazer" },
  { value: "progress", label: "Em Andamento" },
  { value: "review", label: "Em Revisão" },
  { value: "done", label: "Concluído" },
  { value: "waiting_approval", label: "Aguardando Aprovação" },
  { value: "blocked", label: "Bloqueado" },
  { value: "paused", label: "Pausado" },
  { value: "cancelled", label: "Cancelado" },
];

export function FlowEdgeActionModal({
  isOpen,
  onClose,
  onConfirm,
  sourceName,
  targetName,
  defaultActionType,
  defaultPropertyChanges,
  employees = [],
  classificacoes = [],
}: FlowEdgeActionModalProps) {
  const [selected, setSelected] = useState<FlowActionType>(defaultActionType || "move");
  const [changeStatus, setChangeStatus] = useState(false);
  const [newStatus, setNewStatus] = useState("todo");
  const [changeResponsible, setChangeResponsible] = useState(false);
  const [newResponsibleUserId, setNewResponsibleUserId] = useState("");
  const [changeClassificacao, setChangeClassificacao] = useState(false);
  const [newClassificacaoId, setNewClassificacaoId] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSelected(defaultActionType || "move");
      setChangeStatus(defaultPropertyChanges?.changeStatus || false);
      setNewStatus(defaultPropertyChanges?.newStatus || "todo");
      setChangeResponsible(defaultPropertyChanges?.changeResponsible || false);
      setNewResponsibleUserId(defaultPropertyChanges?.newResponsibleUserId || "");
      setChangeClassificacao(defaultPropertyChanges?.changeClassificacao || false);
      setNewClassificacaoId(defaultPropertyChanges?.newClassificacaoId || "");
    }
  }, [isOpen, defaultActionType, defaultPropertyChanges]);

  const handleConfirm = () => {
    const propertyChanges: FlowEdgePropertyChanges = {};
    if (changeStatus) {
      propertyChanges.changeStatus = true;
      propertyChanges.newStatus = newStatus;
    }
    if (changeResponsible && newResponsibleUserId) {
      propertyChanges.changeResponsible = true;
      propertyChanges.newResponsibleUserId = newResponsibleUserId;
      propertyChanges.newResponsibleName = employees.find(e => e.user_id === newResponsibleUserId)?.name || "";
    }
    if (changeClassificacao && newClassificacaoId) {
      propertyChanges.changeClassificacao = true;
      propertyChanges.newClassificacaoId = newClassificacaoId;
      propertyChanges.newClassificacaoName = classificacoes.find(c => c.id === newClassificacaoId)?.nome || "";
    }

    const hasChanges = Object.keys(propertyChanges).length > 0;
    onConfirm(selected, hasChanges ? propertyChanges : undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar Ação do Fluxo</DialogTitle>
          {sourceName && targetName && (
            <p className="text-sm text-muted-foreground mt-1">
              De <strong>{sourceName}</strong> para <strong>{targetName}</strong>
            </p>
          )}
        </DialogHeader>

        {/* Action Type */}
        <div>
          <p className="text-sm font-medium mb-2">Tipo de Ação</p>
          <RadioGroup value={selected} onValueChange={(v) => setSelected(v as FlowActionType)} className="space-y-2">
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
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </label>
              );
            })}
          </RadioGroup>
        </div>

        <Separator />

        {/* Property Changes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Alterações de Propriedades</p>
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Configure alterações automáticas nas propriedades da tarefa ao executar esta ação.
          </p>

          <div className="space-y-4">
            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Alterar Status</Label>
                </div>
                <Switch checked={changeStatus} onCheckedChange={setChangeStatus} />
              </div>
              {changeStatus && (
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Responsible */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Alterar Responsável</Label>
                </div>
                <Switch checked={changeResponsible} onCheckedChange={setChangeResponsible} />
              </div>
              {changeResponsible && (
                <Select value={newResponsibleUserId} onValueChange={setNewResponsibleUserId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.user_id} value={emp.user_id}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Classificação */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Alterar Classificação</Label>
                </div>
                <Switch checked={changeClassificacao} onCheckedChange={setChangeClassificacao} />
              </div>
              {changeClassificacao && (
                <Select value={newClassificacaoId} onValueChange={setNewClassificacaoId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a classificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {classificacoes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleConfirm}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
