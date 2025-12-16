import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

// Define filter field types
interface FilterField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
}

interface FilterCategory {
  label: string;
  fields: FilterField[];
}

// Define filter field categories and fields
const FILTER_FIELDS: Record<string, FilterCategory> = {
  contact: {
    label: "Contato",
    fields: [
      { key: "state", label: "Estado", type: "text" },
      { key: "city", label: "Cidade", type: "text" },
      { key: "gender", label: "Gênero", type: "select", options: ["masculino", "feminino", "outro"] },
      { key: "job_title", label: "Cargo", type: "text" },
      { key: "job_level", label: "Nível Hierárquico", type: "select", options: ["estagiario", "junior", "pleno", "senior", "coordenador", "gerente", "diretor", "c-level"] },
    ]
  },
  company: {
    label: "Empresa",
    fields: [
      { key: "company_name", label: "Nome da Empresa", type: "text" },
      { key: "company_segment", label: "Segmento", type: "text" },
      { key: "company_subsegment", label: "Sub-segmento", type: "text" },
      { key: "company_size", label: "Porte", type: "select", options: ["MEI", "ME", "EPP", "Médio", "Grande"] },
      { key: "company_employees_range", label: "Faixa de Funcionários", type: "select", options: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"] },
      { key: "company_revenue_range", label: "Faixa de Faturamento", type: "select", options: ["Até 81k", "81k-360k", "360k-4.8M", "4.8M-300M", "300M+"] },
    ]
  },
  decision: {
    label: "Decisão",
    fields: [
      { key: "buying_role", label: "Papel na Compra", type: "select", options: ["decisor", "influenciador", "usuario", "comprador", "avaliador"] },
      { key: "is_decision_maker", label: "É Decisor", type: "boolean" },
      { key: "influence_level", label: "Nível de Influência", type: "select", options: ["baixo", "medio", "alto", "critico"] },
    ]
  },
  software: {
    label: "Software",
    fields: [
      { key: "uses_similar_software", label: "Usa Software Similar", type: "boolean" },
      { key: "current_software_type", label: "Tipo de Software", type: "text" },
      { key: "current_vendor", label: "Fornecedor Atual", type: "text" },
      { key: "satisfaction_level", label: "Nível de Satisfação", type: "select", options: ["muito_insatisfeito", "insatisfeito", "neutro", "satisfeito", "muito_satisfeito"] },
    ]
  },
  purchase: {
    label: "Compra",
    fields: [
      { key: "purchase_timeline", label: "Timeline de Compra", type: "select", options: ["imediato", "1-3_meses", "3-6_meses", "6-12_meses", "mais_12_meses", "sem_previsao"] },
      { key: "urgency_level", label: "Nível de Urgência", type: "select", options: ["baixa", "media", "alta", "critica"] },
      { key: "budget_range", label: "Faixa de Budget", type: "select", options: ["ate_1k", "1k-5k", "5k-10k", "10k-50k", "50k-100k", "100k+"] },
    ]
  },
  marketing: {
    label: "Marketing",
    fields: [
      { key: "acquisition_channel", label: "Canal de Aquisição", type: "text" },
      { key: "utm_source", label: "UTM Source", type: "text" },
      { key: "utm_medium", label: "UTM Medium", type: "text" },
      { key: "utm_campaign", label: "UTM Campaign", type: "text" },
      { key: "pricing_page_visited", label: "Visitou Página de Preços", type: "boolean" },
      { key: "webinar_attended", label: "Participou de Webinar", type: "boolean" },
      { key: "demo_requested", label: "Solicitou Demo", type: "boolean" },
    ]
  },
  qualification: {
    label: "Qualificação",
    fields: [
      { key: "lead_classification", label: "Classificação", type: "select", options: ["ouro", "prata", "bronze", "descartado"] },
      { key: "global_score", label: "Score Global", type: "number" },
      { key: "company_fit_score", label: "Score Fit Empresa", type: "number" },
      { key: "authority_score", label: "Score Autoridade", type: "number" },
      { key: "contact_quality_score", label: "Score Qualidade Contato", type: "number" },
      { key: "purchase_intent_score", label: "Score Intenção Compra", type: "number" },
      { key: "digital_maturity_score", label: "Score Maturidade Digital", type: "number" },
    ]
  },
  lgpd: {
    label: "LGPD",
    fields: [
      { key: "lgpd_consent", label: "Consentimento LGPD", type: "boolean" },
      { key: "partner_sharing_consent", label: "Consentimento Compartilhamento", type: "boolean" },
    ]
  }
};

const OPERATORS = {
  text: [
    { value: "equals", label: "Igual a" },
    { value: "not_equals", label: "Diferente de" },
    { value: "contains", label: "Contém" },
    { value: "not_contains", label: "Não contém" },
    { value: "starts_with", label: "Começa com" },
    { value: "is_null", label: "Está vazio" },
    { value: "is_not_null", label: "Não está vazio" },
  ],
  number: [
    { value: "equals", label: "Igual a" },
    { value: "not_equals", label: "Diferente de" },
    { value: "greater_than", label: "Maior que" },
    { value: "less_than", label: "Menor que" },
    { value: "greater_or_equal", label: "Maior ou igual" },
    { value: "less_or_equal", label: "Menor ou igual" },
    { value: "between", label: "Entre" },
  ],
  select: [
    { value: "equals", label: "Igual a" },
    { value: "not_equals", label: "Diferente de" },
    { value: "in", label: "Um de" },
  ],
  boolean: [
    { value: "equals", label: "É" },
  ]
};

interface FilterCondition {
  id: string;
  field: string;
  operator: string;
  value: unknown;
  fieldType?: string;
}

interface FilterConfigCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface SavedFilter {
  id: string;
  name: string;
  description: string | null;
  filter_config: {
    conditions: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    logic: 'AND' | 'OR';
  };
  is_favorite: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filter: SavedFilter | null;
  companyId: string;
}

export const LeadFilterBuilderModal = ({ open, onOpenChange, filter, companyId }: Props) => {
  const queryClient = useQueryClient();
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logic, setLogic] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<FilterCondition[]>([]);

  useEffect(() => {
    if (filter) {
      setName(filter.name);
      setDescription(filter.description || "");
      setLogic(filter.filter_config?.logic || 'AND');
      setConditions(
        filter.filter_config?.conditions?.map((c, idx) => ({
          id: `cond-${idx}`,
          field: c.field,
          operator: c.operator,
          value: c.value,
        })) || []
      );
    } else {
      resetForm();
    }
  }, [filter, open]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setLogic('AND');
    setConditions([]);
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      { id: `cond-${Date.now()}`, field: "", operator: "equals", value: "" }
    ]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const getFieldInfo = (fieldKey: string) => {
    for (const category of Object.values(FILTER_FIELDS)) {
      const field = category.fields.find(f => f.key === fieldKey);
      if (field) return field;
    }
    return null;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome é obrigatório");
      if (conditions.length === 0) throw new Error("Adicione pelo menos uma condição");

      const filterConfig = JSON.parse(JSON.stringify({
        conditions: conditions.map(c => ({
          field: c.field,
          operator: c.operator,
          value: c.value
        })),
        logic
      }));

      if (filter) {
        const { error } = await supabase
          .from('lead_saved_filters')
          .update({ name, description: description || null, filter_config: filterConfig })
          .eq('id', filter.id);
        if (error) throw error;
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('lead_saved_filters')
          .insert([{
            company_id: companyId,
            name,
            description: description || null,
            filter_config: filterConfig,
            created_by: userData.user?.id || ''
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-saved-filters'] });
      toast.success(filter ? "Filtro atualizado" : "Filtro criado");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar filtro");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{filter ? "Editar Filtro" : "Criar Novo Filtro"}</DialogTitle>
          <DialogDescription>
            Configure as condições para filtrar leads de forma agregada
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Filtro *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Leads Qualificados SP"
                />
              </div>
              <div className="space-y-2">
                <Label>Lógica das Condições</Label>
                <Select value={logic} onValueChange={(v: 'AND' | 'OR') => setLogic(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">E (todas as condições)</SelectItem>
                    <SelectItem value="OR">OU (qualquer condição)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o objetivo deste filtro..."
                rows={2}
              />
            </div>

            {/* Conditions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base">Condições</Label>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Condição
                </Button>
              </div>

              {conditions.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">Nenhuma condição adicionada</p>
                  <Button variant="link" onClick={addCondition}>
                    Adicionar primeira condição
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {conditions.map((condition, idx) => {
                    const fieldInfo = getFieldInfo(condition.field);
                    const fieldType = fieldInfo?.type || 'text';
                    const operators = OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text;

                    return (
                      <div key={condition.id} className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
                        {idx > 0 && (
                          <Badge variant="secondary" className="mt-2 shrink-0">
                            {logic}
                          </Badge>
                        )}
                        
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          {/* Field Select */}
                          <Select 
                            value={condition.field} 
                            onValueChange={(v) => updateCondition(condition.id, { field: v, operator: 'equals', value: '' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Campo" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(FILTER_FIELDS).map(([catKey, category]) => (
                                <div key={catKey}>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                                    {category.label}
                                  </div>
                                  {category.fields.map(field => (
                                    <SelectItem key={field.key} value={field.key}>
                                      {field.label}
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Operator Select */}
                          <Select 
                            value={condition.operator} 
                            onValueChange={(v) => updateCondition(condition.id, { operator: v })}
                            disabled={!condition.field}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Operador" />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map(op => (
                                <SelectItem key={op.value} value={op.value}>
                                  {op.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Value Input */}
                          {!['is_null', 'is_not_null'].includes(condition.operator) && (
                            fieldType === 'select' && fieldInfo?.options ? (
                              <Select 
                                value={String(condition.value || '')} 
                                onValueChange={(v) => updateCondition(condition.id, { value: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Valor" />
                                </SelectTrigger>
                                <SelectContent>
                                  {fieldInfo.options.map(opt => (
                                    <SelectItem key={opt} value={opt}>
                                      {opt}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : fieldType === 'boolean' ? (
                              <Select 
                                value={String(condition.value ?? '')} 
                                onValueChange={(v) => updateCondition(condition.id, { value: v === 'true' })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Valor" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true">Sim</SelectItem>
                                  <SelectItem value="false">Não</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                type={fieldType === 'number' ? 'number' : 'text'}
                                value={String(condition.value ?? '')}
                                onChange={(e) => updateCondition(condition.id, { 
                                  value: fieldType === 'number' ? Number(e.target.value) : e.target.value 
                                })}
                                placeholder="Valor"
                              />
                            )
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCondition(condition.id)}
                          className="shrink-0"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim() || conditions.length === 0}
          >
            {saveMutation.isPending ? "Salvando..." : filter ? "Atualizar" : "Criar Filtro"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
