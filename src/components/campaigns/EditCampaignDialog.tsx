import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Campaign } from "@/hooks/useCampaigns";
import { useToast } from "@/hooks/use-toast";

interface EditCampaignDialogProps {
  campaign: Campaign | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Campaign>) => Promise<void>;
}

export function EditCampaignDialog({ campaign, isOpen, onClose, onSave }: EditCampaignDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    platforms: "",
    status: "active" as "active" | "paused" | "finished" | "deleted",
    period: "",
    average_ticket: 0,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name,
        platforms: campaign.platforms,
        status: campaign.status,
        period: campaign.period,
        average_ticket: campaign.average_ticket || 0,
      });
    }
  }, [campaign]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign) return;

    setLoading(true);
    try {
      await onSave(campaign.id, formData);
      toast({
        title: "Sucesso",
        description: "Campanha atualizada com sucesso!",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar campanha",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Campanha</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Campanha</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Nome da campanha"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="platforms">Plataformas</Label>
            <Input
              id="platforms"
              value={formData.platforms}
              onChange={(e) => handleChange("platforms", e.target.value)}
              placeholder="Ex: Facebook, Instagram"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="paused">Pausada</SelectItem>
                <SelectItem value="finished">Finalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Período</Label>
            <Input
              id="period"
              value={formData.period}
              onChange={(e) => handleChange("period", e.target.value)}
              placeholder="Ex: Janeiro 2024"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="average_ticket">Ticket Médio (R$)</Label>
            <Input
              id="average_ticket"
              type="number"
              step="0.01"
              min="0"
              value={formData.average_ticket}
              onChange={(e) => handleChange("average_ticket", parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
            <p className="text-sm text-muted-foreground">
              Valor médio do produto/serviço desta campanha para cálculo preciso do ROI
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}