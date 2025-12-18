import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CampaignBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    spend?: number;
  };
  onUpdateBudget: (budgetType: 'daily' | 'lifetime', amount: number) => Promise<void>;
  loading: boolean;
}

export function CampaignBudgetModal({
  isOpen,
  onClose,
  campaign,
  onUpdateBudget,
  loading
}: CampaignBudgetModalProps) {
  const [budgetType, setBudgetType] = useState<'daily' | 'lifetime'>('daily');
  const [amount, setAmount] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (!isNaN(numericAmount) && numericAmount > 0) {
      await onUpdateBudget(budgetType, numericAmount);
    }
  };

  const numericAmount = parseFloat(amount.replace(',', '.'));
  const isValidAmount = !isNaN(numericAmount) && numericAmount > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Editar Orçamento</DialogTitle>
          <DialogDescription>
            Defina o novo orçamento para a campanha "{campaign.name}".
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-3">
              <Label>Tipo de Orçamento</Label>
              <RadioGroup 
                value={budgetType} 
                onValueChange={(value) => setBudgetType(value as 'daily' | 'lifetime')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="daily" id="daily" />
                  <Label htmlFor="daily" className="font-normal cursor-pointer">
                    Orçamento Diário
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lifetime" id="lifetime" />
                  <Label htmlFor="lifetime" className="font-normal cursor-pointer">
                    Orçamento Vitalício
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budget-amount">
                Valor ({budgetType === 'daily' ? 'por dia' : 'total'})
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  R$
                </span>
                <Input
                  id="budget-amount"
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Alert variant="default" className="bg-muted/50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                O Meta Ads tem limite mínimo de orçamento diário de R$ 5,00 para a maioria das campanhas.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isValidAmount}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Atualizando...
                </>
              ) : (
                'Atualizar Orçamento'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
