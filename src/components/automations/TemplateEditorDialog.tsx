import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { AutomationRule } from "@/hooks/useAutomationRules";
import { ConditionEditor, ConditionsGroup } from "./ConditionEditor";
import { SafetyLimitsEditor, SafetyLimits, safetyLimitsSchema } from "./SafetyLimitsEditor";
import { CampaignObjectiveSelector } from "./CampaignObjectiveSelector";
import { Separator } from "@/components/ui/separator";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const templateFormSchema = z.object({
  rule_name: z.string().trim().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
  rule_description: z.string().trim().max(500, "Descrição muito longa").optional(),
  rule_order: z.number().int().min(1, "Prioridade deve ser maior que 0").max(100, "Prioridade muito alta"),
  time_window_days: z.number().int().min(1, "Mínimo 1 dia").max(90, "Máximo 90 dias"),
  action_type: z.string().min(1, "Selecione uma ação"),
  is_active: z.boolean(),
});

interface TemplateEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: AutomationRule | null;
  onSave: (data: any) => Promise<any>;
}

export const TemplateEditorDialog = ({ open, onOpenChange, template, onSave }: TemplateEditorDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    rule_name: "",
    rule_description: "",
    rule_order: 1,
    time_window_days: 7,
    action_type: "notify_only",
    is_active: true,
    action_config: {} as any,
    entity_type: "campaign" as "campaign" | "adset" | "ad",
  });

  const [conditions, setConditions] = useState<ConditionsGroup>({
    logic: "AND",
    conditions: [
      {
        field: "cpa",
        operator: ">",
        value: 100,
        type: "number",
      }
    ]
  });

  const [safetyLimits, setSafetyLimits] = useState<SafetyLimits>({
    budget_safety_limits: {
      max_daily_budget_increase_percent: 20,
      max_daily_budget_decrease_percent: 30,
    },
    execution_limits: {
      max_executions_per_day: 3,
      cooldown_hours: 4,
    },
  });

  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  // Load template data when it changes
  useEffect(() => {
    console.log('🔄 TemplateEditorDialog useEffect triggered', { 
      hasTemplate: !!template, 
      templateId: template?.id,
      template
    });
    
    if (template) {
      setIsLoadingTemplate(true);
      console.log('✅ Loading template data:', {
        rule_name: template.rule_name,
        entity_type: template.entity_type,
        action_type: template.action_type,
        rule_order: template.rule_order,
        time_window_days: template.time_window_days,
      });
      
      const newFormData = {
        rule_name: template.rule_name,
        rule_description: template.rule_description || "",
        rule_order: template.rule_order,
        time_window_days: template.time_window_days,
        action_type: template.action_type,
        is_active: template.is_active,
        action_config: template.action_config || {},
        entity_type: (template.entity_type || "campaign") as "campaign" | "adset" | "ad",
      };
      
      console.log('📝 Setting form data:', newFormData);
      setFormData(newFormData);
      
      setConditions(template.conditions as ConditionsGroup);
      
      setSafetyLimits({
        budget_safety_limits: template.budget_safety_limits as any || {
          max_daily_budget_increase_percent: 20,
          max_daily_budget_decrease_percent: 30,
        },
        execution_limits: template.execution_limits as any || {
          max_executions_per_day: 3,
          cooldown_hours: 4,
        },
      });

      setSelectedObjectives(template.campaign_objectives || []);
      
      // Delay to ensure state is updated before rendering
      setTimeout(() => {
        setIsLoadingTemplate(false);
        console.log('✅ Template loading complete');
      }, 0);
    } else {
      setIsLoadingTemplate(false);
      // Reset to defaults
      setFormData({
        rule_name: "",
        rule_description: "",
        rule_order: 1,
        time_window_days: 7,
        action_type: "notify_only",
        is_active: true,
        action_config: {},
        entity_type: "campaign",
      });
      
      setConditions({
        logic: "AND",
        conditions: [
          {
            field: "cpa",
            operator: ">",
            value: 100,
            type: "number",
          }
        ]
      });
      
      setSafetyLimits({
        budget_safety_limits: {
          max_daily_budget_increase_percent: 20,
          max_daily_budget_decrease_percent: 30,
        },
        execution_limits: {
          max_executions_per_day: 3,
          cooldown_hours: 4,
        },
      });

      setSelectedObjectives([]);
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulário básico
    try {
      templateFormSchema.parse(formData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro de validação",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    // Validar limites de segurança
    try {
      safetyLimitsSchema.parse(safetyLimits);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Erro nos limites de segurança",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    // Validar condições
    if (conditions.conditions.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Adicione pelo menos uma condição",
        variant: "destructive",
      });
      return;
    }

    // Validar que todas as condições tenham valores default
    const hasInvalidConditions = conditions.conditions.some(
      cond => cond.value === null || cond.value === undefined
    );

    if (hasInvalidConditions) {
      toast({
        title: "❌ Erro de validação",
        description: "Todas as condições devem ter um valor padrão configurado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    const templateData = {
      ...formData,
      conditions: {
        logic: conditions.logic,
        conditions: conditions.conditions.map(c => ({
          field: c.field,
          operator: null,
          value: null,
          type: c.type,
        }))
      },
      action_config: formData.action_config,
      budget_safety_limits: safetyLimits.budget_safety_limits,
      execution_limits: safetyLimits.execution_limits,
      scope_filters: {},
      campaign_objectives: selectedObjectives.length > 0 ? selectedObjectives : null,
    };

    await onSave(templateData);
    setLoading(false);
    onOpenChange(false);
  };

  // Helpers for dynamic fields based on entity type
  const getAvailableActions = (entityType: string) => {
    if (entityType === "campaign") {
      return [
        { value: "pause_campaign", label: "⏸️ Pausar Campanha" },
        { value: "activate_campaign", label: "▶️ Ativar Campanha" },
        { value: "increase_budget", label: "📈 Aumentar Orçamento" },
        { value: "decrease_budget", label: "📉 Reduzir Orçamento" },
        { value: "duplicate_campaign", label: "📋 Duplicar Campanha" },
        { value: "notify_only", label: "🔔 Apenas Notificar" },
      ];
    }

    if (entityType === "adset") {
      return [
        { value: "pause_adset", label: "⏸️ Pausar Conjunto" },
        { value: "activate_adset", label: "▶️ Ativar Conjunto" },
        { value: "increase_adset_budget", label: "📈 Aumentar Orçamento" },
        { value: "decrease_adset_budget", label: "📉 Reduzir Orçamento" },
        { value: "duplicate_adset", label: "📋 Duplicar Conjunto" },
        { value: "notify_only", label: "🔔 Apenas Notificar" },
      ];
    }

    if (entityType === "ad") {
      return [
        { value: "pause_ad", label: "⏸️ Pausar Criativo" },
        { value: "activate_ad", label: "▶️ Ativar Criativo" },
        { value: "duplicate_ad", label: "📋 Duplicar Criativo" },
        { value: "notify_only", label: "🔔 Apenas Notificar" },
      ];
    }

    return [];
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template de Automação"}</DialogTitle>
          <DialogDescription>
            Configure as regras de automação que serão aplicadas às campanhas
          </DialogDescription>
        </DialogHeader>

        {isLoadingTemplate ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando dados do template...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rule_name">Nome da Regra *</Label>
            <Input
              id="rule_name"
              value={formData.rule_name}
              onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
              placeholder="Ex: Pausar campanhas com CPA alto"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rule_description">Descrição</Label>
            <Textarea
              id="rule_description"
              value={formData.rule_description}
              onChange={(e) => setFormData({ ...formData, rule_description: e.target.value })}
              placeholder="Descreva quando esta regra deve ser aplicada"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="time_window_days">Janela de Tempo (dias)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Define o período histórico em dias usado para calcular as métricas. 
                      Por exemplo, com 7 dias, o sistema calcula a média dos últimos 7 dias 
                      para evitar decisões baseadas em flutuações de um único dia.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="time_window_days"
                type="number"
                min="1"
                value={formData.time_window_days}
                onChange={(e) => setFormData({ ...formData, time_window_days: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="rule_order">Prioridade</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Define a ordem de execução das regras. Números menores têm maior prioridade. 
                      Por exemplo, uma regra com prioridade 1 será executada antes de uma com 
                      prioridade 5. Use para garantir que regras críticas sejam verificadas primeiro.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                id="rule_order"
                type="number"
                min="1"
                value={formData.rule_order}
                onChange={(e) => setFormData({ ...formData, rule_order: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity_type">Tipo de Entidade</Label>
            <Select 
              value={formData.entity_type} 
              onValueChange={(value) => {
                setFormData({ 
                  ...formData, 
                  entity_type: value as "campaign" | "adset" | "ad",
                  action_type: "notify_only"
                });
              }}
            >
              <SelectTrigger id="entity_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="campaign">📊 Campanha</SelectItem>
                <SelectItem value="adset">🎯 Conjunto de Anúncios</SelectItem>
                <SelectItem value="ad">🎨 Criativo (Ad)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action_type">Tipo de Ação</Label>
            <Select
              value={formData.action_type}
              onValueChange={(value) => setFormData({ ...formData, action_type: value })}
            >
              <SelectTrigger id="action_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getAvailableActions(formData.entity_type).map(action => (
                  <SelectItem key={action.value} value={action.value}>
                    {action.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(formData.action_type === 'duplicate_campaign' || formData.action_type === 'duplicate_adset' || formData.action_type === 'duplicate_ad') && (
            <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <Label htmlFor="duplicate_budget_percent">Budget da Campanha Duplicada (%)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      Define qual porcentagem do budget original será aplicada à campanha duplicada.
                      Por exemplo, com 50%, se a campanha original tem budget de R$ 100/dia, 
                      a duplicada terá R$ 50/dia. Use valores menores para testes mais controlados.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  id="duplicate_budget_percent"
                  type="number"
                  min="10"
                  max="200"
                  value={formData.action_config?.duplicate_budget_percent || 50}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    action_config: { 
                      ...formData.action_config, 
                      duplicate_budget_percent: parseInt(e.target.value) || 50 
                    } 
                  })}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">
                  % do budget original
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 Recomendado: 30-70% para testes controlados, 100% para scaling
              </p>
            </div>
          )}

          <Separator className="my-6" />

          <CampaignObjectiveSelector
            value={selectedObjectives}
            onChange={setSelectedObjectives}
          />

          <Separator className="my-6" />

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Condições de Acionamento</h3>
            <p className="text-sm text-muted-foreground">
              Defina as condições que devem ser atendidas para acionar esta automação
            </p>
          </div>

          <ConditionEditor value={conditions} onChange={setConditions} isTemplate={true} />

          <Separator className="my-6" />

          <SafetyLimitsEditor 
            value={safetyLimits} 
            onChange={setSafetyLimits}
            actionType={formData.action_type}
          />

          {/* Recovery Trigger Configuration */}
          {(formData.action_type === 'pause_campaign' || 
            formData.action_type === 'pause_adset' || 
            formData.action_type === 'pause_ad') && (
            <>
              <Separator className="my-6" />
              
              <div className="rounded-lg border p-4 space-y-3 bg-muted/50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="enable_recovery">Reativar Automaticamente</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Quando ativado, a entidade pausada será automaticamente reativada 
                            após o número de dias especificado. Útil para "pausas temporárias" 
                            que permitem que a campanha descanse e depois volte a rodar.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Reativar automaticamente após pausar
                    </p>
                  </div>
                  <Switch
                    id="enable_recovery"
                    checked={formData.action_config?.enable_recovery_trigger || false}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      action_config: { 
                        ...formData.action_config, 
                        enable_recovery_trigger: checked,
                        recovery_trigger_days: checked ? (formData.action_config?.recovery_trigger_days || 3) : undefined
                      } 
                    })}
                  />
                </div>

                {formData.action_config?.enable_recovery_trigger && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="recovery_days">Reativar após (dias)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Número de dias que a entidade ficará pausada antes de ser reativada 
                            automaticamente. Por exemplo, com 3 dias, uma campanha pausada hoje 
                            será reativada automaticamente daqui a 3 dias.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        id="recovery_days"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.action_config?.recovery_trigger_days || 3}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          action_config: { 
                            ...formData.action_config, 
                            recovery_trigger_days: parseInt(e.target.value) || 3
                          } 
                        })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                    <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 mt-3">
                      <p className="text-xs text-blue-900 dark:text-blue-100">
                        🔄 <strong>Exemplo:</strong> Campanha com CPA alto será pausada. 
                        Após {formData.action_config?.recovery_trigger_days || 3} dias, 
                        será reativada automaticamente para uma nova tentativa com dados frescos.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator className="my-6" />

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Template Ativo</Label>
              <p className="text-sm text-muted-foreground">
                Desative para pausar temporariamente esta regra
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : template ? "Atualizar" : "Criar Template"}
            </Button>
          </DialogFooter>
        </form>
        )}
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
};
