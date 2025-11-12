import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const CAMPAIGN_OBJECTIVES = [
  { value: 'OUTCOME_LEADS', label: 'Leads', category: 'Conversão' },
  { value: 'LEAD_GENERATION', label: 'Geração de Leads', category: 'Conversão' },
  { value: 'CONVERSIONS', label: 'Conversões', category: 'Conversão' },
  { value: 'OUTCOME_SALES', label: 'Vendas', category: 'Conversão' },
  { value: 'CATALOG_SALES', label: 'Vendas de Catálogo', category: 'Conversão' },
  { value: 'OUTCOME_TRAFFIC', label: 'Tráfego', category: 'Consideração' },
  { value: 'TRAFFIC', label: 'Tráfego (Legacy)', category: 'Consideração' },
  { value: 'OUTCOME_ENGAGEMENT', label: 'Engajamento', category: 'Consideração' },
  { value: 'MESSAGES', label: 'Mensagens', category: 'Consideração' },
  { value: 'VIDEO_VIEWS', label: 'Visualizações de Vídeo', category: 'Reconhecimento' },
  { value: 'BRAND_AWARENESS', label: 'Reconhecimento da Marca', category: 'Reconhecimento' },
  { value: 'APP_INSTALLS', label: 'Instalações de App', category: 'Outros' },
  { value: 'STORE_TRAFFIC', label: 'Tráfego para Loja', category: 'Outros' },
  { value: 'EVENT_RESPONSES', label: 'Respostas de Eventos', category: 'Outros' },
];

const CATEGORIES = [
  'Conversão',
  'Consideração',
  'Reconhecimento',
  'Outros',
];

interface CampaignObjectiveSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export const CampaignObjectiveSelector = ({ value, onChange }: CampaignObjectiveSelectorProps) => {
  const handleToggle = (objective: string) => {
    if (value.includes(objective)) {
      onChange(value.filter(v => v !== objective));
    } else {
      onChange([...value, objective]);
    }
  };

  const handleSelectAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-base">🎯 Objetivos de Campanha (Opcional)</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione os objetivos onde esta regra deve ser aplicada. Deixe vazio para aplicar em todas as campanhas.
          </p>
        </div>
        {value.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            {value.length} selecionado{value.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-sm text-primary hover:underline"
        >
          {value.length > 0 ? 'Limpar seleção' : 'Aplicar em todas as campanhas'}
        </button>
      </div>

      <Card className="p-4">
        <div className="space-y-6">
          {CATEGORIES.map(category => {
            const objectives = CAMPAIGN_OBJECTIVES.filter(obj => obj.category === category);
            const selectedInCategory = objectives.filter(obj => value.includes(obj.value)).length;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm text-foreground">{category}</h4>
                  {selectedInCategory > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedInCategory}/{objectives.length}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {objectives.map(objective => (
                    <div key={objective.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={objective.value}
                        checked={value.includes(objective.value)}
                        onCheckedChange={() => handleToggle(objective.value)}
                      />
                      <label
                        htmlFor={objective.value}
                        className="text-sm cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {objective.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {value.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
          <span>ℹ️</span>
          <span>Esta regra será aplicada em campanhas de <strong>qualquer objetivo</strong></span>
        </div>
      )}
    </div>
  );
};

export const translateObjective = (objective: string): string => {
  const obj = CAMPAIGN_OBJECTIVES.find(o => o.value === objective);
  return obj ? obj.label : objective;
};
