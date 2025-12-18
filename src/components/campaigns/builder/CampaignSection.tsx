import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CampaignData } from "@/hooks/useCampaignBuilder";

interface CampaignSectionProps {
  campaign: CampaignData;
  onChange: (updates: Partial<CampaignData>) => void;
}

const OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento' },
  { value: 'OUTCOME_LEADS', label: 'Leads' },
  { value: 'OUTCOME_SALES', label: 'Vendas' },
  { value: 'OUTCOME_AWARENESS', label: 'Reconhecimento' },
  { value: 'OUTCOME_APP_PROMOTION', label: 'Promoção de App' },
];

const CTA_OPTIONS = [
  { value: 'LEARN_MORE', label: 'Saiba Mais' },
  { value: 'SHOP_NOW', label: 'Comprar Agora' },
  { value: 'SIGN_UP', label: 'Cadastre-se' },
  { value: 'BOOK_NOW', label: 'Reserve Agora' },
  { value: 'CONTACT_US', label: 'Fale Conosco' },
  { value: 'DOWNLOAD', label: 'Baixar' },
  { value: 'GET_QUOTE', label: 'Obter Cotação' },
  { value: 'APPLY_NOW', label: 'Candidatar-se' },
  { value: 'SUBSCRIBE', label: 'Assinar' },
  { value: 'WATCH_MORE', label: 'Assistir Mais' },
];

export function CampaignSection({ campaign, onChange }: CampaignSectionProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(rawValue, 10) / 100 || 0;
    onChange({ budgetValue: numericValue });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Configurações da Campanha</h2>
        <p className="text-sm text-muted-foreground">
          Defina as configurações básicas da sua campanha no Meta Ads
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="campaign-name">Nome da Campanha *</Label>
          <Input
            id="campaign-name"
            placeholder="Ex: Black Friday 2024"
            value={campaign.name}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Objetivo da Campanha *</Label>
          <Select
            value={campaign.objective}
            onValueChange={(value) => onChange({ objective: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o objetivo" />
            </SelectTrigger>
            <SelectContent>
              {OBJECTIVES.map((obj) => (
                <SelectItem key={obj.value} value={obj.value}>
                  {obj.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            O objetivo determina como o Meta otimizará a entrega dos seus anúncios
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tipo de Orçamento</Label>
            <Select
              value={campaign.budgetType}
              onValueChange={(value: 'daily' | 'lifetime') => onChange({ budgetType: value })}
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
            <Label htmlFor="budget-value">Valor do Orçamento *</Label>
            <Input
              id="budget-value"
              placeholder="R$ 0,00"
              value={formatCurrency(campaign.budgetValue)}
              onChange={handleBudgetChange}
            />
            <p className="text-xs text-muted-foreground">Mínimo: R$ 1,00</p>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div>
            <Label htmlFor="campaign-status" className="font-medium">
              Iniciar campanha ativa
            </Label>
            <p className="text-sm text-muted-foreground">
              {campaign.status === 'ACTIVE' 
                ? 'A campanha começará a veicular imediatamente'
                : 'A campanha será criada pausada para revisão'}
            </p>
          </div>
          <Switch
            id="campaign-status"
            checked={campaign.status === 'ACTIVE'}
            onCheckedChange={(checked) => onChange({ status: checked ? 'ACTIVE' : 'PAUSED' })}
          />
        </div>
      </div>
    </div>
  );
}

export { CTA_OPTIONS };
