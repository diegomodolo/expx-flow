import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Workflow, Clock } from "lucide-react";
import { CRMStage } from "@/hooks/useCRMDeals";
import { EVENT_PRESETS } from "@/lib/offlineEventPresets";
import { useCRMBoards } from "@/hooks/useCRMBoards";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EditStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: CRMStage | null;
  onSave: (stageId: string, updates: Partial<CRMStage>) => Promise<void>;
  workspaceId: string;
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

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "qualified", label: "Qualificado" },
  { value: "unqualified", label: "Não Qualificado" },
  { value: "won", label: "Ganho" },
  { value: "lost", label: "Perdido" },
];

export function EditStageModal({ isOpen, onClose, stage, onSave, workspaceId }: EditStageModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [eventMapping, setEventMapping] = useState<string | null>(null);
  const [autoStatusChange, setAutoStatusChange] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [workflowEnabled, setWorkflowEnabled] = useState(false);
  const [workflowTargetBoardId, setWorkflowTargetBoardId] = useState<string | null>(null);
  const [workflowTargetStageId, setWorkflowTargetStageId] = useState<string | null>(null);
  const [targetBoardStages, setTargetBoardStages] = useState<CRMStage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [autoTemperatureChange, setAutoTemperatureChange] = useState(false);
  const [targetTemperature, setTargetTemperature] = useState<string | null>(null);
  const [maxDays, setMaxDays] = useState<string>("");

  const { boards } = useCRMBoards({ workspaceId });

  useEffect(() => {
    if (stage) {
      setName(stage.name);
      setColor(stage.color);
      setEventMapping(stage.event_mapping || null);
      setAutoStatusChange(stage.auto_status_change || false);
      setTargetStatus(stage.target_status || null);
      setWorkflowEnabled(stage.workflow_enabled || false);
      setWorkflowTargetBoardId(stage.workflow_target_board_id || null);
      setWorkflowTargetStageId(stage.workflow_target_stage_id || null);
      setAutoTemperatureChange(stage.auto_temperature_change || false);
      setTargetTemperature(stage.target_temperature || null);
      setMaxDays(stage.max_days?.toString() || "");
    }
  }, [stage]);

  // Buscar stages do board selecionado
  useEffect(() => {
    if (workflowTargetBoardId) {
      supabase
        .from('crm_stages')
        .select('*')
        .eq('board_id', workflowTargetBoardId)
        .order('order_index')
        .then(({ data }) => {
          if (data) setTargetBoardStages(data as CRMStage[]);
        });
    } else {
      setTargetBoardStages([]);
      setWorkflowTargetStageId(null);
    }
  }, [workflowTargetBoardId]);

  const handleSave = async () => {
    if (!stage || !name.trim()) return;

    // Validar workflow
    if (workflowEnabled) {
      if (!workflowTargetBoardId || !workflowTargetStageId) {
        toast({
          title: "Configuração incompleta",
          description: "Selecione o quadro e a coluna de destino para o workflow",
          variant: "destructive",
        });
        return;
      }

      if (workflowTargetBoardId === stage.board_id) {
        toast({
          title: "Configuração inválida",
          description: "O workflow não pode apontar para o mesmo quadro",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const parsedMaxDays = maxDays ? parseInt(maxDays, 10) : null;
      await onSave(stage.id, {
        name: name.trim(),
        color,
        event_mapping: eventMapping,
        auto_status_change: autoStatusChange,
        target_status: autoStatusChange ? targetStatus : null,
        auto_temperature_change: autoTemperatureChange,
        target_temperature: autoTemperatureChange ? targetTemperature : null,
        workflow_enabled: workflowEnabled,
        workflow_target_board_id: workflowEnabled ? workflowTargetBoardId : null,
        workflow_target_stage_id: workflowEnabled ? workflowTargetStageId : null,
        max_days: parsedMaxDays && parsedMaxDays > 0 ? parsedMaxDays : null,
      });
      onClose();
    } catch (error) {
      console.error("Error saving stage:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const eventOptions = Object.values(EVENT_PRESETS);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Coluna</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome da Coluna */}
          <div className="space-y-2">
            <Label htmlFor="stage-name">Nome da Coluna</Label>
            <Input
              id="stage-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Lead Qualificado"
            />
          </div>

          {/* Cor da Coluna */}
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

          {/* SLA - Dias na Etapa */}
          <div className="space-y-2">
            <Label htmlFor="max-days" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Dias Máximos na Etapa (SLA)
            </Label>
            <Input
              id="max-days"
              type="number"
              min="1"
              value={maxDays}
              onChange={(e) => setMaxDays(e.target.value)}
              placeholder="Ex: 7"
            />
            <p className="text-xs text-muted-foreground">
              Se configurado, um alerta será exibido quando o negócio exceder esse tempo na etapa
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-mapping">Evento Disparado ao Entrar (Opcional)</Label>
            <Select
              value={eventMapping || "none"}
              onValueChange={(value) => setEventMapping(value === "none" ? null : value)}
            >
              <SelectTrigger id="event-mapping">
                <SelectValue placeholder="Selecione um evento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum evento</SelectItem>
                {eventOptions.map((event) => (
                  <SelectItem key={event.name} value={event.name}>
                    {event.displayName} - {event.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Auto-mudança de Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-status">Alterar Status do Lead Automaticamente</Label>
                <p className="text-sm text-muted-foreground">
                  O status do lead será atualizado ao entrar nesta coluna
                </p>
              </div>
              <Switch
                id="auto-status"
                checked={autoStatusChange}
                onCheckedChange={setAutoStatusChange}
              />
            </div>

            {autoStatusChange && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label htmlFor="target-status">Status para o Lead</Label>
                <Select
                  value={targetStatus || "open"}
                  onValueChange={setTargetStatus}
                >
                  <SelectTrigger id="target-status">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Auto-mudança de Temperatura */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-temperature">Alterar Temperatura do Lead Automaticamente</Label>
                <p className="text-sm text-muted-foreground">
                  A temperatura do lead será atualizada ao entrar nesta coluna
                </p>
              </div>
              <Switch
                id="auto-temperature"
                checked={autoTemperatureChange}
                onCheckedChange={setAutoTemperatureChange}
              />
            </div>

            {autoTemperatureChange && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label htmlFor="target-temperature">Temperatura para o Lead</Label>
                <Select
                  value={targetTemperature || "quente"}
                  onValueChange={(value) => setTargetTemperature(value as 'quente' | 'morno' | 'frio')}
                >
                  <SelectTrigger id="target-temperature">
                    <SelectValue placeholder="Selecione uma temperatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quente">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        Quente 🔥
                      </div>
                    </SelectItem>
                    <SelectItem value="morno">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        Morno 🌡️
                      </div>
                    </SelectItem>
                    <SelectItem value="frio">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500" />
                        Frio ❄️
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Workflow de Duplicação */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="workflow-enabled" className="text-base font-semibold flex items-center gap-2">
                  <Workflow className="w-4 h-4" />
                  Fluxo de Duplicação
                </Label>
                <p className="text-sm text-muted-foreground">
                  Ao chegar nesta coluna, criar cópia do lead em outro quadro
                </p>
              </div>
              <Switch
                id="workflow-enabled"
                checked={workflowEnabled}
                onCheckedChange={setWorkflowEnabled}
              />
            </div>

            {workflowEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-purple-500">
                {/* Seletor de Quadro Destino */}
                <div className="space-y-2">
                  <Label htmlFor="target-board">Quadro de Destino</Label>
                  <Select
                    value={workflowTargetBoardId || ""}
                    onValueChange={setWorkflowTargetBoardId}
                  >
                    <SelectTrigger id="target-board">
                      <SelectValue placeholder="Selecione o quadro" />
                    </SelectTrigger>
                    <SelectContent>
                      {boards
                        .filter(b => b.id !== stage?.board_id)
                        .map((board) => (
                          <SelectItem key={board.id} value={board.id}>
                            {board.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Seletor de Coluna Destino */}
                {workflowTargetBoardId && (
                  <div className="space-y-2">
                    <Label htmlFor="target-stage">Coluna de Destino</Label>
                    <Select
                      value={workflowTargetStageId || ""}
                      onValueChange={setWorkflowTargetStageId}
                    >
                      <SelectTrigger id="target-stage">
                        <SelectValue placeholder="Selecione a coluna" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetBoardStages.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Aviso */}
                <Alert className="border-purple-500 bg-purple-500/10">
                  <Workflow className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-900 dark:text-purple-100">
                    <strong>Automação ativa:</strong> Quando um lead entrar nesta coluna,
                    uma cópia será criada automaticamente no destino configurado. Os leads
                    ficarão vinculados.
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </div>

          {/* Aviso sobre Automação de Evento */}
          {eventMapping && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Automação ativa:</strong> Este evento será enviado automaticamente
                para o Facebook quando um lead entrar nesta coluna.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
