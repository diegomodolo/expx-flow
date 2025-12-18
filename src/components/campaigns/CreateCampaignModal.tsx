import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { useCampaignCreation, CampaignObjective } from '@/hooks/useCampaignCreation';
import { Alert, AlertDescription } from '@/components/ui/alert';

type BudgetType = 'daily' | 'lifetime';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  hasAdAccount: boolean;
  onSuccess?: () => void;
}

const CAMPAIGN_OBJECTIVES: { value: CampaignObjective; label: string; description: string }[] = [
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego', description: 'Direcione mais pessoas para um destino' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento', description: 'Obtenha mais curtidas, comentários e compartilhamentos' },
  { value: 'OUTCOME_LEADS', label: 'Leads', description: 'Colete leads para seu negócio' },
  { value: 'OUTCOME_SALES', label: 'Vendas', description: 'Encontre pessoas propensas a comprar' },
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento', description: 'Alcance pessoas propensas a lembrar dos seus anúncios' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoção de App', description: 'Encontre pessoas para instalar seu aplicativo' },
];

export function CreateCampaignModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  hasAdAccount,
  onSuccess
}: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [objective, setObjective] = useState<CampaignObjective>('OUTCOME_TRAFFIC');
  const [startActive, setStartActive] = useState(false);
  const [budgetType, setBudgetType] = useState<BudgetType>('daily');
  const [budgetValue, setBudgetValue] = useState('');
  
  const { createCampaign, loading } = useCampaignCreation();

  const formatCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrency = (value: string): number => {
    const numbers = value.replace(/\D/g, '');
    return parseInt(numbers || '0') / 100;
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCurrency(e.target.value);
    setBudgetValue(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const budget = parseCurrency(budgetValue);
    
    if (!name.trim() || budget < 1) {
      return;
    }

    const result = await createCampaign({
      clientId,
      name: name.trim(),
      objective,
      status: startActive ? 'ACTIVE' : 'PAUSED',
      dailyBudget: budgetType === 'daily' ? budget : undefined,
      lifetimeBudget: budgetType === 'lifetime' ? budget : undefined,
    });

    if (result.success) {
      setName('');
      setObjective('OUTCOME_TRAFFIC');
      setStartActive(false);
      setBudgetType('daily');
      setBudgetValue('');
      onClose();
      onSuccess?.();
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      setObjective('OUTCOME_TRAFFIC');
      setStartActive(false);
      setBudgetType('daily');
      setBudgetValue('');
      onClose();
    }
  };

  const budgetAmount = parseCurrency(budgetValue);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Nova Campanha</DialogTitle>
          <DialogDescription>
            Crie uma campanha no Meta Ads para {clientName}
          </DialogDescription>
        </DialogHeader>

        {!hasAdAccount ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este cliente não possui uma conta de anúncios configurada. 
              Configure a conta de anúncios antes de criar campanhas.
            </AlertDescription>
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Campanha *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Campanha de Leads - Janeiro"
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">Objetivo *</Label>
              <Select
                value={objective}
                onValueChange={(value) => setObjective(value as CampaignObjective)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  {CAMPAIGN_OBJECTIVES.map((obj) => (
                    <SelectItem key={obj.value} value={obj.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{obj.label}</span>
                        <span className="text-xs text-muted-foreground">{obj.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budgetType">Tipo de Orçamento *</Label>
                <Select
                  value={budgetType}
                  onValueChange={(value) => setBudgetType(value as BudgetType)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Orçamento Diário</SelectItem>
                    <SelectItem value="lifetime">Orçamento Vitalício</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Valor (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    R$
                  </span>
                  <Input
                    id="budget"
                    value={budgetValue}
                    onChange={handleBudgetChange}
                    placeholder="0,00"
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
                {budgetValue && budgetAmount < 1 && (
                  <p className="text-xs text-destructive">Valor mínimo: R$ 1,00</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {budgetType === 'daily' 
                  ? 'O orçamento diário será gasto por dia nos conjuntos de anúncios.'
                  : 'O orçamento vitalício será distribuído durante toda a vida da campanha.'}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="startActive">Iniciar campanha ativa</Label>
                <p className="text-sm text-muted-foreground">
                  Se desativado, a campanha será criada pausada
                </p>
              </div>
              <Switch
                id="startActive"
                checked={startActive}
                onCheckedChange={setStartActive}
                disabled={loading}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !name.trim() || budgetAmount < 1}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Campanha'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
