import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { CRMStage } from "@/hooks/useCRMDeals";

export interface LeadFilters {
  status?: string;
  temperature?: string;
  stageId?: string;
  minValue?: number;
  maxValue?: number;
  dateFrom?: string;
  dateTo?: string;
}

interface LeadFiltersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  stages: CRMStage[];
  filters: LeadFilters;
  onApplyFilters: (filters: LeadFilters) => void;
}

export function LeadFiltersDialog({
  isOpen,
  onClose,
  stages,
  filters,
  onApplyFilters,
}: LeadFiltersDialogProps) {
  const [localFilters, setLocalFilters] = useState<LeadFilters>(filters);

  const handleApply = () => {
    onApplyFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters: LeadFilters = {};
    setLocalFilters(emptyFilters);
    onApplyFilters(emptyFilters);
  };

  const activeFilterCount = Object.values(localFilters).filter(v => v !== undefined && v !== '').length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Filtrar Leads</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary">{activeFilterCount} filtros ativos</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={localFilters.status} 
              onValueChange={(value) => setLocalFilters({ ...localFilters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Aberto</SelectItem>
                <SelectItem value="qualified">Qualificado</SelectItem>
                <SelectItem value="unqualified">Não Qualificado</SelectItem>
                <SelectItem value="won">Ganho</SelectItem>
                <SelectItem value="lost">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Temperatura</Label>
            <Select 
              value={localFilters.temperature} 
              onValueChange={(value) => setLocalFilters({ ...localFilters, temperature: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as temperaturas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cold">Frio</SelectItem>
                <SelectItem value="warm">Morno</SelectItem>
                <SelectItem value="hot">Quente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Coluna</Label>
            <Select 
              value={localFilters.stageId} 
              onValueChange={(value) => setLocalFilters({ ...localFilters, stageId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as colunas" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Valor Mínimo (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={localFilters.minValue || ''}
              onChange={(e) => setLocalFilters({ 
                ...localFilters, 
                minValue: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
            />
          </div>

          <div className="space-y-2">
            <Label>Valor Máximo (R$)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={localFilters.maxValue || ''}
              onChange={(e) => setLocalFilters({ 
                ...localFilters, 
                maxValue: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Criação (De)</Label>
            <Input
              type="date"
              value={localFilters.dateFrom || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, dateFrom: e.target.value || undefined })}
            />
          </div>

          <div className="space-y-2">
            <Label>Data Criação (Até)</Label>
            <Input
              type="date"
              value={localFilters.dateTo || ''}
              onChange={(e) => setLocalFilters({ ...localFilters, dateTo: e.target.value || undefined })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClear}>
            <X className="w-4 h-4 mr-2" />
            Limpar Filtros
          </Button>
          <Button onClick={handleApply}>
            Aplicar Filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
