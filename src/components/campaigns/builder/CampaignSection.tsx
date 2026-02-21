import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Target,
  Settings,
  DollarSign,
  Info,
} from "lucide-react";
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
    <div className="flex flex-col h-full">
      {/* Header - matches CampaignEditContent */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          <div className="flex-1">
            <h2 className="text-xl font-semibold">Campanha</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">META</Badge>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Nova
              </Badge>
            </div>
          </div>
          {/* Status Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {campaign.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
            </span>
            <Switch
              checked={campaign.status === 'ACTIVE'}
              onCheckedChange={(checked) => onChange({ status: checked ? 'ACTIVE' : 'PAUSED' })}
              className="data-[state=checked]:bg-green-500"
            />
          </div>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Two Column Layout - matches CampaignEditContent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Configurations */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <Settings className="w-4 h-4" />
                  Configurações
                </h4>

                {/* Name Field */}
                <div className="space-y-2">
                  <Label>Nome da Campanha *</Label>
                  <Input
                    value={campaign.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    placeholder="Ex: Campanha de Conversões - Janeiro"
                  />
                  {campaign.name.trim() === '' && (
                    <p className="text-xs text-destructive">O nome não pode estar vazio</p>
                  )}
                </div>

                {/* Objective */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    Objetivo da Campanha *
                  </Label>
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
              </div>
            </div>

            {/* Right Column - Budget */}
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                  <DollarSign className="w-4 h-4" />
                  Orçamento
                </h4>

                {/* Budget Type */}
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
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="lifetime">Vitalício</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Budget Value */}
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={formatCurrency(campaign.budgetValue)}
                    onChange={handleBudgetChange}
                  />
                  {campaign.budgetValue < 1 && (
                    <p className="text-xs text-destructive">O orçamento mínimo é R$ 1,00</p>
                  )}
                </div>

                {/* Budget Info */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {campaign.budgetType === 'daily' ? 'Orçamento Diário:' : 'Orçamento Total:'}
                    </span>
                    <span className="font-medium">{formatCurrency(campaign.budgetValue)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="w-3 h-3" />
                    <span>A campanha será criada {campaign.status === 'ACTIVE' ? 'ativa' : 'pausada para revisão'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export { CTA_OPTIONS };
