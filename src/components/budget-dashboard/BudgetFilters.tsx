import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Filter } from "lucide-react";
import { BudgetStatus } from "@/hooks/useBudgetAnalysis";

interface BudgetFiltersProps {
  selectedStatus: BudgetStatus | 'all';
  onStatusChange: (status: BudgetStatus | 'all') => void;
  selectedSector: string;
  onSectorChange: (sector: string) => void;
  sectors: string[];
  budgetRange: [number, number];
  onBudgetRangeChange: (range: [number, number]) => void;
}

export function BudgetFilters({
  selectedStatus,
  onStatusChange,
  selectedSector,
  onSectorChange,
  sectors,
  budgetRange,
  onBudgetRangeChange,
}: BudgetFiltersProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Status do Orçamento</Label>
          <Select value={selectedStatus} onValueChange={(value) => onStatusChange(value as BudgetStatus | 'all')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="critical">🔴 Crítico (&gt;100%)</SelectItem>
              <SelectItem value="warning">🟡 Atenção (90-100%)</SelectItem>
              <SelectItem value="healthy">🟢 Saudável (&lt;90%)</SelectItem>
              <SelectItem value="no-budget">⚪ Sem orçamento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Setor</Label>
          <Select value={selectedSector} onValueChange={onSectorChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>
                  {sector}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Faixa de Orçamento</Label>
          <div className="pt-2">
            <Slider
              min={0}
              max={50000}
              step={1000}
              value={budgetRange}
              onValueChange={(value) => onBudgetRangeChange(value as [number, number])}
              className="mb-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatCurrency(budgetRange[0])}</span>
              <span>{formatCurrency(budgetRange[1])}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
