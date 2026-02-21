import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Youtube } from "lucide-react";
import { YouTubeChannel } from "@/hooks/useYouTubeChannels";
import { Label } from "@/components/ui/label";

interface YouTubeRefreshConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channels: YouTubeChannel[];
  onConfirm: (selectedChannelIds: string[], periodDays: number) => void;
}

const PERIOD_OPTIONS = [
  { value: "7", label: "Últimos 7 dias" },
  { value: "15", label: "Últimos 15 dias" },
  { value: "30", label: "Últimos 30 dias" },
  { value: "60", label: "Últimos 60 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export function YouTubeRefreshConfigModal({
  open,
  onOpenChange,
  channels,
  onConfirm,
}: YouTubeRefreshConfigModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(channels.map((c) => c.id));
  const [periodDays, setPeriodDays] = useState("30");

  const allSelected = selectedIds.length === channels.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : channels.map((c) => c.id));
  };

  const toggleChannel = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Reset selections when modal opens
  const handleOpenChange = (val: boolean) => {
    if (val) {
      setSelectedIds(channels.map((c) => c.id));
      setPeriodDays("30");
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-destructive" />
            Configurar Análise
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Period selector */}
          <div className="space-y-2">
            <Label>Período de análise</Label>
            <Select value={periodDays} onValueChange={setPeriodDays}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Channel selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Canais para sincronizar</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll} className="h-auto py-1 px-2 text-xs">
                {allSelected ? "Desmarcar todos" : "Marcar todos"}
              </Button>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {channels.map((ch) => (
                <label
                  key={ch.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.includes(ch.id)}
                    onCheckedChange={() => toggleChannel(ch.id)}
                  />
                  {ch.thumbnail_url && (
                    <img
                      src={ch.thumbnail_url}
                      alt=""
                      className="h-6 w-6 rounded-full shrink-0"
                    />
                  )}
                  <span className="text-sm font-medium truncate">{ch.channel_name}</span>
                </label>
              ))}
            </div>

            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedIds.length} de {channels.length} canais selecionados
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onConfirm(selectedIds, parseInt(periodDays, 10));
              onOpenChange(false);
            }}
            disabled={selectedIds.length === 0}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
