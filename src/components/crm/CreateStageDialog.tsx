import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { EVENT_PRESETS } from "@/lib/offlineEventPresets";

interface CreateStageDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (stageData: {
    name: string;
    color: string;
    event_mapping: string | null;
    auto_status_change: boolean;
    target_status: string | null;
    auto_temperature_change?: boolean;
    target_temperature?: 'quente' | 'morno' | 'frio' | null;
  }) => Promise<void>;
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

export function CreateStageDialog({ isOpen, onClose, onCreate }: CreateStageDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [eventMapping, setEventMapping] = useState<string | null>(null);
  const [autoStatusChange, setAutoStatusChange] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string | null>(null);
  const [autoTemperatureChange, setAutoTemperatureChange] = useState(false);
  const [targetTemperature, setTargetTemperature] = useState<'quente' | 'morno' | 'frio' | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate({
        name: name.trim(),
        color,
        event_mapping: eventMapping,
        auto_status_change: autoStatusChange,
        target_status: autoStatusChange ? targetStatus : null,
        auto_temperature_change: autoTemperatureChange,
        target_temperature: autoTemperatureChange ? targetTemperature : null,
      });
      setName("");
      setColor("#3b82f6");
      setEventMapping(null);
      setAutoStatusChange(false);
      setTargetStatus(null);
      setAutoTemperatureChange(false);
      setTargetTemperature(null);
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
    setEventMapping(null);
    setAutoStatusChange(false);
    setTargetStatus(null);
    setAutoTemperatureChange(false);
    setTargetTemperature(null);
    onClose();
  };

  const eventOptions = Object.values(EVENT_PRESETS);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Coluna</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Nome da Coluna */}
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

          {/* Evento Disparado */}
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

          {/* Aviso sobre Automação */}
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
