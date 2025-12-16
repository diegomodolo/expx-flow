import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const LEAD_FIELDS = [
  // Contato Básico
  { key: 'full_name', label: 'Nome Completo', group: 'Contato' },
  { key: 'first_name', label: 'Primeiro Nome', group: 'Contato' },
  { key: 'last_name', label: 'Sobrenome', group: 'Contato' },
  { key: 'email', label: 'Email', group: 'Contato' },
  { key: 'phone', label: 'Telefone', group: 'Contato' },
  { key: 'whatsapp', label: 'WhatsApp', group: 'Contato' },
  { key: 'date_of_birth', label: 'Data de Nascimento', group: 'Contato' },
  { key: 'gender', label: 'Gênero', group: 'Contato' },
  
  // Localização
  { key: 'city', label: 'Cidade', group: 'Localização' },
  { key: 'state', label: 'Estado', group: 'Localização' },
  { key: 'country', label: 'País', group: 'Localização' },
  { key: 'zip_code', label: 'CEP', group: 'Localização' },
  
  // Empresa
  { key: 'company_name', label: 'Nome da Empresa', group: 'Empresa' },
  { key: 'company_trade_name', label: 'Nome Fantasia', group: 'Empresa' },
  { key: 'cnpj', label: 'CNPJ', group: 'Empresa' },
  { key: 'company_segment', label: 'Segmento da Empresa', group: 'Empresa' },
  { key: 'company_subsegment', label: 'Subsegmento', group: 'Empresa' },
  { key: 'cnae', label: 'CNAE', group: 'Empresa' },
  { key: 'company_size', label: 'Porte da Empresa', group: 'Empresa' },
  { key: 'monthly_revenue', label: 'Faturamento Mensal', group: 'Empresa' },
  { key: 'annual_revenue', label: 'Faturamento Anual', group: 'Empresa' },
  { key: 'employee_count', label: 'Número de Funcionários', group: 'Empresa' },
  { key: 'years_in_market', label: 'Anos no Mercado', group: 'Empresa' },
  { key: 'company_website', label: 'Site da Empresa', group: 'Empresa' },
  { key: 'company_linkedin', label: 'LinkedIn da Empresa', group: 'Empresa' },
  
  // Cargo/Decisão
  { key: 'job_title', label: 'Cargo', group: 'Cargo' },
  { key: 'job_level', label: 'Nível do Cargo', group: 'Cargo' },
  { key: 'department', label: 'Departamento', group: 'Cargo' },
  { key: 'buying_role', label: 'Papel na Compra', group: 'Cargo' },
  { key: 'is_decision_maker', label: 'É Tomador de Decisão', group: 'Cargo' },
  { key: 'influence_level', label: 'Nível de Influência', group: 'Cargo' },
  
  // Software
  { key: 'uses_software', label: 'Usa Software', group: 'Software' },
  { key: 'software_type', label: 'Tipo de Software', group: 'Software' },
  { key: 'current_software', label: 'Software Atual', group: 'Software' },
  { key: 'current_vendor', label: 'Fornecedor Atual', group: 'Software' },
  { key: 'software_satisfaction', label: 'Satisfação com Software', group: 'Software' },
  { key: 'main_pain_point', label: 'Principal Dor', group: 'Software' },
  
  // Compra
  { key: 'budget_range', label: 'Faixa de Orçamento', group: 'Compra' },
  { key: 'purchase_timeline', label: 'Prazo de Compra', group: 'Compra' },
  { key: 'urgency_level', label: 'Nível de Urgência', group: 'Compra' },
  
  // Marketing
  { key: 'acquisition_channel', label: 'Canal de Aquisição', group: 'Marketing' },
  { key: 'specific_source', label: 'Fonte Específica', group: 'Marketing' },
  { key: 'campaign', label: 'Campanha', group: 'Marketing' },
  { key: 'ad_set', label: 'Conjunto de Anúncios', group: 'Marketing' },
  { key: 'utm_source', label: 'UTM Source', group: 'Marketing' },
  { key: 'utm_medium', label: 'UTM Medium', group: 'Marketing' },
  { key: 'utm_campaign', label: 'UTM Campaign', group: 'Marketing' },
  { key: 'utm_term', label: 'UTM Term', group: 'Marketing' },
  { key: 'utm_content', label: 'UTM Content', group: 'Marketing' },
];

interface LeadFieldMapperProps {
  columns: string[];
  fieldMapping: Record<string, string>;
  onMappingChange: (mapping: Record<string, string>) => void;
}

export const LeadFieldMapper = ({ columns, fieldMapping, onMappingChange }: LeadFieldMapperProps) => {
  const handleFieldChange = (column: string, field: string) => {
    const newMapping = { ...fieldMapping };
    if (field === "__none__") {
      delete newMapping[column];
    } else {
      newMapping[column] = field;
    }
    onMappingChange(newMapping);
  };

  const handleRemoveMapping = (column: string) => {
    const newMapping = { ...fieldMapping };
    delete newMapping[column];
    onMappingChange(newMapping);
  };

  // Group fields by category
  const groupedFields = LEAD_FIELDS.reduce((acc, field) => {
    if (!acc[field.group]) acc[field.group] = [];
    acc[field.group].push(field);
    return acc;
  }, {} as Record<string, typeof LEAD_FIELDS>);

  const usedFields = new Set(Object.values(fieldMapping));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Mapeamento de Campos</h3>
        <span className="text-sm text-muted-foreground">
          {Object.keys(fieldMapping).length} campos mapeados
        </span>
      </div>
      
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-3">
          {columns.map(column => (
            <div key={column} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{column}</p>
              </div>
              
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              
              <Select
                value={fieldMapping[column] || "__none__"}
                onValueChange={(value) => handleFieldChange(column, value)}
              >
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Selecione um campo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    <span className="text-muted-foreground">Não importar</span>
                  </SelectItem>
                  {Object.entries(groupedFields).map(([group, fields]) => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                        {group}
                      </div>
                      {fields.map(field => (
                        <SelectItem
                          key={field.key}
                          value={field.key}
                          disabled={usedFields.has(field.key) && fieldMapping[column] !== field.key}
                        >
                          {field.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
              
              {fieldMapping[column] && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => handleRemoveMapping(column)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
