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
  { key: 'email_relevance', label: 'Relevância do E-mail', group: 'Contato' },
  { key: 'phone', label: 'Telefone 1', group: 'Contato' },
  { key: 'phone_relevance', label: 'Relevância do Telefone 1', group: 'Contato' },
  { key: 'phone_2', label: 'Telefone 2', group: 'Contato' },
  { key: 'whatsapp', label: 'WhatsApp', group: 'Contato' },
  { key: 'date_of_birth', label: 'Data de Nascimento', group: 'Contato' },
  { key: 'gender', label: 'Gênero', group: 'Contato' },
  
  // Localização
  { key: 'address_type', label: 'Tipo de Logradouro', group: 'Localização' },
  { key: 'street', label: 'Logradouro', group: 'Localização' },
  { key: 'address_number', label: 'Número', group: 'Localização' },
  { key: 'address_complement', label: 'Complemento', group: 'Localização' },
  { key: 'neighborhood', label: 'Bairro', group: 'Localização' },
  { key: 'zip_code', label: 'CEP', group: 'Localização' },
  { key: 'state', label: 'UF', group: 'Localização' },
  { key: 'state_full_name', label: 'Estado por Extenso', group: 'Localização' },
  { key: 'municipality_code', label: 'Código do Município', group: 'Localização' },
  { key: 'city', label: 'Nome do Município', group: 'Localização' },
  { key: 'country', label: 'País', group: 'Localização' },
  
  // Empresa
  { key: 'cnpj', label: 'CNPJ', group: 'Empresa' },
  { key: 'matriz_filial', label: 'Matriz/Filial', group: 'Empresa' },
  { key: 'company_name', label: 'Razão Social', group: 'Empresa' },
  { key: 'company_trade_name', label: 'Nome Fantasia', group: 'Empresa' },
  { key: 'registration_status_date', label: 'Data da Situação Cadastral Ativa', group: 'Empresa' },
  { key: 'activity_start_date', label: 'Data do Início da Atividade', group: 'Empresa' },
  { key: 'cnae_code', label: 'Cód. CNAE Primário', group: 'Empresa' },
  { key: 'cnae_description', label: 'Desc. CNAE Primário', group: 'Empresa' },
  { key: 'secondary_cnaes', label: 'CNAEs Secundários', group: 'Empresa' },
  { key: 'share_capital', label: 'Capital Social', group: 'Empresa' },
  { key: 'company_size', label: 'Porte', group: 'Empresa' },
  { key: 'company_segment', label: 'Segmento da Empresa', group: 'Empresa' },
  { key: 'company_subsegment', label: 'Subsegmento', group: 'Empresa' },
  { key: 'monthly_revenue', label: 'Faturamento Mensal', group: 'Empresa' },
  { key: 'annual_revenue', label: 'Faturamento Anual', group: 'Empresa' },
  { key: 'employee_count', label: 'Número de Funcionários', group: 'Empresa' },
  { key: 'years_in_market', label: 'Anos no Mercado', group: 'Empresa' },
  { key: 'company_website', label: 'Site da Empresa', group: 'Empresa' },
  { key: 'company_linkedin', label: 'LinkedIn da Empresa', group: 'Empresa' },
  
  // Fiscal/Tributário
  { key: 'simples_option', label: 'Opção pelo Simples', group: 'Fiscal' },
  { key: 'simples_option_date', label: 'Data da Opção pelo Simples', group: 'Fiscal' },
  { key: 'simples_exclusion_date', label: 'Data da Exclusão do Simples', group: 'Fiscal' },
  { key: 'mei_option', label: 'Opção pelo MEI', group: 'Fiscal' },
  { key: 'responsible_federative_entity', label: 'Ente Federativo Responsável', group: 'Fiscal' },
  
  // Natureza Jurídica
  { key: 'legal_nature_code', label: 'Cód. Natureza Jurídica', group: 'Jurídico' },
  { key: 'legal_nature_description', label: 'Desc. Natureza Jurídica', group: 'Jurídico' },
  { key: 'partners', label: 'Nome dos Sócios', group: 'Jurídico' },
  
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
  sampleRow?: Record<string, unknown>;
}

export const LeadFieldMapper = ({ columns, fieldMapping, onMappingChange, sampleRow }: LeadFieldMapperProps) => {
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
          {columns.map(column => {
            const sampleValue = sampleRow?.[column];
            const displayValue = sampleValue !== undefined && sampleValue !== null && sampleValue !== '' 
              ? String(sampleValue) 
              : null;
            
            return (
            <div key={column} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{column}</p>
                {displayValue && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5" title={displayValue}>
                    {displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue}
                  </p>
                )}
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
          );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
