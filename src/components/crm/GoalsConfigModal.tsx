import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Target, TrendingUp, DollarSign, CheckCircle2 } from "lucide-react";
import { useCRMWorkspaceGoals } from "@/hooks/useCRMWorkspaceGoals";

interface GoalsConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  currentMetrics: {
    totalLeads: number;
    revenue: number;
    conversionRate: number;
    closedDeals: number;
  };
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const GoalsConfigModal = ({ 
  open, 
  onOpenChange, 
  workspaceId,
  currentMetrics 
}: GoalsConfigModalProps) => {
  const { goal, isSaving, saveGoals, currentMonth, currentYear } = useCRMWorkspaceGoals(workspaceId);
  
  const [targetLeads, setTargetLeads] = useState<string>("");
  const [targetRevenue, setTargetRevenue] = useState<string>("");
  const [targetConversion, setTargetConversion] = useState<string>("");
  const [targetClosedDeals, setTargetClosedDeals] = useState<string>("");

  // Carregar valores existentes quando o modal abre
  useEffect(() => {
    if (open && goal) {
      setTargetLeads(goal.target_leads?.toString() || "");
      setTargetRevenue(goal.target_revenue?.toString() || "");
      setTargetConversion(goal.target_conversion_rate?.toString() || "");
      setTargetClosedDeals(goal.target_closed_deals?.toString() || "");
    }
  }, [open, goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    saveGoals({
      target_leads: targetLeads ? parseInt(targetLeads) : null,
      target_revenue: targetRevenue ? parseFloat(targetRevenue) : null,
      target_conversion_rate: targetConversion ? parseFloat(targetConversion) : null,
      target_closed_deals: targetClosedDeals ? parseInt(targetClosedDeals) : null
    });
    
    onOpenChange(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculateRemaining = (current: number, target: string, isPercentage = false) => {
    const targetNum = parseFloat(target);
    if (!target || isNaN(targetNum)) return null;
    
    const remaining = targetNum - current;
    if (remaining <= 0) return "Meta atingida! 🎉";
    
    if (isPercentage) {
      return `Faltam: ${remaining.toFixed(1)}%`;
    }
    
    return `Faltam: ${remaining}`;
  };

  const calculateRemainingRevenue = (current: number, target: string) => {
    const targetNum = parseFloat(target);
    if (!target || isNaN(targetNum)) return null;
    
    const remaining = targetNum - current;
    if (remaining <= 0) return "Meta atingida! 🎉";
    
    return `Faltam: ${formatCurrency(remaining)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Personalizar Metas do Mês
          </DialogTitle>
          <p className="text-muted-foreground">
            Configure suas metas para {MONTHS[currentMonth - 1]}/{currentYear}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Meta de Leads */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-primary" />
              Meta de Leads
            </Label>
            <Input
              type="number"
              min="0"
              value={targetLeads}
              onChange={(e) => setTargetLeads(e.target.value)}
              placeholder="Ex: 150"
              className="text-lg"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Atual: {currentMetrics.totalLeads} leads
              </span>
              {targetLeads && (
                <span className="text-muted-foreground">
                  {calculateRemaining(currentMetrics.totalLeads, targetLeads)}
                </span>
              )}
            </div>
          </div>

          {/* Meta de Receita */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base">
              <DollarSign className="w-5 h-5 text-primary" />
              Meta de Receita
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={targetRevenue}
              onChange={(e) => setTargetRevenue(e.target.value)}
              placeholder="Ex: 100000.00"
              className="text-lg"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Atual: {formatCurrency(currentMetrics.revenue)}
              </span>
              {targetRevenue && (
                <span className="text-muted-foreground">
                  {calculateRemainingRevenue(currentMetrics.revenue, targetRevenue)}
                </span>
              )}
            </div>
          </div>

          {/* Meta de Taxa de Conversão */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base">
              <TrendingUp className="w-5 h-5 text-primary" />
              Meta de Taxa de Conversão (%)
            </Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={targetConversion}
              onChange={(e) => setTargetConversion(e.target.value)}
              placeholder="Ex: 25"
              className="text-lg"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Atual: {currentMetrics.conversionRate.toFixed(1)}%
              </span>
              {targetConversion && (
                <span className="text-muted-foreground">
                  {calculateRemaining(currentMetrics.conversionRate, targetConversion, true)}
                </span>
              )}
            </div>
          </div>

          {/* Meta de Negócios Fechados */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-5 h-5 text-primary" />
              Meta de Negócios Fechados
            </Label>
            <Input
              type="number"
              min="0"
              value={targetClosedDeals}
              onChange={(e) => setTargetClosedDeals(e.target.value)}
              placeholder="Ex: 30"
              className="text-lg"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Atual: {currentMetrics.closedDeals} negócios
              </span>
              {targetClosedDeals && (
                <span className="text-muted-foreground">
                  {calculateRemaining(currentMetrics.closedDeals, targetClosedDeals)}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Metas'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
